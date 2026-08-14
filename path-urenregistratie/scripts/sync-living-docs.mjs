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
  { kind: 'playwright', spec: 'auth.spec.ts', feature: 'auth.feature', steps: 'auth.steps.ts', name: 'Inloggen, uitloggen en sessiebeheer', tags: ['regressie', 'ui', 'desktop', 'fase:4'], parentSuite: 'UI Desktop', suite: 'Login', allureFeature: 'Authenticatie', phase: 4 },
  { kind: 'playwright', spec: 'customer-timesheet-api.spec.ts', feature: 'customer-timesheets.feature', steps: 'customer-timesheets.steps.ts', name: 'Klanturenstaten en documentverwerking', tags: ['regressie', 'api', 'fase:10'], parentSuite: 'API', suite: 'Customer Timesheets', allureFeature: 'Klanturenstaten', phase: 10 },
  { kind: 'playwright', spec: 'dashboard.spec.ts', feature: 'dashboard.feature', steps: 'dashboard.steps.ts', name: 'Dashboard en open werkvoorraad', tags: ['regressie', 'ui', 'desktop', 'fase:15'], parentSuite: 'UI Desktop', suite: 'Dashboard', allureFeature: 'Dashboard', phase: 15 },
  { kind: 'playwright', spec: 'email-queue.spec.ts', feature: 'mail-delivery.feature', steps: 'email-queue.steps.ts', name: 'Mailroutering en aflevering', tags: ['regressie', 'api', 'fase:12'], parentSuite: 'API', suite: 'Email Queue', allureFeature: 'E-mailverwerking', phase: 12 },
  { kind: 'playwright', spec: 'invoice-lock.spec.ts', feature: 'invoice-locking.feature', steps: 'invoice-locking.steps.ts', name: 'Facturen definitief maken en vergrendelen', tags: ['regressie', 'integration', 'fase:11'], parentSuite: 'DB / Integratie', suite: 'Invoice Locking', allureFeature: 'Facturatie', phase: 11 },
  { kind: 'playwright', spec: 'invoice-company-identity.spec.ts', feature: 'invoice-company-identity.feature', steps: 'invoice-company-identity.steps.ts', name: 'Facturerende onderneming en handelsnaam', tags: ['regressie', 'integration', 'fase:11'], parentSuite: 'DB / Integratie', suite: 'Invoice Identity', allureFeature: 'Facturatie', phase: 11 },
  { kind: 'playwright', spec: 'invoices.spec.ts', feature: 'invoices.feature', steps: 'invoices-ui.steps.ts', name: 'Facturen bekijken en beheren', tags: ['regressie', 'ui', 'desktop', 'fase:11'], parentSuite: 'UI Desktop', suite: 'Facturen', allureFeature: 'Facturatie', phase: 11 },
  { kind: 'playwright', spec: 'mobile-ui.spec.ts', feature: 'mobile.feature', steps: 'mobile.steps.ts', name: 'Mobiele gebruikerservaring', tags: ['regressie', 'ui', 'mobile', 'fase:15'], parentSuite: 'UI Mobile', suite: 'Mobile Experience', allureFeature: 'Mobile Experience', phase: 15 },
  { kind: 'playwright', spec: 'notifications.spec.ts', feature: 'notifications.feature', steps: 'notifications.steps.ts', name: 'Meldingen beheren', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Notifications', allureFeature: 'Notificaties', phase: 15 },
  { kind: 'playwright', spec: 'password-reset.spec.ts', feature: 'password-reset.feature', steps: 'password-reset.steps.ts', name: 'Wachtwoordherstel en misbruikbeveiliging', tags: ['regressie', 'security', 'fase:13'], parentSuite: 'Security', suite: 'Password Reset / Rate Limiting', allureFeature: 'Audit & Security', phase: 13 },
  { kind: 'playwright', spec: 'period-management.spec.ts', feature: 'period-management.feature', steps: 'period-management.steps.ts', name: 'Maandperiodes beheren', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Period Management', allureFeature: 'Periodebeheer', phase: 15 },
  { kind: 'playwright', spec: 'production-safety.spec.ts', feature: 'production-safety.feature', steps: 'production-safety.steps.ts', name: 'Veilige productieconfiguratie en deployment', tags: ['regressie', 'security', 'fase:14'], parentSuite: 'Security', suite: 'Production Safety', allureFeature: 'Audit & Security', phase: 14 },
  { kind: 'playwright', spec: 'roles-api.spec.ts', feature: 'roles-authorization.feature', steps: 'roles-api.steps.ts', name: 'Rollen, rechten en gegevensafscherming', tags: ['regressie', 'security', 'fase:4'], parentSuite: 'Security', suite: 'Role Scope', allureFeature: 'Audit & Security', phase: 4 },
  { kind: 'playwright', spec: 'security.spec.ts', feature: 'security.feature', steps: 'security.steps.ts', name: 'Authenticatie- en API-beveiliging', tags: ['regressie', 'security', 'fase:5'], parentSuite: 'Security', suite: 'CSRF & Authentication', allureFeature: 'Audit & Security', phase: 5 },
  { kind: 'playwright', spec: 'timesheet-review-flow.spec.ts', feature: 'correction-approval-workflow.feature', steps: 'timesheets-review-integration.steps.ts', name: 'Correctie- en goedkeuringsproces', tags: ['regressie', 'integration', 'fase:9'], parentSuite: 'DB / Integratie', suite: 'Optimistic Locking', allureFeature: 'Correctie & Goedkeuring', phase: 9 },
  { kind: 'playwright', spec: 'timesheet-review-ui.spec.ts', feature: 'correction-approval-ui.feature', steps: 'timesheets-review-ui.steps.ts', name: 'Correcties en goedkeuringen behandelen', tags: ['regressie', 'ui', 'desktop', 'fase:9'], parentSuite: 'UI Desktop', suite: 'Correcties', allureFeature: 'Correctie & Goedkeuring', phase: 9 },
  { kind: 'playwright', spec: 'timesheet-write.spec.ts', feature: 'time-registration.feature', steps: 'timesheets-api.steps.ts', name: 'Urenregistratie verwerken', tags: ['regressie', 'api', 'fase:8'], parentSuite: 'API', suite: 'Timesheets', allureFeature: 'Urenregistratie', phase: 8 },
  { kind: 'playwright', spec: 'user-management.spec.ts', feature: 'team-access.feature', steps: 'user-management.steps.ts', name: 'Team en toegang beheren', tags: ['regressie', 'api', 'fase:13'], parentSuite: 'API', suite: 'User Management', allureFeature: 'Gebruikersbeheer', phase: 13 },
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

  const source = readFileSync(path.join(playwrightDir, definition.spec), 'utf8');
  const pattern = /test\(\s*(['"])\[([^\]]+)\]\s*([^'"\r\n]+)\1\s*,/g;
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
  if (definition.spec === 'accessibility.spec.ts') return 'Toegankelijkheidsinspectie + toetsenbord-use-case';
  if (definition.spec === 'mobile-ui.spec.ts') return 'Responsive viewport + end-to-end use-case';
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

const uniqueIds = new Set(inventory.map((testCase) => testCase.id));
const playwrightCount = inventory.filter((testCase) => testCase.kind === 'playwright').length;
const dbCount = inventory.filter((testCase) => testCase.kind === 'db').length;
if (playwrightCount !== 188 || dbCount !== 1 || inventory.length !== 189 || uniqueIds.size !== 189) {
  throw new Error(`Verwacht 188 Playwright-cases + 1 DB-case = 189 unieke cases, gevonden ${playwrightCount}/${dbCount}/${inventory.length}/${uniqueIds.size}.`);
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

for (const definition of definitions) {
  const cases = inventory.filter((testCase) => testCase.kind === definition.kind && testCase.feature === definition.feature);
  writeFileSync(path.join(featuresDir, definition.feature), featureContent(definition, cases));
  writeFileSync(path.join(stepsDir, definition.steps), stepsContent(definition, cases));
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
writeFileSync(path.join(root, 'TEST-BDD-MAPPING.md'), mapping);

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
writeFileSync(path.join(root, 'LIVING-DOC.md'), livingDoc);

console.log(`Living Documentation gesynchroniseerd: ${playwrightCount} Playwright cases, ${dbCount} DB cases, ${inventory.length} total executable cases.`);
