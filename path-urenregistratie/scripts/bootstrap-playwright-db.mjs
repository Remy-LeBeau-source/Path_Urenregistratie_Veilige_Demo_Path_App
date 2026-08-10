import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { config as loadDotEnv } from 'dotenv';

const root = process.cwd();
const envFiles = [path.join(root, '.env'), path.join(root, '.env.local')];
const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
if (stage && ['dev', 'test', 'acc', 'prod'].includes(stage)) {
  envFiles.push(path.join(root, 'environments', `${stage}.env`));
} else if (!process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
  envFiles.push(path.join(root, 'environments', 'test.env'));
}
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    loadDotEnv({ path: envFile, override: envFile.endsWith('.env.local') || envFile.includes('environments') });
  }
}

let config = {
  host: process.env.PATH_APP_DB_HOST || process.env.PLAYWRIGHT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.PATH_APP_DB_PORT || process.env.PLAYWRIGHT_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.PATH_APP_DB_USER || process.env.PLAYWRIGHT_DB_USER || process.env.DB_USER || 'root',
  password: process.env.PATH_APP_DB_PASSWORD || process.env.PLAYWRIGHT_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
};

let databaseName = process.env.PATH_APP_DB_NAME || process.env.PLAYWRIGHT_DB_NAME || process.env.DB_NAME || '';
if (!databaseName) {
  const stage = String(process.env.PLAYWRIGHT_STAGE || '').trim().toLowerCase();
  if (stage === 'prod') {
    databaseName = 'path_urenregistratie';
  } else if (stage === 'ci' || process.env.CI) {
    databaseName = 'path_urenregistratie';
  } else {
    databaseName = 'path_urenregistratie_test';
  }
}

try {
  const localConfigPath = path.join(root, 'server', 'config.local.php');
  if (fs.existsSync(localConfigPath)) {
    const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
    const match = localConfigContent.match(/'host'\s*=>\s*'([^']+)'/);
    const dbMatch = localConfigContent.match(/'database'\s*=>\s*'([^']+)'/);
    const userMatch = localConfigContent.match(/'username'\s*=>\s*'([^']+)'/);
    const passMatch = localConfigContent.match(/'password'\s*=>\s*'([^']+)'/);
    if (match && !process.env.PATH_APP_DB_HOST && !process.env.PLAYWRIGHT_DB_HOST && !process.env.DB_HOST) {
      config.host = match[1];
    }
    if (dbMatch && !process.env.PATH_APP_DB_NAME && !process.env.PLAYWRIGHT_DB_NAME && !process.env.DB_NAME) {
      databaseName = dbMatch[1];
    }
    if (userMatch && !process.env.PATH_APP_DB_USER && !process.env.PLAYWRIGHT_DB_USER && !process.env.DB_USER) {
      config.user = userMatch[1];
    }
    if (passMatch && !process.env.PATH_APP_DB_PASSWORD && !process.env.PLAYWRIGHT_DB_PASSWORD && !process.env.DB_PASSWORD) {
      config.password = passMatch[1];
    }
  }
} catch {
  // fall back to env-based defaults
}

const connection = await mysql.createConnection(config);
try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  console.log(`Prepared isolated Playwright database: ${databaseName}`);
} finally {
  await connection.end();
}
