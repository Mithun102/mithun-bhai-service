const Database=require("better-sqlite3");
const db=new Database("service.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inventory(
 id INTEGER PRIMARY KEY AUTOINCREMENT, login_id TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL, sold INTEGER NOT NULL DEFAULT 0,
 order_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT, quantity INTEGER NOT NULL,
 amount INTEGER NOT NULL, status TEXT NOT NULL,
 gateway_order_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`);
module.exports=db;
