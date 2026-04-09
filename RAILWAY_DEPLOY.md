# Railway Deployment Guide

## Prerequisites

1. Railway account (https://railway.app)
2. Railway CLI installed (`npm install -g @railway/cli`)
3. Git repository initialized

## Environment Variables

Set these in Railway dashboard (Settings > Environment):

```
JWT_SECRET=<generate-a-secure-32-char-key>
RP_ID=<your-production-domain.com>
RP_NAME=Todo App
RP_ORIGIN=https://<your-production-domain.com>
DATABASE_URL=./data/todos.db
TZ=Asia/Singapore
NODE_ENV=production
PORT=3000
RAILWAY_VOLUME_MOUNT_PATH=/data
```

**Critical for WebAuthn:** RP_ID must match your production domain exactly.

## Deployment Steps

1. Connect your GitHub repository to Railway
2. Add a PostgreSQL or SQLite service (optional - using SQLite with volumes)
3. Configure environment variables as listed above
4. Enable persistent volume at `/data` for SQLite database persistence
5. Deploy - Railway will auto-detect nixpacks.toml and build accordingly

## Volume Setup

1. In Railway dashboard, go to your service settings
2. Add a volume mount:
   - Mount Path: `/data`
   - This persists the SQLite database across deployments

## Post-Deployment

1. Your app will be available at `https://<railway-app-name>.up.railway.app`
2. Register first user via WebAuthn login page
3. Update RP_ORIGIN if using a custom domain
4. Monitor logs in Railway dashboard for any issues

## Build Details

- **Node Version:** 22 (via nixpacks.toml)
- **Dependencies:** Python3, GCC, GNU Make (for better-sqlite3 native build)
- **Build Command:** `npm run build`
- **Start Command:** `npm start -p ${PORT:-3000}`
- **Timezone:** Asia/Singapore (set in environment)

## Troubleshooting

- **Database not persisting:** Verify volume is mounted at `/data`
- **WebAuthn errors:** Check RP_ID matches exact domain in browser
- **Build failures:** Check Railway logs for missing native dependencies
