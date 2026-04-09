# DB.ts Update Required for Railway

Due to filesystem permissions, the following change to `lib/db.ts` must be made manually:

## Required Change

Update the database path initialization in `lib/db.ts` to support Railway volume mounts:

Replace the current database path line with:

```typescript
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'todos.db')
  : path.join(process.cwd(), 'data', 'todos.db');
```

## Location

Find the line in `lib/db.ts` that initializes the database path (typically around line 5-10) and replace it with the above.

## Ensure Directory Creation

Make sure the code includes directory creation:

```typescript
import * as fs from 'fs';
import * as path from 'path';

// After setting dbPath:
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
```

## Why This Matters

- **Local development:** Uses `./data/todos.db`
- **Railway deployment:** Uses `/data/todos.db` from the persistent volume
- **Directory creation:** Ensures the SQLite file can be created if the directory doesn't exist

This change enables seamless deployment to Railway while maintaining local development compatibility.
