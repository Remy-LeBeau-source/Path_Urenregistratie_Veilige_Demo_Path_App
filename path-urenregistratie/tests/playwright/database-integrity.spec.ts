const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { expect, test } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..');

test('[DB-H-001] CRUD smoke test werkt in een geïsoleerde tijdelijke tabel', async () => {
  const result = spawnSync(process.execPath, ['scripts/run-db-crud-smoke.mjs'], {
    cwd: projectRoot,
    env: { ...process.env },
    encoding: 'utf8',
  });

  const stdout = result.stdout?.toString() || '';
  const stderr = result.stderr?.toString() || '';

  expect(result.status, `${stdout}\n${stderr}`).toBe(0);
  expect(stdout).toContain('DB-H-001: CRUD smoke executed successfully.');
});
