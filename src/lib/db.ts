import { join } from "path";

// DB Path defaults to 'blog.db' in the running directory
const DB_PATH = process.env.DB_PATH || join(process.cwd(), "blog.db");

let Database: any;

if (typeof Bun !== 'undefined') {
  const sqlite = await import("bun:sqlite");
  Database = sqlite.Database;
} else {
  const sqlite = await import("node:sqlite");
  Database = sqlite.DatabaseSync;
}

const rawDb = new Database(DB_PATH);

// Compatibility bridge between bun:sqlite and node:sqlite
export const db = {
  run(sql: string) {
    if (typeof Bun !== 'undefined') {
      return rawDb.run(sql);
    } else {
      return rawDb.exec(sql);
    }
  },
  query(sql: string) {
    const stmt = typeof Bun !== 'undefined' ? rawDb.query(sql) : rawDb.prepare(sql);
    return {
      all(params?: any) {
        return stmt.all(params || {});
      },
      get(params?: any) {
        return stmt.get(params || {});
      },
      run(params?: any) {
        return stmt.run(params || {});
      }
    };
  }
};

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    content TEXT,
    excerpt TEXT,
    tags TEXT,
    read_time TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    mood TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id TEXT,
    target_type TEXT,
    author TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrations
try { db.run("ALTER TABLE posts ADD COLUMN likes INTEGER DEFAULT 0"); } catch (e) { }
try { db.run("ALTER TABLE thoughts ADD COLUMN likes INTEGER DEFAULT 0"); } catch (e) { }
