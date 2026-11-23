# ResQSync

ResQSync is a full-stack emergency resource coordination demo. Its application source is in resqsync/.

## Render

- Build: cd resqsync && npm ci && npm run build
- Start: cd resqsync && npm start
- Set JWT_SECRET and RESQSYNC_DEMO_PASSWORD as private Render environment variables. Never commit their values.
- The seeded admin account uses admin@resqsync.test. Its shared password is configured privately in Render.
- DB_ENGINE=sqlite uses local SQLite. Free Render service storage is ephemeral, so demo data can reset after replacement or redeploy.