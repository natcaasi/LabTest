# PRP 05: Subtasks & Progress Tracking

## Feature Overview

The Subtasks & Progress Tracking feature allows users to decompose complex todos into smaller, manageable checklist items with real-time visual progress tracking. Each todo can contain unlimited subtasks that are independently completable without affecting the parent todo's completion state. A blue progress bar and text indicator (`X/Y subtasks`) provide at-a-glance visibility into overall completion, remaining visible even when the subtask list is collapsed.

This feature integrates with the search system (subtask titles are searchable), respects cascade deletes (removing a parent todo removes all its subtasks), and maintains position-based ordering within each todo.

---

## User Stories

### As a busy professional
- I want to break down a large project todo into smaller steps so I can track incremental progress without losing sight of the bigger picture.
- I want to see a progress bar at a glance so I know how far along a multi-step task is without expanding the details.

### As a student
- I want to create a checklist of study topics under a single "Exam Prep" todo so I can check off each topic as I review it.
- I want to uncheck a subtask if I realize I need to revisit a topic.

### As a general user
- I want subtasks to be deleted automatically when I delete the parent todo so there is no orphaned data.
- I want to search for a subtask by title and have the parent todo appear in results.
- I want to add subtasks to any todo — regardless of its priority, due date, or recurrence status.

---

## User Flow

### Adding Subtasks
1. User locates a todo in the todo list (Overdue, Pending, or Completed section)
2. User clicks the **"▶ Subtasks"** toggle button on the todo card
3. The subtask panel expands, showing an input field and any existing subtasks
4. User types a subtask title into the input field
5. User presses **Enter** or clicks the **"Add"** button
6. The new subtask appears at the bottom of the subtask list
7. The progress bar and text indicator update immediately (e.g., `0/1 subtasks`)

### Completing / Uncompleting Subtasks
1. User clicks the checkbox next to a subtask title
2. The subtask is marked completed — checkbox fills, title gets strikethrough styling
3. Progress bar percentage increases and text counter updates (e.g., `1/3 subtasks`)
4. To uncomplete: user clicks the checked checkbox again
5. Strikethrough is removed and progress bar/counter decrement accordingly
6. **Parent todo's completion state is not affected** by subtask toggling

### Deleting Subtasks
1. User clicks the **✕** button on the right side of a subtask row
2. The subtask is removed immediately from the list
3. Progress bar and text counter recalculate
4. If no subtasks remain, the progress bar and counter are hidden

### Collapsing the Panel
1. User clicks the **"▼ Subtasks"** toggle button
2. The subtask list and input field collapse/hide
3. The toggle reverts to **"▶ Subtasks"**
4. The progress bar and text counter **remain visible** below the todo title

---

## Technical Requirements

### Database Schema

Add the `subtasks` table to the SQLite database (via `lib/db.ts`):

```sql
CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Key constraints:
- `todo_id` foreign key with `ON DELETE CASCADE` ensures subtasks are removed when the parent todo is deleted
- `completed` stored as integer (0 = false, 1 = true) per SQLite convention
- `position` enables ordered display within each todo

### TypeScript Interfaces

Add to `lib/db.ts`:

```typescript
export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface CreateSubtaskDto {
  todo_id: number;
  title: string;
  position?: number;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
}
```

### Database CRUD Operations

Export a `subtaskDB` object from `lib/db.ts` with synchronous methods (better-sqlite3 is synchronous — no async/await needed):

```typescript
export const subtaskDB = {
  getByTodoId(todoId: number): Subtask[] {
    return db.prepare(
      'SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC'
    ).all(todoId) as Subtask[];
  },

  create(data: CreateSubtaskDto): Subtask {
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), -1) as maxPos FROM subtasks WHERE todo_id = ?'
    ).get(data.todo_id) as { maxPos: number };

    const position = data.position ?? maxPos.maxPos + 1;

    const result = db.prepare(
      'INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)'
    ).run(data.todo_id, data.title.trim(), position);

    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid) as Subtask;
  },

  update(id: number, data: UpdateSubtaskDto): Subtask {
    if (data.completed !== undefined) {
      db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?')
        .run(data.completed ? 1 : 0, id);
    }
    if (data.title !== undefined) {
      db.prepare('UPDATE subtasks SET title = ? WHERE id = ?')
        .run(data.title.trim(), id);
    }
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },

  deleteByTodoId(todoId: number): void {
    db.prepare('DELETE FROM subtasks WHERE todo_id = ?').run(todoId);
  },
};
```

### API Endpoints

All endpoints require an authenticated session via `getSession()`. Return `401` for unauthenticated requests and verify the parent todo belongs to `session.userId` before any operation.

> **Next.js 16 note**: `params` is a `Promise` — always `await` it.

---

#### `GET /api/todos/[id]/subtasks`

Returns all subtasks for a todo, ordered by position.

**Route file**: `app/api/todos/[id]/subtasks/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  // Verify todo belongs to session.userId
  const subtasks = subtaskDB.getByTodoId(parseInt(id));
  return NextResponse.json(subtasks);
}
```

**Response 200**:
```json
[
  { "id": 1, "todo_id": 5, "title": "Draft outline", "completed": false, "position": 0, "created_at": "2025-11-02T10:30:00" },
  { "id": 2, "todo_id": 5, "title": "Write introduction", "completed": true, "position": 1, "created_at": "2025-11-02T10:31:00" }
]
```

---

#### `POST /api/todos/[id]/subtasks`

Creates a new subtask for the specified todo.

**Request body**:
```json
{ "title": "Draft outline" }
```

**Validation rules**:
- `title` must be a non-empty, non-whitespace string
- Parent todo must exist and belong to `session.userId`
- Position auto-assigned as `max(position) + 1`

**Response 201**: The created subtask object.

**Error responses**:
- `400`: Empty or whitespace-only title
- `401`: Not authenticated
- `403`: Todo belongs to another user
- `404`: Todo not found

---

#### `PUT /api/todos/[id]/subtasks/[subtaskId]`

Updates a subtask (toggle completion or update title).

**Route file**: `app/api/todos/[id]/subtasks/[subtaskId]/route.ts`

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id, subtaskId } = await params;
  // Verify parent todo belongs to session.userId
  const body = await request.json();
  const updated = subtaskDB.update(parseInt(subtaskId), body);
  return NextResponse.json(updated);
}
```

**Request body** (partial — any combination):
```json
{ "completed": true }
```

**Response 200**: The updated subtask object.

---

#### `DELETE /api/todos/[id]/subtasks/[subtaskId]`

Deletes a single subtask.

**Response 200**:
```json
{ "success": true }
```

**Error responses**:
- `401`: Not authenticated
- `403`: Parent todo belongs to another user
- `404`: Subtask not found

---

## UI Components

All subtask UI lives inside `app/page.tsx` (the monolithic client component), embedded within each todo card.

### State Management

```typescript
const [expandedSubtasks, setExpandedSubtasks] = useState<Record<number, boolean>>({});
const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({});
```

### Progress Bar Component

Displayed below the todo title — visible **even when the subtask panel is collapsed**:

```tsx
{todo.subtasks && todo.subtasks.length > 0 && (
  <div className="mt-1">
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{
          width: `${Math.round(
            (todo.subtasks.filter((s: Subtask) => s.completed).length / todo.subtasks.length) * 100
          )}%`
        }}
      />
    </div>
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {todo.subtasks.filter((s: Subtask) => s.completed).length}/{todo.subtasks.length} subtasks
    </span>
  </div>
)}
```

### Toggle Button

```tsx
<button
  onClick={() =>
    setExpandedSubtasks(prev => ({
      ...prev,
      [todo.id]: !prev[todo.id]
    }))
  }
  className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500"
>
  {expandedSubtasks[todo.id] ? '▼ Subtasks' : '▶ Subtasks'}
</button>
```

### Subtask List (visible when expanded)

```tsx
{expandedSubtasks[todo.id] && (
  <div className="mt-2 space-y-1">
    {todo.subtasks?.map((subtask: Subtask) => (
      <div key={subtask.id} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={subtask.completed}
          onChange={() => toggleSubtask(todo.id, subtask.id, subtask.completed)}
          className="rounded"
        />
        <span className={subtask.completed ? 'line-through text-gray-400' : ''}>
          {subtask.title}
        </span>
        <button
          onClick={() => deleteSubtask(todo.id, subtask.id)}
          className="ml-auto text-red-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    ))}
    {/* Add subtask input */}
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={newSubtaskTitles[todo.id] ?? ''}
        onChange={e =>
          setNewSubtaskTitles(prev => ({ ...prev, [todo.id]: e.target.value }))
        }
        onKeyDown={e => e.key === 'Enter' && addSubtask(todo.id)}
        placeholder="New subtask..."
        className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600"
      />
      <button
        onClick={() => addSubtask(todo.id)}
        className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
      >
        Add
      </button>
    </div>
  </div>
)}
```

### API Call Handlers

```typescript
async function addSubtask(todoId: number) {
  const title = newSubtaskTitles[todoId]?.trim();
  if (!title) return;

  await fetch(`/api/todos/${todoId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  setNewSubtaskTitles(prev => ({ ...prev, [todoId]: '' }));
  fetchTodos(); // Refresh entire todo list to update progress
}

async function toggleSubtask(todoId: number, subtaskId: number, currentCompleted: boolean) {
  await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !currentCompleted }),
  });
  fetchTodos();
}

async function deleteSubtask(todoId: number, subtaskId: number) {
  await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
  });
  fetchTodos();
}
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Empty or whitespace-only subtask title | Rejected — API returns `400`; UI silently prevents submission |
| Parent todo deleted | All subtasks cascade-deleted automatically (`ON DELETE CASCADE`) |
| All subtasks completed | Progress bar shows 100%; text reads `N/N subtasks` |
| No subtasks exist on a todo | Progress bar and text counter are **hidden** entirely |
| Last subtask deleted | Progress bar and text counter disappear |
| Subtask panel collapsed | Progress bar and text counter remain visible below the todo title |
| Parent todo is itself completed | Subtasks remain toggleable independently |
| Very long subtask title (>500 characters) | API should reject with `400` or truncate |
| `todo_id` does not belong to current user | API returns `403 Forbidden` |
| `subtaskId` does not exist | API returns `404 Not Found` |
| Unauthenticated request | API returns `401 Not authenticated` |
| Rapid checkbox toggling (race condition) | Last-write-wins via synchronous SQLite; no data corruption |
| Subtask title matches a search query | Parent todo appears in search results |
| Dark mode active | Progress bar, text, and inputs adapt via Tailwind dark mode classes |

---

## Acceptance Criteria

### Subtask CRUD
- [ ] User can expand the subtask panel by clicking **"▶ Subtasks"** on any todo
- [ ] User can add a subtask by typing a title and pressing Enter or clicking Add
- [ ] Empty or whitespace-only titles are rejected (not created)
- [ ] Newly created subtasks appear at the bottom of the list (position-based ordering)
- [ ] User can mark a subtask as completed by clicking its checkbox
- [ ] User can unmark a completed subtask by clicking its checkbox again
- [ ] User can delete a subtask by clicking its ✕ button

### Progress Tracking
- [ ] A blue progress bar displays below the todo title showing completion percentage (0–100%)
- [ ] A text indicator shows `"X/Y subtasks"` with accurate counts
- [ ] Progress bar and text update in real-time after every add, complete, uncomplete, or delete action
- [ ] Progress bar and text remain visible when the subtask panel is collapsed
- [ ] Progress bar and text are hidden when no subtasks exist
- [ ] Completed subtask titles display with strikethrough styling

### Data Integrity
- [ ] Deleting a parent todo removes all its subtasks (CASCADE)
- [ ] Subtask completion does **not** change the parent todo's completed state
- [ ] Subtasks maintain position-based ordering within each todo

### Search Integration
- [ ] Searching for a subtask's title surfaces the parent todo in search results

### Security
- [ ] All subtask API endpoints return `401` for unauthenticated requests
- [ ] Users cannot create, read, update, or delete subtasks on another user's todos (`403`)

---

## Testing Requirements

### E2E Tests (Playwright)

**File**: `tests/05-subtasks-progress.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Subtasks & Progress Tracking', () => {

  test('should expand subtask panel and add a subtask', async ({ page }) => {
    // 1. Create a todo
    // 2. Click "▶ Subtasks" to expand
    // 3. Type subtask title, press Enter
    // 4. Assert subtask appears in the list
    // 5. Assert progress bar visible with "0/1 subtasks"
  });

  test('should toggle subtask completion and update progress', async ({ page }) => {
    // 1. Create a todo with 2 subtasks
    // 2. Check first subtask checkbox
    // 3. Assert progress bar at 50%, text "1/2 subtasks"
    // 4. Check second subtask checkbox
    // 5. Assert progress bar at 100%, text "2/2 subtasks"
  });

  test('should uncomplete a subtask and update progress', async ({ page }) => {
    // 1. Create a todo, add and complete a subtask
    // 2. Uncheck the subtask
    // 3. Assert strikethrough removed
    // 4. Assert progress bar back to 0%, text "0/1 subtasks"
  });

  test('should delete a subtask and update progress', async ({ page }) => {
    // 1. Create a todo, add a subtask
    // 2. Click ✕ on the subtask
    // 3. Assert subtask removed from list
    // 4. Assert progress bar and counter hidden (0 subtasks)
  });

  test('should show progress bar when subtask panel is collapsed', async ({ page }) => {
    // 1. Create a todo, add a subtask
    // 2. Collapse the subtask panel
    // 3. Assert progress bar still visible below todo title
    // 4. Assert subtask list is hidden
  });

  test('should not create subtask with empty title', async ({ page }) => {
    // 1. Expand subtask panel
    // 2. Click Add without entering title
    // 3. Assert no subtask row added
    // 4. Assert progress bar not shown
  });

  test('should cascade delete subtasks when parent todo is deleted', async ({ page }) => {
    // 1. Create a todo with subtasks
    // 2. Delete the parent todo
    // 3. Assert todo and all subtasks gone from UI
  });

  test('should include subtask titles in search results', async ({ page }) => {
    // 1. Create todo "Project Alpha" with subtask "unique-search-xyz"
    // 2. Type "unique-search-xyz" in search bar
    // 3. Assert "Project Alpha" todo appears in results
  });

  test('should maintain subtask order by position', async ({ page }) => {
    // 1. Add subtasks "Step 1", "Step 2", "Step 3" in order
    // 2. Assert they appear in creation order
  });

  test('should not affect parent todo completion when toggling subtasks', async ({ page }) => {
    // 1. Create a todo, add 2 subtasks
    // 2. Complete both subtasks
    // 3. Assert parent todo checkbox is still unchecked
  });

});
```

### Integration Tests

- Verify `subtaskDB.create()` auto-assigns incrementing `position` values
- Verify `subtaskDB.getByTodoId()` returns subtasks ordered by `position ASC`
- Verify `ON DELETE CASCADE` removes all subtasks when parent todo is deleted
- Verify API `POST` returns `400` for empty/whitespace titles
- Verify API `PUT`/`DELETE` returns `403` when the parent todo belongs to a different user
- Verify API endpoints return `404` for non-existent subtask IDs

---

## Out of Scope

- **Drag-and-drop reordering** of subtasks (position is insert-order only)
- **Nested subtasks** (subtasks within subtasks — only one level of hierarchy)
- **Due dates on subtasks** (only the parent todo has a due date)
- **Priority levels on subtasks** (only the parent todo has priority)
- **Reminders on subtasks** (only the parent todo supports reminders)
- **Tags on subtasks** (only the parent todo supports tags)
- **Bulk operations** (e.g., "Complete All" / "Delete All" subtasks button)
- **Subtask-level notifications** or email alerts
- **Subtask export** in CSV format (JSON export may include subtasks in the future)
- **Assigning subtasks** to different users

---

## Success Metrics

| Metric | Target |
|---|---|
| Progress bar renders accurately for 0%, partial, and 100% completion | 100% of cases |
| Subtask CRUD operations reflect in UI without page reload | < 300ms perceived response |
| CASCADE delete leaves zero orphaned subtask rows | 100% verified by integration test |
| Search returns parent todo when querying by subtask title | 100% of matching cases |
| All E2E test scenarios pass on Chromium with virtual WebAuthn authenticator | 10/10 tests passing |
| Unauthenticated and cross-user subtask API calls are blocked | 100% of cases |
| Progress bar and counter remain visible when subtask panel is collapsed | 100% of cases |
| Dark mode styling renders correctly for all subtask UI elements | Visual pass on manual review |
