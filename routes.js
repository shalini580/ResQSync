import { Router } from "express";
import { db, getDbStatus } from './db.js';
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
export const apiRouter = Router();

// Helper to run compiled C OS kernel binary
const C_BINARY_PATH = path.resolve(process.cwd(), 'c_engine', 'os_kernel');
const C_SOURCE_PATH = path.resolve(process.cwd(), 'c_engine', 'os_kernel.c');

function runCKernel(args) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(C_BINARY_PATH)) {
      return reject(new Error('C Kernel executable not found at ' + C_BINARY_PATH));
    }
    execFile(C_BINARY_PATH, args, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr || err.message));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        resolve({ rawOutput: stdout });
      }
    });
  });
}

// OS C-Engine Endpoints
apiRouter.get("/os/c-engine/status", async (req, res) => {
  try {
    const data = await runCKernel(["--status"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, status: "OFFLINE" });
  }
});

apiRouter.post("/os/c-engine/schedule", async (req, res) => {
  try {
    const { algorithm = "Priority", quantum = 2 } = req.body;
    const data = await runCKernel(["--schedule", algorithm, quantum.toString()]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/banker", async (req, res) => {
  try {
    const { food = 850, water = 1200, medicine = 240, vehicles = 14 } = req.body;
    const data = await runCKernel([
      "--banker",
      food.toString(),
      water.toString(),
      medicine.toString(),
      vehicles.toString()
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/process-ops", async (req, res) => {
  try {
    const { operation = "context-switch", targetPid = 101 } = req.body;
    const data = await runCKernel(["--process-ops", operation, targetPid.toString()]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/sync", async (req, res) => {
  try {
    const { syncType = "mutex" } = req.body;
    const data = await runCKernel(["--sync", syncType]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/ipc", async (req, res) => {
  try {
    const data = await runCKernel(["--ipc"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/banker-request", async (req, res) => {
  try {
    const { procIndex = 1, request = [10, 20, 10, 1] } = req.body;
    const data = await runCKernel([
      "--banker-request",
      procIndex.toString(),
      request[0].toString(),
      request[1].toString(),
      request[2].toString(),
      request[3].toString()
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/deadlock-detect", async (req, res) => {
  try {
    const data = await runCKernel(["--deadlock-detect"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post("/os/c-engine/deadlock-recover", async (req, res) => {
  try {
    const data = await runCKernel(["--deadlock-recover"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const C_DIR = path.resolve(process.cwd(), 'c_engine');

apiRouter.get("/os/c-engine/files", (req, res) => {
  try {
    if (!fs.existsSync(C_DIR)) {
      return res.status(404).json({ error: "c_engine folder not found" });
    }
    const files = fs.readdirSync(C_DIR).filter(f => f.endsWith('.c') || f.endsWith('.h') || f === 'Makefile');
    const descriptions = {
      'pcb.h': 'Process Control Block (PCB) Header & CPU Register Structs',
      'pcb.c': 'Process Lifecycle, State Transitions & Context Switching',
      'cpu_scheduler.h': 'CPU Scheduler Definitions & TimelineSlot Structures',
      'cpu_scheduler.c': 'Priority Preemptive, FCFS, SJF, SRTF & Round Robin Algorithms',
      'synchronization.h': 'Mutex, Semaphores & Concurrency Control Headers',
      'synchronization.c': 'pthread_mutex, sem_t Counting Semaphore & Race Condition Test',
      'ipc_pipe.h': 'POSIX Inter-Process Communication Pipe Prototypes',
      'ipc_pipe.c': 'POSIX pipe(), fork() & Duplex Message Passing Stream',
      'bankers_algorithm.h': "Dijkstra Banker's Resource Allocation Matrices & Structs",
      'bankers_algorithm.c': 'Safety Check Algorithm & Dynamic Resource Request Validation',
      'deadlock.h': 'Resource Allocation Graph (RAG) & Wait-For Graph (WFG) Headers',
      'deadlock.c': 'DFS Cycle Detection, 4 Coffman Conditions & Victim Preemption',
      'main.c': 'Kernel CLI Engine Dispatcher, Microsecond Profiler & JSON Serializer',
      'Makefile': 'GCC Compiler Automation, Build Flags & Automated Test Suite',
      'os_kernel.c': 'Unified Master OS Kernel Reference File'
    };
    const fileList = files.map(filename => {
      const filePath = path.join(C_DIR, filename);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lineCount = content.split('\n').length;
      return {
        name: filename,
        sizeBytes: stat.size,
        lineCount,
        description: descriptions[filename] || 'C Kernel Source File',
        type: filename.endsWith('.h') ? 'header' : filename.endsWith('.c') ? 'source' : 'config'
      };
    });
    res.json({ folder: "c_engine", totalFiles: fileList.length, files: fileList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get("/os/c-engine/file/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).send("Invalid filename");
    }
    const targetPath = path.join(C_DIR, filename);
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, "utf8");
      res.type("text/plain").send(content);
    } else {
      res.status(404).send(`// File ${filename} not found in c_engine`);
    }
  } catch (err) {
    res.status(500).send("// Error reading file: " + err.message);
  }
});

apiRouter.get("/os/c-engine/source", (req, res) => {
  try {
    const file = req.query.file;
    if (file && /^[a-zA-Z0-9_\-\.]+$/.test(file)) {
      const targetPath = path.join(C_DIR, file);
      if (fs.existsSync(targetPath)) {
        return res.type("text/plain").send(fs.readFileSync(targetPath, "utf8"));
      }
    }
    if (fs.existsSync(path.join(C_DIR, "main.c"))) {
      const source = fs.readFileSync(path.join(C_DIR, "main.c"), "utf8");
      return res.type("text/plain").send(source);
    }
    if (fs.existsSync(C_SOURCE_PATH)) {
      const source = fs.readFileSync(C_SOURCE_PATH, "utf8");
      return res.type("text/plain").send(source);
    }
    res.status(404).send("// C source file not found");
  } catch (err) {
    res.status(500).send("// Error reading C source file: " + err.message);
  }
});

// ==============================================================================
// DBMS & MySQL ARCHITECTURE API ENDPOINTS
// ==============================================================================

// 1. DBMS Views
apiRouter.get("/db/views/:viewName", async (req, res) => {
  try {
    const { viewName } = req.params;
    const emergencies = await db.getEmergencies();
    const resources = await db.getResources();
    const surplus = await db.getSurplusFood();
    const volunteers = await db.getVolunteers();
    const missions = await db.getMissions();

    if (viewName === "v_active_emergencies_summary") {
      const rows = emergencies
        .filter(e => ["pending", "allocated", "in_progress"].includes(e.status))
        .map(e => ({
          id: e.id,
          process_id: e.process_id,
          title: e.title,
          priority: e.priority,
          zone: e.zone,
          status: e.status,
          total_supplies_needed: e.required_food + e.required_water + e.required_medicine,
          required_vehicles: e.required_vehicles,
          required_volunteers: e.required_volunteers,
          assigned_missions: missions.filter(m => m.emergency_id === e.id).length
        }));
      return res.json({ view: viewName, rows, definition: "CREATE OR REPLACE VIEW v_active_emergencies_summary AS SELECT ... FROM emergency_cases WHERE status IN ('pending', 'allocated', 'in_progress')" });
    }

    if (viewName === "v_zone_resource_deficits") {
      const rows = resources.map(r => ({
        zone: r.zone,
        resource_type: r.resource_type,
        total_capacity: r.total_capacity,
        available_units: r.available_units,
        allocated_units: r.allocated_units,
        availability_pct: ((r.available_units / r.total_capacity) * 100).toFixed(1) + "%",
        inventory_health: r.available_units < (r.total_capacity * 0.25) ? "CRITICAL_DEFICIT" : r.available_units < (r.total_capacity * 0.5) ? "MODERATE_STOCK" : "HEALTHY_STOCK"
      }));
      return res.json({ view: viewName, rows, definition: "CREATE OR REPLACE VIEW v_zone_resource_deficits AS SELECT zone, resource_type, available_units, ROUND((available_units / total_capacity)*100, 1) AS availability_pct ... FROM resources" });
    }

    if (viewName === "v_volunteer_leaderboard") {
      const rows = [...volunteers]
        .sort((a, b) => b.xp - a.xp)
        .map((v, idx) => ({
          civic_rank: idx + 1,
          id: v.id,
          name: v.name,
          zone: v.zone,
          availability: v.availability,
          xp: v.xp,
          coins: v.coins,
          badge: v.badge,
          completed_missions_count: v.completed_missions_count
        }));
      return res.json({ view: viewName, rows, definition: "CREATE OR REPLACE VIEW v_volunteer_leaderboard AS SELECT id, name, xp, DENSE_RANK() OVER (ORDER BY xp DESC) AS civic_rank FROM volunteers" });
    }

    if (viewName === "v_food_rescue_stats") {
      const map = {};
      surplus.forEach(item => {
        const key = `${item.restaurant_name} (${item.zone})`;
        if (!map[key]) {
          map[key] = { restaurant: item.restaurant_name, zone: item.zone, total_donations: 0, total_servings: 0, delivered_servings: 0, available_servings: 0 };
        }
        map[key].total_donations++;
        map[key].total_servings += item.quantity_servings;
        if (item.status === "delivered") map[key].delivered_servings += item.quantity_servings;
        if (item.status === "available") map[key].available_servings += item.quantity_servings;
      });
      return res.json({ view: viewName, rows: Object.values(map), definition: "CREATE OR REPLACE VIEW v_food_rescue_stats AS SELECT restaurant_name, zone, COUNT(*) AS total_donations, SUM(quantity_servings) FROM surplus_food GROUP BY restaurant_name, zone" });
    }

    res.status(404).json({ error: "View not found: " + viewName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. DBMS ACID Transactions Simulation
apiRouter.post("/db/transactions/simulate-acid", async (req, res) => {
  try {
    const { scenario = "commit", caseId = "em_1" } = req.body;
    const isRollback = scenario === "rollback";

    const transactionLogs = [
      "T1: START TRANSACTION; [ISOLATION LEVEL: REPEATABLE READ]",
      "T1: SELECT available_units FROM resources WHERE zone='Zone A' AND resource_type='food' FOR UPDATE; [EXCLUSIVE ROW LOCK]",
      "T1: SELECT available_units FROM resources WHERE zone='Zone A' AND resource_type='water' FOR UPDATE; [EXCLUSIVE ROW LOCK]"
    ];

    if (isRollback) {
      transactionLogs.push(
        "T1: EVALUATING INVENTORY INVARIANT: Requested 800 rations > Available 320 rations.",
        "T1: SIGNAL SQLSTATE '45000' TRIGGER: Inventory underflow violation detected!",
        "T1: ROLLBACK; [ALL TEMPORARY WRITES REVERTED]",
        "T1: Row locks released. Available units remain untouched at 320. State consistency preserved."
      );
      return res.json({
        scenario: "ROLLBACK",
        acidProperties: {
          atomicity: "GUARANTEED: Zero changes were committed; all mutations rolled back cleanly.",
          consistency: "GUARANTEED: Table invariant (available_units >= 0) prevented invalid state transition.",
          isolation: "GUARANTEED: Other concurrent transactions were blocked from reading dirty state.",
          durability: "GUARANTEED: No uncommitted bytes entered write-ahead log (WAL)."
        },
        transactionLogs,
        status: "TRANSACTION_ABORTED_ROLLBACK"
      });
    }

    transactionLogs.push(
      "T1: UPDATE resources SET available_units = available_units - 60 WHERE zone='Zone A' AND resource_type='food';",
      "T1: UPDATE resources SET available_units = available_units - 80 WHERE zone='Zone A' AND resource_type='water';",
      "T1: UPDATE emergency_cases SET status='allocated' WHERE id='" + caseId + "';",
      "T1: INSERT INTO audit_logs (actor, action, details) VALUES ('Chief Controller', 'ACID_ALLOCATE', 'Committed 60 food & 80 water');",
      "T1: COMMIT; [WRITE-AHEAD LOG FLUSHED TO INNODB REDO LOG]",
      "T1: Transaction successfully committed. Row locks released."
    );

    res.json({
      scenario: "COMMIT",
      acidProperties: {
        atomicity: "GUARANTEED: Both resource deductions and case status update succeeded together.",
        consistency: "GUARANTEED: Total units preserved (available + allocated = total_capacity).",
        isolation: "GUARANTEED: Executed inside exclusive 2-Phase Locking (2PL) envelope.",
        durability: "GUARANTEED: Synced to persistent disk storage."
      },
      transactionLogs,
      status: "TRANSACTION_COMMITTED"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DBMS Row-Level Concurrency Locks (SELECT ... FOR UPDATE)
apiRouter.post("/db/concurrency/simulate-lock", async (req, res) => {
  try {
    const { lockMode = "FOR_UPDATE" } = req.body;
    const isLocking = lockMode === "FOR_UPDATE";

    if (isLocking) {
      return res.json({
        lockMode: "PESSIMISTIC_EXCLUSIVE (SELECT ... FOR UPDATE)",
        twoPhaseLocking: {
          growingPhase: "Thread 1 requests exclusive record lock on rescue_missions(id='ms_2'). Lock granted.",
          holdAndExecute: "Thread 1 reads status='assigned', sets status='in_transit'. Thread 2 attempts claim -> BLOCKED (WAITING FOR LOCK).",
          shrinkingPhase: "Thread 1 issues COMMIT; locks released. Thread 2 acquires lock, detects status='in_transit', gracefully aborts."
        },
        raceConditionResult: "ELIMINATED",
        winner: "Responder Alex Rivera",
        contender: "Responder Priya Sharma (Blocked by Row Lock, 0 Overwrites)"
      });
    }

    res.json({
      lockMode: "NON_LOCKING (RAW SELECT)",
      twoPhaseLocking: {
        growingPhase: "NONE. No lock acquired.",
        holdAndExecute: "Thread 1 and Thread 2 simultaneously read status='assigned'. Both issue UPDATE concurrently.",
        shrinkingPhase: "NONE."
      },
      raceConditionResult: "LOST UPDATE / RACE CONDITION COLLISION",
      winner: "Thread 2 overwrote Thread 1 assignment (Data inconsistency!)"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DBMS Index Optimizer Analysis (EXPLAIN Plan)
apiRouter.get("/db/explain-index", (req, res) => {
  res.json({
    query: "SELECT * FROM emergency_cases WHERE zone = 'Zone A' AND priority_score = 1 AND status = 'pending';",
    withIndex: {
      indexName: "idx_em_zone_priority_status (Composite B-Tree)",
      selectType: "SIMPLE",
      table: "emergency_cases",
      type: "ref",
      possibleKeys: ["idx_em_zone_priority_status", "idx_emergency_zone"],
      keyUsed: "idx_em_zone_priority_status",
      keyLength: "10 bytes",
      ref: "const,const,const",
      rowsExamined: 1,
      filteredPercentage: 100.0,
      extra: "Using index condition",
      executionTimeMs: 0.12,
      verdict: "OPTIMAL: Direct B-Tree logarithmic search O(log N). Scanned only 1 row."
    },
    withoutIndex: {
      indexName: "NONE (Index Dropped / Full Table Scan)",
      selectType: "SIMPLE",
      table: "emergency_cases",
      type: "ALL",
      possibleKeys: null,
      keyUsed: null,
      keyLength: null,
      ref: null,
      rowsExamined: 5000,
      filteredPercentage: 0.02,
      extra: "Using where",
      executionTimeMs: 8.45,
      verdict: "POOR: Full table scan O(N). Scanned 5,000 rows sequentially."
    },
    performanceBoostFactor: "70.4x Speedup"
  });
});

// 5. Active DBMS Triggers and Stored Procedures Registry
apiRouter.get("/db/catalog", (req, res) => {
  res.json({
    triggers: [
      {
        name: "trg_prevent_resource_underflow",
        timing: "BEFORE UPDATE",
        table: "resources",
        purpose: "Enforces non-negative inventory invariant. Rejects updates with SIGNAL SQLSTATE '45000'."
      },
      {
        name: "trg_audit_emergency_status_update",
        timing: "AFTER UPDATE",
        table: "emergency_cases",
        purpose: "Automatically inserts immutable log entry into audit_logs when emergency case status changes."
      },
      {
        name: "trg_surplus_food_auto_alert",
        timing: "AFTER INSERT",
        table: "surplus_food",
        purpose: "Automatically generates critical system notification when donation quantity >= 50 servings."
      }
    ],
    storedProcedures: [
      {
        name: "sp_allocate_emergency_resources",
        parameters: "p_case_id, p_actor, OUT p_status_code, OUT p_status_msg",
        acidGuarantees: "START TRANSACTION + SELECT ... FOR UPDATE + Consistency Check + ROLLBACK on error + COMMIT"
      },
      {
        name: "sp_claim_rescue_mission",
        parameters: "p_mission_id, p_volunteer_id, p_volunteer_name, OUT p_success, OUT p_message",
        acidGuarantees: "Mutex Concurrency Protection: Exclusive row lock eliminates race condition on mission assignment"
      }
    ],
    views: [
      "v_active_emergencies_summary",
      "v_zone_resource_deficits",
      "v_volunteer_leaderboard",
      "v_food_rescue_stats"
    ],
    indexes: [
      "idx_em_zone_priority_status (Composite B-Tree)",
      "idx_surplus_zone_status_expiry (Range Index)",
      "idx_vol_zone_avail_xp (Covering Index)",
      "idx_resources_zone_avail (Inventory Index)"
    ]
  });
});
apiRouter.get("/health", async (req, res) => {
  res.json({
    status: "online",
    server: "Node.js Express",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.get("/db/status", async (req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/api/db/connect", async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    const { initDatabase } = await import('./db.js');
    const success = await initDatabase({
      host: host || "127.0.0.1",
      port: parseInt(port || "3306", 10),
      user: user || "root",
      password: password || "",
      database: database || "resqsync_db"
    });
    const status = await getDbStatus();
    res.json({ success, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
apiRouter.post("/db/connect", async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    const { initDatabase } = await import('./db.js');
    const success = await initDatabase({
      host: host || "127.0.0.1",
      port: parseInt(port || "3306", 10),
      user: user || "root",
      password: password || "",
      database: database || "resqsync_db"
    });
    const status = await getDbStatus();
    res.json({ success, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
apiRouter.get("/db/schema-sql", (req, res) => {
  try {
    const schemaPath = path.resolve(process.cwd(), "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, "utf8");
      res.type("text/plain").send(content);
    } else {
      res.status(404).send("schema.sql not found");
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const user = await db.getUserByEmail(email);
    if (!user) {
      const newUser = await db.createUser({
        email,
        password: "password123",
        role: role || "admin",
        name: email.split("@")[0],
        zone: "Zone A"
      });
      return res.json({ success: true, user: newUser });
    }
    if (role && user.role !== role) {
      user.role = role;
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/auth/register", async (req, res) => {
  try {
    const { email, name, role, zone, phone } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "User with this email already exists" });
    }
    const newUser = await db.createUser({
      email,
      name,
      role: role || "volunteer",
      zone: zone || "Zone A",
      phone
    });
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/emergencies", async (req, res) => {
  try {
    const list = await db.getEmergencies();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/emergencies", async (req, res) => {
  try {
    const { title, type, priority, zone, location, required_food, required_water, required_medicine, required_vehicles, required_volunteers } = req.body;
    if (!title || !zone) {
      return res.status(400).json({ error: "Title and zone are required" });
    }
    const priorityScore = priority?.startsWith("P1") ? 1 : priority?.startsWith("P2") ? 2 : priority?.startsWith("P3") ? 3 : 4;
    const newCase = await db.createEmergency({
      title,
      type: type || "flood",
      priority: priority || "P2 - High",
      priority_score: priorityScore,
      zone,
      location: location || `${zone} Incident Site`,
      required_food: parseInt(required_food || "0", 10),
      required_water: parseInt(required_water || "0", 10),
      required_medicine: parseInt(required_medicine || "0", 10),
      required_vehicles: parseInt(required_vehicles || "0", 10),
      required_volunteers: parseInt(required_volunteers || "0", 10)
    });
    res.status(201).json(newCase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/emergencies/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await db.updateEmergencyStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Emergency not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/resources", async (req, res) => {
  try {
    const list = await db.getResources();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/resources/allocate", async (req, res) => {
  try {
    const { zone, allocation } = req.body;
    if (!zone || !allocation) {
      return res.status(400).json({ error: "Zone and allocation payload required" });
    }
    const updated = await db.allocateResources(zone, allocation);
    res.json({ success: true, updated, message: "Banker's Algorithm safe state verified" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
apiRouter.get("/missions", async (req, res) => {
  try {
    const list = await db.getMissions();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/missions/claim", async (req, res) => {
  try {
    const { missionId, volunteerId, volunteerName } = req.body;
    if (!missionId || !volunteerId) {
      return res.status(400).json({ error: "missionId and volunteerId required" });
    }
    const mission = await db.claimMissionWithMutex(missionId, volunteerId, volunteerName || "Volunteer");
    res.json({ success: true, mission });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});
apiRouter.put("/missions/:id/stage", async (req, res) => {
  try {
    const { status } = req.body;
    const mission = await db.updateMissionStage(req.params.id, status);
    if (!mission) return res.status(404).json({ error: "Mission not found" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/surplus-food", async (req, res) => {
  try {
    const list = await db.getSurplusFood();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.post("/surplus-food", async (req, res) => {
  try {
    const { title, restaurant_name, quantity_servings, food_type, zone, preparation_time, expiry_time, pickup_window } = req.body;
    if (!title || !quantity_servings) {
      return res.status(400).json({ error: "Title and quantity are required" });
    }
    const newFood = await db.createSurplusFood({
      title,
      restaurant_name: restaurant_name || "Partner Kitchen",
      quantity_servings: parseInt(quantity_servings, 10),
      food_type: food_type || "Fresh Cooked Meals",
      zone: zone || "Zone A",
      preparation_time: preparation_time || "10:00 AM",
      expiry_time: expiry_time || "03:00 PM",
      pickup_window: pickup_window || "11:00 AM - 01:00 PM"
    });
    res.status(201).json(newFood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/volunteers", async (req, res) => {
  try {
    const list = await db.getVolunteers();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/organisations", async (req, res) => {
  try {
    const list = await db.getOrganisations();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/notifications", async (req, res) => {
  try {
    const list = await db.getNotifications();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.put("/notifications/mark-all-read", async (req, res) => {
  try {
    await db.markAllNotificationsRead();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get("/audit-logs", async (req, res) => {
  try {
    const list = await db.getAuditLogs();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
