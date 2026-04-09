# PRP 09: Export & Import

## Feature Overview

The Export & Import feature enables data portability and backup. Users can download their entire todo list as **JSON** (re-importable) or **CSV** (spreadsheet-friendly), and import a previously exported JSON file to restore or transfer data. Exports include all todo properties (title, priority, due date, recurrence, reminder), while import creates new todos under the current user with new IDs. Tag associations and subtasks are preserved in JSON export/import.

---

## User Stories

### As a cautious user
- I want to export a JSON backup before making large changes, so I can restore my data if something goes wrong.

### As an analyst
- I want to export CSV data and open it in Excel/Google Sheets to build pivot tables and track my productivity.

### As a multi-device user
- I want to export from one device and import on another, so I can keep my todos portable.

### As a team lead
- I want to share a curated todo list with a colleague by exporting JSON and having them import it.

---

## User Flow

### JSON Export
1. User clicks **"Export JSON"** button (green, top-right area)
2. Browser downloads `todos-YYYY-MM-DD.json` automatically
3. File contains full todo data including nested subtasks and tags

### CSV Export
1. User clicks **"Export CSV"** button (dark green, top-right area)
2. Browser downloads `todos-YYYY-MM-DD.csv` automatically
3. File opens in any spreadsheet application

### Import
1. User clicks **"Import"** button (blue, top-right area)
2. File picker opens (accepts `.json` files)
3. User selects a previously exported JSON file
4. App validates the file structure
5. New todos created for current user (new IDs assigned)
6. Success message: **"Successfully imported X todos"**
7. Todo list refreshes to show imported items

---

## Technical Requirements

### API Endpoints

#### Export
```
GET /api/todos/export?format=json
GET /api/todos/export?format=csv
```

**Implementation** (`app/api/todos/export/route.ts`):
```typescript
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const todos = todoDB.findAll(session.userId);

  if (format === 'csv') {
    const csv = convertToCSV(todos);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="todos-${formatDate()}.csv"`,
      },
    });
  }

  // JSON export with nested subtasks and tags
  const enrichedTodos = todos.map(todo => ({
    ...todo,
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  }));

  return new Response(JSON.stringify(enrichedTodos, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="todos-${formatDate()}.json"`,
    },
  });
}
```

#### Import
```
POST /api/todos/import
Content-Type: application/json
Body: Array of todo objects (from JSON export)
```

**Implementation** (`app/api/todos/import/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = await request.json();

  if (!Array.isArray(todos)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  let importedCount = 0;
  for (const todo of todos) {
    // Validate required fields
    if (!todo.title || typeof todo.title !== 'string') continue;

    const newTodo = todoDB.create({
      user_id: session.userId,
      title: todo.title.trim(),
      due_date: todo.due_date || null,
      priority: ['high', 'medium', 'low'].includes(todo.priority) ? todo.priority : 'medium',
      is_recurring: todo.is_recurring ? 1 : 0,
      recurrence_pattern: todo.recurrence_pattern || null,
      reminder_minutes: todo.reminder_minutes ?? null,
    });

    // Re-create subtasks if present
    if (Array.isArray(todo.subtasks)) {
      for (const sub of todo.subtasks) {
        if (sub.title) {
          subtaskDB.create({
            todo_id: newTodo.id,
            title: sub.title,
            position: sub.position ?? 0,
          });
        }
      }
    }

    importedCount++;
  }

  return NextResponse.json({ message: `Successfully imported ${importedCount} todos` });
}
```

### CSV Conversion

```typescript
function convertToCSV(todos: Todo[]): string {
  const header = 'ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder';
  const rows = todos.map(t =>
    [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.completed,
      t.due_date || '',
      t.priority,
      t.is_recurring ? 'true' : 'false',
      t.recurrence_pattern || '',
      t.reminder_minutes ?? '',
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
```

### Client-Side Triggers (in `app/page.tsx`)

```typescript
// JSON Export
async function exportJSON() {
  const res = await fetch('/api/todos/export?format=json');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// CSV Export
async function exportCSV() {
  const res = await fetch('/api/todos/export?format=csv');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `todos-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import
async function importTodos(file: File) {
  const text = await file.text();
  const todos = JSON.parse(text);
  const res = await fetch('/api/todos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todos),
  });
  const data = await res.json();
  // Show success message, refresh list
}
```

---

## UI Components

### Export Buttons

```tsx
<div className="flex gap-2">
  <button onClick={exportJSON} className="bg-green-500 text-white px-4 py-2 rounded">
    Export JSON
  </button>
  <button onClick={exportCSV} className="bg-green-700 text-white px-4 py-2 rounded">
    Export CSV
  </button>
</div>
```

### Import Button + Hidden File Input

```tsx
<label className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer">
  Import
  <input
    type="file"
    accept=".json"
    className="hidden"
    onChange={e => {
      const file = e.target.files?.[0];
      if (file) importTodos(file);
    }}
  />
</label>
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Export with zero todos | Valid empty JSON array `[]` or CSV with headers only |
| Import empty array `[]` | Success message: "Successfully imported 0 todos" |
| Import malformed JSON | Error message: "Invalid JSON format" |
| Import non-array JSON | Error message: "Invalid format" (400) |
| Import todo missing title | Skip that todo, continue with others |
| Import with invalid priority value | Default to `medium` |
| CSV title contains commas | Properly escaped with double-quotes |
| CSV title contains double-quotes | Escaped as `""` |
| Import creates duplicate todos | Allowed — import always creates new entries |
| File size > 1MB | No hard limit enforced; handled by browser |
| Import with subtasks | Subtasks recreated under new todo IDs |
| Tag associations on import | Tags NOT re-linked (must be manually reassigned) |
| User not authenticated | 401 response for both export and import |

---

## Acceptance Criteria

- [ ] "Export JSON" downloads `todos-YYYY-MM-DD.json` with all todo properties
- [ ] JSON export includes nested subtasks and tags
- [ ] "Export CSV" downloads `todos-YYYY-MM-DD.csv` with proper escaping
- [ ] CSV cannot be re-imported (one-way export)
- [ ] "Import" opens file picker accepting `.json` files only
- [ ] Import validates JSON structure before processing
- [ ] Import creates new todos with new IDs under current user
- [ ] Import preserves: title, completed, due_date, priority, recurrence, reminder
- [ ] Import recreates subtasks if present in JSON
- [ ] Import shows success message with count
- [ ] Import shows error message for invalid files
- [ ] Todo list refreshes automatically after import
- [ ] All endpoints require authentication (401 if not logged in)

---

## Testing Requirements

### E2E Tests (Playwright — `tests/09-export-import.spec.ts`)

```typescript
test.describe('Export & Import', () => {
  test('should export todos as JSON', async ({ page }) => {});
  test('should export todos as CSV', async ({ page }) => {});
  test('should export empty list', async ({ page }) => {});
  test('should import valid JSON file', async ({ page }) => {});
  test('should show success message with count after import', async ({ page }) => {});
  test('should reject invalid JSON file', async ({ page }) => {});
  test('should handle import with subtasks', async ({ page }) => {});
  test('should create new IDs on import (not overwrite)', async ({ page }) => {});
  test('should refresh todo list after import', async ({ page }) => {});
});
```

### Unit / Integration Tests

- Verify CSV escaping for titles with commas and quotes
- Verify import validation rejects non-array, missing title
- Verify default priority assignment for invalid values

---

## Out of Scope

- CSV import (CSV is export-only)
- Selective export (export specific todos only)
- Merge/deduplicate on import
- Export scheduling / automatic backups
- Export to other formats (PDF, iCal, etc.)
- Cloud backup integration
- Tag re-linking on import
- Versioned export format
- Export progress indicator

---

## Success Metrics

| Metric | Target |
|---|---|
| JSON export contains all todo fields | 100% of fields |
| CSV opens correctly in Excel / Google Sheets | 100% of rows |
| Round-trip JSON export → import preserves data | 100% of todo properties |
| Import rejects invalid files gracefully | 100% of error cases |
| All E2E tests pass | 9/9 tests |
