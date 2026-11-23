# ResQSync – Resource Coordination & Emergency Relief System

OS + DBMS PBL project, team **Avengers (T167)**, GEU.

Emergency cases and NGO requests are treated like **processes**. They wait in a priority ready queue, worker threads allocate stock from four city zones, and every allocation runs as one **ACID transaction** with **triggers** keeping the data honest. The OS side also has a real **C kernel** (pthreads, fork, pipes) for scheduling, mutex, semaphore, IPC, Banker's algorithm and deadlock.

Every variable and function starts with `res` (from **Res**QSync).

---

## Run it on a Mac

You need **Node.js 22.13 or newer** (`node -v`).

```bash
cd resqsync
npm install
npm run dev
```

Open **http://localhost:3000**.

| Login | Email | Password |
|---|---|---|
| City controller (admin) | admin@gmail.com | admin123 |
| NGO | shantingo@gmail.com | password123 |
| Restaurant | marcus@gmail.com | password123 |
| Volunteer | alex@gmail.com | password123 |

### The database: MySQL or SQLite

The app tries **MySQL first**. If MySQL isn't running or the password is wrong, it prints

```
[db] MySQL not available (ER_ACCESS_DENIED_ERROR) - using SQLite instead
```

and uses the file `data/resqsync.db` inside the project. Nothing else needs to be set up.

To use MySQL, copy `.env.example` to `.env` and fill in your password:

```bash
cp .env.example .env
# open .env and set DB_PASSWORD=your_mysql_password
```

The database `resqsync_final` with all its tables, views, triggers and procedures is created automatically.
Set `DB_ENGINE=sqlite` in `.env` to skip MySQL completely.

### The C kernel

The server compiles `c_engine/` with `cc` when it starts. If the Mac has no compiler, run this once and restart:

```bash
xcode-select --install
```

You can also build it by hand with `npm run kernel`.

### Other commands

```bash
npm run db                 # print every table in the terminal
npm run db audit_logs      # one table, all rows
npm run test:sync          # 50 automatic checks (keep "npm run dev" running in another terminal)
npm run test:load          # load test: 50 clients x 20 requests, 50 parallel inserts, lock race
```

To view the SQLite file in VS Code, install the recommended **SQLite Viewer** extension and click `data/resqsync.db`.

---

## Where each report feature lives

| Report feature | Code |
|---|---|
| Process synchronization: bounded ready queue, semaphores, mutex, condition variable | `server/resSync.js`, `server/resAllocator.js` |
| Priority scheduling with aging + ML boost, then risk/location score, then arrival → id | `server/resAllocator.js` (`resCompareItems`) |
| **Location factor**: 20 km city, depot in each zone, nearer case first inside the same priority | `server/resGeo.js`, case form map picker, City map |
| **ML risk model**: logistic regression from scratch, trained on 3000 simulated incidents, compared with the priority-only rule | `server/resModel.js`, ML risk model page |
| Producer–consumer workers, "Allocate by priority" button | `server/resAllocator.js`, Sync monitor page |
| CPU scheduling FCFS / SJF / SRTF / Priority / RR | `c_engine/cpu_scheduler.c`, OS lab → CPU scheduling |
| Mutex race demo (pthreads) | `c_engine/synchronization.c`, OS lab → Mutex |
| Semaphore producer–consumer | `c_engine/synchronization.c`, OS lab → Semaphore |
| IPC with fork + pipe | `c_engine/ipc_pipe.c`, OS lab → IPC pipes |
| Banker's algorithm (live zone data too) | `c_engine/bankers_algorithm.c`, OS lab → Banker's |
| Deadlock detection and recovery | `c_engine/deadlock.c`, OS lab → Deadlock |
| PCB / process table | `c_engine/pcb.c`, OS lab → Process table |
| 12 tables, keys, constraints | `database/schema.mysql.sql`, `database/schema.sqlite.sql` |
| 5 views | `v_priority_queue`, `v_zone_stock`, `v_volunteer_leaderboard`, `v_mission_board`, `v_user_ratings` |
| 8 triggers (underflow, audit, surplus alert, case audit, fulfilled ×2, rewards, low rating alert) | schema files, DBMS lab → Triggers |
| Stored procedures `sp_AllocateEmergencyResources`, `sp_DispatchRescueMission` | `schema.mysql.sql` (SQLite runs the same steps in `server/resDb.js`) |
| ACID transactions, rollback test, stock ledger | `server/resDb.js`, DBMS lab → Transactions |
| Row locking (`SELECT … FOR UPDATE`) and race test | DBMS lab → Concurrency |
| No duplicate open requests | unique `open_key` column / partial unique index |
| Organisation verification | Organisations page, `/api/organisations` |
| Rescue missions with stages, XP, coins, badges | Rescue missions + Rewards pages |
| Surplus food pickup tracking | Surplus food page |
| Notifications, audit log | bell in the top bar, Audit log page |
| City map, analytics, City Health Score | City map + Analytics pages |
| JWT login, bcrypt passwords | `server/resAuth.js` |
| Feedback & ratings (one per delivery, UNIQUE key; 1–2 stars alert the admin) | `feedback` table, `server/resExtraRoutes.js`, Missions / Surplus / Profile pages |
| Profile editing and password change | My profile page, `PATCH /api/me` |
| Compliance report (SLA per priority, zone resources, checks, CSV, print) | Reports & backups page, `/api/reports/compliance` |
| Expired-food archiving (expired rows moved to `surplus_food_archive` in one transaction, hourly job + admin button) | `server/resArchive.js`, Surplus food page |
| Load test (parallel reads, parallel inserts, ledger check, lock race) | `scripts/resLoadTest.js`, `npm run test:load` |
| Database backup & recovery (JSON dump, restore in one transaction, safety copy, auto backup) | `server/resBackup.js`, Reports & backups page |
| **Disaster drill**: same disaster replayed with FCFS, Priority + aging and ResQSync (discrete-event simulation), live map replay, scoreboard, team Gantt chart; can also report real drill cases | `server/resDrill.js`, Disaster drill page |
| **Crash recovery**: a child process is killed with SIGKILL in the middle of a stock update, with and without a transaction | `server/resCrash.js`, `server/resCrashWorker.js`, DBMS lab → Crash recovery |
| **Banker's algorithm on the live vehicle fleet** (vehicles return after a mission; workers only hand them out in a safe state) | `server/resBanker.js`, `server/resAllocator.js`, OS lab → Banker's on live fleet |
| **Smart text report** (English/Hinglish message fills the case form) | `server/resParse.js`, case form on Emergency queue / My requests |
| **Stock forecast** (moving-average use rate, time until empty, restock suggestion, admin alerts) | `server/resForecast.js`, Stock & forecast page |
| **Route planning**: Dijkstra with a min-heap on the road grid, river + bridges, admin can close roads | `server/resRoutePlan.js`, City map & routes |
| **Index lab**: same query with and without a covering B-tree index, EXPLAIN plans and timings | `server/resIndexLab.js`, DBMS lab → Indexing |

## How the queue is ordered (emergency + location + ML)

1. **Emergency first.** Effective priority = given priority − aging − ML boost. The ML boost is 1 when the predicted risk is ≥ 0.85 (a P2 can become P1, nothing goes above P1).
2. **Same level?** score = 0.6 × ML risk + 0.4 × nearness, where nearness = 1 − distance to the zone depot / 7.07 km. Higher score first.
3. **Still tied?** older first, then case before request, then smaller id.

So a far P1 is always served before a near P3, but two P2 cases are ordered by how risky and how close they are. The weights are in `.env` (`RISK_WEIGHT`, `DISTANCE_WEIGHT`, `ML_PROMOTE_AT`).

An older database file is upgraded automatically on start (new columns and the feedback table are added). For fresh demo data, delete the `data` folder.

## Folder layout

```
resqsync/
├── server.js              starts DB → seed → C kernel → allocator → web server
├── server/                Express API, database layer, allocator, sync primitives
├── src/                   React frontend (views/ = pages, components/ = shared parts)
├── c_engine/              C kernel (make → resqsync_kernel)
├── database/              MySQL and SQLite schema
├── scripts/resShowDb.js   npm run db
└── tests/resSync.test.js  npm run test:sync
```
