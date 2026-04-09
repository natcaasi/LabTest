# PRP 03: Recurring Todos

## Feature Overview

The Recurring Todos feature allows users to create tasks that automatically repeat on a schedule. When a recurring todo is marked as completed, the system creates a new instance for the next occurrence with the same title, priority, tags, reminder offset, and recurrence pattern. Four recurrence patterns are supported: **Daily**, **Weekly**, **Monthly**, and **Yearly**. A due date is required for recurring todos. Recurring todos display a purple **🔄** badge with the pattern name.

---

## User Stories

### As a professional
- I want to create a weekly recurring todo for team meetings so a new task appears each week after I complete the current one.
- I want the next instance to keep the same priority and tags so I don't have to reconfigure every time.

### As a health-conscious user
- I want daily recurring todos for exercise and medication so I never forget routine habits.

### As a finance manager
- I want monthly recurring todos for bill payments so I'm always reminded when the cycle resets.

---

## User Flow

### Creating a Recurring Todo
1. User enters a todo title
2. User checks the **"Repeat"** checkbox
3. A recurrence pattern dropdown appears: Daily, Weekly, Monthly, Yearly
4. User selects the desired pattern
5. User **must** set a due date (field becomes required when Repeat is checked)
6. User clicks **"Add"**
7. The todo displays with a **🔄 weekly** (or daily/monthly/yearly) badge

### Completing a Recurring Todo
1. User clicks the checkbox on a recurring todo
2. The current instance is marked as completed and moves to the Completed section
3. The system automatically creates a **new instance** with:
   - Same title
   - Same priority
   - Same recurrence pattern and `is_recurring = true`
   - Same reminder offset (`reminder_minutes`)
   - Same tags (re-linked)
   - **New due date** calculated from the current due date + pattern interval
4. The new instance appears in the Pending section

### Editing Recurrence
1. User clicks **"Edit"** on a recurring todo
2. In the modal, user can toggle the Repeat checkbox on/off
3. User can change the recurrence pattern
4. Removing recurrence makes it a one-time todo
5. Adding recurrence to a non-recurring todo requires a due date

---

## Technical Requirements

### Database Schema

Recurrence fields on the `todos` table:

```sql
is_recurring INTEGER NOT NULL DEFAULT 0,       -- 0 = false, 1 = true
recurrence_pattern TEXT                          -- 'daily' | 'weekly' | 'monthly' | 'yearly' | NULL
```

### TypeScript Types (`lib/db.ts`)

```typescript
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

### Due Date Calculation

```typescript
import { getSingaporeNow } from '@/lib/timezone';

function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): string {
  const date = new Date(currentDueDate);
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString();
}
```

### Completion Handler (PUT `/api/todos/[id]`)

When `completed` changes to `true` and `is_recurring` is `true`:

```typescript
if (body.completed && existingTodo.is_recurring && existingTodo.recurrence_pattern) {
  const nextDueDate = calculateNextDueDate(
    existingTodo.due_date!,
    existingTodo.recurrence_pattern as RecurrencePattern
  );

  const newTodo = todoDB.create({
    user_id: session.userId,
    title: existingTodo.title,
    due_date: nextDueDate,
    priority: existingTodo.priority,
    is_recurring: true,
    recurrence_pattern: existingTodo.recurrence_pattern,
    reminder_minutes: existingTodo.reminder_minutes ?? undefined,
  });

  // Re-link tags from completed instance to new instance
  const tags = tagDB.getByTodoId(existingTodo.id);
  for (const tag of tags) {
    tagDB.linkToTodo(newTodo.id, tag.id);
  }
}
```

### API Validation

- If `is_recurring` is `true`, `due_date` is required — return `400` if missing
- `recurrence_pattern` must be one of `daily`, `weekly`, `monthly`, `yearly`

---

## UI Components

### Repeat Checkbox and Pattern Dropdown

```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={isRecurring}
    onChange={e => setIsRecurring(e.target.checked)}
  />
  Repeat
</label>

{isRecurring && (
  <select
    value={recurrencePattern}
    onChange={e => setRecurrencePattern(e.target.value as RecurrencePattern)}
  >
    <option value="daily">Daily</option>
    <option value="weekly">Weekly</option>
    <option value="monthly">Monthly</option>
    <option value="yearly">Yearly</option>
  </select>
)}
```

### Recurrence Badge

```tsx
{todo.is_recurring && todo.recurrence_pattern && (
  <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-300 dark:border-purple-700 px-2 py-0.5 rounded">
    🔄 {todo.recurrence_pattern}
  </span>
)}
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Recurring todo without due date | API rejects with `400` |
| Invalid recurrence pattern | API rejects with `400` |
| Monthly recurrence on Jan 31 | Next due date = Feb 28/29 (JS Date handles overflow) |
| Yearly recurrence on Feb 29 | Next instance on Mar 1 in non-leap years (JS Date behavior) |
| Uncompleting a recurring todo whose next instance was created | Next instance already exists; uncompleting does NOT delete it |
| Editing recurrence pattern after creation | Changes apply to current instance only; past instances unaffected |
| Removing recurrence from a recurring todo | `is_recurring` set to false; no new instance on completion |
| Completing recurring todo that also has subtasks | Subtasks belong to completed instance; new instance has no subtasks |
| Completing recurring todo that also has tags | Tags are re-linked to the new instance |

---

## Acceptance Criteria

- [ ] "Repeat" checkbox appears on the creation form
- [ ] Checking Repeat reveals pattern dropdown (Daily/Weekly/Monthly/Yearly)
- [ ] Due date is required when Repeat is checked
- [ ] Recurring todos display 🔄 badge with pattern name
- [ ] Completing a recurring todo creates a new instance with the next due date
- [ ] New instance inherits title, priority, tags, reminder offset, and recurrence settings
- [ ] New instance appears in Pending section
- [ ] User can edit recurrence settings via the edit modal
- [ ] Disabling recurrence makes the todo one-time
- [ ] API rejects recurring todo without due date (`400`)
- [ ] Badge adapts to dark mode

---

## Testing Requirements

### E2E Tests (Playwright — `tests/03-recurring-todos.spec.ts`)

```typescript
test.describe('Recurring Todos', () => {
  test('should create a recurring todo with weekly pattern', async ({ page }) => {});
  test('should display recurrence badge', async ({ page }) => {});
  test('should require due date for recurring todos', async ({ page }) => {});
  test('should create next instance on completion', async ({ page }) => {});
  test('should inherit priority in next instance', async ({ page }) => {});
  test('should calculate correct next due date for daily', async ({ page }) => {});
  test('should calculate correct next due date for monthly', async ({ page }) => {});
  test('should remove recurrence via edit', async ({ page }) => {});
});
```

### Integration Tests

- Verify `calculateNextDueDate()` for all four patterns
- Verify new instance creation includes all inherited fields
- Verify tag re-linking to new instance
- Verify API rejects recurring todo without due date

---

## Out of Scope

- Custom recurrence intervals (e.g., every 3 days, every 2 weeks)
- Specific day-of-week selection (e.g., "repeat every Monday and Wednesday")
- End date / max occurrences for recurrence
- Skipping an occurrence without completing
- Recurrence history / timeline view
- iCal / RRULE specification support

---

## Success Metrics

| Metric | Target |
|---|---|
| Next instance created on completion with correct due date | 100% of recurring completions |
| All metadata inherited (priority, tags, reminder, pattern) | 100% of new instances |
| Recurrence badge displays correctly | 100% of recurring todos |
| API validation blocks missing due date | 100% of cases |
| All E2E tests pass | 8/8 tests |
