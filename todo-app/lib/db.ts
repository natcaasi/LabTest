import Database from 'better-sqlite3';
import path from 'path';
import { formatSGTime } from './timezone';

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'todos.db');
  const dbDir = path.dirname(dbPath);

  if (!require('fs').existsSync(dbDir)) {
    require('fs').mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  initializeSchema(db);
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function initializeSchema(database: Database.Database): void {
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = new Set((tables as Array<{ name: string }>).map((t) => t.name));

  if (!tableNames.has('users')) {
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  if (!tableNames.has('authenticators')) {
    database.exec(`
      CREATE TABLE authenticators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        credential_id BLOB NOT NULL UNIQUE,
        public_key BLOB NOT NULL,
        sign_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  if (!tableNames.has('todos')) {
    database.exec(`
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurrence_pattern TEXT,
        reminder_minutes INTEGER,
        last_notification_sent TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_todos_user_id ON todos(user_id);
      CREATE INDEX idx_todos_due_date ON todos(due_date);
      CREATE INDEX idx_todos_completed ON todos(completed);
    `);
  }

  if (!tableNames.has('subtasks')) {
    database.exec(`
      CREATE TABLE subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_subtasks_todo_id ON subtasks(todo_id);
    `);
  }

  if (!tableNames.has('tags')) {
    database.exec(`
      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_tags_user_id ON tags(user_id);
    `);
  }

  if (!tableNames.has('todo_tags')) {
    database.exec(`
      CREATE TABLE todo_tags (
        todo_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY(todo_id, tag_id),
        FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_todo_tags_tag_id ON todo_tags(tag_id);
    `);
  }

  if (!tableNames.has('templates')) {
    database.exec(`
      CREATE TABLE templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date_offset_days INTEGER NOT NULL DEFAULT 0,
        subtasks_json TEXT,
        tag_ids TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_templates_user_id ON templates(user_id);
    `);
  }

  if (!tableNames.has('holidays')) {
    database.exec(`
      CREATE TABLE holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        is_sg_public INTEGER NOT NULL DEFAULT 1
      );
    `);
    seedHolidays(database);
  }
}

function seedHolidays(database: Database.Database): void {
  const sgHolidays = [
    { date: '2025-01-01', name: 'New Year Day' },
    { date: '2025-01-29', name: 'Chinese New Year' },
    { date: '2025-01-30', name: 'Chinese New Year' },
    { date: '2025-04-10', name: 'Good Friday' },
    { date: '2025-05-01', name: 'Labour Day' },
    { date: '2025-06-02', name: 'Vesak Day' },
    { date: '2025-08-09', name: 'National Day' },
    { date: '2025-10-01', name: 'Deepavali' },
    { date: '2025-12-25', name: 'Christmas Day' },
    { date: '2026-01-01', name: 'New Year Day' },
    { date: '2026-02-17', name: 'Chinese New Year' },
    { date: '2026-02-18', name: 'Chinese New Year' },
    { date: '2026-03-29', name: 'Good Friday' },
    { date: '2026-05-01', name: 'Labour Day' },
    { date: '2026-05-24', name: 'Vesak Day' },
    { date: '2026-07-07', name: 'Hari Raya Puasa' },
    { date: '2026-08-09', name: 'National Day' },
    { date: '2026-09-16', name: 'Malaysia Day' },
    { date: '2026-10-21', name: 'Deepavali' },
    { date: '2026-12-25', name: 'Christmas Day' },
  ];

  const insert = database.prepare(
    'INSERT OR IGNORE INTO holidays (date, name, is_sg_public) VALUES (?, ?, 1)'
  );

  for (const holiday of sgHolidays) {
    insert.run(holiday.date, holiday.name);
  }
}

export function queryOne<T>(sql: string, params?: unknown[]): T | undefined {
  const db = getDB();
  const stmt = db.prepare(sql);
  return (stmt.get(...(params || [])) as T) || undefined;
}

export function queryAll<T>(sql: string, params?: unknown[]): T[] {
  const db = getDB();
  const stmt = db.prepare(sql);
  return (stmt.all(...(params || [])) as T[]) || [];
}

export function execute(sql: string, params?: unknown[]): Database.RunResult {
  const db = getDB();
  const stmt = db.prepare(sql);
  return stmt.run(...(params || []));
}

export function transaction<T>(fn: () => T): T {
  const db = getDB();
  const transactionFn = db.transaction(fn);
  return transactionFn();
}
