import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const playwrightDir = path.join(root, 'tests', 'playwright');
const featuresDir = path.join(playwrightDir, 'features');

const remoteDir = path.join(root, 'tests', 'remote');
const featureFiles = readdirSync(featuresDir).filter((file) => file.endsWith('.feature')).sort();
const specFiles = readdirSync(playwrightDir).filter((file) => file.endsWith('.spec.ts')).sort();
// De live-TEST-regressie onder tests/remote/ hoort dezelfde ontwerpdiscipline te
// volgen: elke uitvoerbare case heeft een feature-scenario met techniek,
// Given/When/Then en een assertion-telling.
let remoteSpecFiles = [];
try {
  remoteSpecFiles = readdirSync(remoteDir).filter((file) => file.endsWith('.spec.ts')).sort();
} catch {
  remoteSpecFiles = [];
}
const featureCases = [];
const failures = [];

for (const file of featureFiles) {
  const source = readFileSync(path.join(featuresDir, file), 'utf8');
  // Naast @happy/@negative mag een scenario uitvoeringstags dragen (@gui, @desktop,
  // @mobile). Die bepalen in welke projecten de case draait, niet of hij geldig is.
  const scenarioPattern = new RegExp(String.raw`(^[ \t]*@(happy|negative)(?:[ \t]+@[\w-]+)*[ \t]*$\r?\n\s*Scenario:\s*\[([^\]]+)]([^\r\n]*)\r?\n)([\s\S]*?)(?=^[ \t]*@(happy|negative)(?:[ \t]+@[\w-]+)*[ \t]*$|(?![\s\S]))`, 'gm');
  const matches = [...source.matchAll(scenarioPattern)];
  if (!matches.length) failures.push(`${file}: geen scenario's gevonden.`);

  for (const match of matches) {
    const flow = match[2];
    const id = match[3].trim();
    const title = match[4].trim();
    const body = match[5];
    const technique = body.match(/^\s*# Testtechniek:\s*(.+)$/m)?.[1]?.trim() || '';
    const assertions = Number(body.match(/^\s*# Aantoonbare (?:Playwright|SQL)-assertions in deze case:\s*(\d+)$/m)?.[1] || 0);
    const hasGiven = /^\s*Given\s+/m.test(body);
    const hasWhen = /^\s*When\s+/m.test(body);
    const hasThen = /^\s*Then\s+/m.test(body);

    if (!technique) failures.push(`${id}: testtechniek ontbreekt.`);
    if (assertions < 1) failures.push(`${id}: aantoonbare assertion ontbreekt.`);
    if (!hasGiven || !hasWhen || !hasThen) failures.push(`${id}: Given/When/Then-keten is onvolledig.`);
    if (id.includes('-N-') !== (flow === 'negative')) failures.push(`${id}: happy/negative-tag past niet bij case-ID.`);
    featureCases.push({ file, id, title, flow, technique, assertions });
  }
}

const specIds = [];
for (const file of specFiles) {
  const source = readFileSync(path.join(playwrightDir, file), 'utf8');
  for (const match of source.matchAll(/test\(\s*(['"])\[([^\]]+)]/g)) specIds.push(match[2].trim());
}
for (const file of remoteSpecFiles) {
  const source = readFileSync(path.join(remoteDir, file), 'utf8');
  for (const match of source.matchAll(/test\(\s*(['"])\[([^\]]+)]/g)) specIds.push(match[2].trim());
}
specIds.push('DB-H-001');

const duplicates = featureCases
  .map((testCase) => testCase.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicates.length) failures.push(`Dubbele feature case-ID's: ${[...new Set(duplicates)].join(', ')}.`);

const featureIds = new Set(featureCases.map((testCase) => testCase.id));
const executableIds = new Set(specIds);
const missingFeature = [...executableIds].filter((id) => !featureIds.has(id));
const missingExecutable = [...featureIds].filter((id) => !executableIds.has(id));
if (missingFeature.length) failures.push(`Executable cases zonder feature: ${missingFeature.join(', ')}.`);
if (missingExecutable.length) failures.push(`Featurecases zonder executable test: ${missingExecutable.join(', ')}.`);

const requiredTechniqueCoverage = [
  ['toestandsovergang', /toestandsovergang/i],
  ['rollen/decision table', /beslissingstabel rollen en autorisatie/i],
  ['grenswaarden', /grenswaardenanalyse/i],
  ['equivalentieklassen', /equivalentieklasse/i],
  ['negatieve/error guessing', /negatieve equivalentieklasse.*error guessing/i],
  ['concurrency', /concurrency/i],
  ['end-to-end GUI', /end-to-end use-case/i],
  ['toegankelijkheid', /toegankelijkheidsinspectie/i],
  ['responsive/mobile', /responsive viewport/i],
  ['data-integriteit', /data-integriteit/i],
];
for (const [label, pattern] of requiredTechniqueCoverage) {
  if (!featureCases.some((testCase) => pattern.test(testCase.technique))) {
    failures.push(`ISTQB/TMap-dekking ontbreekt voor ${label}.`);
  }
}

const techniqueCounts = new Map();
for (const testCase of featureCases) {
  techniqueCounts.set(testCase.technique, (techniqueCounts.get(testCase.technique) || 0) + 1);
}

if (failures.length) {
  throw new Error(`Test-design-audit mislukt:\n- ${failures.join('\n- ')}`);
}

console.log(JSON.stringify({
  ok: true,
  feature_files: featureFiles.length,
  executable_cases: executableIds.size,
  mapped_feature_cases: featureCases.length,
  happy_cases: featureCases.filter((testCase) => testCase.flow === 'happy').length,
  negative_cases: featureCases.filter((testCase) => testCase.flow === 'negative').length,
  techniques: Object.fromEntries([...techniqueCounts.entries()].sort((left, right) => right[1] - left[1])),
}, null, 2));
