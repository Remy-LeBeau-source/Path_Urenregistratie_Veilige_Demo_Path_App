#!/usr/bin/env node
// Genereert de database-ERD rechtstreeks uit database/schema.sql, zodat het
// diagram nooit meer los kan raken van het echte schema: elke run leest de
// CREATE TABLE-blokken opnieuw en produceert database/ERD-nieuw.svg (en het
// bijbehorende .md-overzicht) helemaal opnieuw.
//
// Ontwerp, bewust gelijk aan het eerdere handmatige diagram (27 aug):
// - Domeinen (kolommen) i.p.v. één kriskras-netwerk: leesbaarder dan 50+
//   kruisende lijnen, en de indeling komt letterlijk overeen met ERD.md.
// - Alleen foreign keys BINNEN hetzelfde domein krijgen een getekende lijn;
//   een FK naar een andere domeinkolom krijgt inline tekst "→ tabel.veld"
//   achter het veld zelf. Dat hield het vorige diagram leesbaar en dat
//   principe verandert hier niet.
// - Per tabel alleen PK/FK/UQ-velden getoond, plus een teller voor de rest
//   ("N overige kolommen") -- de volledige kolomlijst staat al in SCHEMA.md.
//
// Gebruik: node scripts/generate-erd.mjs
// Voeg dit toe aan de eigen werkwijze na elke schemawijziging (zie
// database/ERD.md en de memory "keep-erd-updated-with-schema").

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const schemaPath = join(root, 'database', 'schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

// ---------------------------------------------------------------------------
// 1. Parse: CREATE TABLE-blokken, kolommen, PK/UQ/FK.
// ---------------------------------------------------------------------------
const tableBlocks = [...sql.matchAll(/CREATE TABLE\s+`?(\w+)`?\s*\(([\s\S]*?)\n\);/g)];

const tables = tableBlocks.map(([, name, body]) => {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const columns = [];
  const fks = []; // { column, refTable, refColumn }
  let compositePk = null;

  for (const line of lines) {
    const clean = line.replace(/,\s*$/, '');

    const fkMatch = clean.match(/^CONSTRAINT\s+`?\w+`?\s+FOREIGN KEY\s*\(`?(\w+)`?\)\s*REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
    if (fkMatch) {
      fks.push({ column: fkMatch[1], refTable: fkMatch[2], refColumn: fkMatch[3] });
      continue;
    }
    const pkCompositeMatch = clean.match(/^PRIMARY KEY\s*\(([^)]+)\)/i);
    if (pkCompositeMatch) {
      compositePk = pkCompositeMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
      continue;
    }
    const uqCompositeMatch = clean.match(/^CONSTRAINT\s+`?\w+`?\s+UNIQUE\s*\(([^)]+)\)/i);
    if (uqCompositeMatch) {
      // Composite unique: onthouden per kolom als UQ-markering.
      const cols = uqCompositeMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
      for (const c of cols) columns.find(col => col.name === c) && (columns.find(col => col.name === c).uq = true);
      continue;
    }
    if (/^(INDEX|KEY|CONSTRAINT\s+`?\w+`?\s+CHECK)/i.test(clean)) continue;

    const colMatch = clean.match(/^`?(\w+)`?\s+([A-Z]+(?:\([^)]*\))?(?:\s+UNSIGNED)?)/i);
    if (colMatch) {
      const [, colName, rawType] = colMatch;
      columns.push({
        name: colName,
        type: rawType.trim(),
        pk: /PRIMARY KEY/i.test(clean),
        uq: /\bUNIQUE\b/i.test(clean),
        nullable: !/NOT NULL/i.test(clean) && !/PRIMARY KEY/i.test(clean),
      });
    }
  }

  if (compositePk) for (const c of compositePk) { const col = columns.find(x => x.name === c); if (col) col.pk = true; }
  for (const fk of fks) { const col = columns.find(x => x.name === fk.column); if (col) col.fk = fk; }

  return { name, columns, fkCount: fks.length };
});

const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
const totalFks = tables.reduce((sum, t) => sum + t.fkCount, 0);

// ---------------------------------------------------------------------------
// 2. Domeinen. Vaste indeling (zelfde als ERD.md), reminder_log toegevoegd bij
//    Identiteit en beheer: hij hoort net als audit_log bij het bedrijf/de
//    gebruiker, niet bij een specifiek ander domein.
// ---------------------------------------------------------------------------
const domains = [
  { title: 'Organisatie & identiteit', tables: ['companies', 'users', 'user_preferences', 'employees', 'audit_log', 'reminder_log'] },
  { title: 'Opdrachten & routering', tables: ['counterparties', 'assignments', 'mail_recipients', 'assignment_mail_routes'] },
  { title: 'Urenregistratie', tables: ['periods', 'timesheets', 'time_entries', 'timesheet_corrections'] },
  { title: 'Documenten & facturatie', tables: ['customer_timesheets', 'invoices'] },
  { title: 'Communicatie', tables: ['announcements', 'announcement_recipients', 'email_deliveries', 'notifications'] },
];

const byName = Object.fromEntries(tables.map(t => [t.name, t]));
const domainOf = {};
for (const d of domains) for (const t of d.tables) domainOf[t] = d.title;
const placed = new Set(domains.flatMap(d => d.tables));
const missing = tables.filter(t => !placed.has(t.name));
if (missing.length) {
  console.warn('Niet in een domein ingedeeld, toegevoegd aan Organisatie & identiteit:', missing.map(t => t.name).join(', '));
  domains[0].tables.push(...missing.map(t => t.name));
  for (const t of missing) domainOf[t.name] = domains[0].title;
}

// ---------------------------------------------------------------------------
// 3. Layout + SVG.
// ---------------------------------------------------------------------------
const COL_WIDTH = 330;
const COL_GAP = 46;
const ROW_H = 24;
const HEAD_H = 34;
const TABLE_GAP = 30;
const PAD = 40;
const TOP = 150;

function visibleRows(table) {
  const keyCols = table.columns.filter(c => c.pk || c.fk || c.uq);
  const rest = table.columns.length - keyCols.length;
  return { keyCols, restCount: rest };
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

let svgTables = '';
let svgConnectors = '';
const tablePos = {}; // name -> {x,y,w,h}
const colY = {}; // "table.column" -> absolute y (voor connectorlijnen)

let x = PAD;
for (const domain of domains) {
  let y = TOP;
  for (const tname of domain.tables) {
    const table = byName[tname];
    if (!table) continue;
    const { keyCols, restCount } = visibleRows(table);
    const rowCount = keyCols.length + (restCount > 0 ? 1 : 0);
    const h = HEAD_H + rowCount * ROW_H + 10;
    tablePos[tname] = { x, y, w: COL_WIDTH, h };

    svgTables += `<g>
  <rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${h}" rx="8" fill="#ffffff" stroke="#d7dee2" stroke-width="1.5"/>
  <rect x="${x}" y="${y}" width="${COL_WIDTH}" height="${HEAD_H}" rx="8" fill="#12876f"/>
  <rect x="${x}" y="${y + HEAD_H - 8}" width="${COL_WIDTH}" height="8" fill="#12876f"/>
  <text x="${x + 14}" y="${y + 22}" font-family="Segoe UI, Arial" font-size="14" font-weight="700" fill="#ffffff">${esc(table.name)}</text>
  <text x="${x + COL_WIDTH - 12}" y="${y + 22}" font-family="Segoe UI, Arial" font-size="10.5" fill="#dff3ee" text-anchor="end">${table.columns.length} kolommen</text>
`;

    let ry = y + HEAD_H + 16;
    for (const col of keyCols) {
      const badge = col.pk && col.fk ? 'PK/FK' : col.pk ? 'PK' : col.fk ? 'FK' : 'UQ';
      const badgeColor = col.pk ? '#0d1b38' : col.fk ? '#2f6fb0' : '#8a6d1a';
      let refText = '';
      if (col.fk) {
        const crossDomain = domainOf[col.fk.refTable] !== domain.title;
        refText = `<text x="${x + COL_WIDTH - 12}" y="${ry}" font-family="Segoe UI, Arial" font-size="10" fill="${crossDomain ? '#6b7680' : '#2f6fb0'}" text-anchor="end">→ ${esc(col.fk.refTable)}.${esc(col.fk.refColumn)}</text>`;
      } else if (col.uq) {
        refText = `<text x="${x + COL_WIDTH - 12}" y="${ry}" font-family="Segoe UI, Arial" font-size="10" fill="#8a6d1a" text-anchor="end">uniek</text>`;
      }
      svgTables += `  <rect x="${x + 12}" y="${ry - 13}" width="${badge.length * 6.4 + 12}" height="16" rx="3" fill="${badgeColor}"/>
  <text x="${x + 18}" y="${ry - 1}" font-family="Segoe UI, Arial" font-size="9.5" font-weight="700" fill="#ffffff">${badge}</text>
  <text x="${x + 12 + badge.length * 6.4 + 22}" y="${ry - 1}" font-family="Consolas, monospace" font-size="11" fill="#20303f">${esc(col.name)}</text>
  ${refText}
`;
      colY[`${table.name}.${col.name}`] = ry - 6;
      ry += ROW_H;
    }
    if (restCount > 0) {
      svgTables += `  <text x="${x + 18}" y="${ry - 1}" font-family="Segoe UI, Arial" font-style="italic" font-size="10" fill="#8a959c">… ${restCount} overige kolommen in SCHEMA.md</text>\n`;
    }
    svgTables += `</g>\n`;
    y += h + TABLE_GAP;
  }
  x += COL_WIDTH + COL_GAP;
}

// Connectorlijnen: alleen binnen hetzelfde domein, van FK-veld naar de
// doeltabel-kop (niet naar de exacte doelkolom -- die kan een "overige
// kolom" zijn die niet los getekend is; de koptekst is altijd zichtbaar).
for (const table of tables) {
  for (const col of table.columns) {
    if (!col.fk) continue;
    if (domainOf[col.fk.refTable] !== domainOf[table.name]) continue;
    if (col.fk.refTable === table.name) continue; // zelfreferentie, geen lijn
    const from = tablePos[table.name];
    const to = tablePos[col.fk.refTable];
    if (!from || !to) continue;
    const fromY = colY[`${table.name}.${col.name}`] ?? (from.y + from.h / 2);
    const toY = to.y + HEAD_H / 2;
    // Domeinen staan elk in hun eigen kolom, dus "zelfde domein" betekent hier
    // altijd "zelfde x": beide uiteinden gaan aan de LINKERkant naar buiten en
    // weer naar binnen -- nooit dwars door een andere tabel heen (dat gebeurde
    // eerder wel toen het doel-uiteinde de rechterrand van de doelbox pakte).
    const busX = from.x - 16;
    svgConnectors += `<path d="M ${from.x} ${fromY} H ${busX} V ${toY} H ${to.x}" fill="none" stroke="#9fb3c8" stroke-width="1.5" marker-end="url(#arrow)"/>\n`;
  }
}

const totalWidth = x - COL_GAP + PAD;
const totalHeight = Math.max(...Object.values(tablePos).map(p => p.y + p.h)) + PAD;
const generated = new Date().toISOString().slice(0, 16).replace('T', ' ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" font-family="Segoe UI, Arial">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#9fb3c8"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#f7f9fa"/>
  <rect x="0" y="0" width="${totalWidth}" height="6" fill="#12876f"/>
  <text x="${PAD}" y="42" font-size="22" font-weight="700" fill="#0d1b38">Path Consultancy · Database-ERD</text>
  <text x="${PAD}" y="64" font-size="12.5" fill="#5b6670">Automatisch gegenereerd uit database/schema.sql · ${tables.length} tabellen · ${totalColumns} kolommen · ${totalFks} foreign keys · gegenereerd ${generated}</text>
  <text x="${PAD}" y="90" font-size="11" fill="#5b6670">PK primary key · FK foreign key · PK/FK gecombineerde sleutel · UQ uniek · "→ tabel.veld" wijst het FK-doel aan; een getekende lijn geldt alleen binnen hetzelfde domein.</text>
  ${domains.map((d, i) => `<text x="${PAD + i * (COL_WIDTH + COL_GAP)}" y="128" font-size="13" font-weight="700" fill="#12876f">${esc(d.title)}</text>`).join('\n  ')}
  ${svgConnectors}
  ${svgTables}
</svg>`;

const svgPath = join(root, 'database', 'ERD-nieuw.svg');
writeFileSync(svgPath, svg, 'utf8');

const mdPath = join(root, 'database', 'ERD-nieuw.md');
const md = `# Database-ERD (automatisch gegenereerd) — Path Uren & Facturatie

Dit bestand en [ERD-nieuw.svg](ERD-nieuw.svg) worden volledig gegenereerd door
\`node scripts/generate-erd.mjs\`, rechtstreeks uit \`database/schema.sql\`. Draai
dat script opnieuw na elke schemawijziging -- niets hier wordt met de hand
bijgewerkt.

## Overzicht

${tables.length} tabellen, ${totalColumns} kolommen, ${totalFks} foreign keys. Per veld: \`PK\`, \`FK\`,
\`PK/FK\` of \`UQ\`. Achter een FK-veld staat de doeltabel en doelkolom; een
getekende verbindingslijn staat er alleen bij als bron en doel in hetzelfde
domein staan (anders wordt het diagram onleesbaar door kruisende lijnen over
de volle breedte).

![Automatisch gegenereerde database-ERD](ERD-nieuw.svg)

## Domeinen

| Domein | Tabellen |
|---|---|
${domains.map(d => `| ${d.title} | ${d.tables.filter(t => byName[t]).map(t => `\`${t}\``).join(', ')} |`).join('\n')}

## Verschil met de vorige ERD (database/ERD.md, 27-8-2026)

De vorige versie was handmatig gemaakt en dertien dagen niet bijgewerkt terwijl
\`schema.sql\` in die periode wel veranderde (commit 84654743 tot nu). Concreet
verschil:

- **Nieuwe tabel:** \`reminder_log\` (idempotentie voor de serverplanning van de
  vier herinneringstypen; uniek per medewerker/type/periode).
- **\`companies\`:** elf nieuwe kolommen -- \`invoice_name_display\`,
  \`invoice_phone\`, \`invoice_email\` en acht kolommen voor de vier
  herinneringstypen (\`weekly_reminder_*\`, \`month_end_reminder_*\`,
  \`overdue_reminder_*\`, \`approval_reminder_*\`) plus \`mail_signature\`.
- **\`employees\`:** vijf nieuwe kolommen \`hours_monday\` t/m \`hours_friday\`
  (optioneel eigen werkpatroon per weekdag).
- **\`email_deliveries\`:** \`user_id\` (nieuwe FK naar \`users.id\`),
  \`timesheet_version\`, \`pdf_storage_key\`, \`dry_run\`, \`acceptance_test\`, en de
  \`channel\`/\`attachment_policy\`-enums uitgebreid met nieuwe waarden
  (\`timesheet_submission_receipt\`, \`timesheet_final_approval\`,
  \`password_reset\`, \`timesheet_receipt\`, \`other\`).
- Tabelaantal 19 → ${tables.length}, foreign keys 49 → ${totalFks}.

De oude \`ERD.md\`/\`ERD.svg\`/\`ERD-detail.svg\` blijven staan zodat het verschil
zichtbaar blijft; verwijder ze pas als dit nieuwe diagram is goedgekeurd.
`;
writeFileSync(mdPath, md, 'utf8');

console.log(`ERD gegenereerd: ${tables.length} tabellen, ${totalColumns} kolommen, ${totalFks} foreign keys.`);
console.log(`-> ${svgPath}`);
console.log(`-> ${mdPath}`);
