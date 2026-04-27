const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, './social-manager.db');
console.log('DB path:', DB_PATH);
const db = new Database(DB_PATH);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));
db.close();
