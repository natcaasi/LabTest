# Todo App

A feature-rich todo application built with Next.js 16, SQLite, and WebAuthn authentication. Includes advanced features like recurring todos, reminders, subtasks, tagging, templates, calendar view, and more.

## Features

### Core Features (11 implemented)
1. **Todo CRUD Operations** - Create, read, update, delete todos with Singapore timezone support
2. **Priority System** - High/Medium/Low priority with color-coded badges and sorting
3. **Recurring Todos** - Daily, weekly, monthly, yearly patterns with automatic next instance creation
4. **Reminders & Notifications** - Browser notifications 15min to 1 week before due date
5. **Subtasks & Progress** - Checklist items with visual progress bars
6. **Tag System** - Categorize todos with custom colored tags
7. **Template System** - Save and reuse todo configurations
8. **Search & Filtering** - Real-time search by title with priority and tag filters
9. **Export/Import** - Backup and restore todos in JSON format
10. **Calendar View** - Month view with todos, Singapore public holidays, and day modal
11. **WebAuthn Authentication** - Passwordless login with passkeys/biometrics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite via better-sqlite3 (synchronous)
- **Authentication**: WebAuthn via @simplewebauthn
- **Styling**: Tailwind CSS 4
- **Testing**: Playwright E2E tests
- **Timezone**: Asia/Singapore (all dates in SG timezone)
- **Validation**: Zod schemas

## Prerequisites

- Node.js 18+
- npm or yarn
- WebAuthn-compatible browser (Chrome, Firefox, Safari, Edge)

## Installation

```bash
# Clone or extract the project
cd todo-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Generate JWT secret (Linux/Mac)
openssl rand -hex 32  # Add this to JWT_SECRET in .env.local

# On Windows, use:
# Generate a random 32-char hex string and add it to .env.local
```

## Environment Variables

Create `.env.local` with:

```
DATABASE_URL=./data/todos.db
JWT_SECRET=<your-32-char-hex-string>
RP_ID=localhost
RP_NAME=Todo App
RP_ORIGIN=http://localhost:3000
TZ=Asia/Singapore
```

For production (Vercel/Railway):
- Set `RP_ID` to your domain
- Set `RP_ORIGIN` to your full HTTPS URL
- Use secure random JWT_SECRET
- Enable HTTPS

## Development

```bash
# Start dev server
npm run dev

# Open http://localhost:3000 in browser

# Run linting
npm run lint

# Run E2E tests
npm test
```

## Project Structure

```
todo-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (todos, auth, tags, etc.)
│   ├── page.tsx           # Home page
│   ├── login/            # Login page
│   ├── calendar/         # Calendar view
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── TodoForm.tsx
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   ├── SearchBar.tsx
│   ├── TagManager.tsx
│   └── TemplateManager.tsx
├── lib/                  # Utilities
│   ├── db.ts            # Database initialization
│   ├── auth.ts          # Authentication helpers
│   ├── timezone.ts      # Singapore timezone utilities
│   ├── validation.ts    # Zod schemas
│   ├── webauthn.ts      # WebAuthn helpers
│   ├── sg-holidays.ts   # Holiday lookups
│   └── hooks/
│       └── useNotifications.ts  # Notification hook
├── tests/               # Playwright E2E tests
├── middleware.ts        # Route protection
├── playwright.config.ts # Test configuration
└── package.json
```

## Database Schema

Automatically created on first run:
- `users` - User accounts
- `authenticators` - WebAuthn credentials
- `todos` - Todo items
- `subtasks` - Subtasks with completion state
- `tags` - Custom tags
- `todo_tags` - Many-to-many todo-tag relationship
- `templates` - Saved todo templates
- `holidays` - Singapore public holidays

## API Routes

### Authentication
- `POST /api/auth/register-options` - Get WebAuthn registration options
- `POST /api/auth/register-verify` - Verify and create account
- `POST /api/auth/login-options` - Get WebAuthn login options
- `POST /api/auth/login-verify` - Verify login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Todos
- `GET /api/todos` - List todos
- `POST /api/todos` - Create todo
- `GET /api/todos/[id]` - Get todo
- `PUT /api/todos/[id]` - Update todo
- `DELETE /api/todos/[id]` - Delete todo
- `GET /api/todos/[id]/subtasks` - List subtasks
- `POST /api/todos/[id]/subtasks` - Add subtask
- `PUT /api/subtasks/[id]` - Update subtask
- `DELETE /api/subtasks/[id]` - Delete subtask
- `GET /api/todos/[id]/tags` - Get todo tags
- `POST /api/todos/[id]/tags` - Add tag to todo
- `DELETE /api/todos/[id]/tags` - Remove tag from todo
- `GET /api/todos/export` - Export all data
- `POST /api/todos/import` - Import data

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/[id]` - Update tag
- `DELETE /api/tags/[id]` - Delete tag

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template
- `POST /api/templates/[id]/use` - Create todo from template

### Notifications & Calendar
- `GET /api/notifications/check` - Check for upcoming reminders
- `GET /api/holidays` - List Singapore holidays

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel Dashboard
```

**Note**: SQLite in Vercel serverless functions resets on each deployment. Consider using:
- Vercel Postgres
- Railway (recommended - persistent SQLite with volumes)
- Supabase PostgreSQL

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Set environment variables
railway variables set JWT_SECRET=your-secret
railway variables set RP_ID=your-domain.up.railway.app
railway variables set RP_ORIGIN=https://your-domain.up.railway.app

# Deploy
railway up
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/01-auth.spec.ts

# Run in headed mode (see browser)
npm test -- --headed

# View test report
npx playwright show-report
```

### Test Coverage

- Authentication (registration, login, logout)
- Todo CRUD operations
- Priority system and filtering
- Tag management
- Search functionality
- Calendar navigation
- Template creation and usage

## Performance Optimization

- Optimistic UI updates for instant feedback
- Client-side filtering (no round-trips for search/filter)
- Database indexes on foreign keys and frequently queried fields
- Prepared statements for all SQL queries
- HTTP-only, secure JWT cookies

## Security

- WebAuthn passwordless authentication
- HTTP-only secure cookies (7-day expiry)
- Prepared statements (SQL injection prevention)
- React XSS protection
- CORS-aware API design
- Route protection middleware

## Accessibility

- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Dark mode support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- WebAuthn requires compatible browser

## Troubleshooting

### Database lock errors
- Close other connections to the database
- Check for hung processes with: `lsof | grep todos.db`

### WebAuthn not working
- Ensure HTTPS in production
- Check RP_ID and RP_ORIGIN match exactly
- Verify browser supports WebAuthn

### Tests failing
- Ensure dev server is running: `npm run dev`
- Clear browser cache and cookies
- Run tests with: `npm test -- --headed`

## Contributing

1. Follow existing code style (TypeScript strict, no console.log)
2. Keep files under 800 lines
3. Add tests for new features
4. Update README for significant changes

## License

MIT

## Support

For issues and questions, refer to the technical specification documents in the Markdowns/ directory.
