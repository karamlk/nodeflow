import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created TEXT NOT NULL,
    updated TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT,
    flowName TEXT,
    folderName TEXT,
    description TEXT,
    nodes TEXT NOT NULL,
    connections TEXT NOT NULL,
    public INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(userId);
`);

export default db;
