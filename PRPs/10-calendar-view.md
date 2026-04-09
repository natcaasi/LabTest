# PRP 10: Calendar View

## Feature Overview

The Calendar View provides a monthly grid visualization of todos organized by their due dates. Accessible via a dedicated `/calendar` route, it displays a full-month calendar where each date cell shows the todos due on that day, color-coded by priority. The view includes month navigation (◀/▶), Singapore public holiday integration, and synchronizes with the same data shown in the list view.

---

## User Stories

### As a planner
- I want to see my todos laid out on a calendar so I can spot overloaded days and balance my workload.

### As a professional
- I want to see Singapore public holidays on the calendar so I can plan around them.

### As a visual thinker
- I want color-coded priority indicators on the calendar so I can quickly identify urgent tasks at a glance.

---

## User Flow

### Navigating to Calendar
1. User clicks **"Calendar"** button (purple, top navigation area)
2. Browser navigates to `/calendar`
3. Calendar displays the current month

### Browsing Months
1. Click **◀** to go to previous month
2. Click **▶** to go to next month
3. Current month/year displayed in header (e.g., "November 2025")
4. Today's date is visually highlighted

### Viewing Todos on Calendar
1. Todos with due dates appear on their respective date cells
2. Each todo pill is color-coded by priority:
   - 🔴 Red = High
   - 🟡 Yellow = Medium
   - 🔵 Blue = Low
3. Multiple todos on the same day stack vertically
4. Todo title text is truncated if too long for the cell

### Calendar-Holiday Integration
1. Public holidays appear on their respective dates
2. Holiday dates may have special background or styling
3. Holiday names are displayed in the cell

### Returning to List View
1. Click browser back button, or
2. Navigate to home/root URL

---

## Technical Requirements

### Route & Page

```
Route: /calendar
File: app/calendar/page.tsx
Type: 'use client' (client component)
Auth: Protected by middleware.ts
```

### Data Fetching

```typescript
// Fetch todos for the current user
const res = await fetch('/api/todos');
const todos: Todo[] = await res.json();

// Fetch holidays for the displayed month/year
const holidayRes = await fetch(`/api/holidays?year=${year}&month=${month}`);
const holidays: Holiday[] = await holidayRes.json();
```

### Holiday API

```
GET /api/holidays?year=2025&month=11
```

**Implementation** (`app/api/holidays/route.ts`):
```typescript
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1).toString());

  const holidays = holidayDB.findByMonth(year, month);
  return NextResponse.json(holidays);
}
```

### Database — `holidays` Table

```sql
CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  country TEXT DEFAULT 'SG',
  created_at TEXT DEFAULT (datetime('now'))
);
```

Seeded via `npx tsx scripts/seed-holidays.ts` with Singapore public holidays.

### Calendar Grid Generation

```typescript
function generateCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sunday

  const days: CalendarDay[] = [];

  // Padding for days before month start
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: null, isCurrentMonth: false });
  }

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      todos: todosForDate(dateStr),
      holidays: holidaysForDate(dateStr),
    });
  }

  return days;
}
```

### State Management

```typescript
const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
const [todos, setTodos] = useState<Todo[]>([]);
const [holidays, setHolidays] = useState<Holiday[]>([]);

function prevMonth() {
  if (currentMonth === 1) {
    setCurrentMonth(12);
    setCurrentYear(currentYear - 1);
  } else {
    setCurrentMonth(currentMonth - 1);
  }
}

function nextMonth() {
  if (currentMonth === 12) {
    setCurrentMonth(1);
    setCurrentYear(currentYear + 1);
  } else {
    setCurrentMonth(currentMonth + 1);
  }
}
```

---

## UI Components

### Calendar Header

```tsx
<div className="flex items-center justify-between mb-4">
  <button onClick={prevMonth} className="text-2xl">◀</button>
  <h2 className="text-xl font-bold">
    {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
  </h2>
  <button onClick={nextMonth} className="text-2xl">▶</button>
</div>
```

### Calendar Grid

```tsx
<div className="grid grid-cols-7 gap-1">
  {/* Day headers */}
  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
    <div key={day} className="text-center font-bold p-2">{day}</div>
  ))}

  {/* Day cells */}
  {calendarDays.map((day, i) => (
    <div key={i} className={`min-h-[100px] border rounded p-1 ${
      day.isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''
    } ${!day.isCurrentMonth ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
      {day.date && (
        <>
          <div className="text-sm font-medium">{parseInt(day.date.split('-')[2])}</div>
          {/* Holidays */}
          {day.holidays?.map(h => (
            <div key={h.id} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 rounded px-1 mb-1">
              {h.name}
            </div>
          ))}
          {/* Todos */}
          {day.todos?.map(t => (
            <div key={t.id} className={`text-xs rounded px-1 mb-0.5 truncate ${
              t.priority === 'high' ? 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200' :
              t.priority === 'medium' ? 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200' :
              'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200'
            }`}>
              {t.title}
            </div>
          ))}
        </>
      )}
    </div>
  ))}
</div>
```

### Navigation Button (on main page)

```tsx
<a href="/calendar" className="bg-purple-500 text-white px-4 py-2 rounded">
  Calendar
</a>
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No todos have due dates | Calendar renders with empty cells |
| Many todos on one date (>5) | Cells scroll or truncate; no layout break |
| Todo with due date+time | Placed on the date portion of the datetime |
| Month with 28/29/30/31 days | Grid adjusts correctly |
| Year boundary (Dec → Jan) | Year increments/decrements properly |
| Holiday on same day as todos | Both displayed; holiday first, then todos |
| No holidays seeded | Calendar works without holiday data |
| Unauthenticated user visits /calendar | Redirected to login by middleware |
| Dark mode enabled | All elements readable with adapted colors |
| Completed todos | Still shown on calendar (same as list) |
| Recurring todo | Shown on its current due date |
| Mobile viewport | Grid remains usable (responsive) |

---

## Acceptance Criteria

- [ ] `/calendar` route renders a monthly grid
- [ ] Calendar shows current month by default
- [ ] ◀ and ▶ buttons navigate to previous/next month
- [ ] Month/year header updates when navigating
- [ ] Today's date is visually highlighted
- [ ] Todos appear on their due-date cells
- [ ] Todos are color-coded by priority (red/yellow/blue)
- [ ] Singapore public holidays are displayed on correct dates
- [ ] Holiday styling is distinct from todo styling
- [ ] Week starts on Sunday with labeled column headers
- [ ] Calendar grid properly pads days before month start
- [ ] Route is protected by authentication middleware
- [ ] Dark mode is fully supported
- [ ] Calendar button is accessible from the main todo page

---

## Testing Requirements

### E2E Tests (Playwright — `tests/10-calendar-view.spec.ts`)

```typescript
test.describe('Calendar View', () => {
  test('should navigate to calendar page', async ({ page }) => {});
  test('should display current month and year', async ({ page }) => {});
  test('should navigate to previous month', async ({ page }) => {});
  test('should navigate to next month', async ({ page }) => {});
  test('should display todos on their due dates', async ({ page }) => {});
  test('should color-code todos by priority', async ({ page }) => {});
  test('should highlight today', async ({ page }) => {});
  test('should display Singapore holidays', async ({ page }) => {});
  test('should handle month boundary (Dec to Jan)', async ({ page }) => {});
  test('should require authentication', async ({ page }) => {});
});
```

---

## Out of Scope

- Weekly or daily calendar views
- Drag-and-drop rescheduling of todos
- Clicking a date to create a new todo
- Todo detail popover on hover/click
- iCal/Google Calendar sync
- Multi-month view
- Agenda/list view within calendar page
- Time-slot scheduling within a day

---

## Success Metrics

| Metric | Target |
|---|---|
| Todos placed on correct due-date cells | 100% |
| Priority color coding matches badges | 100% |
| Month navigation handles all boundary cases | 100% |
| Holidays displayed for Singapore | All gazetted holidays |
| Calendar renders within 500ms | 95th percentile |
| All E2E tests pass | 10/10 tests |
