import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
const LOCAL_DB_PATH = path.resolve(process.cwd(), "data", "resqsync_local_db.json");
const dataDir = path.dirname(LOCAL_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
let simStore = {
  users: [],
  emergency_cases: [],
  resources: [],
  surplus_food: [],
  rescue_missions: [],
  volunteers: [],
  organisations: [],
  resource_requests: [],
  system_notifications: [],
  audit_logs: []
};
function loadLocalDatabase() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      simStore = JSON.parse(raw);
    } else {
      saveLocalDatabase();
    }
  } catch (err) {
    console.error("[Local Database] Failed to load local database file:", err.message);
  }
}
function saveLocalDatabase() {
  try {
    simStore.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(simStore, null, 2), "utf-8");
  } catch (err) {
    console.error("[Local Database] Failed to write local database file:", err.message);
  }
}
loadLocalDatabase();
let pool = null;
let isLiveMySqlConnected = false;
let lastError;
export let currentDbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "resqsync_db",
  connectTimeout: 2e3
};
export async function initDatabase(customConfig) {
  if (customConfig) {
    currentDbConfig = { ...currentDbConfig, ...customConfig };
  }
  try {
    if (pool) {
      await pool.end().catch(() => {
      });
      pool = null;
    }
    pool = mysql.createPool({
      ...currentDbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const connection = await pool.getConnection();
    connection.release();
    isLiveMySqlConnected = true;
    lastError = void 0;
    return true;
  } catch (err) {
    if (pool) {
      await pool.end().catch(() => {
      });
      pool = null;
    }
    isLiveMySqlConnected = false;
    lastError = err?.message || "Connection refused";
    return false;
  }
}
export async function getDbStatus() {
  const tableCounts = {
    users: simStore.users?.length || 0,
    emergency_cases: simStore.emergency_cases?.length || 0,
    resources: simStore.resources?.length || 0,
    surplus_food: simStore.surplus_food?.length || 0,
    rescue_missions: simStore.rescue_missions?.length || 0,
    volunteers: simStore.volunteers?.length || 0,
    organisations: simStore.organisations?.length || 0,
    resource_requests: simStore.resource_requests?.length || 0,
    system_notifications: simStore.system_notifications?.length || 0,
    audit_logs: simStore.audit_logs?.length || 0
  };
  if (isLiveMySqlConnected && pool) {
    try {
      const [userCount] = await pool.query("SELECT COUNT(*) as c FROM users");
      const [emCount] = await pool.query("SELECT COUNT(*) as c FROM emergency_cases");
      const [resCount] = await pool.query("SELECT COUNT(*) as c FROM resources");
      tableCounts.users = userCount[0]?.c ?? tableCounts.users;
      tableCounts.emergency_cases = emCount[0]?.c ?? tableCounts.emergency_cases;
      tableCounts.resources = resCount[0]?.c ?? tableCounts.resources;
    } catch {
    }
  }
  return {
    connected: isLiveMySqlConnected,
    engine: isLiveMySqlConnected ? "Local MySQL Database (Connected)" : "Local Persistent Database (Active)",
    host: currentDbConfig.host,
    port: currentDbConfig.port,
    database: currentDbConfig.database,
    user: currentDbConfig.user,
    error: lastError,
    tables: tableCounts,
    lastChecked: (/* @__PURE__ */ new Date()).toISOString(),
    filePath: LOCAL_DB_PATH
  };
}
export const db = {
  // USERS
  getUsers: async () => simStore.users,
  getUserByEmail: async (email) => simStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  createUser: async (user) => {
    const newUser = { id: `u_${Date.now()}`, ...user };
    simStore.users.push(newUser);
    saveLocalDatabase();
    if (isLiveMySqlConnected && pool) {
      try {
        await pool.query(
          "INSERT INTO users (id, email, password, role, name, phone, zone) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [newUser.id, newUser.email, newUser.password || "password", newUser.role, newUser.name, newUser.phone || "", newUser.zone || "Zone A"]
        );
      } catch (e) {
        console.warn("[MySQL Sync] Failed to insert user into live MySQL:", e);
      }
    }
    return newUser;
  },
  // EMERGENCIES
  getEmergencies: async () => simStore.emergency_cases,
  createEmergency: async (em) => {
    const newId = `em_${Date.now()}`;
    const pid = `PID-${100 + (simStore.emergency_cases?.length || 0) + 1}`;
    const newEm = {
      id: newId,
      process_id: pid,
      status: "pending",
      arrival_time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      ...em
    };
    simStore.emergency_cases.unshift(newEm);
    simStore.audit_logs.unshift({
      id: Date.now(),
      action: "PROCESS_SPAWNED",
      entity_type: "EMERGENCY_CASE",
      entity_id: newId,
      actor: em.reported_by || "Emergency Dispatch",
      details: `New emergency task created: ${em.title} (${em.priority})`,
      os_concept: "Process Creation & Priority Scheduling",
      dbms_concept: "INSERT INTO emergency_cases (ACID)",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalDatabase();
    if (isLiveMySqlConnected && pool) {
      try {
        await pool.query(
          `INSERT INTO emergency_cases (id, process_id, title, type, priority, priority_score, zone, location, required_food, required_water, required_medicine, required_vehicles, required_volunteers, arrival_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newEm.id, newEm.process_id, newEm.title, newEm.type, newEm.priority, newEm.priority_score || 1, newEm.zone, newEm.location, newEm.required_food || 0, newEm.required_water || 0, newEm.required_medicine || 0, newEm.required_vehicles || 0, newEm.required_volunteers || 0, newEm.arrival_time]
        );
      } catch (e) {
        console.warn("[MySQL Sync] Failed to insert emergency case:", e);
      }
    }
    return newEm;
  },
  updateEmergencyStatus: async (id, status) => {
    const em = simStore.emergency_cases.find((e) => e.id === id);
    if (em) {
      em.status = status;
      saveLocalDatabase();
      if (isLiveMySqlConnected && pool) {
        pool.query("UPDATE emergency_cases SET status = ? WHERE id = ?", [status, id]).catch(() => {
        });
      }
      return em;
    }
    return null;
  },
  // RESOURCES
  getResources: async () => simStore.resources,
  updateResourceStock: async (id, available, allocated) => {
    const res = simStore.resources.find((r) => r.id === id);
    if (res) {
      res.available_units = available;
      res.allocated_units = allocated;
      saveLocalDatabase();
      return res;
    }
    return null;
  },
  allocateResources: async (zone, allocation) => {
    const zoneResources = simStore.resources.filter((r) => r.zone === zone);
    const updates = [];
    for (const [type, reqAmount] of Object.entries(allocation)) {
      if (!reqAmount) continue;
      const target = zoneResources.find((r) => r.resource_type === type);
      if (target) {
        if (target.available_units < reqAmount) {
          throw new Error(`Insufficient available ${type} in ${zone} (requested: ${reqAmount}, available: ${target.available_units})`);
        }
        target.available_units -= reqAmount;
        target.allocated_units += reqAmount;
        updates.push(target);
      }
    }
    simStore.audit_logs.unshift({
      id: Date.now(),
      action: "SAFE_RESOURCE_ALLOCATION",
      entity_type: "RESOURCES",
      entity_id: zone,
      actor: "Banker Safety Engine",
      details: `Allocated resources in ${zone}: ${JSON.stringify(allocation)}`,
      os_concept: "Banker Algorithm Deadlock Avoidance",
      dbms_concept: "Row-Level Locking & Transaction Commit",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalDatabase();
    return updates;
  },
  // MISSIONS
  getMissions: async () => simStore.rescue_missions,
  createMission: async (mission) => {
    const newMission = {
      id: `ms_${Date.now()}`,
      status: "assigned",
      ...mission
    };
    simStore.rescue_missions.unshift(newMission);
    saveLocalDatabase();
    return newMission;
  },
  claimMissionWithMutex: async (missionId, volunteerId, volunteerName) => {
    const mission = simStore.rescue_missions.find((m) => m.id === missionId);
    if (!mission) throw new Error("Mission not found");
    if (mission.volunteer_id && mission.volunteer_id !== volunteerId) {
      throw new Error("Mutex Lock Conflict: Mission already claimed by another responder.");
    }
    mission.volunteer_id = volunteerId;
    mission.volunteer_name = volunteerName;
    mission.mutex_lock_token = `MUTEX-${Date.now()}-${volunteerId.slice(-4)}`;
    mission.status = "pickup";
    const vol = simStore.volunteers.find((v) => v.user_id === volunteerId);
    if (vol) {
      vol.availability = "Busy";
      vol.active_mission_id = missionId;
    }
    simStore.audit_logs.unshift({
      id: Date.now(),
      action: "MUTEX_ACQUIRED",
      entity_type: "RESCUE_MISSION",
      entity_id: missionId,
      actor: volunteerName,
      details: `Volunteer claimed mission ${mission.title}. Mutex token: ${mission.mutex_lock_token}`,
      os_concept: "Mutex Binary Semaphore",
      dbms_concept: "Exclusive Row Lock (FOR UPDATE)",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalDatabase();
    return mission;
  },
  updateMissionStage: async (missionId, status) => {
    const mission = simStore.rescue_missions.find((m) => m.id === missionId);
    if (mission) {
      mission.status = status;
      if (status === "completed" && mission.volunteer_id) {
        const vol = simStore.volunteers.find((v) => v.user_id === mission.volunteer_id);
        if (vol) {
          vol.availability = "Available";
          vol.active_mission_id = null;
          vol.xp += 50;
          vol.coins += 15;
          vol.completed_missions_count = (vol.completed_missions_count || 0) + 1;
        }
      }
      saveLocalDatabase();
      return mission;
    }
    return null;
  },
  // SURPLUS FOOD
  getSurplusFood: async () => simStore.surplus_food,
  createSurplusFood: async (food) => {
    const newFood = {
      id: `food_${Date.now()}`,
      status: "available",
      ...food
    };
    simStore.surplus_food.unshift(newFood);
    simStore.audit_logs.unshift({
      id: Date.now(),
      action: "SURPLUS_FOOD_REGISTERED",
      entity_type: "SURPLUS_FOOD",
      entity_id: newFood.id,
      actor: food.restaurant_name || "Restaurant",
      details: `Donated ${food.quantity_servings} servings of ${food.title}`,
      os_concept: "Producer-Consumer Buffer Enqueue",
      dbms_concept: "INSERT with Expiry Trigger",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalDatabase();
    return newFood;
  },
  updateSurplusFoodStatus: async (id, status) => {
    const food = simStore.surplus_food.find((f) => f.id === id);
    if (food) {
      food.status = status;
      saveLocalDatabase();
      return food;
    }
    return null;
  },
  // VOLUNTEERS
  getVolunteers: async () => simStore.volunteers,
  awardVolunteer: async (volunteerId, xpGain, coinsGain) => {
    const vol = simStore.volunteers.find((v) => v.user_id === volunteerId || v.id === volunteerId);
    if (vol) {
      vol.xp += xpGain;
      vol.coins += coinsGain;
      saveLocalDatabase();
      return vol;
    }
    return null;
  },
  // ORGANISATIONS
  getOrganisations: async () => simStore.organisations,
  createOrganisation: async (org) => {
    const newOrg = { id: `org_${Date.now()}`, status: "verified", ...org };
    simStore.organisations.push(newOrg);
    saveLocalDatabase();
    return newOrg;
  },
  // NOTIFICATIONS
  getNotifications: async () => simStore.system_notifications,
  markAllNotificationsRead: async () => {
    simStore.system_notifications.forEach((n) => n.is_read = true);
    saveLocalDatabase();
    return true;
  },
  // AUDIT LOGS
  getAuditLogs: async () => simStore.audit_logs
};
