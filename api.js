export const api = {
  // DB & Server Health
  async getDbStatus() {
    try {
      const res = await fetch("/api/db/status");
      if (!res.ok) throw new Error("Failed to fetch DB status");
      return await res.json();
    } catch {
      return {
        connected: false,
        engine: "Local Persistent Database (Active)",
        host: "localhost",
        port: 3306,
        database: "resqsync_db",
        user: "root",
        tables: {
          users: 4,
          emergency_cases: 5,
          resources: 20,
          surplus_food: 3,
          rescue_missions: 2,
          volunteers: 3,
          organisations: 3,
          resource_requests: 1,
          system_notifications: 3,
          audit_logs: 1
        },
        lastChecked: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  },
  async connectDb(config) {
    try {
      const res = await fetch("/api/db/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  async getSchemaSql() {
    try {
      const res = await fetch("/api/db/schema-sql");
      if (!res.ok) throw new Error("Failed to fetch schema");
      return await res.text();
    } catch {
      return "-- MySQL schema available in /schema.sql";
    }
  },
  // Auth
  async login(email, role) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role })
      });
      return await res.json();
    } catch (err) {
      console.warn("Backend login fallback:", err.message);
      return null;
    }
  },
  async register(data) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.warn("Backend register fallback:", err.message);
      return null;
    }
  },
  // Emergencies
  async getEmergencies() {
    try {
      const res = await fetch("/api/emergencies");
      if (res.ok) return await res.json();
    } catch {
    }
    return null;
  },
  async createEmergency(data) {
    try {
      const res = await fetch("/api/emergencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend createEmergency failed:", err);
    }
    return null;
  },
  // Resources
  async getResources() {
    try {
      const res = await fetch("/api/resources");
      if (res.ok) return await res.json();
    } catch {
    }
    return null;
  },
  async allocateResources(zone, allocation) {
    try {
      const res = await fetch("/api/resources/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone, allocation })
      });
      return await res.json();
    } catch (err) {
      return { error: err.message };
    }
  },
  // Missions
  async claimMission(missionId, volunteerId, volunteerName) {
    try {
      const res = await fetch("/api/missions/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, volunteerId, volunteerName })
      });
      return await res.json();
    } catch (err) {
      return { error: err.message };
    }
  },
  async updateMissionStage(missionId, status) {
    try {
      const res = await fetch(`/api/missions/${missionId}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend updateMissionStage failed:", err);
    }
    return null;
  },
  // Surplus food
  async createSurplusFood(data) {
    try {
      const res = await fetch("/api/surplus-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend createSurplusFood failed:", err);
    }
    return null;
  },
  // Notifications
  async markAllNotificationsRead() {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "PUT" });
    } catch {
    }
  },

  // Native C OS Kernel Engine Integrations
  async getCEngineStatus() {
    try {
      const res = await fetch("/api/os/c-engine/status");
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("getCEngineStatus failed:", err);
    }
    return { status: "OFFLINE", engine: "Native C Kernel" };
  },

  async runCScheduling(algorithm = "Priority", quantum = 2) {
    try {
      const res = await fetch("/api/os/c-engine/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algorithm, quantum })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCScheduling failed:", err);
    }
    return null;
  },

  async runCBanker(resources = { food: 850, water: 1200, medicine: 240, vehicles: 14 }) {
    try {
      const res = await fetch("/api/os/c-engine/banker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resources)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCBanker failed:", err);
    }
    return null;
  },

  async runCMutex(useMutex = true) {
    try {
      const res = await fetch("/api/os/c-engine/mutex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useMutex })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCMutex failed:", err);
    }
    return null;
  },

  async runCProcessOps(operation = "context-switch", targetPid = 101) {
    try {
      const res = await fetch("/api/os/c-engine/process-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, targetPid })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCProcessOps failed:", err);
    }
    return null;
  },

  async runCSync(syncType = "mutex") {
    try {
      const res = await fetch("/api/os/c-engine/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncType })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCSync failed:", err);
    }
    return null;
  },

  async runCIPC() {
    try {
      const res = await fetch("/api/os/c-engine/ipc", { method: "POST" });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCIPC failed:", err);
    }
    return null;
  },

  async runCBankerRequest(procIndex = 1, request = [10, 20, 10, 1]) {
    try {
      const res = await fetch("/api/os/c-engine/banker-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procIndex, request })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCBankerRequest failed:", err);
    }
    return null;
  },

  async runCDeadlockDetect() {
    try {
      const res = await fetch("/api/os/c-engine/deadlock-detect", { method: "POST" });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCDeadlockDetect failed:", err);
    }
    return null;
  },

  async runCDeadlockRecover() {
    try {
      const res = await fetch("/api/os/c-engine/deadlock-recover", { method: "POST" });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("runCDeadlockRecover failed:", err);
    }
    return null;
  },

  async getCEngineFiles() {
    try {
      const res = await fetch("/api/os/c-engine/files");
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("getCEngineFiles failed:", err);
    }
    return { folder: "c_engine", totalFiles: 0, files: [] };
  },

  async getCEngineFile(filename) {
    try {
      const res = await fetch(`/api/os/c-engine/file/${encodeURIComponent(filename)}`);
      if (res.ok) return await res.text();
    } catch (err) {
      console.warn(`getCEngineFile(${filename}) failed:`, err);
    }
    return "";
  },

  async getCSourceCode(filename) {
    try {
      const url = filename ? `/api/os/c-engine/source?file=${encodeURIComponent(filename)}` : "/api/os/c-engine/source";
      const res = await fetch(url);
      if (res.ok) return await res.text();
    } catch (err) {
      console.warn("getCSourceCode failed:", err);
    }
    return "";
  },

  // DBMS MySQL Integration APIs
  async getDbView(viewName) {
    try {
      const res = await fetch(`/api/db/views/${viewName}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("getDbView failed:", err);
    }
    return null;
  },

  async simulateAcidTransaction(scenario = "commit", caseId = "em_1") {
    try {
      const res = await fetch("/api/db/transactions/simulate-acid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, caseId })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("simulateAcidTransaction failed:", err);
    }
    return null;
  },

  async simulateDbLock(lockMode = "FOR_UPDATE") {
    try {
      const res = await fetch("/api/db/concurrency/simulate-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockMode })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("simulateDbLock failed:", err);
    }
    return null;
  },

  async getExplainIndexPlan() {
    try {
      const res = await fetch("/api/db/explain-index");
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("getExplainIndexPlan failed:", err);
    }
    return null;
  },

  async getDbCatalog() {
    try {
      const res = await fetch("/api/db/catalog");
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("getDbCatalog failed:", err);
    }
    return null;
  }
};
