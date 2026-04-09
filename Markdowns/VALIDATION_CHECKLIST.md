# Todo App - Validation Checklist

## Table of Contents
1. [Authentication Validation](#1-authentication-validation)
2. [Todo Creation Validation](#2-todo-creation-validation)
3. [Priority Levels Validation](#3-priority-levels-validation)
4. [Due Dates & Time Management Validation](#4-due-dates--time-management-validation)
5. [Recurring Todos Validation](#5-recurring-todos-validation)
6. [Reminders & Notifications Validation](#6-reminders--notifications-validation)
7. [Subtasks & Checklists Validation](#7-subtasks--checklists-validation)
8. [Tags & Categories Validation](#8-tags--categories-validation)
9. [Todo Templates Validation](#9-todo-templates-validation)
10. [Search & Advanced Filtering Validation](#10-search--advanced-filtering-validation)
11. [Export & Import Validation](#11-export--import-validation)
12. [Calendar View Validation](#12-calendar-view-validation)
13. [Todo Management Validation](#13-todo-management-validation)
14. [Dark Mode Validation](#14-dark-mode-validation)
15. [General Functionality Validation](#15-general-functionality-validation)

---

## 1. Authentication Validation

### Registration Process
- [ ] Click "Register" button opens registration form
- [ ] Username field accepts input
- [ ] "Register" button triggers WebAuthn/Passkey creation
- [ ] Biometric prompt appears (fingerprint/face/security key)
- [ ] Successful registration redirects to main app
- [ ] Error handling for failed registration

### Login Process
- [ ] Login form shows username field
- [ ] "Login" button triggers WebAuthn authentication
- [ ] Biometric prompt appears for authentication
- [ ] Successful login redirects to main app
- [ ] Invalid credentials show appropriate error
- [ ] Passkey sync works across devices

### Logout Process
- [ ] Logout button visible in top-right corner
- [ ] Clicking logout clears session
- [ ] Redirects to login page
- [ ] Requires re-authentication to access app

### Security Features
- [ ] No password fields visible anywhere
- [ ] WebAuthn/Passkeys used exclusively
- [ ] All operations require authentication
- [ ] Session management works correctly

---

## 2. Todo Creation Validation

### Basic Todo Creation
- [ ] Main input field accepts text input
- [ ] "Add" button enabled when title entered
- [ ] Empty/whitespace-only titles rejected
- [ ] Todo appears in Pending section after creation
- [ ] Todo sorted by priority and due date

### Priority Selection
- [ ] Priority dropdown shows High/Medium/Low options
- [ ] Default priority is Medium
- [ ] Priority selection works during creation
- [ ] Priority badge appears on created todo

### Due Date Setting
- [ ] Date-time picker opens when clicked
- [ ] Singapore timezone enforced
- [ ] Minimum due date is 1 minute in future
- [ ] Invalid past dates rejected
- [ ] Due date displays correctly on todo

### Form Location & Layout
- [ ] Form located at top of main page
- [ ] All fields properly aligned
- [ ] Responsive design works on mobile
- [ ] Form clears after successful creation

---

## 3. Priority Levels Validation

### Priority Display
- [ ] High priority shows red badge
- [ ] Medium priority shows yellow badge
- [ ] Low priority shows blue badge
- [ ] Colors adapt correctly in dark mode

### Priority Sorting
- [ ] High priority todos appear first
- [ ] Medium priority todos second
- [ ] Low priority todos last
- [ ] Sorting works within each section (Overdue/Pending/Completed)

### Priority Filtering
- [ ] Priority filter dropdown available
- [ ] "All Priorities" shows all todos
- [ ] Individual priority filters work correctly
- [ ] Filter combines with other filters

### Visual Indicators
- [ ] Priority badges visible on all todos
- [ ] Badge colors match specification
- [ ] Badges readable in both light/dark modes
- [ ] Priority shown in edit modal

---

## 4. Due Dates & Time Management Validation

### Date-Time Picker
- [ ] Picker opens when due date field clicked
- [ ] Singapore timezone enforced
- [ ] Future dates only accepted
- [ ] Time selection works correctly

### Smart Time Display
- [ ] Overdue todos show red text with "X days/hours/minutes overdue"
- [ ] < 1 hour shows red "Due in X minutes"
- [ ] < 24 hours shows orange "Due in X hours (timestamp)"
- [ ] < 7 days shows yellow "Due in X days (timestamp)"
- [ ] 7+ days shows blue full timestamp

### Overdue Section
- [ ] Overdue todos appear in separate red section
- [ ] Warning icon (⚠️) displays
- [ ] Counter shows "Overdue (X)"
- [ ] Overdue todos sorted by priority then due date

### Timezone Consistency
- [ ] All dates use Singapore timezone
- [ ] Timezone conversion works correctly
- [ ] Display shows correct local time interpretation

---

## 5. Recurring Todos Validation

### Recurrence Setup
- [ ] "Repeat" checkbox enables recurrence options
- [ ] Dropdown shows Daily/Weekly/Monthly/Yearly
- [ ] Due date required for recurring todos
- [ ] Recurrence pattern selection works

### Visual Indicators
- [ ] Recurring todos show 🔄 badge with pattern
- [ ] Badge shows abbreviated pattern (daily/weekly/etc.)
- [ ] Purple badge with border in light mode
- [ ] Colors adapt for dark mode

### Recurrence Behavior
- [ ] Completing recurring todo creates new instance
- [ ] New instance has same settings (priority, tags, reminder)
- [ ] Next due date calculated correctly by pattern
- [ ] Daily: +1 day, Weekly: +7 days, Monthly: +1 month, Yearly: +1 year

### Pattern Accuracy
- [ ] Daily recurrence works for multiple days
- [ ] Weekly recurrence maintains day of week
- [ ] Monthly recurrence maintains date
- [ ] Yearly recurrence maintains date and month

---

## 6. Reminders & Notifications Validation

### Notification Setup
- [ ] "🔔 Enable Notifications" button visible
- [ ] Clicking requests browser permission
- [ ] Permission granted changes to "🔔 Notifications On"
- [ ] Permission denied shows appropriate message

### Reminder Configuration
- [ ] Reminder dropdown disabled without due date
- [ ] Reminder dropdown shows 7 timing options
- [ ] Options: 15m, 30m, 1h, 2h, 1d, 2d, 1w before
- [ ] Reminder selection saves correctly

### Visual Indicators
- [ ] Todos with reminders show 🔔 badge
- [ ] Badge shows abbreviated time (🔔 15m, 🔔 1h, etc.)
- [ ] Badge visible in all views

### Notification Delivery
- [ ] Notifications sent at correct time
- [ ] Each reminder sent only once
- [ ] Notifications work when browser tab inactive
- [ ] Notification content shows todo title

### Browser Requirements
- [ ] Modern browsers support notifications
- [ ] Graceful degradation for unsupported browsers
- [ ] Permission handling works correctly

---

## 7. Subtasks & Checklists Validation

### Subtask Creation
- [ ] "▶ Subtasks" button expands todo
- [ ] Input field appears for new subtasks
- [ ] Enter key adds subtask
- [ ] "Add" button adds subtask
- [ ] Subtasks appear in ordered list

### Subtask Management
- [ ] Checkbox toggles subtask completion
- [ ] ✕ button deletes individual subtask
- [ ] Subtasks maintain order
- [ ] Independent of parent todo completion

### Progress Tracking
- [ ] Progress bar shows 0-100% completion
- [ ] "X/Y subtasks" text displays correctly
- [ ] Progress updates in real-time
- [ ] Progress visible when subtasks collapsed

### Subtask Features
- [ ] Unlimited subtasks per todo
- [ ] Subtasks included in search
- [ ] CASCADE delete when parent deleted
- [ ] Subtasks persist across sessions

---

## 8. Tags & Categories Validation

### Tag Creation
- [ ] "+ Manage Tags" button opens modal
- [ ] Tag name input accepts text
- [ ] Color picker allows hex code input
- [ ] "Create Tag" adds tag to list
- [ ] Default color #3B82F6 applied

### Tag Management
- [ ] Edit button modifies existing tags
- [ ] Delete button removes tags
- [ ] CASCADE delete removes from todos
- [ ] Tag list updates in real-time

### Tag Usage on Todos
- [ ] Tag pills visible below todo form
- [ ] Click to select/deselect tags
- [ ] Selected tags show checkmark and colored background
- [ ] Unselected tags show outline style

### Tag Filtering
- [ ] "All Tags" dropdown filters todos
- [ ] Individual tag selection works
- [ ] Multiple tag selection supported
- [ ] Filter combines with other filters

### Tag Display
- [ ] Tags appear as colored pills on todos
- [ ] White text on custom background colors
- [ ] Rounded design
- [ ] Responsive wrapping on mobile

---

## 9. Todo Templates Validation

### Template Creation
- [ ] "💾 Save as Template" appears when title filled
- [ ] Modal opens with template fields
- [ ] Name and description inputs work
- [ ] Category dropdown available
- [ ] "Save Template" creates template

### Template Usage
- [ ] "Use Template" dropdown in todo form
- [ ] Templates show with category in parentheses
- [ ] Selecting template creates todo instantly
- [ ] Template settings applied correctly

### Template Management
- [ ] "📋 Templates" button opens manager
- [ ] Template list shows all saved templates
- [ ] "Use" button creates todo from template
- [ ] "Delete" button removes template

### Template Content
- [ ] Templates preserve: title, priority, recurrence, reminder
- [ ] Templates exclude: due dates, tags
- [ ] Category information saved
- [ ] Description optional

---

## 10. Search & Advanced Filtering Validation

### Basic Search
- [ ] Search bar accepts input
- [ ] Real-time filtering as you type
- [ ] Searches todo titles AND subtasks
- [ ] Case-insensitive matching
- [ ] Partial word matching works

### Quick Filters
- [ ] Priority filter dropdown works
- [ ] Tag filter dropdown works
- [ ] "▶ Advanced" toggles advanced panel
- [ ] "Clear All" removes all filters

### Advanced Filters
- [ ] Completion status filter (All/Incomplete/Completed)
- [ ] Date range inputs (From/To)
- [ ] Date validation works
- [ ] Filters combine with AND logic

### Saved Filter Presets
- [ ] "💾 Save Filter" appears when filters active
- [ ] Modal shows current filter preview
- [ ] Preset name input works
- [ ] Saved presets appear in advanced panel
- [ ] Clicking preset applies filters

---

## 11. Export & Import Validation

### JSON Export
- [ ] "Export JSON" button downloads file
- [ ] Filename format: todos-YYYY-MM-DD.json
- [ ] File contains complete todo data
- [ ] JSON structure valid and parseable

### CSV Export
- [ ] "Export CSV" button downloads file
- [ ] Filename format: todos-YYYY-MM-DD.csv
- [ ] Columns: ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder
- [ ] Data opens correctly in spreadsheet applications

### JSON Import
- [ ] "Import" button opens file picker
- [ ] Accepts .json files
- [ ] Validates JSON format
- [ ] Creates new todos with new IDs
- [ ] Preserves all todo properties
- [ ] Success message shows import count

### Import Validation
- [ ] Invalid JSON rejected
- [ ] Missing required fields handled
- [ ] Large files processed correctly
- [ ] Error messages informative

---

## 12. Calendar View Validation

### Navigation
- [ ] "Calendar" button navigates to /calendar
- [ ] Calendar shows monthly view
- [ ] Month navigation arrows work
- [ ] Today button jumps to current month

### Todo Display
- [ ] Todos with due dates appear on calendar
- [ ] Color-coded by priority (red/yellow/blue)
- [ ] Multiple todos stack on same date
- [ ] Todo titles visible on date cells

### Calendar Features
- [ ] Current day highlighted
- [ ] Past dates grayed out appropriately
- [ ] Responsive grid layout
- [ ] Dark mode support

### Data Synchronization
- [ ] Calendar shows same todos as list view
- [ ] Changes sync in real-time
- [ ] Filters don't affect calendar (if implemented)
- [ ] Holiday integration (if configured)

---

## 13. Todo Management Validation

### Todo Completion
- [ ] Checkbox toggles completion status
- [ ] Completed todos move to Completed section
- [ ] Recurring todos create new instances
- [ ] Unchecking returns to appropriate section

### Todo Editing
- [ ] "Edit" button opens modal with current values
- [ ] All fields editable (title, priority, due date, etc.)
- [ ] Changes save correctly
- [ ] Todo moves to correct section after edit

### Todo Deletion
- [ ] "Delete" button immediately removes todo
- [ ] No confirmation dialog
- [ ] Subtasks deleted with parent
- [ ] Tag associations removed

### Organization
- [ ] Automatic sorting: Priority → Due Date → Creation Date
- [ ] Overdue section for past due todos
- [ ] Pending section for future/no due date
- [ ] Completed section sorted by completion date

---

## 14. Dark Mode Validation

### Automatic Detection
- [ ] Detects system dark mode preference
- [ ] Changes apply without manual toggle
- [ ] Updates when system setting changes
- [ ] Works across macOS/Windows/Linux

### Visual Changes
- [ ] Background gradients change appropriately
- [ ] Card backgrounds adapt (dark gray in dark mode)
- [ ] Text colors invert for readability
- [ ] Accent colors adjust for dark backgrounds

### Component Adaptation
- [ ] Priority badges readable in both modes
- [ ] Tag pills maintain contrast
- [ ] Buttons adapt colors
- [ ] Borders and shadows adjust

### Accessibility
- [ ] WCAG AA contrast ratios maintained
- [ ] Text readable in both modes
- [ ] Focus states visible
- [ ] No harsh white backgrounds in dark mode

---

## 15. General Functionality Validation

### Performance
- [ ] App loads quickly
- [ ] Real-time updates work smoothly
- [ ] Large todo lists (>100) perform well
- [ ] Search and filters respond quickly

### Data Persistence
- [ ] Todos persist across browser sessions
- [ ] User-specific data isolation
- [ ] Changes save immediately
- [ ] No data loss on refresh

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Invalid inputs show helpful messages
- [ ] Failed operations provide feedback
- [ ] App remains functional during errors

### Responsive Design
- [ ] Works on desktop browsers
- [ ] Adapts to tablet sizes
- [ ] Mobile-friendly interface
- [ ] Touch interactions work correctly

### Browser Compatibility
- [ ] Chrome 90+ works correctly
- [ ] Firefox 88+ works correctly
- [ ] Safari 14+ works correctly
- [ ] Edge 90+ works correctly

---

## Validation Summary

### Test Environment
- **Browser**: [Chrome/Firefox/Safari/Edge] [Version]
- **OS**: [Windows/macOS/Linux] [Version]
- **Device**: [Desktop/Mobile/Tablet]
- **Network**: [Fast/Slow/Unstable]

### Results
- **Total Checks**: 150+
- **Passed**: ____
- **Failed**: ____
- **Not Applicable**: ____

### Issues Found
[List any bugs, inconsistencies, or deviations from specifications]

### Recommendations
[Suggestions for improvements or fixes]

---

**Validation Date**: [Current Date]
**Validator**: [Your Name]
**App Version**: 1.0</content>
<parameter name="filePath">c:\Users\natca\Downloads\LabTest\Markdowns\VALIDATION_CHECKLIST.md