import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

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
  try {
    rmSync(outputFolder, { recursive: true, force: true });
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error?.code)) {
      throw error;
    }
    const staleFolder = `${outputFolder}.stale-${Date.now()}`;
    try {
      renameSync(outputFolder, staleFolder);
      console.warn(`Kon ${outputFolder} niet direct verwijderen (${error.code}); hernoemd naar ${staleFolder}.`);
    } catch (renameError) {
      if (!['EPERM', 'EBUSY'].includes(renameError?.code)) {
        throw renameError;
      }
      console.warn(`Kon ${outputFolder} niet verwijderen of hernoemen (${renameError.code}); hergebruik de bestaande lokale map.`);
    }
  }
}
mkdirSync(outputFolder, { recursive: true });
try {
  writeFileSync(`${outputFolder}/categories.json`, JSON.stringify(categories, null, 2));
  writeFileSync(`${outputFolder}/environment.properties`, [
    'application=Path Urenregistratie',
    `version=${applicationVersion}`,
    `stage=${reportStage}`,
    `target=${reportTarget}`,
    'reporting=Playwright + Allure',
  ].join('\n') + '\n');
} catch (error) {
  if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error?.code)) {
    throw error;
  }
  console.warn(`Kon Allure metadata lokaal niet overschrijven (${error.code}); testuitvoering gaat door met bestaande metadata.`);
}

console.log(`Allure results ${preserveResults ? 'behouden en ' : ''}voorbereid met functionele categories en environment metadata.`);
