# PRP 06: Tag System

## Feature Overview

The Tag System allows users to organize todos with custom, color-coded labels. Tags follow a **many-to-many** relationship with todos via a junction table (`todo_tags`). Each user manages their own set of tags through a dedicated modal (create, edit, delete). Tags appear as colored pills on todo cards and can be used to filter the entire todo list. Tag names are unique per user, and deleting a tag cascade-removes all associations.

---

## User Stories

### As an organized user
- I want to create custom tags with names and colors so I can categorize my todos by project, context, or topic.
- I want to assign multiple tags to a single todo for cross-category visibility.

### As a reviewer
- I want to filter my todo list by tag so I can focus on a specific project or area.

### As a power user
- I want to edit a tag's name or color and have the change reflected across all associated todos instantly.
- I want to delete a tag and know all associations are cleaned up automatically.

---

## User Flow

### Creating a Tag
1. User clicks **"+ Manage Tags"** button near the todo form
2. Tag management modal opens
3. User enters tag name in text field
4. User selects a color via the color picker or enters a hex code (default: `#3B82F6`)
5. User clicks **"Create Tag"**
6. Tag appears in the tag list within the modal and becomes available for selection

### Assigning Tags to Todos
1. When creating or editing a todo, tag pills appear below the form (if tags exist)
2. User clicks a tag pill to select it (checkmark appears, colored background, white text)
3. User clicks again to deselect (checkmark removed, gray border)
4. Multiple tags can be selected simultaneously
5. Selected tags are saved with the todo on submit

### Editing a Tag
1. User opens tag management modal
2. Clicks **"Edit"** next to any tag
3. Modifies name and/or color
4. Clicks **"Update"**
5. Changes reflect on all todos that use this tag

### Deleting a Tag
1. User opens tag management modal
2. Clicks **"Delete"** next to a tag
3. Confirms deletion
4. Tag removed from all todos (CASCADE) and from the tag list

### Filtering by Tag
1. User selects a tag from the **"All Tags"** dropdown in the filter bar
2. Only todos with the selected tag are shown
3. Filter combines with other active filters (AND logic)
4. Selecting **"All Tags"** clears the tag filter

---

## Technical Requirements

### Database Schema

**`tags` table**:

```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);
```

**`todo_tags` junction table**:

```sql
CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);
```

### TypeScript Interfaces (`lib/db.ts`)

```typescript
export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateTagDto {
  user_id: number;
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}
```

### Database CRUD Operations (`lib/db.ts`)

```typescript
export const tagDB = {
  getAll(userId: number): Tag[],
  getById(id: number): Tag | undefined,
  getByTodoId(todoId: number): Tag[],
  create(data: CreateTagDto): Tag,
  update(id: number, data: UpdateTagDto): Tag,
  delete(id: number): void,
  linkToTodo(todoId: number, tagId: number): void,
  unlinkFromTodo(todoId: number, tagId: number): void,
  setTodoTags(todoId: number, tagIds: number[]): void,  // Replace all tags for a todo
};
```

### API Endpoints

#### `GET /api/tags`
Returns all tags for the authenticated user.

#### `POST /api/tags`
Creates a new tag. Validates unique name per user.

**Request**: `{ "name": "Work", "color": "#EF4444" }`
**Response 201**: Tag object.
**Error 409**: Duplicate name.

#### `PUT /api/tags/[id]`
Updates tag name and/or color.

#### `DELETE /api/tags/[id]`
Deletes tag and all `todo_tags` associations (CASCADE).

#### Tag assignment on todos:
- `POST /api/todos` and `PUT /api/todos/[id]` accept a `tagIds: number[]` field
- The API calls `tagDB.setTodoTags()` to replace all tag links

---

## UI Components

### Tag Management Modal

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
    <h2 className="text-lg font-bold mb-4">Manage Tags</h2>

    {/* Create form */}
    <div className="flex gap-2 mb-4">
      <input type="text" value={tagName} onChange={...} placeholder="Tag name" />
      <input type="color" value={tagColor} onChange={...} />
      <input type="text" value={tagColor} onChange={...} placeholder="#3B82F6" />
      <button onClick={createTag}>Create Tag</button>
    </div>

    {/* Tag list */}
    {tags.map(tag => (
      <div key={tag.id} className="flex items-center gap-2">
        <span style={{ backgroundColor: tag.color }} className="px-2 py-0.5 rounded-full text-white text-sm">
          {tag.name}
        </span>
        <button onClick={() => editTag(tag)}>Edit</button>
        <button onClick={() => deleteTag(tag.id)}>Delete</button>
      </div>
    ))}
  </div>
</div>
```

### Tag Selection Pills (on todo form)

```tsx
{tags.map(tag => (
  <button
    key={tag.id}
    onClick={() => toggleTag(tag.id)}
    className={selectedTagIds.includes(tag.id)
      ? 'text-white rounded-full px-3 py-1'
      : 'border border-gray-300 rounded-full px-3 py-1'}
    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
  >
    {selectedTagIds.includes(tag.id) && '✓ '}{tag.name}
  </button>
))}
```

### Tag Pills on Todo Cards

```tsx
{todo.tags?.map(tag => (
  <span
    key={tag.id}
    style={{ backgroundColor: tag.color }}
    className="text-xs text-white px-2 py-0.5 rounded-full"
  >
    {tag.name}
  </span>
))}
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Duplicate tag name for same user | API returns `409 Conflict` |
| Duplicate tag name for different users | Allowed — tags are user-scoped |
| Deleting a tag used by multiple todos | CASCADE removes all `todo_tags` rows; todos unaffected |
| Editing tag color | All todo cards update immediately on next fetch |
| Assigning same tag twice to a todo | `PRIMARY KEY (todo_id, tag_id)` prevents duplicates |
| Tag name with special characters | Allowed; HTML-escaped on render |
| Empty tag name | API returns `400` |
| Very long tag name (>100 chars) | API should reject or truncate |
| No tags exist yet | Tag selection area hidden on todo form; filter dropdown hidden |
| Recurring todo completed | New instance inherits all tag associations |
| Dark mode | Tag pills retain custom color; white text for contrast |

---

## Acceptance Criteria

- [ ] User can create tags with custom name and color via modal
- [ ] Default tag color is `#3B82F6` (blue)
- [ ] Duplicate tag names per user are rejected (`409`)
- [ ] User can edit tag name and color; changes reflect on all associated todos
- [ ] User can delete a tag; associations cascade-removed
- [ ] Tags appear as colored pills on todo cards
- [ ] User can select/deselect multiple tags when creating or editing a todo
- [ ] Selected tags show checkmark, colored background, white text
- [ ] Tag filter dropdown filters the todo list by selected tag
- [ ] Tag filter combines with other filters (AND logic)
- [ ] Tags are user-scoped — users see only their own tags
- [ ] Recurring todo new instance inherits all tags
- [ ] Dark mode rendering is correct

---

## Testing Requirements

### E2E Tests (Playwright — `tests/06-tag-system.spec.ts`)

```typescript
test.describe('Tag System', () => {
  test('should create a tag with name and color', async ({ page }) => {});
  test('should reject duplicate tag name', async ({ page }) => {});
  test('should edit tag name and color', async ({ page }) => {});
  test('should delete tag and remove from todos', async ({ page }) => {});
  test('should assign tags to a todo', async ({ page }) => {});
  test('should display tag pills on todo cards', async ({ page }) => {});
  test('should filter todos by tag', async ({ page }) => {});
  test('should clear tag filter', async ({ page }) => {});
});
```

### Integration Tests

- Verify `UNIQUE(user_id, name)` constraint
- Verify `ON DELETE CASCADE` on `todo_tags`
- Verify `tagDB.setTodoTags()` replaces all associations
- Verify tags inherited when recurring todo is completed

---

## Out of Scope

- Tag groups / nested tag hierarchies
- Tag icons or emoji
- Tag usage statistics / analytics
- Drag-and-drop tag reordering
- Bulk tag assignment to multiple todos at once
- Auto-suggested tags based on todo title
- Tag sharing between users
- Tag import/export

---

## Success Metrics

| Metric | Target |
|---|---|
| Tag CRUD operations work without page reload | 100% of operations |
| Many-to-many relationship correctly maintained | 100% of cases |
| Cascade delete leaves no orphaned `todo_tags` rows | 100% verified |
| Tag filter correctly shows/hides todos | 100% of cases |
| Tag pills render with correct color and name | 100% of cases |
| All E2E tests pass | 8/8 tests |
