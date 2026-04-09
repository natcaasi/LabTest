import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL UNIQUE,
    country TEXT DEFAULT 'SG',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Singapore public holidays 2025-2027
const holidays = [
  // 2025
  { name: "New Year's Day", date: '2025-01-01' },
  { name: 'Chinese New Year', date: '2025-01-29' },
  { name: 'Chinese New Year (2nd Day)', date: '2025-01-30' },
  { name: 'Hari Raya Puasa', date: '2025-03-31' },
  { name: 'Good Friday', date: '2025-04-18' },
  { name: 'Labour Day', date: '2025-05-01' },
  { name: 'Vesak Day', date: '2025-05-12' },
  { name: 'Hari Raya Haji', date: '2025-06-07' },
  { name: 'National Day', date: '2025-08-09' },
  { name: 'Deepavali', date: '2025-10-20' },
  { name: 'Christmas Day', date: '2025-12-25' },
  // 2026
  { name: "New Year's Day", date: '2026-01-01' },
  { name: 'Chinese New Year', date: '2026-02-17' },
  { name: 'Chinese New Year (2nd Day)', date: '2026-02-18' },
  { name: 'Hari Raya Puasa', date: '2026-03-20' },
  { name: 'Good Friday', date: '2026-04-03' },
  { name: 'Labour Day', date: '2026-05-01' },
  { name: 'Vesak Day', date: '2026-05-31' },
  { name: 'Hari Raya Haji', date: '2026-05-27' },
  { name: 'National Day', date: '2026-08-09' },
  { name: 'Deepavali', date: '2026-11-08' },
  { name: 'Christmas Day', date: '2026-12-25' },
  // 2027
  { name: "New Year's Day", date: '2027-01-01' },
  { name: 'Chinese New Year', date: '2027-02-06' },
  { name: 'Chinese New Year (2nd Day)', date: '2027-02-07' },
  { name: 'Hari Raya Puasa', date: '2027-03-10' },
  { name: 'Good Friday', date: '2027-03-26' },
  { name: 'Labour Day', date: '2027-05-01' },
  { name: 'Vesak Day', date: '2027-05-20' },
  { name: 'Hari Raya Haji', date: '2027-05-17' },
  { name: 'National Day', date: '2027-08-09' },
  { name: 'Deepavali', date: '2027-10-29' },
  { name: 'Christmas Day', date: '2027-12-25' },
];

const insert = db.prepare('INSERT OR IGNORE INTO holidays (name, date) VALUES (?, ?)');

const insertMany = db.transaction(() => {
  for (const h of holidays) {
    insert.run(h.name, h.date);
  }
});

insertMany();
console.log(`Seeded ${holidays.length} Singapore public holidays for 2025-2027`);
db.close();
