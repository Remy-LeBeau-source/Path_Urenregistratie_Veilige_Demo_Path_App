# Handoff — dekkingsronde 3 september 2026

**Stand:** TEST draait **1.0.1**. PROD niet aangeraakt (staat op 0.9.156, wacht
op jouw Promote Prod). Alle commits op `main`, elke commit groen op
`npm run check`. Versieschema sinds nu: `1.0.x` (BESLISTABEL W10).

De volledige procedure en gebiedenlijst staat in **`DEKKINGSRONDE.md`**. Elke
sessie kan die oppakken. Trigger: de gebruiker zegt **"dekkingsronde"**.

---

## Gedaan in deze ronde

| Versie | Commit | Wat |
|---|---|---|
| 0.9.173 | Dekkingsronde 1 | `[TS-API-N-012]` optimistische vergrendeling urenstaat: tweede write met verouderde versie → 409 stale-version, DB houdt de waarden van de winnaar |
| **1.0.0** | Dekkingsronde 2 + versiesprong | Nieuwe suite `database-integrity.spec.ts`: `[DB-H-002]` 17 weesrij-controles · `[DB-H-003]` ON DELETE CASCADE-contract · `[DB-N-005]` medewerker verwijderen laat geen weesrijen + auditlog |
| 1.0.1 | Dekkingsronde 3 | 97 regels dode CSS weg (26 ongebruikte classes), CSS-bundel ~6,7 kB kleiner |

**Direct hiervoor in dezelfde sessie (0.9.157 → 0.9.172):** mobiele
document-flow, kruisjes, PWA-naam + navy statusbalk per omgeving, leesbaarheid,
accountuitnodiging (aanpasbare welkomsttekst + geen beheerder-throttle),
medewerkerdashboard-laadtoestand, klanturenstaat-desync, klikbare
factuurstatusstappen, herkomst bij "rechtstreeks gemaild", scroll-sluit-menu-fix,
`npm run version:set`-script, dekkingsronde als vaste werkwijze (W12).
Nieuwe cases daarbij: `DASH-N-018`, `DASH-N-019`, `DASH-H-020`, `INV-H-022`,
`INV-H-023`, `PWD-H-018`, `PWD-H-019`, `MOB-H-020`, `CTS-API-H-014`.

---

## Nog te doen — resterende plan

| # | Gebied | Wat nog | Grofweg |
|---|---|---|---|
| 1 | Uren & correcties | correctie→herindiening DB-keten, verlof/ziekte-validatie, dag-entry grenzen | 2 commits |
| 2 | Database | per schrijf-API een audit_log-cross-check (invoice, customer_timesheet, announcement, settings); dubbele e-mail-afleveringen | 2 |
| 3 | Facturen & klanturenstaat | PDF-inhoud vs preview edge-cases, lock-transities, externe factuur formaten, broker-dedup rand | 3 |
| 4 | Mail | kanaalsjabloon-overerving, acceptatieconsole 5 scenario's, sandbox-omleiding, reset-throttle | 2 |
| 5 | Mededelingen/notificaties | stale-response breder, herstel-basismeldingen, teller-sync | 1 |
| 6 | Teambeheer & auth | dubbel e-mailadres varianten, rate-limits, rol-autorisatiematrix, admin verwijderen | 2 |
| 7 | Instellingen | bedrijfsidentiteit → factuur-PDF, betaaltermijn, merkkleuren → contrast | 1 |
| 8 | PWA/mobiel | service worker, installatieaanbod-varianten, iOS-titel, iconen — Android **én** iOS | 2 |
| 9 | Uiterlijk & a11y | contrast breder per view, tekstondergrens per view, focus-volgorde, toetsenbord | 1 |
| 10 | Opschonen | ongebruikte JS-functies weg, dubbele render-logica samenvoegen | 1 |
| 11 | Design-verfijning | binnen bestaande tokens: knop-hiërarchie, spacing-ritme, lege-/laadtoestanden — elk met test/contrastcheck | 3–5 |

**Inschatting rest:** ~8–13 uur werk, ~20–28 commits, allemaal naar TEST.

## Bewust niet nu

- app.js opsplitsen / renderpijplijn herzien — te risicovol vlak vóór go-live.
  Wordt een bevindingenlijst, geen code, tot na 1.0.
- Echte visuele iPhone-check blijft mensenwerk (`mobile-safari` = WebKit-engine,
  geen toestel).

## Resume

`git pull`, lees `DEKKINGSRONDE.md`, ga verder bij gebied 1. Elke commit:
`npm run version:set 1.0.x` → `npm run check` → nieuwe/aangeraakte specs groen →
NL-commit zonder handtekening → push. PROD blijft van de gebruiker.
