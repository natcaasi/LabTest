# PRP 04: Reminders & Notifications

## Feature Overview

The Reminders & Notifications feature enables browser-based push notifications that alert users before a todo's due date. Users select a reminder offset (15 minutes to 1 week before) when creating or editing a todo. A backend polling endpoint checks for pending reminders every minute, and the frontend triggers browser notifications when the reminder time arrives. Each reminder fires only once, tracked via `last_notification_sent`. A **🔔** badge with abbreviated timing is displayed on todos that have reminders set. All time calculations use **Singapore timezone**.

---

## User Stories

### As a forgetful user
- I want to receive a browser notification before a todo is due so I don't miss deadlines.
- I want to choose how far in advance I'm reminded (15 min, 1 hour, 1 day, etc.).

### As a planner
- I want to see which todos have reminders at a glance via a 🔔 badge so I know what's covered.
- I want to remove a reminder by selecting "None" so I can stop notifications for certain tasks.

### As a mobile/multi-tab user
- I want notifications even when the app tab is in the background so I don't have to keep it focused.

---

## User Flow

### Enabling Notifications
1. User clicks **"🔔 Enable Notifications"** button (orange, top-right)
2. Browser prompts for notification permission
3. User grants permission
4. Button changes to **"🔔 Notifications On"** (green badge)
5. If denied, button remains orange; reminders are stored but notifications won't fire

### Setting a Reminder
1. User creates or edits a todo that has a due date
2. The **"Reminder"** dropdown becomes enabled (disabled when no due date)
3. User selects a timing:
   - 15 minutes before
   - 30 minutes before
   - 1 hour before
   - 2 hours before
   - 1 day before
   - 2 days before
   - 1 week before
4. User saves the todo
5. A **🔔 15m** (or 30m / 1h / 2h / 1d / 2d / 1w) badge appears on the todo

### Receiving a Notification
1. Frontend polls `GET /api/notifications/check` every 60 seconds
2. Endpoint returns todos whose `reminder_time <= now` AND `last_notification_sent IS NULL`
3. Frontend displays a browser notification with the todo title and due date
4. Backend marks `last_notification_sent` to prevent duplicates

### Removing a Reminder
1. User edits the todo
2. Selects **"None"** from the Reminder dropdown
3. `reminder_minutes` set to `null`; badge disappears

---

## Technical Requirements

### Database Schema

Reminder fields on the `todos` table:

```sql
reminder_minutes INTEGER,          -- NULL = no reminder; 15, 30, 60, 120, 1440, 2880, 10080
last_notification_sent TEXT         -- ISO timestamp of when notification was sent; NULL = not yet sent
```

### Reminder Timing Map

```typescript
const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before', badge: '15m' },
  { value: 30, label: '30 minutes before', badge: '30m' },
  { value: 60, label: '1 hour before', badge: '1h' },
  { value: 120, label: '2 hours before', badge: '2h' },
  { value: 1440, label: '1 day before', badge: '1d' },
  { value: 2880, label: '2 days before', badge: '2d' },
  { value: 10080, label: '1 week before', badge: '1w' },
];
```

### Notification Check Endpoint

**`GET /api/notifications/check`**

```typescript
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const now = getSingaporeNow();
  const todos = todoDB.getAll(session.userId);

  const pending = todos.filter(todo => {
    if (!todo.due_date || !todo.reminder_minutes || todo.completed) return false;
    if (todo.last_notification_sent) return false;

    const dueDate = new Date(todo.due_date);
    const reminderTime = new Date(dueDate.getTime() - todo.reminder_minutes * 60 * 1000);
    return now >= reminderTime;
  });

  // Mark as notified
  for (const todo of pending) {
    todoDB.update(todo.id, { last_notification_sent: now.toISOString() } as any);
  }

  return NextResponse.json(pending);
}
```

### Frontend Notification Hook (`lib/hooks/useNotifications.ts`)

```typescript
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  useEffect(() => {
    if (permission !== 'granted') return;

    const interval = setInterval(async () => {
      const res = await fetch('/api/notifications/check');
      const todos = await res.json();
      for (const todo of todos) {
        new Notification(`Todo Reminder: ${todo.title}`, {
          body: `Due: ${todo.due_date}`,
          icon: '/favicon.ico',
        });
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [permission]);

  return { permission, requestPermission };
}
```

---

## UI Components

### Enable Notifications Button

```tsx
<button
  onClick={requestPermission}
  className={permission === 'granted'
    ? 'bg-green-500 text-white px-3 py-1 rounded'
    : 'bg-orange-500 text-white px-3 py-1 rounded'}
>
  🔔 {permission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
</button>
```

### Reminder Dropdown (in todo form / edit modal)

```tsx
<select
  value={reminderMinutes ?? ''}
  onChange={e => setReminderMinutes(e.target.value ? parseInt(e.target.value) : null)}
  disabled={!dueDate}
  className="border rounded px-2 py-1 dark:bg-gray-800"
>
  <option value="">None</option>
  {REMINDER_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

### Reminder Badge

```tsx
{todo.reminder_minutes && (
  <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">
    🔔 {REMINDER_OPTIONS.find(o => o.value === todo.reminder_minutes)?.badge}
  </span>
)}
```

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Reminder set but no due date | Dropdown disabled; API rejects with `400` if sent |
| Due date removed after reminder was set | `reminder_minutes` should be cleared to `null` |
| Notification permission denied | Reminders stored in DB but no browser notifications fire |
| Todo completed before reminder fires | `completed` filter excludes it from check endpoint |
| Same reminder fires twice (race condition) | `last_notification_sent` set atomically; checked before sending |
| Browser tab in background | Notifications still fire via `setInterval` in service context |
| Recurring todo completed with reminder | New instance inherits `reminder_minutes`; `last_notification_sent` is NULL |
| User changes reminder timing after initial set | `reminder_minutes` updated; `last_notification_sent` reset to NULL |
| Multiple todos due at same time | All fire individual notifications |
| Singapore timezone boundary | All calculations use `getSingaporeNow()` |

---

## Acceptance Criteria

- [ ] "Enable Notifications" button requests browser permission
- [ ] Button changes to green "Notifications On" when granted
- [ ] Reminder dropdown shows 7 timing options plus "None"
- [ ] Reminder dropdown is disabled when no due date is set
- [ ] Setting a reminder displays a 🔔 badge with abbreviated timing
- [ ] Selecting "None" removes the reminder and badge
- [ ] Notification fires at the correct time (reminder_minutes before due_date)
- [ ] Each notification fires only once (`last_notification_sent` tracking)
- [ ] Notifications work when browser tab is in background
- [ ] Completed todos are excluded from notification checks
- [ ] Recurring todo next instance inherits `reminder_minutes` with NULL `last_notification_sent`
- [ ] All time calculations use Singapore timezone

---

## Testing Requirements

### E2E Tests (Playwright — `tests/04-reminders-notifications.spec.ts`)

```typescript
test.describe('Reminders & Notifications', () => {
  test('should show reminder dropdown when due date is set', async ({ page }) => {});
  test('should disable reminder dropdown when no due date', async ({ page }) => {});
  test('should set reminder and display badge', async ({ page }) => {});
  test('should remove reminder by selecting None', async ({ page }) => {});
  test('should display correct badge abbreviation for each option', async ({ page }) => {});
  test('should clear reminder when due date is removed', async ({ page }) => {});
});
```

> Note: Browser notification delivery is difficult to test in E2E; test the API endpoint and UI state instead.

### Integration Tests

- Verify `/api/notifications/check` returns only pending, incomplete todos past reminder time
- Verify `last_notification_sent` is set after check
- Verify completed todos are excluded
- Verify recurring todo new instance has NULL `last_notification_sent`

---

## Out of Scope

- Email notifications
- SMS / push notifications (native mobile)
- Custom notification sounds
- Snooze / dismiss / reschedule from notification
- Notification center / history within the app
- Recurring reminders (reminder fires once per todo instance)
- Notification preferences beyond enable/disable

---

## Success Metrics

| Metric | Target |
|---|---|
| Notification fires within 60 seconds of reminder time | 100% of cases (polling interval) |
| Duplicate notifications prevented | 0 duplicates |
| Reminder badge displays correct abbreviation | 100% of cases |
| Dropdown disabled when no due date | 100% of cases |
| Singapore timezone used for all calculations | 100% of cases |
| All E2E tests pass | 6/6 tests |
