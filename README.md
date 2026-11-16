
# ResQSync – Intelligent Emergency Relief & Resource Coordination System

**ResQSync** is a simulation-based city management platform designed to coordinate emergency response, resource allocation, food donations, and volunteer rescue operations.

The platform connects restaurants, NGOs, shelters, volunteers, and administrators to reduce food wastage and improve resource distribution during emergencies.

Developed as an **Operating Systems and DBMS Project** at Graphic Era University (GEU).

## Key Features

- **Role-Based Access:** Separate dashboards for Admin, NGO, Restaurant, and Volunteer.
- **Emergency Management:** Create, monitor, and prioritize emergency cases.
- **Resource Allocation:** Allocate food, water, medicines, and other resources based on priority and availability.
- **Food Donation Management:** Connect restaurants with NGOs and shelters to manage surplus food.
- **Rescue Missions:** Assign volunteers, track mission progress, and manage deliveries.
- **OS Simulation:** Demonstrate CPU scheduling, multithreading, synchronization, IPC, deadlock handling, and Banker's Algorithm.
- **Database Management:** Implement transactions, ACID properties, concurrency control, locks, triggers, views, and stored procedures.
- **Gamification:** Reward volunteers with XP, coins, levels, badges, and leaderboards.
- **Analytics:** Monitor resource usage, rescue activities, volunteer performance, and City Health Score.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MySQL / SQLite |
| OS Engine | C, Pthreads |
| Authentication | JWT, Bcrypt |
| Inter-Process Communication | Fork, Pipes |

## Operating System Concepts

ResQSync integrates practical OS concepts into its resource coordination workflow:

- Process Management and PCB
- CPU Scheduling (FCFS, SJF, SRTF, Priority, Round Robin)
- Multithreading using Pthreads
- Mutex and Semaphore
- Process Synchronization
- Inter-Process Communication (IPC)
- Deadlock Detection and Recovery
- Banker's Algorithm
- Resource Allocation

## DBMS Concepts

- ER Modeling and Relational Database Design
- SQL and Normalization
- Primary Keys, Foreign Keys, and Constraints
- ACID Transactions
- Concurrency Control and Row Locking
- Database Triggers
- Stored Procedures
- Views and Indexing
- Audit Logs and Recovery

## Project Structure

```text
resqsync/
├── c_engine/       # C-based OS simulation
├── database/       # MySQL and SQLite schemas
├── server/         # Backend APIs and resource allocator
├── src/            # React frontend
├── scripts/        # Database utilities
├── tests/          # Synchronization tests
├── server.js       # Application entry point
└── package.json
```

## Installation and Setup

### Prerequisites
- Node.js 22.13+
- npm
- C compiler (GCC/Clang)
- MySQL (optional; SQLite fallback supported)

### Steps

```bash
git clone <repository-url>
cd resqsync
npm install
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

### Database Configuration

ResQSync supports MySQL and SQLite.

- MySQL is used when the database connection is configured.
- SQLite is used as a fallback when MySQL is unavailable.
- Set `DB_ENGINE=sqlite` in `.env` to use SQLite directly.

## Testing

Run synchronization tests:

```bash
npm run test:sync
```

View database records:

```bash
npm run db
```

## Team Information

**Team Name:** Avengers  
**Team ID:** OSDBMS-V-2026-T167  
**Institution:** Graphic Era University

## Project Scope

ResQSync is an academic simulation platform. City locations, emergencies, users, resources, and rescue activities are simulated. It is not intended to replace real-world emergency response services.
