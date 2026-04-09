# PRP 07: Template System

## Feature Overview

The Template System allows users to save frequently used todo configurations as reusable templates. A template captures the todo's title, priority, recurrence settings, recurrence pattern, and reminder timing. Users create templates from the todo form via a **"💾 Save as Template"** button or apply them instantly via a **"Use Template"** dropdown. A separate **"📋 Templates"** modal provides full template management (browse, use, delete). Templates support optional description and category fields for organization. Templates do **not** include specific due dates, tags, or subtasks.

---

## User Stories

### As a routine-oriented user
- I want to save a "Weekly Team Meeting" template so I can create the same todo configuration with one click each week.

### As a project manager
- I want to categorize templates (Work, Personal, Finance) so I can find them quickly.

### As a general user
- I want to use a template from a dropdown and have a todo created instantly without filling out the form.
- I want to delete templates I no longer need without affecting existing todos created from them.

---

## User Flow

### Saving a Template
1. User fills out the todo form (title, priority, recurrence, reminder)
2. The **"💾 Save as Template"** button appears when the title is non-empty
3. User clicks the button
4. A modal opens with:
   - **Name** (required) — pre-filled with the todo title
   - **Description** (optional)
   - **Category** (optional) — e.g., Work, Personal, Finance
5. User clicks **"Save Template"**
6. Template saved to the database

### Using a Template (Quick Dropdown)
1. User locates the **"Use Template"** dropdown on the todo form
2. Selects a template (shows `"Template Name (Category)"` if category exists)
3. A todo is created **instantly** with the template's settings
4. Due date is **not** set (user adds later if needed)

### Using a Template (Modal)
1. User clicks **"📋 Templates"** button in the top navigation
2. Template manager modal opens showing all templates
3. User clicks **"Use"** on any template
4. Todo created immediately; modal closes

### Deleting a Template
1. User opens template manager modal
2. Clicks **"Delete"** on a template
3. Confirms deletion
4. Template removed — **does not affect** existing todos created from it

---

## Technical Requirements

### Database Schema

**`templates` table**:

```sql
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  title_template TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  reminder_minutes INTEGER,
  subtasks_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

> `subtasks_json` stores a JSON array for future subtask template support: `[{ "title": "Step 1", "position": 0 }]`

### TypeScript Interfaces (`lib/db.ts`)

```typescript
export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface CreateTemplateDto {
  user_id: number;
  name: string;
  description?: string;
  category?: string;
  title_template: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
  subtasks_json?: string;
}
```

### Database Operations (`lib/db.ts`)

```typescript
export const templateDB = {
  getAll(userId: number): Template[],
  getById(id: number): Template | undefined,
  create(data: CreateTemplateDto): Template,
  delete(id: number): void,
};
```

### API Endpoints

#### `GET /api/templates`
Returns all templates for the authenticated user.

#### `POST /api/templates`
Creates a new template.

**Request**:
```json
{
  "name": "Weekly Meeting",
  "description": "Weekly team sync",
  "category": "Work",
  "title_template": "Team Meeting",
  "priority": "high",
  "is_recurring": true,
  "recurrence_pattern": "weekly",
  "reminder_minutes": 60
}
```

**Validation**: `name` and `title_template` are required and non-empty.

#### `DELETE /api/templates/[id]`
Deletes a template. Verifies ownership via `session.userId`.

#### `POST /api/templates/[id]/use`
Creates a todo from the template.

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.getById(parseInt(id));
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    priority: template.priority,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.recurrence_pattern ?? undefined,
    reminder_minutes: template.reminder_minutes ?? undefined,
  });

  return NextResponse.json(todo, { status: 201 });
}
```

---

## UI Components

### Save as Template Button

```tsx
{title.trim() && (
  <button onClick={() => setShowSaveTemplateModal(true)} className="text-sm text-green-600">
    💾 Save as Template
  </button>
)}
```

### Save Template Modal

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
    <h2>Save as Template</h2>
    <input type="text" value={templateName} placeholder="Template name (required)" />
    <textarea value={templateDesc} placeholder="Description (optional)" />
    <input type="text" value={templateCategory} placeholder="Category (optional)" />
    <button onClick={saveTemplate}>Save Template</button>
    <button onClick={() => setShowSaveTemplateModal(false)}>Cancel</button>
  </div>
</div>
```

### Use Template Dropdown

```tsx
<select onChange={e => useTemplate(parseInt(e.target.value))} defaultValue="">
  <option value="" disabled>Use Template</option>
  {templates.map(t => (
    <option key={t.id} value={t.id}>
      {t.name}{t.category ? ` (${t.category})` : ''}
    </option>
  ))}
</select>
```

### Template Manager Modal

Each template card displays:
- **Name** (bold)
- **Description** (if provided)
- **Category** badge (if provided)
- **Priority** badge (color-coded)
- **🔄 Recurrence** badge (if recurring, with pattern)
- **🔔 Reminder** badge (if set)
- **"Use"** and **"Delete"** buttons

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Template name is empty | API returns `400` |
| `title_template` is empty | API returns `400` |
| Template with no category | Category badge hidden; dropdown shows name only |
| Using a template creates a todo with no due date | Expected — user sets due date separately |
| Deleting a template | Does not affect existing todos created from it |
| Template has recurrence but used todo has no due date | Todo created as recurring, but reminder won't fire until due date is set |
| `subtasks_json` provided | Stored as JSON string; parsed when creating todo from template (future feature) |
| User has no templates | "Use Template" dropdown hidden; modal shows empty state |
| Template belongs to another user | API returns `403` on use/delete |

---

## Acceptance Criteria

- [ ] "💾 Save as Template" button appears when todo title is non-empty
- [ ] Save template modal captures name (required), description, and category
- [ ] Template saved with current form settings (priority, recurrence, reminder)
- [ ] "Use Template" dropdown lists all user templates with optional category
- [ ] Selecting a template creates a todo instantly
- [ ] "📋 Templates" button opens full template manager modal
- [ ] Template cards show name, description, category badge, priority badge, recurrence badge, reminder badge
- [ ] "Use" button in modal creates todo and closes modal
- [ ] "Delete" button removes template without affecting existing todos
- [ ] API validates required fields and ownership
- [ ] Dark mode renders modal and badges correctly

---

## Testing Requirements

### E2E Tests (Playwright — `tests/07-template-system.spec.ts`)

```typescript
test.describe('Template System', () => {
  test('should save a template from the todo form', async ({ page }) => {});
  test('should use a template from dropdown to create todo', async ({ page }) => {});
  test('should use a template from modal to create todo', async ({ page }) => {});
  test('should display template details in modal', async ({ page }) => {});
  test('should delete a template', async ({ page }) => {});
  test('should not show save button when title is empty', async ({ page }) => {});
  test('should show category in template dropdown', async ({ page }) => {});
});
```

### Integration Tests

- Verify `templateDB.create()` stores all fields including `subtasks_json`
- Verify `POST /api/templates/[id]/use` creates todo with correct settings
- Verify template deletion doesn't cascade to existing todos
- Verify API ownership checks

---

## Out of Scope

- Template editing after creation (delete and re-create)
- Template sharing between users
- Template import/export
- Template duplication
- Template usage statistics
- Auto-suggested templates based on user patterns
- Subtask creation from `subtasks_json` (stored but not yet consumed)
- Template ordering or favorites

---

## Success Metrics

| Metric | Target |
|---|---|
| Template creation stores all form settings accurately | 100% of fields |
| Todo created from template matches template settings | 100% of cases |
| Template deletion leaves existing todos intact | 100% verified |
| Template manager displays all template metadata | 100% of fields |
| All E2E tests pass | 7/7 tests |
