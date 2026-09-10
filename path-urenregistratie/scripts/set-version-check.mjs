import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const fixture = mkdtempSync(join(tmpdir(), "path-version-check-"));
const files = ["package.json", "package-lock.json", "index.html", "scripts/smoke-test.mjs", "tests/playwright/auth.spec.ts"];
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
  copyFileSync(new URL("set-version.mjs", import.meta.url), join(fixture, "scripts/set-version.mjs"));
  const changed = run("0.0.2");
  assert.equal(changed.status, 0, changed.stderr);
  for (const file of files.slice(2)) assert.equal(readFileSync(join(fixture, file), "utf8"), 'v0.0.2 ?v=0.0.2 "0.0.2" 127.0.0.1 10.0.1 0.0.10 0.0.1.2\r\n');
  assert.match(readFileSync(join(fixture, "package-lock.json"), "utf8"), /dependency: "0\.0\.1"/);
  assert.equal(run("--check").status, 0);
  write("tests/playwright/auth.spec.ts", "version missing\n");
  const before = files.map(file => readFileSync(join(fixture, file), "utf8"));
  assert.equal(run("0.0.3").status, 1);
  assert.deepEqual(files.map(file => readFileSync(join(fixture, file), "utf8")), before);
  console.log("Versiescript: IP-adressen, langere getallen, dependencies, CRLF en validatie vóór schrijven groen.");
} finally {
  const target = resolve(fixture);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(target.includes("path-version-check-"));
  rmSync(target, { recursive: true, force: true });
}
