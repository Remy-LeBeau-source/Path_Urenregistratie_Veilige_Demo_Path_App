import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const root = process.cwd();
const sqlPath = path.join(root, 'database', 'queries', 'crud-smoke.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

let config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'path_urenregistratie',
  charset: 'utf8mb4',
  multipleStatements: true,
};

try {
  const localConfigPath = path.join(root, 'server', 'config.local.php');
  if (fs.existsSync(localConfigPath)) {
    const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
    const match = localConfigContent.match(/'host'\s*=>\s*'([^']+)'/);
    const dbMatch = localConfigContent.match(/'database'\s*=>\s*'([^']+)'/);
    const userMatch = localConfigContent.match(/'username'\s*=>\s*'([^']+)'/);
    const passMatch = localConfigContent.match(/'password'\s*=>\s*'([^']+)'/);
    if (match) config.host = match[1];
    if (dbMatch) config.database = dbMatch[1];
    if (userMatch) config.user = userMatch[1];
    if (passMatch) config.password = passMatch[1];
  }
} catch {
  // fall back to env-based defaults
}

const productionContext = process.env.NODE_ENV === 'production' || process.env.PLAYWRIGHT_STAGE === 'prod';
if (productionContext) {
  throw new Error('DB CRUD smoke is not allowed to run in production contexts.');
}

const connection = await mysql.createConnection(config);

try {
  await connection.query('CREATE DATABASE IF NOT EXISTS path_urenregistratie');
} catch {
  // ignore bootstrap issues and rely on existing connection.
}

try {
  const [results] = await connection.query(sql);
  const resultSets = Array.isArray(results) ? results : [results];
  const finalRows = Array.isArray(resultSets[resultSets.length - 1]) ? resultSets[resultSets.length - 1] : [];
  const hasExpectedOutput = finalRows.some(row => row && typeof row === 'object' && Number(row.remaining_rows ?? row['remaining_rows']) === 0);
  if (!hasExpectedOutput) {
    throw new Error('DB-H-001 did not produce the expected cleanup result set.');
  }
  console.log('DB-H-001: CRUD smoke executed successfully.');
} catch (error) {
  console.error('DB-H-001 failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
