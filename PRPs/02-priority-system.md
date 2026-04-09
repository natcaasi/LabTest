# PRP 02: Priority System

## Feature Overview

The Priority System adds a three-level importance classification (High, Medium, Low) to every todo. Each level has a distinct color-coded badge (Red, Yellow, Blue) that appears next to the todo title in all views. Todos are automatically sorted by priority within each section (Overdue, Pending, Completed), and users can filter the entire list by a specific priority level. The default priority for new todos is **Medium**.

---

## User Stories

### As a busy professional
- I want to assign a priority to each todo so the most critical tasks stand out visually.
- I want my todo list automatically sorted with high-priority items first so I can focus without manual reordering.

### As a project manager
- I want to filter todos by priority so I can quickly review all urgent items across my list.

### As a general user
- I want to change a todo's priority after creation so I can reprioritize as circumstances change.
- I want priority colors that are easy to distinguish at a glance, including in dark mode.

---

## User Flow

### Setting Priority on Creation
1. User fills in the todo title
2. User selects a priority from the dropdown: **High**, **Medium** (default), or **Low**
3. User clicks **"Add"**
4. The new todo displays with the appropriate color-coded badge

### Changing Priority via Edit
1. User clicks **"Edit"** on a todo
2. In the edit modal, user changes the priority dropdown
3. User clicks **"Update"**
4. The badge color updates and the todo re-sorts within its section

### Filtering by Priority
1. User selects a priority from the **"All Priorities"** dropdown in the filter bar
2. Only todos matching the selected priority are shown
3. User selects **"All Priorities"** to clear the filter

---

## Technical Requirements

### Database Schema

Priority is stored as a `TEXT` column on the `todos` table:

```sql
priority TEXT NOT NULL DEFAULT 'medium'  -- 'high' | 'medium' | 'low'
```

### TypeScript Types (`lib/db.ts`)

```typescript
export type Priority = 'high' | 'medium' | 'low';
```

The `Todo` interface includes `priority: Priority`.

### Sorting Logic

Within each section (Overdue / Pending / Completed), sort order is:

1. **Priority weight**: High (3) → Medium (2) → Low (1)
2. **Due date**: Earliest first (nulls last)
3. **Created date**: Newest first

```typescript
const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (pw !== 0) return pw;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
```

### API Validation

On `POST /api/todos` and `PUT /api/todos/[id]`, validate `priority`:

```typescript
const validPriorities: Priority[] = ['high', 'medium', 'low'];
if (priority && !validPriorities.includes(priority)) {
  return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
}
```

---

## UI Components

### Priority Badge

```tsx
function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[priority]}`}>
      {priority}
    </span>
  );
}
```

### Priority Dropdown (Form)

```tsx
<select
  value={priority}
  onChange={e => setPriority(e.target.value as Priority)}
  className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"
>
  <option value="high">High</option>
  <option value="medium">Medium</option>
  <option value="low">Low</option>
</select>
```

### Priority Filter Dropdown

```tsx
<select
  value={priorityFilter}
  onChange={e => setPriorityFilter(e.target.value)}
  className="border rounded px-2 py-1"
>
  <option value="">All Priorities</option>
  <option value="high">High Priority</option>
  <option value="medium">Medium Priority</option>
  <option value="low">Low Priority</option>
</select>
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No priority specified on creation | Defaults to `medium` |
| Invalid priority value (e.g., `"urgent"`) | API returns `400 Bad Request` |
| Priority filter combined with search | AND logic — both must match |
| All todos filtered out by priority | Sections collapse; "no results" state shown |
| Recurring todo completed | Next instance inherits same priority |
| Dark mode active | Badge colors adapt via Tailwind dark variants |
| Priority changed via edit | Todo re-sorts in its section immediately |

---

## Acceptance Criteria

- [ ] Priority dropdown shows High, Medium, Low options on the creation form
- [ ] Default priority is Medium when none selected
- [ ] Each priority displays a color-coded badge: Red (High), Yellow (Medium), Blue (Low)
- [ ] Todos are sorted by priority (High first) within each section
- [ ] User can change priority via the edit modal
- [ ] Priority filter dropdown filters the entire todo list
- [ ] Selecting "All Priorities" clears the filter
- [ ] Priority filter works in combination with other filters (AND logic)
- [ ] Invalid priority values are rejected by the API with `400`
- [ ] Badges adapt correctly in dark mode
- [ ] Recurring todo next instance inherits priority

---

## Testing Requirements

### E2E Tests (Playwright — `tests/02-todo-crud.spec.ts`)

```typescript
test.describe('Priority System', () => {
  test('should default to medium priority', async ({ page }) => {});
  test('should create high-priority todo with red badge', async ({ page }) => {});
  test('should create low-priority todo with blue badge', async ({ page }) => {});
  test('should sort todos by priority within section', async ({ page }) => {});
  test('should change priority via edit modal', async ({ page }) => {});
  test('should filter todos by priority', async ({ page }) => {});
  test('should clear priority filter with "All Priorities"', async ({ page }) => {});
});
```

### Integration Tests

- Verify `todoDB.create()` defaults to `medium` when priority omitted
- Verify API rejects invalid priority values
- Verify sorting returns High → Medium → Low order

---

## Out of Scope

- Custom priority levels beyond the three predefined
- Priority-based color for the entire todo card background
- Priority icons (emoji/icons) — only text badges
- Priority statistics or analytics dashboard
- Automatic priority escalation based on approaching due date

---

## Success Metrics

| Metric | Target |
|---|---|
| Badge color matches priority level | 100% of cases |
| Sort order respects priority weighting | 100% of cases |
| Priority filter correctly includes/excludes todos | 100% of cases |
| Default priority assigned when omitted | 100% of creates |
| Dark mode badge rendering correct | Visual pass |
| All E2E tests pass | 7/7 tests |
