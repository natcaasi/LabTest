# Todo App — Technical Document

## 1. Overview

This document describes the architecture, feature set, and implementation guidance for a full-featured Todo application built with Next.js 16 (App Router), SQLite, and WebAuthn authentication. The application is designed around the Singapore timezone and follows a modular feature structure defined by eleven Product Requirement Prompts (PRPs).

---

## 2. Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via `better-sqlite3` (synchronous operations) |
| Authentication | WebAuthn / Passkeys via `@simplewebauthn` |
| Styling | Tailwind CSS 4 |
| Testing | Playwright (E2E) |
| Timezone | Asia/Singapore — all date/time logic uses `lib/timezone.ts` |

---

## 3. Architecture

The application follows a client–server split within the Next.js App Router convention:

- **Client components** (`app/page.tsx` and related UI files) handle rendering, user interaction, and optimistic updates.
- **API routes** (server-side) handle database access, validation, and business logic.
- **Database operations are synchronous** — `better-sqlite3` does not use `async/await`.
- **API route handlers** use Next.js 16's async params pattern.

---

## 4. Feature Inventory

### 4.1 Todo CRUD Operations (PRP-01)

The foundation of the application. Provides create, read, update, and delete operations for todo items.

- All timestamps are generated and displayed in the Singapore timezone.
- Input validation is enforced on both client and server.
- The UI uses optimistic updates: the interface reflects changes immediately while the API call completes in the background, rolling back on failure.

### 4.2 Priority System (PRP-02)

Each todo can be assigned one of three priority levels: High, Medium, or Low.

- Priorities are displayed as color-coded badges (e.g., red for High, yellow for Medium, green/grey for Low).
- The default sort order places higher-priority items above lower-priority ones.
- Users can filter the todo list by a specific priority level.

### 4.3 Recurring Todos (PRP-03)

Supports repeating todo patterns on daily, weekly, monthly, and yearly schedules.

- When a recurring todo is completed, the system automatically creates the next instance with a calculated due date.
- The new instance inherits metadata (priority, tags, subtasks) from the completed item.
- Due date calculation accounts for month-length variations and timezone boundaries.

### 4.4 Reminders & Notifications (PRP-04)

Provides browser-based notifications triggered ahead of a todo's due date.

- Configurable lead times ranging from 15 minutes to 1 week before the due date.
- A client-side polling mechanism checks for upcoming reminders at regular intervals.
- Duplicate notifications are prevented by tracking which reminders have already fired.
- All reminder time calculations are performed in the Singapore timezone.

### 4.5 Subtasks & Progress Tracking (PRP-05)

Adds checklist-style subtasks to any todo item, with visual progress feedback.

- Each subtask has a title, completion state, and a position index for ordering.
- A progress bar on the parent todo reflects the ratio of completed subtasks.
- Subtask positions can be reordered by the user.
- Deleting a parent todo cascades to delete all associated subtasks.

### 4.6 Tag System (PRP-06)

Enables categorization of todos through color-coded labels.

- Tags and todos have a many-to-many relationship (a todo can have multiple tags; a tag can apply to multiple todos).
- Tags support full CRUD operations: create, rename, change color, and delete.
- The todo list can be filtered to show only items matching a selected tag.

### 4.7 Template System (PRP-07)

Allows users to save and reuse common todo configurations.

- A template captures a todo's title, description, priority, tags, and subtasks.
- Subtask data is serialized as JSON within the template record.
- When a template is applied, due dates are calculated using a configurable offset from the creation date.
- Templates can be organized into categories.

### 4.8 Search & Filtering (PRP-08)

Provides real-time search and multi-criteria filtering across the todo list.

- Text search matches against todo titles in real time as the user types.
- Advanced search extends matching to tag names.
- Multiple filter criteria (priority, tag, completion status, date range) can be combined.
- All filtering is performed client-side for responsiveness.

### 4.9 Export & Import (PRP-09)

Supports full data backup and restore via JSON files.

- Export produces a JSON file containing all todos, subtasks, tags, and relationships.
- On import, internal IDs are remapped to avoid conflicts with existing data.
- Relationships between entities (e.g., todo–tag associations, parent–subtask links) are preserved through the remapping process.
- Imported data is validated before being written to the database.

### 4.10 Calendar View (PRP-10)

Displays todos on a monthly calendar grid based on their due dates.

- The calendar renders a standard month view with navigation to previous and next months.
- Singapore public holidays are marked on the calendar.
- Todos appear on the date cell corresponding to their due date.

### 4.11 Authentication — WebAuthn/Passkeys (PRP-11)

Provides passwordless authentication using the WebAuthn standard.

- Users register and log in using device biometrics (fingerprint, face recognition) or security keys.
- Sessions are managed with JWTs issued after successful authentication.
- Route protection middleware ensures authenticated access to all application routes.
- This feature can be implemented last or in parallel, as the rest of the application can function without it during development.

---

## 5. Feature Dependencies

Features are not fully independent. The dependency graph is as follows:

```
Todo CRUD (01)
├── Priority System (02)
├── Recurring Todos (03)
├── Subtasks & Progress (05) → Template System (07)
├── Tag System (06) → Search & Filtering (08)
├── Export & Import (09)
└── Calendar View (10)

Authentication (11) → All features (for production use)
```

A feature should only be implemented after its upstream dependencies are in place.

---

## 6. Implementation Phases

### Phase 1 — Foundation

| PRP | Feature |
|---|---|
| 01 | Todo CRUD Operations |
| 02 | Priority System |

Establishes the core data model, API routes, and UI patterns that all subsequent features build on.

### Phase 2 — Core Features

| PRP | Feature |
|---|---|
| 03 | Recurring Todos |
| 04 | Reminders & Notifications |
| 05 | Subtasks & Progress Tracking |

Adds the primary productivity capabilities.

### Phase 3 — Organization

| PRP | Feature |
|---|---|
| 06 | Tag System |
| 08 | Search & Filtering |

Introduces categorization and discovery mechanisms.

### Phase 4 — Productivity

| PRP | Feature |
|---|---|
| 07 | Template System |
| 09 | Export & Import |
| 10 | Calendar View |

Adds convenience and data portability features.

### Phase 5 — Infrastructure

| PRP | Feature |
|---|---|
| 11 | WebAuthn Authentication |

Can be developed in parallel with any phase or deferred to the end.

---

## 7. Key Technical Patterns

### Timezone Handling

All date/time values are processed and displayed in the `Asia/Singapore` timezone. A shared utility module (`lib/timezone.ts`) provides helper functions for formatting, comparison, and conversion. No feature should perform raw `new Date()` calls without routing through this module.

### API Route Convention

API routes follow the Next.js 16 App Router pattern with async params. Request validation occurs at the route handler level before any database interaction. Responses use standard HTTP status codes and consistent JSON envelopes.

### Database Access

`better-sqlite3` provides synchronous, blocking database calls. There is no need for `async/await` on database operations. Prepared statements should be used for parameterized queries. Foreign key constraints and cascade deletes are configured at the schema level.

### Optimistic UI Updates

Client components apply state changes immediately on user action. If the subsequent API call fails, the UI rolls back to the previous state and surfaces an error message. This pattern applies to all CRUD operations.

### Client-Side Filtering

Search and filter operations run entirely in the browser against the already-fetched dataset. This avoids round-trips for every keystroke or filter change, keeping the interface responsive.

---

## 8. Testing Strategy

End-to-end tests are written with Playwright and should cover:

- Every CRUD path for each feature (create, read, update, delete).
- Validation failures and error handling (e.g., empty titles, invalid dates).
- Edge cases documented in each PRP (e.g., month-boundary recurrence, duplicate tag names, import ID conflicts).
- Cross-feature interactions (e.g., deleting a tag that is applied to multiple todos, completing a recurring todo with subtasks).

Unit tests supplement E2E coverage for isolated logic such as timezone calculations, due date offset computation, and JSON import validation.

---

## 9. Project Conventions for AI-Assisted Development

When using AI coding assistants with this project:

1. Always load `.github/copilot-instructions.md` first — it defines project-wide code style, file layout, and naming conventions.
2. Use the Singapore timezone helpers from `lib/timezone.ts` for all date/time work.
3. Follow the async params pattern required by Next.js 16 API routes.
4. Remember that `better-sqlite3` calls are synchronous — do not wrap them in `await`.
5. UI logic lives in client components; data logic lives in API routes.
6. Refer to `USER_GUIDE.md` for expected user-facing behavior when implementing or reviewing features.

---

*Last updated: April 2026*
*Source: Product Requirement Prompts (PRPs) v11*
