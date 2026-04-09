import Database from 'better-sqlite3';
import path from 'path';

// --- Types ---

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: string;
  counter: number;
  transports: string | null;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  due_date: string | null;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  subtasks?: Subtask[];
  tags?: Tag[];
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TodoTag {
  todo_id: number;
  tag_id: number;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  country: string;
  created_at: string;
}

// --- Database Initialization ---

const dbPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd(), 'todos.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    credential_public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    transports TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    due_date TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    is_recurring INTEGER DEFAULT 0,
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly')),
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (todo_id, tag_id),
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    title_template TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    is_recurring INTEGER DEFAULT 0,
    recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly')),
    reminder_minutes INTEGER,
    subtasks_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    country TEXT DEFAULT 'SG',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
  CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
  CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
  CREATE INDEX IF NOT EXISTS idx_authenticators_credential_id ON authenticators(credential_id);
`);

// --- User DB ---

export const userDB = {
  findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  },
  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },
  create(data: { username: string }): User {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const info = stmt.run(data.username);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
  },
};

// --- Authenticator DB ---

export const authenticatorDB = {
  findByUserId(userId: number): Authenticator[] {
    return db.prepare('SELECT * FROM authenticators WHERE user_id = ?').all(userId) as Authenticator[];
  },
  findByCredentialId(credentialId: string): Authenticator | undefined {
    return db.prepare('SELECT * FROM authenticators WHERE credential_id = ?').get(credentialId) as Authenticator | undefined;
  },
  create(data: { user_id: number; credential_id: string; credential_public_key: string; counter: number; transports: string | null }): Authenticator {
    const stmt = db.prepare(
      'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports) VALUES (?, ?, ?, ?, ?)'
    );
    const info = stmt.run(data.user_id, data.credential_id, data.credential_public_key, data.counter, data.transports);
    return db.prepare('SELECT * FROM authenticators WHERE id = ?').get(info.lastInsertRowid) as Authenticator;
  },
  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

// --- Todo DB ---

export const todoDB = {
  findAll(userId: number): Todo[] {
    const todos = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Todo[];
    for (const todo of todos) {
      todo.subtasks = subtaskDB.findByTodoId(todo.id);
      todo.tags = tagDB.findByTodoId(todo.id);
    }
    return todos;
  },
  findById(id: number): Todo | undefined {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
    if (todo) {
      todo.subtasks = subtaskDB.findByTodoId(todo.id);
      todo.tags = tagDB.findByTodoId(todo.id);
    }
    return todo;
  },
  create(data: {
    user_id: number;
    title: string;
    due_date?: string | null;
    priority?: Priority;
    is_recurring?: number;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
  }): Todo {
    const stmt = db.prepare(
      `INSERT INTO todos (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      data.user_id,
      data.title,
      data.due_date || null,
      data.priority || 'medium',
      data.is_recurring || 0,
      data.recurrence_pattern || null,
      data.reminder_minutes ?? null
    );
    return todoDB.findById(info.lastInsertRowid as number)!;
  },
  update(id: number, data: Partial<{
    title: string;
    completed: number;
    due_date: string | null;
    priority: Priority;
    is_recurring: number;
    recurrence_pattern: RecurrencePattern | null;
    reminder_minutes: number | null;
    last_notification_sent: string | null;
  }>): Todo | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
    if (fields.length === 0) return todoDB.findById(id);
    values.push(id);
    db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return todoDB.findById(id);
  },
  delete(id: number): void {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },
};

// --- Subtask DB ---

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    return db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC, id ASC').all(todoId) as Subtask[];
  },
  findById(id: number): Subtask | undefined {
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
  },
  create(data: { todo_id: number; title: string; position?: number }): Subtask {
    const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM subtasks WHERE todo_id = ?').get(data.todo_id) as { max_pos: number };
    const position = data.position ?? (maxPos.max_pos + 1);
    const stmt = db.prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)');
    const info = stmt.run(data.todo_id, data.title, position);
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(info.lastInsertRowid) as Subtask;
  },
  update(id: number, data: Partial<{ title: string; completed: number; position: number }>): Subtask | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return subtaskDB.findById(id);
    values.push(id);
    db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return subtaskDB.findById(id);
  },
  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },
};

// --- Tag DB ---

export const tagDB = {
  findAll(userId: number): Tag[] {
    return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[];
  },
  findById(id: number): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag | undefined;
  },
  findByTodoId(todoId: number): Tag[] {
    return db.prepare(
      `SELECT t.* FROM tags t
       INNER JOIN todo_tags tt ON t.id = tt.tag_id
       WHERE tt.todo_id = ?
       ORDER BY t.name ASC`
    ).all(todoId) as Tag[];
  },
  create(data: { user_id: number; name: string; color?: string }): Tag {
    const stmt = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)');
    const info = stmt.run(data.user_id, data.name, data.color || '#3B82F6');
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid) as Tag;
  },
  update(id: number, data: Partial<{ name: string; color: string }>): Tag | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return tagDB.findById(id);
    values.push(id);
    db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return tagDB.findById(id);
  },
  delete(id: number): void {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },
  linkToTodo(todoId: number, tagId: number): void {
    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
  },
  unlinkFromTodo(todoId: number, tagId: number): void {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },
  setTodoTags(todoId: number, tagIds: number[]): void {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(todoId);
    const stmt = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      stmt.run(todoId, tagId);
    }
  },
};

// --- Template DB ---

export const templateDB = {
  findAll(userId: number): Template[] {
    return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name ASC').all(userId) as Template[];
  },
  findById(id: number): Template | undefined {
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template | undefined;
  },
  create(data: {
    user_id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    title_template: string;
    priority?: Priority;
    is_recurring?: number;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    subtasks_json?: string | null;
  }): Template {
    const stmt = db.prepare(
      `INSERT INTO templates (user_id, name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      data.user_id,
      data.name,
      data.description || null,
      data.category || null,
      data.title_template,
      data.priority || 'medium',
      data.is_recurring || 0,
      data.recurrence_pattern || null,
      data.reminder_minutes ?? null,
      data.subtasks_json || null
    );
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(info.lastInsertRowid) as Template;
  },
  update(id: number, data: Partial<{
    name: string;
    description: string | null;
    category: string | null;
    title_template: string;
    priority: Priority;
    is_recurring: number;
    recurrence_pattern: RecurrencePattern | null;
    reminder_minutes: number | null;
    subtasks_json: string | null;
  }>): Template | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
    if (fields.length === 0) return templateDB.findById(id);
    values.push(id);
    db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return templateDB.findById(id);
  },
  delete(id: number): void {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  },
};

// --- Holiday DB ---

export const holidayDB = {
  findAll(): Holiday[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[];
  },
  findByMonth(year: number, month: number): Holiday[] {
    const monthStr = String(month).padStart(2, '0');
    const pattern = `${year}-${monthStr}-%`;
    return db.prepare('SELECT * FROM holidays WHERE date LIKE ?').all(pattern) as Holiday[];
  },
  create(data: { name: string; date: string; country?: string }): Holiday {
    const stmt = db.prepare('INSERT INTO holidays (name, date, country) VALUES (?, ?, ?)');
    const info = stmt.run(data.name, data.date, data.country || 'SG');
    return db.prepare('SELECT * FROM holidays WHERE id = ?').get(info.lastInsertRowid) as Holiday;
  },
  findByDate(date: string): Holiday[] {
    return db.prepare('SELECT * FROM holidays WHERE date = ?').all(date) as Holiday[];
  },
};

export default db;
