# Final report – what to write so it matches this code

Every line below is true for the code in this folder. Replace the matching
lines / `[placeholders]` in the report with these.

## Updated Project Approach and Architecture

- **Front-end:** React 19 with Vite and plain CSS (`src/styles.css`). *Remove "Tailwind CSS" – the project does not use it.*
- **API:** about **80 REST endpoints** under `/api` (JSON), plus live updates over Server-Sent Events (`/api/events`).
- **Database:** MySQL (mysql2) with **12 tables, 5 views, 8 triggers, 2 stored procedures** (one extra lab-only table, `lab_bench_reports`, is created by the Indexing lab when you run it).
- **Fallback:** if MySQL is not available within 2 seconds, the server uses a local **SQLite file** (`data/resqsync.db`) with the same schema. *Replace "local JSON file".*
- **ML + location:** a logistic-regression risk model (written from scratch) and the case location (km from the zone depot) order cases inside the same priority. Emergency priority always comes first.

**Changes since Phase-II:**
Passwords are hashed with bcrypt and every API checks the JWT role; SQL fixes are merged into the schema files; the lock demo runs the real `SELECT … FOR UPDATE`; added feedback & ratings, profile editing, compliance reports, backup & recovery, expired-food archiving, an ML risk model with location-aware scheduling, and automated + load tests.

**New in the final phase (innovation):**

| Feature | Concept it proves | Where |
|---|---|---|
| Disaster drill | CPU scheduling on a real problem: the same disaster replayed with FCFS, Priority + aging and ResQSync; discrete-event simulation; Gantt chart with rescue teams as CPUs | Disaster drill page |
| Crash recovery demo | Atomicity and recovery: a process is killed with `SIGKILL` in the middle of a stock update; with a transaction nothing survives, without one the units are lost | DBMS lab → Crash recovery |
| Banker's algorithm on the live fleet | Deadlock avoidance on a reusable resource: vehicles return after a mission, and worker threads only hand them out if the state stays safe | OS lab → Banker's on live fleet |
| Indexing lab | B-tree / covering index, `EXPLAIN` query plans, full scan vs index search | DBMS lab → Indexing |
| Route planning | Dijkstra's shortest path with a min-heap; river with bridges; roads can be closed | City map & routes |
| Stock forecast | Moving-average use rate, time until a zone runs out, restock suggestion, admin alert | Stock & forecast |
| Smart text report | A plain English/Hinglish message fills the case form (type, people, supplies, priority, place) | Emergency queue / My requests |

**Disaster drill result to quote** (earthquake in Zone C, 30 incidents in the first hour, 4 rescue teams, seed 7):

| | FCFS | Priority + aging | ResQSync |
|---|---|---|---|
| P1: average time until help arrives | 66 min | 28 min | **17 min** |
| P1: worst wait | 88 min | 88 min | **33 min** |
| Incidents reached within target | 17 of 30 | 24 of 30 | **26 of 30** |
| People reached within target | 67% | 83% | **88%** |

These figures come from a simulation (simulated city, simulated incidents). Present them as simulated results, not real-world measurements.

**Index lab result to quote** (SQLite, 1,00,000 rows): full table scan ≈ 6 ms → covering index ≈ 0.1 ms (about 50–60× faster). The exact numbers depend on the laptop.

## Tasks Completed

| Task | Status |
|---|---|
| 10. Real authentication: bcrypt password hashing, JWT login, role checks on every admin API | Done |
| 11. Feedback/ratings, profile editing, compliance reports, backup and recovery, expired-food archiving | Done |
| 12. ML risk model + location factor in scheduling | Done |
| 13. Automated tests (50 checks) and load test | Done |
| 14. Disaster drill, crash recovery, Banker's on the live fleet, indexing lab, route planning, stock forecast, smart text report | Done |
| 15. New simpler interface (grouped menu, one accent colour, Archivo typeface) | Done |

## Challenges

5. **Security** – *done*: bcrypt hashes, JWT tokens, role checks on admin APIs.
6. **Scripted lock demo** – *done*: DBMS lab → Concurrency runs real parallel clients against the real row lock (10 clients, exactly 1 wins).
7. **Banker's on consumable supplies** – food and water are used up, so the Banker's algorithm does not apply to them. We applied it where it is correct: vehicles, which return to the depot after a mission.

## Progress Overview

All **35 proposed features** work, plus the seven final-phase additions above.
Behind schedule: only the final report, screenshots and demonstration video.

## Codebase Information – Structure

```
server.js                start-up: database → seed → ML model → C kernel → allocator → web server
server/                  resRoutes.js, resExtraRoutes.js, resNewRoutes.js, resLabRoutes.js (API)
                         resDb.js (MySQL + SQLite), resAllocator.js + resSync.js (threads, semaphores, mutex)
                         resBanker.js (Banker's on the fleet), resDrill.js (drill simulation)
                         resCrash.js + resCrashWorker.js (kill -9 demo), resIndexLab.js, resRoutePlan.js (Dijkstra)
                         resForecast.js, resParse.js, resModel.js (ML), resGeo.js, resBackup.js, resArchive.js, resAuth.js
src/                     React app: views/ (pages), components/, resApi.jsx (API calls)
database/                schema.mysql.sql, schema.sqlite.sql, resqsync_full_database.sql (schema + demo data in one file)
c_engine/                pcb, cpu_scheduler, synchronization, ipc_pipe, bankers_algorithm, deadlock, main.c, Makefile
tests/resSync.test.js    npm run test:sync
scripts/resLoadTest.js   npm run test:load
```

Important commits: run `git log --oneline` in the repository and copy the real hashes.

## Testing and Validation Status

| Test | Status | Notes |
|---|---|---|
| CPU scheduling (P1 0/8, P2 1/4, P3 2/9, P4 3/5, quantum 2) | Pass | Avg waiting: SRTF 6.5, SJF 7.75, Priority 7.75, FCFS 8.75, RR 12.75 |
| Login security | Pass | Wrong password → 401; NGO calling an admin API → 403; passwords stored as bcrypt hashes |
| Automated tests | Pass | `npm run test:sync`: 50 / 50 checks (priority order, aging, ML promotion, location order, ACID rollback, row locks, triggers, ratings, profile, compliance, backup/restore, archiving, drill, crash recovery, Banker's, vehicle return, text report, Dijkstra, forecast, index) |
| Crash recovery | Pass | Killed inside a transaction: stock unchanged. Killed without one: units lost (then repaired). Ledger balanced after both. |
| Load test | Pass | `npm run test:load` (SQLite, laptop): 1000 parallel reads, p95 ≈ 88 ms, 0 errors; 50 parallel inserts all saved; ledger balanced; 10 clients, 1 lock winner |
| Live MySQL server | Pending | Run `npm run test:sync` once with MySQL running and write the result here |

*The load-test and index numbers depend on the laptop. Run the tests on your own machine and copy those numbers.*

## Deliverables Progress

4. MySQL schema, views, triggers and stored procedures – Completed
6. Real login and role protection – Completed
7. Feedback, profile editing, compliance reports, backup and recovery – Completed
8. Testing all features and fixing errors – Completed (50 automated checks + load test)
9. Final-phase innovations (drill, crash recovery, live Banker's, indexing, routes, forecast, text report) – Completed
10. Final report, screenshots and demonstration video – In Progress
