import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const playwrightDir = path.join(root, 'tests', 'playwright');
const featuresDir = path.join(playwrightDir, 'features');
const stepsDir = path.join(playwrightDir, 'steps');

const definitions = [
  { spec: 'audit-log.spec.ts', feature: 'audit-log.feature', steps: 'audit-log.steps.ts', name: 'Auditlog en traceerbaarheid', tags: ['regressie', 'api', 'fase:16'], parentSuite: 'API', suite: 'Audit Log', allureFeature: 'Audit & Security', phase: 16 },
  { spec: 'auth.spec.ts', feature: 'auth.feature', steps: 'auth.steps.ts', name: 'Authenticatie en sessiebeheer', tags: ['regressie', 'ui', 'desktop', 'fase:4'], parentSuite: 'UI Desktop', suite: 'Login', allureFeature: 'Authenticatie', phase: 4 },
  { spec: 'customer-timesheet-api.spec.ts', feature: 'customer-timesheets.feature', steps: 'customer-timesheets.steps.ts', name: 'Klanturenstaten via API', tags: ['regressie', 'api', 'fase:10'], parentSuite: 'API', suite: 'Customer Timesheets', allureFeature: 'Klanturenstaten', phase: 10 },
  { spec: 'dashboard.spec.ts', feature: 'dashboard.feature', steps: 'dashboard.steps.ts', name: 'Dashboardweergave', tags: ['regressie', 'ui', 'desktop', 'fase:15'], parentSuite: 'UI Desktop', suite: 'Dashboard', allureFeature: 'Dashboard', phase: 15 },
  { spec: 'email-queue.spec.ts', feature: 'email-queue.feature', steps: 'email-queue.steps.ts', name: 'E-mailqueue en afleverbeleid', tags: ['regressie', 'api', 'fase:12'], parentSuite: 'API', suite: 'Email Queue', allureFeature: 'E-mailverwerking', phase: 12 },
  { spec: 'invoice-lock.spec.ts', feature: 'invoice-locking.feature', steps: 'invoice-locking.steps.ts', name: 'Definitieve facturen en locking', tags: ['regressie', 'integration', 'fase:11'], parentSuite: 'DB / Integratie', suite: 'Invoice Locking', allureFeature: 'Facturatie', phase: 11 },
  { spec: 'invoices.spec.ts', feature: 'invoices-ui.feature', steps: 'invoices-ui.steps.ts', name: 'Factuurweergave in de desktop-UI', tags: ['regressie', 'ui', 'desktop', 'fase:11'], parentSuite: 'UI Desktop', suite: 'Facturen', allureFeature: 'Facturatie', phase: 11 },
  { spec: 'mobile-ui.spec.ts', feature: 'mobile.feature', steps: 'mobile.steps.ts', name: 'Mobiele gebruikerservaring', tags: ['regressie', 'ui', 'mobile', 'fase:15'], parentSuite: 'UI Mobile', suite: 'Mobile Experience', allureFeature: 'Mobile Experience', phase: 15 },
  { spec: 'notifications.spec.ts', feature: 'notifications.feature', steps: 'notifications.steps.ts', name: 'Notificaties via API', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Notifications', allureFeature: 'Notificaties', phase: 15 },
  { spec: 'password-reset.spec.ts', feature: 'password-reset.feature', steps: 'password-reset.steps.ts', name: 'Wachtwoordherstel en rate limiting', tags: ['regressie', 'security', 'fase:13'], parentSuite: 'Security', suite: 'Password Reset / Rate Limiting', allureFeature: 'Audit & Security', phase: 13 },
  { spec: 'period-management.spec.ts', feature: 'period-management.feature', steps: 'period-management.steps.ts', name: 'Periodebeheer via API', tags: ['regressie', 'api', 'fase:15'], parentSuite: 'API', suite: 'Period Management', allureFeature: 'Periodebeheer', phase: 15 },
  { spec: 'production-safety.spec.ts', feature: 'production-safety.feature', steps: 'production-safety.steps.ts', name: 'Productieveiligheid', tags: ['regressie', 'security', 'fase:14'], parentSuite: 'Security', suite: 'Production Safety', allureFeature: 'Audit & Security', phase: 14 },
  { spec: 'roles-api.spec.ts', feature: 'roles-api.feature', steps: 'roles-api.steps.ts', name: 'Rollen en gegevensscope', tags: ['regressie', 'security', 'fase:4'], parentSuite: 'Security', suite: 'Role Scope', allureFeature: 'Audit & Security', phase: 4 },
  { spec: 'security.spec.ts', feature: 'security.feature', steps: 'security.steps.ts', name: 'CSRF en authenticatiebeveiliging', tags: ['regressie', 'security', 'fase:5'], parentSuite: 'Security', suite: 'CSRF & Authentication', allureFeature: 'Audit & Security', phase: 5 },
  { spec: 'timesheet-review-flow.spec.ts', feature: 'timesheets-review-integration.feature', steps: 'timesheets-review-integration.steps.ts', name: 'Correctie en goedkeuring met optimistic locking', tags: ['regressie', 'integration', 'fase:9'], parentSuite: 'DB / Integratie', suite: 'Optimistic Locking', allureFeature: 'Correctie & Goedkeuring', phase: 9 },
  { spec: 'timesheet-review-ui.spec.ts', feature: 'timesheets-review-ui.feature', steps: 'timesheets-review-ui.steps.ts', name: 'Correctie en goedkeuring in de desktop-UI', tags: ['regressie', 'ui', 'desktop', 'fase:9'], parentSuite: 'UI Desktop', suite: 'Correcties', allureFeature: 'Correctie & Goedkeuring', phase: 9 },
  { spec: 'timesheet-write.spec.ts', feature: 'timesheets-api.feature', steps: 'timesheets-api.steps.ts', name: 'Urenregistratie via API', tags: ['regressie', 'api', 'fase:8'], parentSuite: 'API', suite: 'Timesheets', allureFeature: 'Urenregistratie', phase: 8 },
  { spec: 'user-management.spec.ts', feature: 'user-management.feature', steps: 'user-management.steps.ts', name: 'Gebruikersbeheer via API', tags: ['regressie', 'api', 'fase:13'], parentSuite: 'API', suite: 'User Management', allureFeature: 'Gebruikersbeheer', phase: 13 },
];

function extractCases(spec) {
  const source = readFileSync(path.join(playwrightDir, spec), 'utf8');
  const cases = [];
  const pattern = /test\(\s*(['"])\[([^\]]+)\]\s*([^'"\r\n]+)\1\s*,/g;
  for (const match of source.matchAll(pattern)) {
    cases.push({ id: match[2], title: match[3].trim() });
  }
  if (cases.length === 0) throw new Error(`Geen cases gevonden in ${spec}.`);
  return cases;
}

function storyFor(definition, testCase) {
  if (testCase.id === 'MOB-H-001') return 'Veilige toegang en sessies';
  if (testCase.id === 'MOB-H-002') return 'Uren registreren en indienen';
  if (testCase.id === 'MOB-H-003') return 'Correctie en goedkeuring';
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

function featureContent(definition, cases) {
  const scenarios = cases.map((testCase) => {
    const flowTag = testCase.id.includes('-N-') ? 'negative' : 'happy';
    return [
      `  @${flowTag}`,
      `  Scenario: [${testCase.id}] ${testCase.title}`,
      '    Given de uitvoerbare Playwright-case is voorbereid',
      '    When de beschreven businessflow wordt uitgevoerd',
      '    Then wordt het verwachte resultaat aantoonbaar gevalideerd',
    ].join('\n');
  }).join('\n\n');

  return [
    ...definition.tags.map((tag) => `@${tag}`),
    `Feature: ${definition.name} in Path Uren & Facturatie`,
    '',
    `  # Native Playwright-uitvoering: tests/playwright/${definition.spec}`,
    `  # Navigatiemapping: tests/playwright/steps/${definition.steps}`,
    '',
    scenarios,
    '',
  ].join('\n');
}

function stepsContent(definition, cases) {
  const mappings = cases.map((testCase) => `  { caseId: '${testCase.id}', spec: '${definition.spec}' },`).join('\n');
  return [
    `// Navigation-only mapping for ${definition.feature}.`,
    '// Native Playwright remains the executable source of truth; no Cucumber runner is used.',
    '',
    'type StepPattern = string | RegExp;',
    'type StepHandler = (...args: unknown[]) => unknown;',
    '',
    'const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;',
    'const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;',
    'const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;',
    '',
    "Given('de uitvoerbare Playwright-case is voorbereid', () => undefined);",
    "When('de beschreven businessflow wordt uitgevoerd', () => undefined);",
    "Then('wordt het verwachte resultaat aantoonbaar gevalideerd', () => undefined);",
    '',
    'export const caseMappings = [',
    mappings,
    '] as const;',
    '',
  ].join('\n');
}

const inventory = definitions.flatMap((definition) => {
  const cases = extractCases(definition.spec);
  return cases.map((testCase) => ({ ...testCase, ...definition, suite: suiteFor(definition, testCase), story: storyFor(definition, testCase) }));
});

const uniqueIds = new Set(inventory.map((testCase) => testCase.id));
if (inventory.length !== 96 || uniqueIds.size !== 96) {
  throw new Error(`Verwacht 96 unieke cases, gevonden ${inventory.length}/${uniqueIds.size}.`);
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
  const cases = inventory.filter((testCase) => testCase.spec === definition.spec);
  writeFileSync(path.join(featuresDir, definition.feature), featureContent(definition, cases));
  writeFileSync(path.join(stepsDir, definition.steps), stepsContent(definition, cases));
}

const mappingRows = inventory.map((testCase) => {
  const flow = testCase.id.includes('-N-') ? 'Negative' : 'Happy';
  return `| ${testCase.id} | ${testCase.tags[1]} | ${testCase.feature} | ${testCase.title} | ${testCase.steps} | ${testCase.spec} | ${testCase.parentSuite} | ${testCase.allureFeature} | ${testCase.story} | ${flow} | ${testCase.phase} | Actueel |`;
}).join('\n');

const mapping = `# TEST BDD Mapping

## Architectuur

- Native Playwright specs zijn de uitvoerbare bron van waarheid.
- \`.feature\`-bestanden zijn Living Documentation.
- \`.steps.ts\`-bestanden zijn navigatie- en case-ID-mapping zonder Cucumber-runner.
- Case-ID staat in de scenarionaam en is gelijk aan Playwright en Allure \`testCaseId\`.

## Compacte tagconventie

- Feature: \`@regressie\`, precies een hoofdtype (\`@ui\`, \`@api\`, \`@security\`, \`@db\` of \`@integration\`), optioneel \`@desktop\`/\`@mobile\`, en \`@fase:<nummer>\`.
- Scenario: precies een van \`@happy\` of \`@negative\`.
- Geen domein-, backend-, case-ID- of lange business-taglijsten.

## Volledige traceability matrix

| Case ID | Type | Feature file | Scenario | Steps mapping | Playwright spec | Allure parentSuite | Allure Feature | Allure Story | Flow | Fase | Status |
|---|---|---|---|---|---|---|---|---|---|---:|---|
${mappingRows}

## Totalen

- Functionele cases: 96
- Playwright-uitvoeringen: 100
- Niet-mobile uitvoeringen: 92
- Mobile functionele cases: 4
- Pixel 7 / Chromium: 4 uitvoeringen
- iPhone 13 / WebKit: 4 uitvoeringen
`;
writeFileSync(path.join(root, 'TEST-BDD-MAPPING.md'), mapping);

const domainSections = definitions.map((definition) => {
  const cases = inventory.filter((testCase) => testCase.spec === definition.spec);
  return `### ${definition.name}\n\n- Feature: \`tests/playwright/features/${definition.feature}\`\n- Spec: \`tests/playwright/${definition.spec}\`\n- Cases: ${cases.length}\n\n${cases.map((testCase) => `- [${testCase.id}] ${testCase.title}`).join('\n')}`;
}).join('\n\n');

const livingDoc = `# Living Doc - Path Uren & Facturatie

De native Playwright specs zijn de uitvoerbare waarheid. Deze Living Documentation maakt dezelfde 96 functionele cases leesbaar zonder een tweede testrunner toe te voegen.

## Actuele regressiestatus

- Functionele cases: 96 unieke case-ID's
- Uitvoeringen: 100
- Niet-mobile projectuitvoeringen: 92
- Mobile functionele cases: 4
- Pixel 7 / Chromium-uitvoeringen: 4
- iPhone 13 / WebKit-uitvoeringen: 4

De vier Mobile-cases worden op twee devices uitgevoerd. Daarom leveren 96 functionele cases in totaal 100 resultaten op: 92 + (4 x 2) = 100.

## Documentatieketen

1. \`.feature\`: businessleesbaar gedrag en compacte KRPI-tags.
2. \`.steps.ts\`: expliciete case-ID naar spec-mapping; geen uitvoerbare Cucumber-code.
3. \`.spec.ts\`: uitvoerbare Playwright-test.
4. Allure: functionele Suites en Behaviors, met project/device als metadata.

## Dekking

${domainSections}

## Rapportage

- Suites: UI Desktop, UI Mobile, API, Security en DB / Integratie.
- Epic: Path Uren & Facturatie.
- SubSuite: Happy of Negative.
- API request/response-attachments worden centraal geredigeerd.
- UI-screenshots zijn selectief; trace, video en failure-screenshot volgen de Playwright failure-policy.

## Bijwerken

1. Wijzig of voeg eerst de native Playwright-case met unieke ID toe.
2. Draai \`node scripts/sync-living-docs.mjs\`.
3. Controleer de feature/steps/spec/Allure mapping.
4. Draai \`npm run test:e2e\`, \`npm run allure:generate\` en \`npm run check\`.
`;
writeFileSync(path.join(root, 'LIVING-DOC.md'), livingDoc);

console.log(`Living Documentation gesynchroniseerd: ${definitions.length} features, ${definitions.length} steps mappings, ${inventory.length} cases.`);