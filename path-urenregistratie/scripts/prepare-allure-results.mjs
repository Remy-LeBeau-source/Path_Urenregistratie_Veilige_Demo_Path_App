import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const outputFolder = 'allure-results';
const categories = [
  {
    name: 'Omgeving / browser ontbreekt',
    matchedStatuses: ['broken', 'failed'],
    messageRegex: '.*(Executable doesn.t exist|Could not connect to server|ECONNREFUSED).*',
  },
  {
    name: 'Testautomatisering / timeout',
    matchedStatuses: ['broken', 'failed'],
    messageRegex: '.*(Timeout|strict mode violation|locator).*',
  },
  {
    name: 'Security regressie',
    matchedStatuses: ['broken', 'failed'],
    traceRegex: '.*\\[(SEC|SAFE|PWD|ROLE)-.*',
  },
  {
    name: 'Product regressie',
    matchedStatuses: ['failed'],
  },
  {
    name: 'Onverwachte testfout',
    matchedStatuses: ['broken'],
  },
];

const preserveResults = process.env.PATH_ALLURE_PRESERVE_RESULTS === '1';
const packageMetadata = JSON.parse(readFileSync('package.json', 'utf8'));
const applicationVersion = String(packageMetadata.version || 'onbekend');
const reportStage = String(process.env.PATH_REPORT_STAGE || (process.env.CI ? 'CI release regression' : process.env.PLAYWRIGHT_STAGE || 'local'));
const reportTarget = String(process.env.PATH_REPORT_TARGET || (process.env.CI ? 'TEST -> PROD' : 'lokale testomgeving'));
if (!preserveResults) {
  rmSync(outputFolder, { recursive: true, force: true });
}
mkdirSync(outputFolder, { recursive: true });
writeFileSync(`${outputFolder}/categories.json`, JSON.stringify(categories, null, 2));
writeFileSync(`${outputFolder}/environment.properties`, [
  'application=Path Urenregistratie',
  `version=${applicationVersion}`,
  `stage=${reportStage}`,
  `target=${reportTarget}`,
  'reporting=Playwright + Allure',
].join('\n') + '\n');

console.log(`Allure results ${preserveResults ? 'behouden en ' : ''}voorbereid met functionele categories en environment metadata.`);
