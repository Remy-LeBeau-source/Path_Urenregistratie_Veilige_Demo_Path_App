import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const playwrightDir = path.join(root, 'tests', 'playwright');
const featuresDir = path.join(playwrightDir, 'features');
const stepsDir = path.join(playwrightDir, 'steps');

const definitions = [
  { kind: 'playwright', spec: 'accessibility.spec.ts', feature: 'accessibility.feature', steps: 'accessibility.steps.ts', name: 'Toegankelijkheid en toetsenbordbediening', tags: ['regressie', 'ui', 'desktop', 'fase:15'], parentSuite: 'UI Desktop', suite: 'Accessibility', allureFeature: 'Accessibility', phase: 15 },
  { kind: 'playwright', spec: 'admin-writes.spec.ts', feature: 'organization-settings.feature', steps: 'admin-writes.steps.ts', name: 'Organisatie-instellingen beheren', tags: ['regressie', 'api', 'fase:2'], parentSuite: 'API', suite: 'Admin Writes', allureFeature: 'Beheer & Instellingen', phase: 2 },
  { kind: 'playwright', spec: 'audit-log.spec.ts', feature: 'audit-log.feature', steps: 'audit-log.steps.ts', name: 'Auditlog en traceerbaarheid', tags: ['regressie', 'api', 'fase:16'], parentSuite: 'API', suite: 'Audit Log', allureFeature: 'Audit & Security', phase: 16 },
  { kind: 'playwright', spec: 'server-log.spec.ts', feature: 'server-log.feature', steps: 'server-log.steps.ts', name: 'Serverfoutenlog inzien', tags: ['regressie', 'api', 'fase:16'], parentSuite: 'API', suite: 'Server Log', allureFeature: 'Audit & Security', phase: 16 },
  { kind: 'playwright', spec: 'auth.spec.ts', feature: 'auth.feature', steps: 'auth.steps.ts', name: 'Inloggen, uitloggen en sessiebeheer', tags: ['regressie', 'ui', 'desktop', 'fase:4'], parentSuite: 'UI Desktop', suite: 'Login', allureFeature: 'Authenticatie', phase: 4 },
  { kind: 'playwright', spec: 'avatar-picker.spec.ts', feature: 'avatar-picker.feature', steps: 'avatar-picker.steps.ts', name: 'Avatarkiezer in het profielmenu', tags: ['regressie', 'ui', 'desktop', 'fase:19'], parentSuite: 'UI Desktop', suite: 'Avatarkiezer', allureFeature: 'Profiel & Voorkeuren', phase: 19 },
  { kind: 'playwright', spec: 'business-workflows-*.spec.ts', specs: readdirSync(playwrightDir).filter((file) => file.startsWith('business-workflows-') && file.endsWith('.spec.ts')).sort(), feature: 'end-to-end-workflows.feature', steps: 'end-to-end-workflows.steps.ts', name: 'Bedrijfsketens van medewerker tot Backoffice', tags: ['regressie', 'integration', 'ui', 'desktop', 'fase:16'], parentSuite: 'DB / Integratie', suite: 'End-to-end Workflows', allureFeature: 'Bedrijfsketens', phase: 16 },
  { kind: 'playwright', spec: 'customer-timesheet-api.spec.ts', feature: 'customer-timesheets.feature', steps: 'customer-timesheets.steps.ts', name: 'Klanturenstaten en documentverwerking', tags: ['regressie', 'api', 'fase:10'], parentSuite: 'API', suite: 'Customer Timesheets', allureFeature: 'Klanturenstaten', phase: 10 },
  // Meerdere specbestanden, één hoofdstuk. dashboard.spec.ts is opgeknipt in een
  // beheer- en een medewerkerdeel omdat CI-sharding per bestand werkt en dat ene
  // bestand de langzaamste shard bepaalde. Dat is een uitvoeringsdetail, geen
  // splitsing van het onderwerp, dus de documentatie houdt één dashboardhoofdstuk.
  // Zonder deze meervoudsvorm verdwenen de 20 cases van het nieuwe bestand
  // geruisloos uit dashboard.feature en de mapping.
  { kind: 'playwright', spec: 'dashboard*.spec.ts', specs: readdirSync(playwrightDir).filter((file) => file.startsWith('dashboard') && file.endsWith('.spec.ts')).sort(), feature: 'dashboard.feature', steps: 'dashboard.steps.ts', name: 'Dashboard en open werkvoorraad', tags: ['regressie', 'ui', 'desktop', 'fase:15'], parentSuite: 'UI Desktop', suite: 'Dashboard', allureFeature: 'Dashboard', phase: 15 },
  { kind: 'playwright', spec: 'database-integrity.spec.ts', feature: 'database-relations.feature', steps: 'database-relations.steps.ts', name: 'Relationele database-integriteit', tags: ['regressie', 'integration', 'db', 'fase:16'], parentSuite: 'DB / Integratie', suite: 'Database Integrity', allureFeature: 'Database & Infrastructure', phase: 16 },
  { kind: 'playwright', spec: 'email-queue.spec.ts', feature: 'mail-delivery.feature', steps: 'email-queue.steps.ts', name: 'Mailroutering en aflevering', tags: ['regressie', 'api', 'fase:12'], parentSuite: 'API', suite: 'Email Queue', allureFeature: 'E-mailverwerking', phase: 12 },
  { kind: 'playwright', spec: 'help-widget.spec.ts', feature: 'help-widget.feature', steps: 'help-widget.steps.ts', name: 'Hulp en contact', tags: ['regressie', 'ui', 'desktop', 'fase:17'], parentSuite: 'UI Desktop', suite: 'Help Widget', allureFeature: 'Hulp & Contact', phase: 17 },
  { kind: 'playwright', spec: 'invoice-lock.spec.ts', feature: 'invoice-locking.feature', steps: 'invoice-locking.steps.ts', name: 'Facturen definitief maken en vergrendelen', tags: ['regressie', 'integration', 'fase:11'], parentSuite: 'DB / Integratie', suite: 'Invoice Locking', allureFeature: 'Facturatie', phase: 11 },
  { kind: 'playwright', spec: 'invoice-company-identity.spec.ts', feature: 'invoice-company-identity.feature', steps: 'invoice-company-identity.steps.ts', name: 'Facturerende onderneming en handelsnaam', tags: ['regressie', 'integration', 'fase:11'], parentSuite: 'DB / Integratie', suite: 'Invoice Identity', allureFeature: 'Facturatie', phase: 11 },
  { kind: 'playwright', spec: 'invoices.spec.ts', feature: 'invoices.feature', steps: 'invoices-ui.steps.ts', name: 'Facturen bekijken en beheren', tags: ['regressie', 'ui', 'desktop', 'fase:11'], parentSuite: 'UI Desktop', suite: 'Facturen', allureFeature: 'Facturatie', phase: 11 },
  { kind: 'playwright', spec: 'mobile-ui.spec.ts', feature: 'mobile.feature', steps: 'mobile.steps.ts', name: 'Mobiele gebruikerservaring', tags: ['regressie', 'ui', 'mobile', 'fase:15'], parentSuite: 'UI Mobile', suite: 'Mobile Experience', allureFeature: 'Mobile Experience', phase: 15 },
  { kind: 'playwright', spec: 'notifications.spec.ts', feature: 'notifications.feature', steps: 'notifications.steps.ts', name: 'Meldingen beheren', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Notifications', allureFeature: 'Notificaties', phase: 15 },
  { kind: 'playwright', spec: 'announcements.spec.ts', feature: 'announcements.feature', steps: 'announcements.steps.ts', name: 'Mededelingen versturen, intrekken en verbergen', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Announcements', allureFeature: 'Mededelingen', phase: 15 },
  { kind: 'playwright', spec: 'password-reset.spec.ts', feature: 'password-reset.feature', steps: 'password-reset.steps.ts', name: 'Wachtwoordherstel en misbruikbeveiliging', tags: ['regressie', 'security', 'fase:13'], parentSuite: 'Security', suite: 'Password Reset / Rate Limiting', allureFeature: 'Audit & Security', phase: 13 },
  { kind: 'playwright', spec: 'pilot-page.spec.ts', feature: 'pilot-page.feature', steps: 'pilot-page.steps.ts', name: 'Functionele 1919-pilotportals naast de bestaande app', tags: ['regressie', 'ui', 'desktop', 'mobile', 'fase:18'], parentSuite: 'UI Desktop', suite: '1919 Pilot', allureFeature: '1919 Pilot', phase: 18 },
  { kind: 'playwright', spec: 'period-management.spec.ts', feature: 'period-management.feature', steps: 'period-management.steps.ts', name: 'Maandperiodes beheren', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Period Management', allureFeature: 'Periodebeheer', phase: 15 },
  { kind: 'playwright', spec: 'production-safety.spec.ts', feature: 'production-safety.feature', steps: 'production-safety.steps.ts', name: 'Veilige productieconfiguratie en deployment', tags: ['regressie', 'security', 'fase:14'], parentSuite: 'Security', suite: 'Production Safety', allureFeature: 'Audit & Security', phase: 14 },
  { kind: 'playwright', spec: 'reminders.spec.ts', feature: 'reminders.feature', steps: 'reminders.steps.ts', name: 'Serverplanning herinneringen', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Reminders', allureFeature: 'Herinneringen', phase: 15 },
  { kind: 'playwright', spec: 'roles-api.spec.ts', feature: 'roles-authorization.feature', steps: 'roles-api.steps.ts', name: 'Rollen, rechten en gegevensafscherming', tags: ['regressie', 'security', 'fase:4'], parentSuite: 'Security', suite: 'Role Scope', allureFeature: 'Audit & Security', phase: 4 },
  { kind: 'playwright', spec: 'security.spec.ts', feature: 'security.feature', steps: 'security.steps.ts', name: 'Authenticatie- en API-beveiliging', tags: ['regressie', 'security', 'fase:5'], parentSuite: 'Security', suite: 'CSRF & Authentication', allureFeature: 'Audit & Security', phase: 5 },
  { kind: 'playwright', spec: 'klassiek-verkenning.spec.ts', feature: 'klassiek-verkenning.feature', steps: 'klassiek-verkenning.steps.ts', name: 'Vondsten uit de monkey-verkenning op Klassiek', tags: ['regressie', 'ui', 'desktop', 'fase:19'], parentSuite: 'UI Desktop', suite: 'Klassiek verkenning', allureFeature: 'Vormgeving', phase: 19 },
  { kind: 'playwright', spec: 'pipeline-demo.spec.ts', feature: 'pipeline-demo.feature', steps: 'pipeline-demo.steps.ts', name: 'Interactieve Path Pipeline als zelfstandige TEST-demo met echte projectstand', tags: ['regressie', 'ui', 'desktop', 'mobile', 'fase:18'], parentSuite: 'UI Desktop', suite: 'Pipeline-demo', allureFeature: 'Werkwijze & pipeline', phase: 18 },
  { kind: 'playwright', spec: 'skin.spec.ts', feature: 'skin.feature', steps: 'skin.steps.ts', name: 'Vormgevingsschakelaar (klassiek / nieuw)', tags: ['regressie', 'ui', 'desktop', 'fase:19'], parentSuite: 'UI Desktop', suite: 'Skin', allureFeature: 'Vormgeving', phase: 19 },
  { kind: 'playwright', spec: 'timesheet-review-flow.spec.ts', feature: 'correction-approval-workflow.feature', steps: 'timesheets-review-integration.steps.ts', name: 'Correctie- en goedkeuringsproces', tags: ['regressie', 'integration', 'fase:9'], parentSuite: 'DB / Integratie', suite: 'Optimistic Locking', allureFeature: 'Correctie & Goedkeuring', phase: 9 },
  { kind: 'playwright', spec: 'timesheet-review-ui.spec.ts', feature: 'correction-approval-ui.feature', steps: 'timesheets-review-ui.steps.ts', name: 'Correcties en goedkeuringen behandelen', tags: ['regressie', 'ui', 'desktop', 'fase:9'], parentSuite: 'UI Desktop', suite: 'Correcties', allureFeature: 'Correctie & Goedkeuring', phase: 9 },
  { kind: 'playwright', spec: 'timesheet-write.spec.ts', feature: 'time-registration.feature', steps: 'timesheets-api.steps.ts', name: 'Urenregistratie verwerken', tags: ['regressie', 'api', 'fase:8'], parentSuite: 'API', suite: 'Timesheets', allureFeature: 'Urenregistratie', phase: 8 },
  { kind: 'playwright', spec: 'user-management.spec.ts', feature: 'team-access.feature', steps: 'user-management.steps.ts', name: 'Team en toegang beheren', tags: ['regressie', 'api', 'fase:13'], parentSuite: 'API', suite: 'User Management', allureFeature: 'Gebruikersbeheer', phase: 13 },
  { kind: 'playwright', spec: '../remote/*.spec.ts', specDir: path.join(root, 'tests', 'remote'), specs: readdirSync(path.join(root, 'tests', 'remote')).filter((file) => file.endsWith('.spec.ts')).sort(), feature: 'live-test-regression.feature', steps: 'live-test-regression.steps.ts', name: 'Live TEST-regressie en deployacceptatie', tags: ['regressie', 'integration', 'live', 'fase:16'], parentSuite: 'DB / Integratie', suite: 'Live TEST', allureFeature: 'Live TEST-regressie', phase: 16 },
  { kind: 'db', feature: 'database-integrity.feature', steps: 'database.steps.ts', name: 'Database-integriteit en CRUD-controle', tags: ['regressie', 'db', 'fase:16'], parentSuite: 'DB / SQL', suite: 'Database Integrity', allureFeature: 'Database & Infrastructure', phase: 16, source: 'database/queries/crud-smoke.sql', runner: 'scripts/run-db-crud-smoke.mjs' },
];

function extractCases(definition) {
  if (definition.kind === 'db') {
    return [{ id: 'DB-H-001', title: 'CRUD smoke test werkt in een geïsoleerde tijdelijke tabel', assertionCount: 3, testSteps: [
      'Given de database CRUD smoke is voorbereid',
      'When het SQL-script wordt uitgevoerd via de DB smoke runner',
      'Then wordt het verwachte cleanup-result bevestigd',
    ] }];
  }

  const specDir = definition.specDir || playwrightDir;
  const specFiles = definition.specs || [definition.spec];
  const source = specFiles.map((file) => readFileSync(path.join(specDir, file), 'utf8')).join('\n\n');
  // De titel mag gewone aanhalingstekens bevatten wanneer de buitenste JS-string
  // een ander teken gebruikt, en geparametriseerde cases gebruiken template-
  // literals. Stop daarom alleen bij hetzelfde afsluitteken als waarmee de
  // testtitel begon, niet bij ieder willekeurig quote-teken in de leesbare titel.
  //
  // VALKUIL (gevonden 16 sep, ROLE-N-008): deze regex kent geen JS-escaping. Een
  // titel als test('[X] ... collega\'s', ...) met een backslash-ontsnapt
  // aanhalingsteken dat GELIJK is aan het openingsteken, breekt de match af bij
  // die ontsnapte quote (de regex ziet gewoon een teken, geen escape-context).
  // Gevolg: geen match voor die test() -- niet zichtbaar als foutmelding, maar
  // als een verkeerd samengevoegd Scenario (de test.step()'s van de gemiste case
  // schuiven stilzwijgend in het blok van de vorige case, met een te hoog
  // "Aantoonbare assertions"-getal als enige aanwijzing). Voorkomen: gebruik in
  // een testtitel nooit hetzelfde aanhalingsteken als de buitenste string, ook
  // niet ontsnapt -- kies een andere formulering (bijv. "van een collega" i.p.v.
  // "van collega's") of een ander buitenste quote-teken.
  const pattern = /test\(\s*(['"`])\[([^\]]+)\]\s*((?:(?!\1)[^\r\n])*)\1\s*,/g;
  const matches = [...source.matchAll(pattern)];
  const cases = matches.map((match, index) => {
    const block = source.slice(match.index, matches[index + 1]?.index ?? source.length);
    const testSteps = [...block.matchAll(/test\.step\(\s*(['"])([^'"\r\n]+)\1\s*,/g)].map(step => step[2].trim());
    const assertionCount = (block.match(/\b(?:expect|expectApiError)\s*\(/g) || []).length;
    return { id: match[2], title: match[3].trim(), assertionCount, testSteps };
  });
  if (cases.length === 0) throw new Error(`Geen cases gevonden in ${definition.spec}.`);
  return cases;
}

function sentenceCase(text) {
  const value = String(text || '').trim();
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

function scenarioSteps(definition, testCase) {
  const explicit = testCase.testSteps
    .map(step => step.match(/^(Given|When|Then|And)\s+(.+)$/i))
    .filter(Boolean)
    .map(match => `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${match[2]}`);

  const hasGiven = explicit.some(step => step.startsWith('Given '));
  const hasWhen = explicit.some(step => step.startsWith('When '));
  const hasThen = explicit.some(step => step.startsWith('Then '));
  const result = [...explicit];
  if (!hasGiven) result.unshift(`Given ${sentenceCase(definition.name)} is voorbereid`);
  if (!hasWhen) {
    const givenCount = result.findIndex(step => !step.startsWith('Given ') && !step.startsWith('And '));
    const insertAt = givenCount < 0 ? result.length : givenCount;
    result.splice(insertAt, 0, `When de flow voor ${testCase.id} wordt uitgevoerd`);
  }
  if (!hasThen) result.push(`Then wordt met Playwright-assertions bevestigd dat ${sentenceCase(testCase.title)}`);
  return result;
}

function storyFor(definition, testCase) {
  if (testCase.id === 'MOB-H-001') return 'Veilige toegang en sessies';
  if (testCase.id === 'MOB-H-002') return 'Uren registreren en indienen';
  if (testCase.id === 'MOB-H-003') return 'Correctie en goedkeuring';
  if (definition.kind === 'db') return 'Database CRUD smoke';
  if (definition.spec === 'invoice-lock.spec.ts' && /lock|finaliseer|gelijktijd|immutable/i.test(testCase.title)) return 'Factuur definitief maken';
  if (definition.spec.startsWith('timesheet-review')) return 'Correctie en goedkeuring';
  if (definition.spec === 'timesheet-write.spec.ts') return 'Uren registreren en indienen';
  if (definition.spec === 'customer-timesheet-api.spec.ts') return 'Klanturenstaat lifecycle';
  if (['auth.spec.ts', 'password-reset.spec.ts', 'security.spec.ts'].includes(definition.spec)) return 'Veilige toegang en sessies';
  return testCase.title;
}

function suiteFor(definition, testCase) {
  const mobileSuites = {
    'MOB-H-001': 'Login & Navigatie',
    'MOB-H-002': 'Uren & Upload',
    'MOB-H-003': 'Correctie & Goedkeuring',
    'MOB-N-004': 'Facturen & Responsive',
  };
  return mobileSuites[testCase.id] || definition.suite;
}

function techniqueFor(definition, testCase) {
  const text = `${testCase.id} ${testCase.title}`.toLowerCase();
  if (definition.spec === 'announcements.spec.ts' && testCase.id === 'ANN-N-010') return 'Decision-table-analyse (combinatie van twee onderling uitsluitende referentievelden) + negatieve equivalentieklasse';
  if (definition.spec === 'announcements.spec.ts' && testCase.id === 'ANN-N-011') return 'Twee-rollentest (beheerder versus medewerker op dezelfde mededeling) + negatieve inhoudscontrole op naamlekken';
  if (definition.spec === 'accessibility.spec.ts') return 'Toegankelijkheidsinspectie + toetsenbord-use-case';
  if (definition.spec === 'mobile-ui.spec.ts') return 'Responsive viewport + end-to-end use-case';
  if (definition.spec === 'pipeline-demo.spec.ts') {
    return {
      'PIPE-H-001': 'Datagedreven vergelijking (pagina versus pilot/path-kwaliteitsstraat-data.json) + traceerbaarheid over drie projecties',
      'PIPE-H-002': 'Toestandsovergangtest (aangenomen → wacht op VS Code → simulatie → opgeleverd) + contractcontrole van het wachtrij-antwoord + negatieve controle dat GitHub niet meer wordt benaderd',
      'PIPE-N-002': 'Foutinjectie op de intake (leeg veld, onleesbare invoer, grensoverschrijding, verkeerde methode) + omgevingsafscherming met tegenproef',
      'PIPE-N-003': 'Regressiecontrole na hernoeming: oude URL blijft bereikbaar en verwijst door (meta-refresh) naar de nieuwe naam',
      'PIPE-H-003': 'Meting van berekende stijl (computed style) in licht en donker kleurschema',
      'PIPE-H-004': 'Equivalentieklassen op filters + toestandsovergang van het detailpaneel + sorteercontrole',
      'PIPE-H-006': 'Meting van berekende stijl in licht en donker + responsive viewport (intake #45)',
      'PIPE-H-007': 'Beslistabel op de keuzelijst (kiezen, zelf typen, loslaten) + toestandsovergang van de volgorde in Te doen (toetsenbord, herladen) + inhoudscontrole van versheidsregel en voettekst',
      'PIPE-H-008': 'Beslistabel op het criterium-voorstel (leeg/getal/status/generiek geeft elk een ander Then) + negatieve controle op een extern netwerkverzoek',
      'PIPE-H-017': 'Toestandsovergangtest over de vier fasen van de straat (elke stap moet op het scherm terechtkomen, en vrijgeven moet hem weer loslaten) + grenswaarden op de fase (0 en 4 horen erbij, -1 en 5 niet) + negatieve klasse op het schrijfrecht',
      'PIPE-N-005': 'Foutinjectie op de netwerklaag met grenswaardeanalyse op het aantal pogingen (twee mislukkingen nog goed, drie mislukkingen geeft de eerlijke terugvalmelding)',
      'PIPE-H-016': 'Beslistabel op de gemelde opslagbron (bestand, database, database ingesteld maar onbereikbaar) + structurele geheimhoudingscontrole op verboden sleutels in het antwoord + gelijkheidscontrole tussen lezen en schrijven',
      'PIPE-H-015': 'Equivalentieklassen op de werkwijze (Kanban, Scrum met einddatum, Scrum zonder einddatum) + negatieve invoercontrole op de server (onbekende werkwijze, kromme datum, anoniem) + herstelbaarheid na herladen',
      'PIPE-H-014': 'Beslistabel op het kaartmenu (welke actie hoort erin, welke bewust niet, en welke is uitgeschakeld in de huidige kolom) + controle op de server dat de actie echt uitgevoerd is',
      'PIPE-H-013': 'Toestandsovergangtest op het bord (kolom naar kolom) met controle op de server in plaats van op het scherm + herstelbaarheid na herladen zonder browseropslag + tweede lezer ziet dezelfde stand + equivalentieklassen op de lezer (anoniem ziet geen naam, ingelogd wel)',
      'PIPE-H-012': 'Navigatietest over de drie werkruimtes via het gedeelde nummer + herstelbaarheid (dezelfde link opent hetzelfde ticket opnieuw) + negatieve inhoudscontrole dat de eigen implementatie (GitHub) nergens meer doorschemert',
      'PIPE-H-011': 'Datagedreven vergelijking (versiegroepering op de pagina versus dezelfde groepering uit de feed) + equivalentieklassen op het releasefilter + navigatiecontrole van release naar bord',
      'PIPE-H-010': 'Contractcontrole op de issuepagina (vaste blokken, veld-naar-veldafbeelding naar Jira) + controle dat traceability-cijfers uit de echte case komen en de ERD-link echt bereikbaar is',
      'PIPE-H-009': 'Contractcontrole op het koppelingen-endpoint (vorm, statusregels per bron) + negatieve inhoudscontrole dat geen enkele instelling naar buiten lekt',
      'PIPE-N-004': 'Grenswaardenanalyse op viewportbreedte (net onder/boven de drempel, plus de standaard testbreedte als vaste regressie) + reproductie van "Bureaubladsite aanvragen"',
      'PIPE-H-005': 'Toestandsovergang over drie weergavestanden + meting van berekende stijl + persistentie na herladen',
      'PIPE-N-001': 'Grenswaardenanalyse (10 van 14 regels) + responsive viewport + negatieve integratiecontrole'
    }[testCase.id] || 'End-to-end use-case + regressiebewaking';
  }
  // Monkey-vondsten: de techniek die de vondst deed, plus die de vaste case gebruikt.
  if (definition.spec === 'klassiek-verkenning.spec.ts') {
    const perCase = {
      'KLV-N-001': 'Monkey testing (seeded) + concurrency + toestandsovergang',
      'KLV-N-002': 'Monkey testing (seeded) + grenswaardenanalyse + responsive viewport',
      'KLV-N-003': 'Monkey testing (seeded) + grenswaardenanalyse + responsive viewport',
      'KLV-N-004': 'Monkey testing (seeded) + concurrency + herstelbaarheid',
      'KLV-N-005': 'Monkey testing (seeded) + grenswaardenanalyse + toestandsovergang + responsive viewport',
      'KLV-N-006': 'Monkey testing (seeded) + grenswaardenanalyse + toestandsovergang + responsive viewport',
      'KLV-N-007': 'Monkey testing (seeded) + negatieve equivalentieklasse + error guessing',
      'KLV-N-008': 'Monkey testing (seeded) + grenswaardenanalyse + negatieve equivalentieklasse',
      'KLV-N-009': 'Beslissingstabel vormgeving en scherm + regressiebewaking',
      'KLV-H-010': 'Responsive viewport + toegankelijkheidsinspectie (44px, toetsenbord) + end-to-end use-case',
      'KLV-N-011': 'Monkey testing (seeded) + grenswaardenanalyse + responsive viewport',
      'KLV-N-012': 'Toestandsovergangtest (onaangeraakt → deels ingevuld) + beslistabel indienbaarheid + herladen (persistentie)',
      'KLV-H-013': 'Toestandsovergangtest (Opslaan = bewust 0) + beslistabel indienbaarheid',
      'KLV-H-014': 'Toestandsovergangtest (Standaardweek vullen) + consistentie tussen schermen (Mijn uren en Vandaag)',
      'KLV-H-015': 'Toestandsovergangtest (N open → Compleet) + grenswaarde (laatste open dag)',
      'KLV-H-016': 'Responsive viewport (390/1280) + toegankelijkheidsinspectie (44px tikvlak) + navigatietest',
      'NOT-H-011': 'Toestandsovergangtest (ongelezen → gelezen via openklappen of knopje) + navigatietest (springen naar eerste ongelezen)',
      'NOT-N-015': 'Negatieve toestandsovergang (bekijken of dichtklappen leest niet)',
      'NOT-H-013': 'Beslistabel (soort melding → bestemming) + navigatietest',
      'NOT-H-014': 'Equivalentieklassen (mededeling vs statusmelding) + API-contractcontrole',
      'NOT-H-016': 'Grenswaardenanalyse (30 berichten, 10 in de bel) + paginering (toestandsovergang per pagina)',
      'PIPE-H-001': 'Use-caseketen + traceerbaarheid over drie projecties',
      'PIPE-H-002': 'Toestandsovergangtest (vier fasen) + end-to-end use-case',
      'PIPE-N-001': 'Grenswaardenanalyse (Living Doc op tien) + responsive viewport + negatieve controle (geen externe koppeling)',
      'NOT-H-018': 'Grenswaardenanalyse (korte vs lange tekst, afkappen bij 90 tekens) + toestandsovergang (ingeklapt naar open)',
      'NOT-H-017': 'Equivalentieklassen (actueel/ongelezen/gelezen/ingetrokken) + optelregel tussen filters + contrastmeting in licht en donker',
      'ANN-N-007': 'Grenswaardenanalyse met niet-ASCII invoer (tekens versus bytes) + foutboodschapcontrole',
      'ADM-WR-N-008': 'Grenswaardenanalyse met niet-ASCII invoer (naam op de kolomgrens) + persistentiecontrole',
      'TS-REV-API-N-002': 'Toestandsovergangtest (verboden overgangen in de statustabel) + controle dat een geweigerde overgang niets verandert',
      'KLV-N-023': 'Grenswaardenanalyse (maandmaximum voor verlof en ziekte) + foutafhandeling zonder serverfout',
      'KLV-N-022': 'Responsive viewport (320/360/390) + grenswaarden smalle telefoon + lay-outmeting binnen de kaart',
      'KLV-H-021': 'Toestandsovergangtest (licht↔donker, Klassiek↔Modern, heen en terug) + toegankelijkheidsinspectie (geen misleidend aria-pressed)',
      'KLV-H-020':'Beslistabel (stap → knoptekst) + visuele consistentie met de huisstijlknop in licht en donker',
      'KLV-H-019':'Contrastmeting (WCAG 4,5:1) + themacombinaties (licht/donker) × responsive viewport (390/1280)',
      'KLV-H-018':'Omgevingsafhankelijke test (TEST/lokaal vs PROD-host) + ordening- en grenscontrole (nieuwste ≤ appversie) + inhoudscontrole (geen namen of gevoelige gegevens) + responsive viewport',
      'KLV-H-017':'Beslistabeltest (weekuren × vrije dag van Beheer) + equivalentieklassen (past in 9, in 8, past niet)',
    };
    return perCase[testCase.id] || 'Monkey testing (seeded) + negatieve equivalentieklasse + error guessing';
  }
  if (testCase.id === 'DASH-H-052') return 'Equivalentieklassen op de eigenaarfilter (Backoffice/medewerkers/alle) + regressie op stabiele maandtotalen';
  if (testCase.id === 'HELP-N-003') return 'Toestandsovergangtest (onbekend -> bekend -> onbekend -> onbekend) op de hulpbot-teller, met inhoudscontrole van het samengevoegde contactbericht';
  if (testCase.id === 'ADM-WR-H-001') return 'Equivalentieklassen over alle Instellingen-velden (identiteit, merkkleuren, betaaltermijn, vier herinneringssoorten) met van de huidige waarde afwijkende testwaarden, elk teruggecontroleerd op de server';
  if (['SAFE-H-012', 'SAFE-H-014', 'PWD-H-006'].includes(testCase.id)) return 'Beslissingstabel + equivalentieklassen + toestandsovergang';
  if (testCase.id === 'PWD-N-018') return 'Grenswaardenanalyse (vijfde poging mag, zesde niet) + contractcontrole van de Retry-After-koptekst';
  if (testCase.id === 'TS-API-N-014') return 'Equivalentieklasse op de vorm van de payload (dubbele datum) + consistentiecontrole tussen maandtotaal en dagregels';
  if (testCase.id === 'ANN-N-008') return 'Grenswaardenanalyse langs de kolomgrens (750 tekens, met accenten) + controle dat een geweigerde intrekking niets verandert';
  if (testCase.id === 'ANN-N-009') return 'Beslistabel (handeling x brontoestand) op wanneer een bericht als gelezen telt';
  if (testCase.id === 'ADM-WR-N-009') return 'Grenswaardenanalyse op het uurtarief (op de grens, erboven, typefout) + persistentiecontrole';
  if (testCase.id === 'CTS-API-H-018') return 'Equivalentieklassen op de schrijfwijze van een PDF-woordenboek (met en zonder spatie) + negatieve controle dat een nep-PDF geweigerd blijft';
  if (testCase.id === 'SEC-H-013') return 'Grenswaardenanalyse op de drempel (twee mag nog niet, drie wel) + idempotentiecontrole (geen tweede event binnen hetzelfde venster) + inhoudscontrole van het event_data-veld';
  if (testCase.id === 'SAFE-H-009') return 'Equivalentieklassen + toestandsovergang';
  if (testCase.id === 'SAFE-H-011') return 'Toestandsovergang + foutinjectie + beslissingstabel';
  if (/gelijktijd|optimistic|tweede lock|immutable/.test(text)) return 'Concurrency + toestandsovergang';
  if (/limiet|minimaal|hoog|driecijferig|vijfcijferig|ongeldige maand|te groot|te kort|nul/.test(text)) return 'Grenswaardenanalyse';
  if (/rol|admin|medewerker|anoniem|eigen|andere medewerker|403|401|toegang|scope/.test(text)) return 'Beslissingstabel rollen en autorisatie';
  if (/status|correctie|indien|goedkeur|sluit|heropen|deactiv|heractiv|reset|restore|lock|retry|mark_read|mark_all_read/.test(text)) return 'Toestandsovergang';
  if (/ongeldig|unknown|zonder|ontbre|niet-bestaande|weigert|fout|fail-closed|plaintext/.test(text) || testCase.id.includes('-N-')) return 'Negatieve equivalentieklasse + error guessing';
  if (/filter|bestandstype|jpg|pdf|attachment|weergave|periode/.test(text)) return 'Equivalentieklassen';
  if (/f5|herstel|ververst|wisselt|behoudt/.test(text)) return 'Herstelbaarheid + toestandsovergang';
  return definition.tags.includes('ui') ? 'End-to-end use-case + visuele contractasserties' : 'API-contract + equivalentieklasse';
}

function featureContent(definition, cases) {
  if (definition.kind === 'db') {
    return [
      ...definition.tags.map((tag) => `@${tag}`),
      `Feature: ${definition.name}`,
      '',
      `  # SQL-bron: ${definition.source}`,
      `  # Runner: ${definition.runner}`,
      '',
      '  @happy',
      `  Scenario: [${cases[0].id}] ${cases[0].title}`,
      '    # Testtechniek: CRUD-keten, toestandsovergang en data-integriteit',
      '    # Aantoonbare SQL-assertions in deze case: 3',
      '    Given de database CRUD smoke is voorbereid',
      '    When het SQL-script wordt uitgevoerd via de DB smoke runner',
      '    Then wordt het verwachte cleanup-result bevestigd',
      '',
    ].join('\n');
  }

  const scenarios = cases.map((testCase) => {
    const flowTag = testCase.id.includes('-N-') ? 'negative' : 'happy';
    const steps = scenarioSteps(definition, testCase);
    return [
      `  @${flowTag}`,
      `  Scenario: [${testCase.id}] ${testCase.title}`,
      `    # Testtechniek: ${testCase.technique}`,
      `    # Aantoonbare Playwright-assertions in deze case: ${testCase.assertionCount}`,
      ...steps.map(step => `    ${step}`),
    ].join('\n');
  }).join('\n\n');

  return [
    ...definition.tags.map((tag) => `@${tag}`),
    `Feature: ${definition.name}`,
    '',
    `  # Native Playwright-uitvoering: tests/playwright/${definition.spec}`,
    `  # Navigatiemapping: tests/playwright/steps/${definition.steps}`,
    '',
    scenarios,
    '',
  ].join('\n');
}

function stepsContent(definition, cases) {
  if (definition.kind === 'db') {
    return [
      `// Navigation-only mapping for ${definition.feature}.`,
      '// Database smoke remains executable through the SQL runner; no Cucumber runner is used.',
      '// Generated by npm run docs:sync; executable SQL remains the source of truth.',
      '',
      'export {};',
      '',
      'const navigate = (_text: string) => undefined;',
      'const Given = navigate;',
      'const When = navigate;',
      'const Then = navigate;',
      '',
      'Given("de database CRUD smoke is voorbereid");',
      'When("het SQL-script wordt uitgevoerd via de DB smoke runner");',
      'Then("wordt het verwachte cleanup-result bevestigd");',
      '',
    ].join('\n');
  }

  const navigationSteps = [...new Set(cases.flatMap((testCase) => scenarioSteps(definition, testCase)))];
  return [
    `// Navigation-only mapping for ${definition.feature}.`,
    '// Native Playwright remains the executable source of truth; no Cucumber runner is used.',
    `// Executable test: tests/playwright/${definition.spec}`,
    '// Generated by npm run docs:sync; executable Playwright remains the source of truth.',
    `/// <reference path="../${definition.spec}" />`,
    '',
    'export {};',
    '',
    'const navigate = (_text: string) => undefined;',
    'const Given = navigate;',
    'const When = navigate;',
    'const Then = navigate;',
    'const And = navigate;',
    'const But = navigate;',
    '',
    '// Eenvoudige F12-navigatie; de echte acties en assertions staan in het specbestand hierboven.',
    ...navigationSteps.map((gherkinStep) => {
      const match = gherkinStep.match(/^(Given|When|Then|And|But)\s+(.+)$/);
      if (!match) throw new Error(`Ongeldige Gherkin-stap voor ${definition.feature}: ${gherkinStep}`);
      return `${match[1]}(${JSON.stringify(match[2])});`;
    }),
    '',
  ].join('\n');
}

const inventory = definitions.flatMap((definition) => {
  const cases = extractCases(definition);
  return cases.map((testCase) => ({ ...testCase, ...definition, suite: suiteFor(definition, testCase), story: storyFor(definition, testCase), technique: techniqueFor(definition, testCase) }));
});

// Bewaakt de enige eigenschap die er echt toe doet (geen dubbele of gemiste
// case-ID's); een los hardcoded exact aantal hoorde hier eerder ook bij, maar
// moest dan bij elke nieuwe test handmatig worden opgehoogd — precies het
// soort onderhoudslus die we willen vermijden. Zie git-historie voor de oude vorm.
const uniqueIds = new Set(inventory.map((testCase) => testCase.id));
const playwrightCount = inventory.filter((testCase) => testCase.kind === 'playwright').length;
const dbCount = inventory.filter((testCase) => testCase.kind === 'db').length;
if (dbCount !== 1 || uniqueIds.size !== inventory.length) {
  const duplicates = inventory.map(testCase => testCase.id).filter((id, index, all) => all.indexOf(id) !== index);
  throw new Error(`Cases moeten uniek zijn en er moet precies 1 DB-case zijn (dbCount=${dbCount}). Dubbele ID's: ${duplicates.join(', ') || '(geen)'}.`);
}
const casesWithoutAssertions = inventory.filter((testCase) => Number(testCase.assertionCount) < 1);
if (casesWithoutAssertions.length) {
  throw new Error(`Iedere executable case moet minimaal één aantoonbare assertion hebben. Zonder assertion: ${casesWithoutAssertions.map(testCase => testCase.id).join(', ')}.`);
}

mkdirSync(featuresDir, { recursive: true });
mkdirSync(stepsDir, { recursive: true });

const expectedFeatures = new Set(definitions.map((definition) => definition.feature));
const expectedSteps = new Set(definitions.map((definition) => definition.steps));
for (const file of readdirSync(featuresDir).filter((file) => file.endsWith('.feature'))) {
  if (!expectedFeatures.has(file)) rmSync(path.join(featuresDir, file));
}
for (const file of readdirSync(stepsDir).filter((file) => file.endsWith('.steps.ts'))) {
  if (!expectedSteps.has(file)) rmSync(path.join(stepsDir, file));
}

// Schrijf alleen als de INHOUD verandert, en bewaar daarbij de regeleindes die
// het bestand al had.
//
// Waarom dit er is (13 sep 2026). Dit script schreef altijd met LF, terwijl de
// gegenereerde bestanden in de working tree als CRLF staan. Gevolg: de eerste
// docs:sync na een verse checkout maakte élk feature- en stepsbestand
// "gewijzigd" zonder ook maar één inhoudelijke wijziging -- tientallen bestanden
// ruis bij elke commit. Dat is niet alleen lelijk: de herontwerp-sessie kreeg
// er een stil mislukte `git merge` door (git weigert te mergen met ongecommitte
// wijzigingen) en pushte in de veronderstelling dat main was meegenomen, wat de
// merge-wachtrij op alle acht shards liet omvallen. Ruis die je leert negeren,
// verbergt op een dag iets echts.
function schrijfAlsGewijzigd(bestandspad, nieuweInhoud) {
  let bestaand = null;
  try {
    bestaand = readFileSync(bestandspad, 'utf8');
  } catch {
    bestaand = null;
  }

  // Vergelijk op inhoud, niet op regeleinde: anders blijft elke sync het
  // bestand herschrijven puur omdat de tekens verschillen.
  const genormaliseerd = (tekst) => tekst.replace(/\r\n/g, '\n');
  if (bestaand !== null && genormaliseerd(bestaand) === genormaliseerd(nieuweInhoud)) {
    return false;
  }

  // Nieuw bestand: LF, zoals dit script altijd al deed. Bestaand bestand: neem
  // over wat er stond, zodat een CRLF-tree CRLF blijft.
  const gebruiktCrlf = bestaand !== null && bestaand.includes('\r\n');
  writeFileSync(bestandspad, gebruiktCrlf ? nieuweInhoud.replace(/\r?\n/g, '\r\n') : nieuweInhoud);
  return true;
}

let gewijzigdeBestanden = 0;
for (const definition of definitions) {
  const cases = inventory.filter((testCase) => testCase.kind === definition.kind && testCase.feature === definition.feature);
  if (schrijfAlsGewijzigd(path.join(featuresDir, definition.feature), featureContent(definition, cases))) gewijzigdeBestanden += 1;
  if (schrijfAlsGewijzigd(path.join(stepsDir, definition.steps), stepsContent(definition, cases))) gewijzigdeBestanden += 1;
}

const mappingRows = inventory.map((testCase) => {
  const flow = testCase.id.includes('-N-') ? 'Negative' : 'Happy';
  const source = testCase.kind === 'db' ? `${testCase.source} + ${testCase.runner}` : testCase.spec;
  return `| ${testCase.id} | ${testCase.kind === 'db' ? 'db' : testCase.tags[1]} | ${testCase.feature} | ${testCase.title} | ${testCase.technique} | ${testCase.assertionCount} | ${testCase.steps} | ${source} | ${testCase.parentSuite} | ${testCase.allureFeature} | ${testCase.story} | ${flow} | ${testCase.phase} | Actueel |`;
}).join('\n');

const playwrightFeatureCount = definitions.filter((definition) => definition.kind === 'playwright').length;
const dbFeatureCount = definitions.filter((definition) => definition.kind === 'db').length;
const mobileCaseCount = inventory.filter((testCase) => testCase.kind === 'playwright' && testCase.tags.includes('mobile')).length;
const nonMobileExecutionCount = playwrightCount - mobileCaseCount;
const totalExecutionCount = nonMobileExecutionCount + (mobileCaseCount * 2);

const mapping = `# TEST BDD Mapping

## Architectuur

- Native Playwright specs zijn de uitvoerbare bron van waarheid.
- \`.feature\`-bestanden zijn Living Documentation.
- \`.steps.ts\`-bestanden zijn een eenvoudige F12-navigatie-index zonder Cucumber-runner.
- Case-ID, bron, assertionaantal en testtechniek blijven centraal bewaard in deze traceability matrix.
- Case-ID staat in de scenarionaam en is gelijk aan Playwright en Allure \`testCaseId\`.

## Compacte tagconventie

- Feature: \`@regressie\`, precies een hoofdtype (\`@ui\`, \`@api\`, \`@security\`, \`@db\` of \`@integration\`), optioneel \`@desktop\`/\`@mobile\`, en \`@fase:<nummer>\`.
- Scenario: precies een van \`@happy\` of \`@negative\`.
- Geen domein-, backend-, case-ID- of lange business-taglijsten.

## Volledige traceability matrix

| Case ID | Type | Feature file | Scenario | Testtechniek | Assertions | Steps mapping | Source | Allure parentSuite | Allure Feature | Allure Story | Flow | Fase | Status |
|---|---|---|---|---|---:|---|---|---|---|---|---|---:|---|
${mappingRows}

## Totalen

- Playwright executable cases: ${playwrightCount}
- SQL/DB executable cases: ${dbCount}
- Totaal unieke executable cases: ${inventory.length}
- Playwright features: ${playwrightFeatureCount}
- Database features: ${dbFeatureCount}
- Playwright steps mappings: ${playwrightFeatureCount}
- Database steps mappings: ${dbFeatureCount}
`;
if (schrijfAlsGewijzigd(path.join(root, 'TEST-BDD-MAPPING.md'), mapping)) gewijzigdeBestanden += 1;

const domainSections = definitions.map((definition) => {
  const cases = inventory.filter((testCase) => testCase.kind === definition.kind && testCase.feature === definition.feature);
  const sourceLabel = definition.kind === 'db'
    ? `${definition.source} + ${definition.runner}`
    : `tests/playwright/${definition.spec}`;
  return `### ${definition.name}\n\n- Feature: \`tests/playwright/features/${definition.feature}\`\n- Source: \`${sourceLabel}\`\n- Cases: ${cases.length}\n\n${cases.map((testCase) => `- [${testCase.id}] ${testCase.title} — Techniek: ${testCase.technique || 'CRUD-keten, toestandsovergang en data-integriteit'} · Assertions: ${testCase.assertionCount || 3}`).join('\n')}`;
}).join('\n\n');

const livingDoc = `# Living Doc - Path Uren & Facturatie

De native Playwright specs zijn de uitvoerbare waarheid. Deze Living Documentation maakt dezelfde ${playwrightCount} Playwright-cases leesbaar en voegt ${dbCount} directe DB/SQL-case(s) toe zonder een tweede testrunner te introduceren.

## Actuele regressiestatus

- Playwright executable cases: ${playwrightCount} unieke case-ID's
- SQL/DB executable cases: ${dbCount} unieke case-ID('s)
- Totaal executable cases: ${inventory.length} unieke case-ID's
- Playwright features: ${playwrightFeatureCount}
- Database features: ${dbFeatureCount}
- Playwright steps mappings: ${playwrightFeatureCount}
- Database steps mappings: ${dbFeatureCount}
- Uitvoeringen: ${totalExecutionCount}
- Niet-mobile projectuitvoeringen: ${nonMobileExecutionCount}
- Mobile functionele cases: ${mobileCaseCount}
- Pixel 7 / Chromium-uitvoeringen: ${mobileCaseCount}
- iPhone 13 / WebKit-uitvoeringen: ${mobileCaseCount}

De ${mobileCaseCount} Mobile-cases worden op twee devices uitgevoerd. Daarom leveren ${playwrightCount} Playwright-functionele cases in totaal ${totalExecutionCount} resultaten op: ${nonMobileExecutionCount} + (${mobileCaseCount} x 2) = ${totalExecutionCount}.

## Documentatieketen

1. \`.feature\`: businessleesbaar gedrag en compacte KRPI-tags.
2. \`.steps.ts\`: eenvoudige F12-navigatie naar de leesbare stapzin; geen dubbele testcode.
3. \`.spec.ts\`: uitvoerbare Playwright-test.
4. SQL/DB smoke: \`database/queries/crud-smoke.sql\` en \`scripts/run-db-crud-smoke.mjs\` voor directe infrastructuurvalidatie.
5. Allure: functionele Suites en Behaviors, met project/device als metadata.

## Dekking

${domainSections}

## Rapportage

- Suites: UI Desktop, UI Mobile, API, Security, DB / SQL en DB / Integratie.
- Epic: Path Uren & Facturatie.
- SubSuite: Happy of Negative.
- API request/response-attachments worden centraal geredigeerd.
- UI-screenshots zijn selectief; trace, video en failure-screenshot volgen de Playwright failure-policy.

## Bijwerken

1. Wijzig of voeg eerst de native Playwright-case met unieke ID toe.
2. Voeg voor directe SQL/DB-validatie een case toe via de database-definitie in de sync-script.
3. Draai \`node scripts/sync-living-docs.mjs\`.
4. Controleer de feature/steps/spec/Allure mapping.
5. Draai \`npm run test:e2e\`, \`npm run allure:generate\` en \`npm run check\`.
`;
if (schrijfAlsGewijzigd(path.join(root, 'LIVING-DOC.md'), livingDoc)) gewijzigdeBestanden += 1;

console.log(`Living Documentation gesynchroniseerd: ${playwrightCount} Playwright cases, ${dbCount} DB cases, ${inventory.length} total executable cases; ${gewijzigdeBestanden} bestand(en) herschreven.`);
