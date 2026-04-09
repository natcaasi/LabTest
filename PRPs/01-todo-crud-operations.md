# PRP 01: Todo CRUD Operations

## Feature Overview

The Todo CRUD Operations feature is the foundation of the application. It enables authenticated users to create, read, update, and delete (CRUD) todo items. Each todo has a title, optional due date, priority level, and completion status. All date/time operations enforce **Singapore timezone** (`Asia/Singapore`). The UI provides an inline form for creation, section-based organization (Overdue, Pending, Completed), and immediate visual feedback for all operations.

---

## User Stories

### As a busy professional
- I want to quickly add a todo with a title so I can capture tasks before I forget them.
- I want to set a due date and time on a todo so I know my deadlines.
- I want to edit a todo's details after creation so I can adjust as plans change.

### As a student
- I want to see my todos organized into Overdue, Pending, and Completed sections so I can focus on what matters.
- I want to mark a todo as done by clicking a checkbox so tracking progress is effortless.

### As a general user
- I want to delete a todo I no longer need so my list stays clean.
- I want my todos sorted automatically by priority and due date so the most urgent items appear first.

---

## User Flow

### Creating a Todo
1. User enters a title in the text input at the top of the page
2. User optionally selects a priority level (High / Medium / Low — defaults to Medium)
3. User optionally picks a due date and time (must be ≥ 1 minute in the future, Singapore timezone)
4. User clicks **"Add"** or presses Enter
5. The new todo appears in the **Pending** section (or **Overdue** if the due date is already past — edge case)
6. The input field clears, ready for the next entry

### Reading / Viewing Todos
1. On page load the app fetches all todos for the authenticated user via `GET /api/todos`
2. Todos are split into three collapsible sections:
   - **Overdue** (red background, ⚠️ icon) — past due date and not completed
   - **Pending** — future due date or no due date, and not completed
   - **Completed** — checkbox checked
3. Each section shows a count, e.g., `Overdue (3)`, `Pending (12)`, `Completed (5)`
4. Within each section todos are sorted: Priority (High → Low) → Due date (earliest first) → Creation date

### Updating a Todo
1. User clicks **"Edit"** on any todo card
2. A modal opens pre-filled with the current title, due date, priority, and other fields
3. User modifies one or more fields
4. User clicks **"Update"** to save, or **"Cancel"** to discard
5. The todo moves to the correct section if the due date changed

### Completing / Uncompleting a Todo
1. User clicks the checkbox on the left of a todo
2. The todo moves to the **Completed** section (or back to Pending/Overdue on uncheck)
3. For recurring todos, completing creates the next instance automatically (see PRP 03)

### Deleting a Todo
1. User clicks **"Delete"** (red text) on any todo card
2. The todo is immediately removed — no confirmation dialog
3. All associated subtasks, tag associations, and reminder data are cascade-deleted

---

## Technical Requirements

### Database Schema

**`todos` table** (defined in `lib/db.ts`):

```sql
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### TypeScript Interfaces (`lib/db.ts`)

```typescript
export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  subtasks?: Subtask[];
  tags?: Tag[];
}

export interface CreateTodoDto {
  user_id: number;
  title: string;
  due_date?: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  reminder_minutes?: number;
}

export interface UpdateTodoDto {
  title?: string;
  completed?: boolean;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  reminder_minutes?: number | null;
}
```

### Database CRUD Operations (`lib/db.ts`)

```typescript
export const todoDB = {
  getAll(userId: number): Todo[],
  getById(id: number): Todo | undefined,
  create(data: CreateTodoDto): Todo,
  update(id: number, data: UpdateTodoDto): Todo,
  delete(id: number): void,
};
```

> All operations are **synchronous** (`better-sqlite3`).

### API Endpoints

#### `GET /api/todos`
Returns all todos for the authenticated user, including subtasks and tags.

**Response 200**:
```json
[
  {
    "id": 1,
    "title": "Buy groceries",
    "completed": false,
    "due_date": "2025-11-10T14:00",
    "priority": "high",
    "is_recurring": false,
    "recurrence_pattern": null,
    "reminder_minutes": null,
    "created_at": "2025-11-02T10:30:00",
    "subtasks": [],
    "tags": []
  }
]
```

#### `POST /api/todos`
Creates a new todo.

**Request body**:
```json
{
  "title": "Buy groceries",
  "due_date": "2025-11-10T14:00",
  "priority": "high"
}
```

**Validation**:
- `title` — required, non-empty, non-whitespace
- `due_date` — optional; if provided, must be ≥ 1 minute in the future (Singapore time)
- `priority` — optional; must be `high`, `medium`, or `low`

**Response 201**: The created todo object.

#### `PUT /api/todos/[id]`
Updates an existing todo. Route uses async params: `const { id } = await params;`

**Request body** (partial):
```json
{ "title": "Updated title", "priority": "low" }
```

**Response 200**: The updated todo object.

#### `DELETE /api/todos/[id]`
Deletes a todo and all associated data (subtasks, tag links).

**Response 200**:
```json
{ "success": true }
```

### API Route Pattern (Next.js 16)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.getAll(session.userId);
  return NextResponse.json(todos);
}
```

---

## UI Components

All UI lives in `app/page.tsx` (client component with `'use client'`).

### Todo Creation Form

```tsx
<form onSubmit={handleAddTodo} className="flex gap-2">
  <input
    type="text"
    value={title}
    onChange={e => setTitle(e.target.value)}
    placeholder="What needs to be done?"
    className="flex-1 border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
    required
  />
  <select value={priority} onChange={e => setPriority(e.target.value as Priority)}>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
  </select>
  <input
    type="datetime-local"
    value={dueDate}
    onChange={e => setDueDate(e.target.value)}
  />
  <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
    Add
  </button>
</form>
```

### Section Layout

```tsx
{/* Overdue Section */}
{overdueTodos.length > 0 && (
  <section className="bg-red-50 dark:bg-red-900/20 rounded p-4">
    <h2>⚠️ Overdue ({overdueTodos.length})</h2>
    {overdueTodos.map(todo => <TodoCard key={todo.id} todo={todo} />)}
  </section>
)}

{/* Pending Section */}
<section>
  <h2>Pending ({pendingTodos.length})</h2>
  {pendingTodos.map(todo => <TodoCard key={todo.id} todo={todo} />)}
</section>

{/* Completed Section */}
<section>
  <h2>Completed ({completedTodos.length})</h2>
  {completedTodos.map(todo => <TodoCard key={todo.id} todo={todo} />)}
</section>
```

### Smart Due Date Display

```typescript
function formatDueDate(dueDate: string): { text: string; color: string } {
  const now = getSingaporeNow();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMs < 0) return { text: `${Math.abs(diffMins)} minutes overdue`, color: 'text-red-600' };
  if (diffMins < 60) return { text: `Due in ${diffMins} minutes`, color: 'text-red-600' };
  if (diffMins < 1440) return { text: `Due in ${Math.floor(diffMins / 60)} hours`, color: 'text-orange-500' };
  if (diffMins < 10080) return { text: `Due in ${Math.floor(diffMins / 1440)} days`, color: 'text-yellow-600' };
  return { text: formatSingaporeDate(dueDate), color: 'text-blue-500' };
}
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Empty or whitespace-only title | Rejected — API returns `400`; form prevents submission |
| Due date in the past | Rejected — API returns `400` with message |
| Due date exactly now | Rejected — must be ≥ 1 minute in the future |
| Title with special characters | Accepted — stored as-is; HTML-escaped on render |
| Very long title (>1000 chars) | API may truncate or reject with `400` |
| Deleting a todo with subtasks/tags | Cascade delete removes all associated data |
| Completing a recurring todo | Creates next instance (handled by PUT route) |
| Unauthenticated request | API returns `401` |
| Editing another user's todo | API returns `403` |
| Network failure during save | UI should show error state; no partial writes |
| Multiple rapid checkbox clicks | Last-write-wins; synchronous SQLite prevents corruption |

---

## Acceptance Criteria

- [ ] User can create a todo with a title (required)
- [ ] User can optionally set due date and priority when creating
- [ ] Empty/whitespace titles are rejected
- [ ] Due dates in the past are rejected
- [ ] Todos appear in correct section: Overdue, Pending, or Completed
- [ ] Todos are sorted by priority then due date within each section
- [ ] User can toggle completion via checkbox
- [ ] User can edit a todo via modal and save changes
- [ ] User can delete a todo; deletion is immediate and cascading
- [ ] Smart due-date display shows urgency-based colors and text
- [ ] Overdue section shows red background and ⚠️ icon
- [ ] All operations require authentication (`401` for unauthenticated)
- [ ] All dates use Singapore timezone

---

## Testing Requirements

### E2E Tests (Playwright — `tests/02-todo-crud.spec.ts`)

```typescript
test.describe('Todo CRUD Operations', () => {
  test('should create a todo with title only', async ({ page }) => {});
  test('should create a todo with title, priority, and due date', async ({ page }) => {});
  test('should reject empty title', async ({ page }) => {});
  test('should display todo in Pending section', async ({ page }) => {});
  test('should mark todo as completed via checkbox', async ({ page }) => {});
  test('should uncheck a completed todo', async ({ page }) => {});
  test('should edit todo title via modal', async ({ page }) => {});
  test('should delete a todo immediately', async ({ page }) => {});
  test('should show overdue todos in red section', async ({ page }) => {});
  test('should sort todos by priority then due date', async ({ page }) => {});
});
```

### Integration Tests

- Verify `todoDB.create()` stores and returns complete todo object
- Verify `todoDB.getAll()` returns only todos for the specified user
- Verify `todoDB.delete()` cascade-removes subtasks and tag associations
- Verify API validation rejects empty titles and past due dates
- Verify API returns `401` for unauthenticated requests

---

## Out of Scope

- Drag-and-drop reordering of todos
- Bulk operations (select-all, delete-all)
- Undo/redo for deletions
- Confirmation dialog before delete
- Offline support / service workers
- Collaborative / shared todos
- Todo archiving (separate from deletion)

---

## Success Metrics

| Metric | Target |
|---|---|
| Todo CRUD operations complete without full page reload | 100% of operations |
| Section assignment (Overdue/Pending/Completed) is accurate | 100% of cases |
| Smart due-date display matches urgency thresholds | 100% of cases |
| All E2E test scenarios pass | 10/10 tests |
| API rejects invalid input with appropriate status codes | 100% of cases |
| Singapore timezone enforced for all date operations | 100% of cases |
