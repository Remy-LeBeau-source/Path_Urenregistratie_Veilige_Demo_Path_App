import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const fixture = mkdtempSync(join(tmpdir(), "path-version-check-"));
// Deze lijst moet gelijk lopen met BESTANDEN in set-version.mjs: het script
// leest elk bestand uit die lijst, dus een bestand dat daar wel staat en hier
// niet laat de controle vallen op een ontbrekend bestand in plaats van op het
// gedrag dat hij hoort te toetsen.
const files = ["package.json", "package-lock.json", "index.html", "scripts/smoke-test.mjs", "tests/playwright/auth.spec.ts", "pilot/path-kwaliteitsstraat.html"];
const write = (file, value) => {
  const target = join(fixture, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
};
const run = version => spawnSync(process.execPath, [join(fixture, "scripts/set-version.mjs"), version], { encoding: "utf8", windowsHide: true });
try {
  write("package.json", '{"version":"0.0.1"}\r\n');
  write("package-lock.json", '{"version":"0.0.1"}\n' + "\n".repeat(15) + 'dependency: "0.0.1"\n');
  for (const file of files.slice(2)) write(file, 'v0.0.1 ?v=0.0.1 "0.0.1" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n');
  // Een notitie in "Nieuw in de app" noemt een oude versie bewust en schuift niet mee.
  const notitie = '<li><span class="nieuw-versie">0.0.1</span></li>\r\n';
  // Een commentaarregel gemarkeerd met [versie-vast] noemt eveneens bewust een oude
  // versie (waarin iets is ingevoerd) en mag daarom ook niet meeschuiven. Getoetst
  // in twee bestanden, omdat het in de praktijk in allebei misging: in opmaak
  // (index.html) en in code (scripts/smoke-test.mjs).
  const vast = '<!-- ingevoerd in v0.0.1 [versie-vast] -->\r\n';
  write("index.html", 'v0.0.1 ?v=0.0.1 "0.0.1" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n' + notitie + vast);
  const vasteToelichting = '// Sinds v0.0.1 bestaat dit scherm [versie-vast]\r\n';
  write("scripts/smoke-test.mjs", 'v0.0.1 ?v=0.0.1 "0.0.1" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n' + vasteToelichting);
  copyFileSync(new URL("set-version.mjs", import.meta.url), join(fixture, "scripts/set-version.mjs"));
  // De twee lijsten moeten gelijk lopen. Zonder deze controle valt de test bij een
  // vergeten regel om op een ontbrekend bestand (ENOENT) in plaats van op een
  // begrijpelijke melding -- precies wat er gebeurde toen pilot/path-kwaliteitsstraat.html
  // aan set-version.mjs werd toegevoegd.
  const bron = readFileSync(new URL("set-version.mjs", import.meta.url), "utf8");
  const blok = bron.slice(bron.indexOf("const BESTANDEN = ["), bron.indexOf("];", bron.indexOf("const BESTANDEN = [")));
  const genoemd = [...blok.matchAll(/pad:\s*"([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(genoemd, files, "set-version.mjs en set-version-check.mjs noemen niet dezelfde bestanden");
  const changed = run("0.0.2");
  assert.equal(changed.status, 0, changed.stderr);
  for (const file of files.slice(4)) assert.equal(readFileSync(join(fixture, file), "utf8"), 'v0.0.2 ?v=0.0.2 "0.0.2" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n');
  assert.equal(
    readFileSync(join(fixture, "scripts/smoke-test.mjs"), "utf8"),
    'v0.0.2 ?v=0.0.2 "0.0.2" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n' + vasteToelichting,
    "een als [versie-vast] gemarkeerde toelichting in code hoort niet mee te schuiven"
  );
  assert.equal(readFileSync(join(fixture, "index.html"), "utf8"), 'v0.0.2 ?v=0.0.2 "0.0.2" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n' + notitie + vast);
  assert.match(readFileSync(join(fixture, "package-lock.json"), "utf8"), /dependency: "0\.0\.1"/);
  assert.equal(run("--check").status, 0);
  write("tests/playwright/auth.spec.ts", "version missing\n");
  const before = files.map(file => readFileSync(join(fixture, file), "utf8"));
  assert.equal(run("0.0.3").status, 1);
  assert.deepEqual(files.map(file => readFileSync(join(fixture, file), "utf8")), before);
  console.log("Versiescript: IP-adressen, langere getallen, dependencies, CRLF, vaste versienotities en validatie vóór schrijven groen.");
} finally {
  const target = resolve(fixture);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(target.includes("path-version-check-"));
  rmSync(target, { recursive: true, force: true });
}
