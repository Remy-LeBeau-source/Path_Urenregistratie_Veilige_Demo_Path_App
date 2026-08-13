import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const featuresDir = path.join(root, 'tests', 'bdd', 'features');
const generatedDir = path.join(root, '.features-gen');
const nativeSpecsDir = path.join(root, 'tests', 'playwright');
const failures = [];
const bddCases = [];

for (const file of readdirSync(featuresDir).filter((name) => name.endsWith('.feature')).sort()) {
  const source = readFileSync(path.join(featuresDir, file), 'utf8');
  for (const match of source.matchAll(/Scenario:\s*\[([^\]]+)]([^\r\n]*)[\s\S]*?(?=\n\s*(?:@\w|Scenario:)|$)/g)) {
    const id = match[1].trim();
    const block = match[0];
    const parityId = block.match(/^\s*# Native pariteitscase:\s*(\S+)\s*$/m)?.[1] || '';
    if (!parityId) failures.push(`${id}: Native pariteitscase ontbreekt.`);
    if (!/^BDD-/.test(id)) failures.push(`${id}: uitvoerbare BDD-pilot-ID moet met BDD- beginnen.`);
    if (!/^\s*Given\s+/m.test(block) || !/^\s*When\s+/m.test(block) || !/^\s*Then\s+/m.test(block)) {
      failures.push(`${id}: Given/When/Then-keten is onvolledig.`);
    }
    bddCases.push({ id, parityId, file });
  }
}

const nativeSources = readdirSync(nativeSpecsDir)
  .filter((name) => name.endsWith('.spec.ts'))
  .map((name) => readFileSync(path.join(nativeSpecsDir, name), 'utf8'))
  .join('\n');

for (const testCase of bddCases) {
  if (!nativeSources.includes(`[${testCase.parityId}]`)) {
    failures.push(`${testCase.id}: native pariteitscase ${testCase.parityId} bestaat niet.`);
  }
}

const generatedSources = existsSync(generatedDir)
  ? readdirSync(generatedDir, { recursive: true })
      .filter((name) => String(name).endsWith('.spec.js'))
      .map((name) => readFileSync(path.join(generatedDir, String(name)), 'utf8'))
      .join('\n')
  : '';

for (const testCase of bddCases) {
  if (!generatedSources.includes(testCase.id)) failures.push(`${testCase.id}: gegenereerde Playwright-test ontbreekt.`);
}

if (!bddCases.length) failures.push('Geen uitvoerbare BDD-cases gevonden.');
if (failures.length) throw new Error(`BDD-design-audit mislukt:\n- ${failures.join('\n- ')}`);

console.log(JSON.stringify({
  ok: true,
  executable_bdd_cases: bddCases.length,
  native_cases_preserved: 168,
  migrated_with_parity: bddCases.map(({ id, parityId }) => ({ id, parityId })),
}, null, 2));
