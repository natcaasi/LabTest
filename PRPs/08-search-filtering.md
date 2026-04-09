# PRP 08: Search & Filtering

## Feature Overview

The Search & Filtering feature provides a powerful, client-side system for finding and narrowing down todos. It includes a real-time text search bar (searches todo titles **and** subtask titles), quick-filter dropdowns for priority and tag, an advanced panel with completion status and date range filters, and saved filter presets stored in `localStorage`. All active filters use **AND** logic. The UI updates instantly as the user types or selects filter criteria.

---

## User Stories

### As a power user
- I want to search by keyword and find todos even when the keyword appears only in a subtask, so nothing is missed.
- I want to combine search + priority + tag + date range to drill down to exactly the todos I need.

### As a daily planner
- I want to save a "Today's High Priority" filter preset so I can apply it with one click each morning.

### As a reviewer
- I want to filter by completion status to review what I've accomplished this week.

---

## User Flow

### Basic Search
1. User types in the search bar (placeholder: "Search todos and subtasks...")
2. Results filter in real-time as the user types (case-insensitive, partial match)
3. Both todo titles and subtask titles are searched
4. User clicks ✕ or deletes text to clear the search

### Quick Filters
1. User selects from **"All Priorities"** dropdown to filter by priority
2. User selects from **"All Tags"** dropdown to filter by tag
3. Both combine with the search query (AND logic)

### Advanced Filters
1. User clicks **"▶ Advanced"** to expand the advanced panel
2. User selects completion status: All Todos / Incomplete Only / Completed Only
3. User sets date range: Due Date From and/or Due Date To
4. All filters combine with AND logic

### Saving a Filter Preset
1. User applies any combination of filters
2. **"💾 Save Filter"** button appears (green)
3. User clicks it; modal shows current filter summary
4. User enters a preset name and clicks **"Save"**
5. Preset stored in `localStorage`

### Applying a Saved Preset
1. User opens the advanced panel
2. Clicks a preset name in the **"Saved Filter Presets"** section
3. All filters applied instantly (overwrites current filters)

### Deleting a Preset
1. User clicks ✕ next to a saved preset name
2. Preset removed from `localStorage`

### Clearing All Filters
1. User clicks **"Clear All"** button (red) — appears whenever any filter is active
2. All filters reset to defaults; full todo list restored

---

## Technical Requirements

### Client-Side Filtering

All filtering happens in `app/page.tsx` — no additional API endpoints. The full todo list is already fetched via `GET /api/todos`.

```typescript
function filterTodos(todos: Todo[]): Todo[] {
  return todos.filter(todo => {
    // Search filter (title + subtask titles)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = todo.title.toLowerCase().includes(q);
      const subtaskMatch = todo.subtasks?.some(s => s.title.toLowerCase().includes(q));
      if (!titleMatch && !subtaskMatch) return false;
    }

    // Priority filter
    if (priorityFilter && todo.priority !== priorityFilter) return false;

    // Tag filter
    if (tagFilter && !todo.tags?.some(t => t.id === tagFilter)) return false;

    // Completion filter
    if (completionFilter === 'incomplete' && todo.completed) return false;
    if (completionFilter === 'completed' && !todo.completed) return false;

    // Date range filter
    if (dateFrom && todo.due_date && new Date(todo.due_date) < new Date(dateFrom)) return false;
    if (dateTo && todo.due_date && new Date(todo.due_date) > new Date(dateTo + 'T23:59:59')) return false;
    if ((dateFrom || dateTo) && !todo.due_date) return false;

    return true;
  });
}
```

### Filter State

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
const [tagFilter, setTagFilter] = useState<number | ''>('');
const [completionFilter, setCompletionFilter] = useState<'all' | 'incomplete' | 'completed'>('all');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');
const [showAdvanced, setShowAdvanced] = useState(false);
```

### Saved Presets (localStorage)

```typescript
interface FilterPreset {
  name: string;
  searchQuery: string;
  priorityFilter: string;
  tagFilter: number | '';
  completionFilter: string;
  dateFrom: string;
  dateTo: string;
}

function savePreset(preset: FilterPreset) {
  const presets = JSON.parse(localStorage.getItem('filterPresets') || '[]');
  presets.push(preset);
  localStorage.setItem('filterPresets', JSON.stringify(presets));
}

function deletePreset(name: string) {
  const presets = JSON.parse(localStorage.getItem('filterPresets') || '[]');
  const filtered = presets.filter((p: FilterPreset) => p.name !== name);
  localStorage.setItem('filterPresets', JSON.stringify(filtered));
}
```

---

## UI Components

### Search Bar

```tsx
<div className="relative">
  <span className="absolute left-3 top-2.5">🔍</span>
  <input
    type="text"
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    placeholder="Search todos and subtasks..."
    className="w-full pl-10 pr-10 py-2 border rounded dark:bg-gray-800"
  />
  {searchQuery && (
    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5">✕</button>
  )}
</div>
```

### Quick Filter Row

```tsx
<div className="flex gap-2">
  {/* Priority filter */}
  <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | '')}>
    <option value="">All Priorities</option>
    <option value="high">High Priority</option>
    <option value="medium">Medium Priority</option>
    <option value="low">Low Priority</option>
  </select>

  {/* Tag filter */}
  {tags.length > 0 && (
    <select value={tagFilter} onChange={e => setTagFilter(e.target.value ? parseInt(e.target.value) : '')}>
      <option value="">All Tags</option>
      {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  )}

  {/* Advanced toggle */}
  <button onClick={() => setShowAdvanced(!showAdvanced)}>
    {showAdvanced ? '▼ Advanced' : '▶ Advanced'}
  </button>

  {/* Active filter actions */}
  {hasActiveFilters && (
    <>
      <button onClick={clearAllFilters} className="text-red-600">Clear All</button>
      <button onClick={() => setShowSaveModal(true)} className="text-green-600">💾 Save Filter</button>
    </>
  )}
</div>
```

### Advanced Filters Panel

```tsx
{showAdvanced && (
  <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-4 space-y-3">
    {/* Completion status */}
    <select value={completionFilter} onChange={e => setCompletionFilter(e.target.value)}>
      <option value="all">All Todos</option>
      <option value="incomplete">Incomplete Only</option>
      <option value="completed">Completed Only</option>
    </select>

    {/* Date range */}
    <div className="flex gap-2">
      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="Due Date From" />
      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="Due Date To" />
    </div>

    {/* Saved presets */}
    {presets.length > 0 && (
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <div key={p.name} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 rounded-full px-3 py-1">
            <button onClick={() => applyPreset(p)}>{p.name}</button>
            <button onClick={() => deletePreset(p.name)}>✕</button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Search for a subtask title | Parent todo appears in filtered results |
| Search term matches nothing | All sections empty; "no results" state shown |
| All filters cleared | Full todo list restored |
| Date range with only "From" | Shows todos due on or after that date |
| Date range with only "To" | Shows todos due on or before that date |
| Date range active but todo has no due date | Todo is excluded |
| Priority + tag + search combined | All must match (AND logic) |
| Saved preset applied | Overwrites all current filter values |
| Duplicate preset name | Allowed (user responsibility) |
| localStorage unavailable | Presets feature degrades gracefully — no crash |
| Empty search string | No filter applied (shows all) |
| Tag filter dropdown: no tags exist | Dropdown is hidden |
| Section counts with filters active | Counts update to reflect filtered results |

---

## Acceptance Criteria

- [ ] Search bar filters in real-time as user types
- [ ] Search is case-insensitive and supports partial matching
- [ ] Search includes subtask titles — parent todo appears in results
- [ ] Clear button (✕) appears when search has text; clears on click
- [ ] Priority filter dropdown filters by selected priority
- [ ] Tag filter dropdown filters by selected tag (hidden if no tags)
- [ ] Advanced panel toggles with ▶/▼ button
- [ ] Completion filter: All / Incomplete Only / Completed Only
- [ ] Date range filter works with From only, To only, or both
- [ ] Date range excludes todos without due dates
- [ ] All filters use AND logic when combined
- [ ] "Clear All" resets all filters
- [ ] "💾 Save Filter" saves current combination to localStorage
- [ ] Saved presets appear in advanced panel and can be applied or deleted
- [ ] Section counters (Overdue, Pending, Completed) update with filter results

---

## Testing Requirements

### E2E Tests (Playwright — `tests/08-search-filtering.spec.ts`)

```typescript
test.describe('Search & Filtering', () => {
  test('should search by todo title', async ({ page }) => {});
  test('should search by subtask title', async ({ page }) => {});
  test('should clear search with X button', async ({ page }) => {});
  test('should filter by priority', async ({ page }) => {});
  test('should filter by tag', async ({ page }) => {});
  test('should filter by completion status', async ({ page }) => {});
  test('should filter by date range', async ({ page }) => {});
  test('should combine multiple filters with AND logic', async ({ page }) => {});
  test('should save and apply a filter preset', async ({ page }) => {});
  test('should delete a saved preset', async ({ page }) => {});
  test('should clear all filters', async ({ page }) => {});
});
```

### Unit Tests

- Verify `filterTodos()` with various filter combinations
- Verify subtask title matching
- Verify date range boundary conditions

---

## Out of Scope

- Server-side search / full-text search indexing
- Fuzzy matching / typo tolerance
- Search highlighting (bolding matched text)
- Search history / recent searches
- Filter presets synced to database (only localStorage)
- OR logic between filters
- Regex search
- Saved presets per user (localStorage is per browser/device)

---

## Success Metrics

| Metric | Target |
|---|---|
| Search results update within 100ms of keystroke | 100% of cases |
| Subtask title search surfaces parent todo | 100% of matching cases |
| Combined filters produce correct AND results | 100% of combinations |
| Saved presets persist across page refreshes | 100% (localStorage) |
| Section counts accurate after filtering | 100% of cases |
| All E2E tests pass | 11/11 tests |
