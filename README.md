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
npm run test:sync          # 18 automatic checks (keep "npm run dev" running in another terminal)
```

To view the SQLite file in VS Code, install the recommended **SQLite Viewer** extension and click `data/resqsync.db`.

---

## Where each report feature lives

| Report feature | Code |
|---|---|
| Process synchronization: bounded ready queue, semaphores, mutex, condition variable | `server/resSync.js`, `server/resAllocator.js` |
| Priority scheduling with aging and tie-break (priority → arrival → id) | `server/resAllocator.js` (`resCompareRows`) |
| Producer–consumer workers, "Allocate by priority" button | `server/resAllocator.js`, Sync monitor page |
| CPU scheduling FCFS / SJF / SRTF / Priority / RR | `c_engine/cpu_scheduler.c`, OS lab → CPU scheduling |
| Mutex race demo (pthreads) | `c_engine/synchronization.c`, OS lab → Mutex |
| Semaphore producer–consumer | `c_engine/synchronization.c`, OS lab → Semaphore |
| IPC with fork + pipe | `c_engine/ipc_pipe.c`, OS lab → IPC pipes |
| Banker's algorithm (live zone data too) | `c_engine/bankers_algorithm.c`, OS lab → Banker's |
| Deadlock detection and recovery | `c_engine/deadlock.c`, OS lab → Deadlock |
| PCB / process table | `c_engine/pcb.c`, OS lab → Process table |
| 10 tables, keys, constraints | `database/schema.mysql.sql`, `database/schema.sqlite.sql` |
| 4 views | `v_priority_queue`, `v_zone_stock`, `v_volunteer_leaderboard`, `v_mission_board` |
| 7 triggers (underflow, audit, surplus alert, case audit, fulfilled ×2, rewards) | schema files, DBMS lab → Triggers |
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
