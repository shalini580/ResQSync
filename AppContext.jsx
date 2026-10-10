import { createContext, useContext, useState } from "react";
import {
  INITIAL_USERS,
  INITIAL_EMERGENCY_CASES,
  INITIAL_RESOURCES,
  INITIAL_MISSIONS,
  INITIAL_SURPLUS_FOOD,
  INITIAL_RESOURCE_REQUESTS,
  INITIAL_ORGANISATIONS,
  INITIAL_VOLUNTEERS,
  INITIAL_PROCESSES,
  INITIAL_NOTIFICATIONS
} from "../data/initialData";
const AppContext = createContext(null);
export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [emergencyCases, setEmergencyCases] = useState(INITIAL_EMERGENCY_CASES);
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [missions, setMissions] = useState(INITIAL_MISSIONS);
  const [surplusFood, setSurplusFood] = useState(INITIAL_SURPLUS_FOOD);
  const [resourceRequests, setResourceRequests] = useState(INITIAL_RESOURCE_REQUESTS);
  const [organisations, setOrganisations] = useState(INITIAL_ORGANISATIONS);
  const [volunteers, setVolunteers] = useState(INITIAL_VOLUNTEERS);
  const [processes, setProcesses] = useState(INITIAL_PROCESSES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [deadlockState, setDeadlockState] = useState({
    hasDeadlock: true,
    cycle: ["P101 (River Rescue)", "Vehicle V1", "P102 (Smoke Evac)", "Medicine M1", "P101 (River Rescue)"],
    resources: [
      { name: "Rescue Vehicle V1", heldBy: "Process P101 (Case E101)", waitedBy: "Process P102 (Case E102)" },
      { name: "Trauma Medicine M1", heldBy: "Process P102 (Case E102)", waitedBy: "Process P101 (Case E101)" }
    ]
  });
  const [lastMutexSim, setLastMutexSim] = useState(null);
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;
  const addNotification = (title, message, type, relatedId) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
      relatedId
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };
  const login = (email, role) => {
    const match = INITIAL_USERS.find((u) => u.role === role);
    if (match) {
      setCurrentUser({ ...match, email: email || match.email });
      setActiveView("dashboard");
      return true;
    }
    const defaultUser = {
      id: `user-${Date.now()}`,
      name: email.split("@")[0] || "User",
      email,
      role,
      zone: "Zone A"
    };
    setCurrentUser(defaultUser);
    setActiveView("dashboard");
    return true;
  };
  const logout = () => {
    setCurrentUser(null);
  };
  const switchRole = (role) => {
    const match = INITIAL_USERS.find((u) => u.role === role);
    if (match) {
      setCurrentUser(match);
    } else {
      if (currentUser) {
        setCurrentUser({ ...currentUser, role });
      }
    }
    setActiveView("dashboard");
  };
  const registerUser = (newUser) => {
    const created = {
      id: `user-${Date.now()}`,
      name: newUser.name || "New Registered User",
      email: newUser.email || "user@resqsync.org",
      role: newUser.role || "volunteer",
      phone: newUser.phone,
      zone: newUser.zone || "Zone A",
      orgName: newUser.orgName,
      orgType: newUser.orgType,
      shelterCapacity: newUser.shelterCapacity,
      skills: newUser.skills,
      availability: "Available",
      xp: 0,
      coins: 0,
      level: 1
    };
    if (newUser.role === "restaurant" || newUser.role === "ngo") {
      const org = {
        id: `ORG-${Date.now().toString().slice(-4)}`,
        name: newUser.orgName || newUser.name || "Registered Organization",
        type: newUser.role === "restaurant" ? "Restaurant" : newUser.shelterCapacity ? "Shelter" : "NGO",
        zone: newUser.zone || "Zone A",
        contactPerson: newUser.name || "Representative",
        phone: newUser.phone || "+1 555-0100",
        address: newUser.address || "City Precinct",
        status: "Under Review",
        verification: "Pending",
        shelterCapacity: newUser.shelterCapacity,
        occupiedBeds: 0,
        availableFood: newUser.role === "restaurant" ? 0 : void 0,
        pendingRequests: 0
      };
      setOrganisations((prev) => [org, ...prev]);
    }
    if (newUser.role === "volunteer") {
      const vol = {
        id: `V${Math.floor(10 + Math.random() * 89)}`,
        name: newUser.name || "Volunteer",
        zone: newUser.zone || "Zone A",
        availability: "Available",
        skills: newUser.skills || ["General Assistance"],
        completedMissions: 0,
        xp: 0,
        coins: 0,
        level: 1,
        phone: newUser.phone || "+1 555-0100"
      };
      setVolunteers((prev) => [vol, ...prev]);
    }
    setCurrentUser(created);
    setActiveView("dashboard");
    addNotification("Registration Received", `Welcome ${created.name} (${created.role.toUpperCase()}) to ResQSync.`, "success");
  };
  const createEmergencyCase = (data) => {
    const nextNum = emergencyCases.length + 101;
    const caseId = `E${nextNum}`;
    const pid = nextNum;
    const nowTime = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    const priorityMap = {
      Critical: 1,
      "Very Unstable": 2,
      Unstable: 3,
      Stable: 4,
      Low: 5
    };
    const newCase = {
      ...data,
      id: caseId,
      processId: pid,
      processState: "READY",
      schedulingPriority: priorityMap[data.priority] || 3,
      createdAt: nowTime,
      updatedAt: nowTime,
      allocatedResources: { food: 0, water: 0, medicine: 0, vehicles: 0, volunteers: 0 },
      auditLog: [
        {
          timestamp: nowTime,
          action: "CASE_CREATED",
          actor: currentUser?.name || "Dispatcher",
          notes: `Initial priority set to ${data.priority}`
        }
      ]
    };
    const newProcess = {
      pid,
      relatedEntity: `Emergency Case ${caseId}`,
      task: `${data.type} Emergency Dispatch - ${data.title.slice(0, 30)}`,
      arrivalTime: Math.floor(Math.random() * 5),
      burstTime: data.priority === "Critical" ? 8 : 5,
      priority: newCase.schedulingPriority,
      state: "READY",
      remainingTime: data.priority === "Critical" ? 8 : 5
    };
    setEmergencyCases((prev) => [newCase, ...prev]);
    setProcesses((prev) => [newProcess, ...prev]);
    if (data.priority === "Critical") {
      addNotification(
        "DBMS Trigger: Critical Incident Alert",
        `High priority Case ${caseId} (${data.title}) registered in ${data.zone}. CPU Process PID ${pid} queued with Priority 1.`,
        "critical",
        caseId
      );
    } else {
      addNotification("Case Registered", `Emergency ${caseId} created and assigned OS PID ${pid}.`, "info", caseId);
    }
    return newCase;
  };
  const updateEmergencyCasePriority = (id, newPriority, notes) => {
    const nowTime = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    const priorityMap = {
      Critical: 1,
      "Very Unstable": 2,
      Unstable: 3,
      Stable: 4,
      Low: 5
    };
    setEmergencyCases(
      (prev) => prev.map((c) => {
        if (c.id === id) {
          const oldPriority = c.priority;
          const updatedPriorityNumber = priorityMap[newPriority] || 3;
          return {
            ...c,
            priority: newPriority,
            schedulingPriority: updatedPriorityNumber,
            updatedAt: nowTime,
            auditLog: [
              {
                timestamp: nowTime,
                action: "PRIORITY_CHANGED",
                actor: currentUser?.name || "City Controller",
                notes: `Changed from ${oldPriority} to ${newPriority}${notes ? `: ${notes}` : ""}`
              },
              ...c.auditLog
            ]
          };
        }
        return c;
      })
    );
    setProcesses(
      (prev) => prev.map((p) => {
        if (p.relatedEntity.includes(id)) {
          return { ...p, priority: priorityMap[newPriority] || 3 };
        }
        return p;
      })
    );
    addNotification(
      "Audit Log: Priority Updated",
      `Emergency Case ${id} priority adjusted to ${newPriority} by ${currentUser?.name || "Controller"}.`,
      newPriority === "Critical" ? "critical" : "info",
      id
    );
  };
  const updateEmergencyCaseStatus = (id, status) => {
    const nowTime = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    setEmergencyCases(
      (prev) => prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status,
            updatedAt: nowTime,
            auditLog: [
              {
                timestamp: nowTime,
                action: "STATUS_UPDATED",
                actor: currentUser?.name || "City Controller",
                notes: `Status changed to ${status}`
              },
              ...c.auditLog
            ]
          };
        }
        return c;
      })
    );
  };
  const addResource = (data) => {
    const id = `R-${data.type.slice(0, 3).toUpperCase()}-${data.zone.split(" ")[1] || "X"}-${Date.now().toString().slice(-3)}`;
    const newRes = {
      ...data,
      id,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16)
    };
    setResources((prev) => [...prev, newRes]);
    addNotification("Resource Stock Added", `${data.name} (+${data.totalQuantity} ${data.unit}) stored in ${data.zone}.`, "info");
  };
  const updateResourceStock = (id, total, available, reserved) => {
    const nowTime = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    setResources(
      (prev) => prev.map((r) => {
        if (r.id === id) {
          const status = available <= 0 ? "Unavailable" : available < total * 0.25 ? "Low Stock" : "Available";
          return {
            ...r,
            totalQuantity: total,
            available,
            reserved,
            status,
            updatedAt: nowTime
          };
        }
        return r;
      })
    );
  };
  const runBankerSafetyCheck = (req) => {
    const availFood = resources.filter((r) => r.type === "Food").reduce((s, r) => s + r.available, 0);
    const availWater = resources.filter((r) => r.type === "Water").reduce((s, r) => s + r.available, 0);
    const availMed = resources.filter((r) => r.type === "Medicine").reduce((s, r) => s + r.available, 0);
    const availVeh = resources.filter((r) => r.type === "Vehicles").reduce((s, r) => s + r.available, 0);
    const available = [availFood, availWater, availMed, availVeh];
    const requested = [req.food, req.water, req.medicine, req.vehicles];
    const processes2 = ["P101 (Flood E101)", "P102 (Fire E102)", "P103 (Infra E103)", "P104 (Medical E104)"];
    const resourceNames = ["Food (pkts)", "Water (L)", "Medicine (kits)", "Vehicles"];
    const max = [
      [180, 350, 45, 6],
      [100, 200, 50, 5],
      [40, 80, 15, 3],
      [60, 100, 40, 3]
    ];
    const allocation = [
      [120, 250, 30, 4],
      [20, 40, 10, 1],
      [20, 40, 10, 2],
      [40, 80, 20, 2]
    ];
    const need = max.map((row, i) => row.map((val, j) => Math.max(0, val - allocation[i][j])));
    for (let j = 0; j < 4; j++) {
      if (requested[j] > available[j]) {
        return {
          isSafe: false,
          safeSequence: [],
          reason: `Insufficient resource: requested ${requested[j]} ${resourceNames[j]}, but only ${available[j]} available. Allocation would cause Deadlock / starvation.`,
          matrices: { available, max, allocation, need, processes: processes2, resourceNames }
        };
      }
    }
    const work = [...available];
    for (let j = 0; j < 4; j++) {
      work[j] -= requested[j];
    }
    const tempAlloc = allocation.map((row) => [...row]);
    const tempNeed = need.map((row) => [...row]);
    for (let j = 0; j < 4; j++) {
      tempAlloc[0][j] += requested[j];
      tempNeed[0][j] = Math.max(0, tempNeed[0][j] - requested[j]);
    }
    const n = processes2.length;
    const finish = new Array(n).fill(false);
    const safeSequence = [];
    let count = 0;
    while (count < n) {
      let found = false;
      for (let i = 0; i < n; i++) {
        if (!finish[i]) {
          let canFinish = true;
          for (let j = 0; j < 4; j++) {
            if (tempNeed[i][j] > work[j]) {
              canFinish = false;
              break;
            }
          }
          if (canFinish) {
            for (let j = 0; j < 4; j++) {
              work[j] += tempAlloc[i][j];
            }
            safeSequence.push(processes2[i]);
            finish[i] = true;
            found = true;
            count++;
          }
        }
      }
      if (!found) {
        break;
      }
    }
    const isSafe = count === n;
    return {
      isSafe,
      safeSequence: isSafe ? safeSequence : [],
      reason: isSafe ? void 0 : "Banker\u2019s Algorithm detected UNSAFE STATE: System cannot guarantee completion of all emergency processes without potential circular deadlock.",
      matrices: { available, max, allocation, need, processes: processes2, resourceNames }
    };
  };
  const allocateResourcesWithTransaction = async (caseId, req, onStep) => {
    onStep?.("BEGIN TRANSACTION [TX-7741]");
    await new Promise((r) => setTimeout(r, 200));
    onStep?.("Checking Resource Availability in Zone...");
    await new Promise((r) => setTimeout(r, 250));
    const safetyCheck = runBankerSafetyCheck(req);
    if (!safetyCheck.isSafe) {
      onStep?.("SAFETY CHECK FAILED: Rollback transaction");
      await new Promise((r) => setTimeout(r, 200));
      return {
        success: false,
        message: safetyCheck.reason || "Allocation failed. Changes rolled back successfully to preserve system safety state."
      };
    }
    onStep?.(`Banker\u2019s Safety Check: SAFE STATE [Seq: ${safetyCheck.safeSequence.join(" \u2192 ")}]`);
    await new Promise((r) => setTimeout(r, 250));
    onStep?.("Acquiring Row-Level DB Locks (LOCK TABLES resources WRITE)...");
    await new Promise((r) => setTimeout(r, 250));
    setResources(
      (prev) => prev.map((r) => {
        let deduct = 0;
        if (r.type === "Food" && req.food > 0) {
          deduct = Math.min(r.available, Math.ceil(req.food / 2));
        } else if (r.type === "Water" && req.water > 0) {
          deduct = Math.min(r.available, Math.ceil(req.water / 2));
        } else if (r.type === "Medicine" && req.medicine > 0) {
          deduct = Math.min(r.available, Math.ceil(req.medicine / 2));
        } else if (r.type === "Vehicles" && req.vehicles > 0) {
          deduct = Math.min(r.available, 1);
        }
        if (deduct > 0) {
          const newAvail = r.available - deduct;
          const newRes = r.reserved + deduct;
          return {
            ...r,
            available: newAvail,
            reserved: newRes,
            status: newAvail <= 0 ? "Unavailable" : newAvail < r.totalQuantity * 0.25 ? "Low Stock" : "Available"
          };
        }
        return r;
      })
    );
    const targetCase = emergencyCases.find((c) => c.id === caseId);
    if (targetCase) {
      setEmergencyCases(
        (prev) => prev.map((c) => {
          if (c.id === caseId) {
            return {
              ...c,
              status: "Resources Allocated",
              processState: "RUNNING",
              allocatedResources: {
                food: (c.allocatedResources?.food || 0) + req.food,
                water: (c.allocatedResources?.water || 0) + req.water,
                medicine: (c.allocatedResources?.medicine || 0) + req.medicine,
                vehicles: (c.allocatedResources?.vehicles || 0) + req.vehicles,
                volunteers: (c.allocatedResources?.volunteers || 0) + req.volunteers
              },
              auditLog: [
                {
                  timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16),
                  action: "TRANSACTION_COMMITTED",
                  actor: currentUser?.name || "City Controller",
                  notes: `Allocated ${req.food} Food, ${req.water} Water, ${req.medicine} Med, ${req.vehicles} Vehicles via TX-7741`
                },
                ...c.auditLog
              ]
            };
          }
          return c;
        })
      );
      const missionId = `M${Math.floor(200 + Math.random() * 99)}`;
      const newMission = {
        id: missionId,
        caseId: targetCase.id,
        caseTitle: targetCase.title,
        priority: targetCase.priority,
        zone: targetCase.zone,
        emergencyType: targetCase.type,
        resourcesSummary: `${req.food} Food, ${req.water} Water, ${req.medicine} Med, ${req.vehicles} Veh`,
        resourcesDetail: { food: req.food, water: req.water, medicine: req.medicine, vehicles: req.vehicles },
        pickupPoint: `Municipal Relief Depot (${targetCase.zone})`,
        destination: `Evacuation Staging Area (${targetCase.zone})`,
        status: "AVAILABLE",
        peopleAffected: targetCase.peopleAffected,
        xpReward: targetCase.priority === "Critical" ? 320 : 200,
        coinReward: targetCase.priority === "Critical" ? 70 : 45,
        createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16),
        timeline: [
          {
            status: "AVAILABLE",
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            note: "Mission generated following Banker\u2019s safe verification and resource commit"
          }
        ]
      };
      setMissions((prev) => [newMission, ...prev]);
    }
    onStep?.("COMMIT TRANSACTION [TX-7741]");
    await new Promise((r) => setTimeout(r, 200));
    addNotification(
      "Transaction Committed: Resources Allocated",
      `Allocated to ${caseId}. Banker\u2019s sequence verified: ${safetyCheck.safeSequence.join(" \u2192 ")}. New rescue mission published.`,
      "success",
      caseId
    );
    return {
      success: true,
      message: `Transaction committed successfully. Safe Sequence: ${safetyCheck.safeSequence.join(" \u2192 ")}`,
      safeSequence: safetyCheck.safeSequence
    };
  };
  const assignVolunteerToMission = (missionId, volunteerId) => {
    const vol = volunteers.find((v) => v.id === volunteerId);
    if (!vol) return false;
    setMissions(
      (prev) => prev.map((m) => {
        if (m.id === missionId) {
          return {
            ...m,
            assignedVolunteerId: vol.id,
            assignedVolunteerName: `${vol.name} (${vol.id})`,
            status: "ASSIGNED",
            timeline: [
              ...m.timeline,
              {
                status: "ASSIGNED",
                timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                note: `Assigned to ${vol.name} (${vol.id}) by Admin Dispatch`
              }
            ]
          };
        }
        return m;
      })
    );
    setVolunteers(
      (prev) => prev.map((v) => {
        if (v.id === volunteerId) {
          return { ...v, availability: "Busy", currentMissionId: missionId };
        }
        return v;
      })
    );
    addNotification("Mission Assigned", `Mission ${missionId} assigned to volunteer ${vol.name}.`, "info", missionId);
    return true;
  };
  const acceptMissionAsVolunteer = (missionId) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return { success: false, message: "Mission not found." };
    if (mission.status !== "AVAILABLE") {
      return {
        success: false,
        message: "Lock Contention / Synchronization: Mission is already locked and assigned to another responder."
      };
    }
    const volName = currentUser?.name || "Alex Rivera (V12)";
    const volId = currentUser?.id || "V12";
    setMissions(
      (prev) => prev.map((m) => {
        if (m.id === missionId) {
          return {
            ...m,
            assignedVolunteerId: volId,
            assignedVolunteerName: volName,
            status: "ASSIGNED",
            lockedBy: volId,
            timeline: [
              ...m.timeline,
              {
                status: "ASSIGNED",
                timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                note: `Accepted by volunteer ${volName} (Acquired Mutex Lock)`
              }
            ]
          };
        }
        return m;
      })
    );
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        availability: "Busy"
      });
    }
    addNotification("Mission Accepted", `You have acquired lock for ${missionId}. Proceed to pickup.`, "success", missionId);
    return { success: true, message: "Mission accepted successfully. Proceed to pickup depot." };
  };
  const advanceMissionStatus = (missionId, nextStatus) => {
    const timeStr = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let missionReward = { xp: 200, coins: 50 };
    setMissions(
      (prev) => prev.map((m) => {
        if (m.id === missionId) {
          missionReward = { xp: m.xpReward, coins: m.coinReward };
          const noteMap = {
            AVAILABLE: "Re-opened to mission pool",
            ASSIGNED: "Volunteer assigned",
            PICKUP: "Supplies verified and loaded at designated depot",
            "IN TRANSIT": "Responder en route to target destination",
            DELIVERED: "Supplies safely delivered and handed to ground coordinators",
            COMPLETED: "Mission verified closed by City Dispatch. Rewards disbursed."
          };
          return {
            ...m,
            status: nextStatus,
            timeline: [
              ...m.timeline,
              {
                status: nextStatus,
                timestamp: timeStr,
                note: noteMap[nextStatus] || `Status updated to ${nextStatus}`
              }
            ]
          };
        }
        return m;
      })
    );
    if (nextStatus === "COMPLETED") {
      const volId = currentUser?.id || "V12";
      setVolunteers(
        (prev) => prev.map((v) => {
          if (v.id === volId || v.id === "V12") {
            const newXp = v.xp + missionReward.xp;
            const newCoins = v.coins + missionReward.coins;
            const newLevel = Math.floor(newXp / 400) + 1;
            return {
              ...v,
              xp: newXp,
              coins: newCoins,
              level: newLevel,
              completedMissions: v.completedMissions + 1,
              availability: "Available",
              currentMissionId: void 0
            };
          }
          return v;
        })
      );
      if (currentUser && currentUser.role === "volunteer") {
        const newXp = (currentUser.xp || 1450) + missionReward.xp;
        const newCoins = (currentUser.coins || 380) + missionReward.coins;
        const newLevel = Math.floor(newXp / 400) + 1;
        setCurrentUser({
          ...currentUser,
          xp: newXp,
          coins: newCoins,
          level: newLevel,
          availability: "Available"
        });
      }
      addNotification(
        "DBMS Trigger Executed: XP & Coins Awarded",
        `Stored procedure sp_award_volunteer_rewards credited +${missionReward.xp} XP and +${missionReward.coins} Coins for mission ${missionId}.`,
        "success",
        missionId
      );
    }
  };
  const addSurplusFood = (data) => {
    const id = `F${Math.floor(300 + Math.random() * 99)}`;
    const nowTime = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    const expiryHour = parseInt(data.expiryTime.split(" ")[1]?.split(":")[0] || "12", 10);
    const isImminent = expiryHour <= 10;
    const newItem = {
      ...data,
      id,
      status: "Available",
      pickupStatus: "Waiting",
      expiryAlertTriggered: isImminent,
      createdAt: nowTime
    };
    setSurplusFood((prev) => [newItem, ...prev]);
    if (isImminent) {
      addNotification(
        "DBMS Trigger: Expiry Priority Escalation",
        `Food donation ${id} (${data.foodName}) expires shortly. Trigger elevated pickup priority to Urgent.`,
        "alert",
        id
      );
    } else {
      addNotification("Food Donation Registered", `${data.foodName} (${data.quantity} ${data.unit}) ready for pickup in ${data.zone}.`, "info", id);
    }
    return newItem;
  };
  const createResourceRequest = (data) => {
    const id = `R${Math.floor(400 + Math.random() * 99)}`;
    const nowTime = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
    const newReq = {
      ...data,
      id,
      status: "Pending",
      createdAt: nowTime
    };
    setResourceRequests((prev) => [newReq, ...prev]);
    const pid = 200 + resourceRequests.length + 1;
    setProcesses((prev) => [
      ...prev,
      {
        pid,
        relatedEntity: `NGO Request ${id}`,
        task: `${data.ngoName} multi-resource supply allocation`,
        arrivalTime: 6,
        burstTime: 5,
        priority: data.priority === "Critical" ? 1 : 2,
        state: "READY",
        remainingTime: 5
      }
    ]);
    addNotification(
      "Resource Request Submitted",
      `${data.ngoName} requested resources for ${data.peopleAffected} people in ${data.zone}.`,
      data.priority === "Critical" ? "critical" : "info",
      id
    );
    return newReq;
  };
  const verifyOrganisation = (orgId, status) => {
    setOrganisations(
      (prev) => prev.map((o) => {
        if (o.id === orgId) {
          return {
            ...o,
            verification: status,
            status: status === "Verified" ? "Active" : "Suspended"
          };
        }
        return o;
      })
    );
    addNotification("Organisation Verification Updated", `Entity ${orgId} set to ${status}.`, "info");
  };
  const updateShelterOccupancy = (orgId, occupiedBeds) => {
    setOrganisations(
      (prev) => prev.map((o) => {
        if (o.id === orgId) {
          return { ...o, occupiedBeds };
        }
        return o;
      })
    );
    addNotification("Shelter Occupancy Updated", `Bed occupancy updated to ${occupiedBeds}.`, "info");
  };
  const markNotificationRead = (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };
  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const runCpuScheduling = (algorithm, quantum = 2) => {
    const list = [...processes].filter((p) => p.state !== "TERMINATED").map((p) => ({ ...p }));
    let timeline = [];
    let completed = [];
    if (algorithm === "FCFS") {
      list.sort((a, b) => a.arrivalTime - b.arrivalTime);
      let currentTime = 0;
      for (const p of list) {
        if (currentTime < p.arrivalTime) currentTime = p.arrivalTime;
        const start = currentTime;
        const end = currentTime + p.burstTime;
        currentTime = end;
        timeline.push({ pid: p.pid, entity: p.relatedEntity, startTime: start, endTime: end, duration: p.burstTime });
        const tat = end - p.arrivalTime;
        const wt = tat - p.burstTime;
        completed.push({
          pid: p.pid,
          task: p.task,
          arrivalTime: p.arrivalTime,
          burstTime: p.burstTime,
          priority: p.priority,
          completionTime: end,
          waitingTime: wt,
          turnaroundTime: tat
        });
      }
    } else if (algorithm === "SJF") {
      let currentTime = 0;
      const readyQueue = [...list];
      while (readyQueue.length > 0) {
        const availableNow = readyQueue.filter((p2) => p2.arrivalTime <= currentTime);
        if (availableNow.length === 0) {
          currentTime = Math.min(...readyQueue.map((p2) => p2.arrivalTime));
          continue;
        }
        availableNow.sort((a, b) => a.burstTime - b.burstTime);
        const p = availableNow[0];
        const idx = readyQueue.findIndex((item) => item.pid === p.pid);
        readyQueue.splice(idx, 1);
        const start = currentTime;
        const end = currentTime + p.burstTime;
        currentTime = end;
        timeline.push({ pid: p.pid, entity: p.relatedEntity, startTime: start, endTime: end, duration: p.burstTime });
        const tat = end - p.arrivalTime;
        const wt = tat - p.burstTime;
        completed.push({
          pid: p.pid,
          task: p.task,
          arrivalTime: p.arrivalTime,
          burstTime: p.burstTime,
          priority: p.priority,
          completionTime: end,
          waitingTime: wt,
          turnaroundTime: tat
        });
      }
    } else if (algorithm === "Priority Scheduling") {
      let currentTime = 0;
      const readyQueue = [...list];
      while (readyQueue.length > 0) {
        const availableNow = readyQueue.filter((p2) => p2.arrivalTime <= currentTime);
        if (availableNow.length === 0) {
          currentTime = Math.min(...readyQueue.map((p2) => p2.arrivalTime));
          continue;
        }
        availableNow.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
        const p = availableNow[0];
        const idx = readyQueue.findIndex((item) => item.pid === p.pid);
        readyQueue.splice(idx, 1);
        const start = currentTime;
        const end = currentTime + p.burstTime;
        currentTime = end;
        timeline.push({ pid: p.pid, entity: p.relatedEntity, startTime: start, endTime: end, duration: p.burstTime });
        const tat = end - p.arrivalTime;
        const wt = tat - p.burstTime;
        completed.push({
          pid: p.pid,
          task: p.task,
          arrivalTime: p.arrivalTime,
          burstTime: p.burstTime,
          priority: p.priority,
          completionTime: end,
          waitingTime: wt,
          turnaroundTime: tat
        });
      }
    } else {
      let currentTime = 0;
      let remaining = list.map((p) => ({ ...p, rem: p.burstTime }));
      let queue = [];
      let i = 0;
      while (remaining.some((p) => p.rem > 0)) {
        const available = remaining.filter((p2) => p2.arrivalTime <= currentTime && p2.rem > 0);
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        const p = available[i % available.length];
        const exec = Math.min(quantum, p.rem);
        timeline.push({ pid: p.pid, entity: p.relatedEntity, startTime: currentTime, endTime: currentTime + exec, duration: exec });
        currentTime += exec;
        p.rem -= exec;
        if (p.rem === 0) {
          const tat = currentTime - p.arrivalTime;
          const wt = tat - p.burstTime;
          completed.push({
            pid: p.pid,
            task: p.task,
            arrivalTime: p.arrivalTime,
            burstTime: p.burstTime,
            priority: p.priority,
            completionTime: currentTime,
            waitingTime: wt,
            turnaroundTime: tat
          });
        }
        i++;
      }
    }
    const avgWaitingTime = completed.reduce((s, p) => s + p.waitingTime, 0) / (completed.length || 1);
    const avgTurnaroundTime = completed.reduce((s, p) => s + p.turnaroundTime, 0) / (completed.length || 1);
    return {
      timeline,
      processes: completed,
      avgWaitingTime: Number(avgWaitingTime.toFixed(2)),
      avgTurnaroundTime: Number(avgTurnaroundTime.toFixed(2)),
      algorithm
    };
  };
  const detectDeadlock = () => {
    return deadlockState;
  };
  const resolveDeadlock = () => {
    const newState = {
      hasDeadlock: false,
      cycle: [],
      resources: [
        { name: "Rescue Vehicle V1", heldBy: "Process P101 (Case E101)", waitedBy: "None (Released)" },
        { name: "Trauma Medicine M1", heldBy: "Process P101 (Preempted from P102)", waitedBy: "None" }
      ],
      resolutionLog: "Deadlock cycle broken via Resource Preemption: Trauma Medicine M1 was preempted from P102 and assigned to highest-priority emergency process P101 (Flood Case E101). P102 rolled back to safe checkpoint."
    };
    setDeadlockState(newState);
    addNotification("Deadlock Resolved", "Resource Preemption broke cycle between P101 and P102. P101 proceeding.", "success");
    return newState;
  };
  const runMutexRaceConditionSimulation = () => {
    const timeStr = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const result = {
      missionId: "M105",
      v1Name: "Volunteer V12 (Alex Rivera)",
      v2Name: "Volunteer V18 (Maya Chen)",
      winner: "Volunteer V12 (Alex Rivera)",
      loser: "Volunteer V18 (Maya Chen)",
      mutexState: "LOCKED",
      transactionLogs: [
        `[${timeStr}] T1 (V12) invokes: atomic_compare_and_swap(&mission_mutex, UNLOCKED, LOCKED)`,
        `[${timeStr}] T1 acquires Mutex lock successfully (Mutex state = 1). Mission status set to RESERVED.`,
        `[${timeStr}] T2 (V18) invokes concurrent request: pthread_mutex_trylock(&mission_mutex)`,
        `[${timeStr}] T2 receives EBUSY / Lock Contention: Mission M105 already locked by Worker Thread V12`,
        `[${timeStr}] T2 Database Transaction rolled back: "Mission already accepted by another responder."`,
        `[${timeStr}] Atomic consistency preserved: Double-assignment race condition prevented.`
      ],
      timestamp: timeStr
    };
    setLastMutexSim(result);
    addNotification("Concurrency Mutex Verified", "Race condition test passed: V12 acquired lock; concurrent request from V18 rejected.", "info");
    return result;
  };
  return <AppContext.Provider
    value={{
      currentUser,
      activeView,
      setActiveView,
      emergencyCases,
      resources,
      missions,
      surplusFood,
      resourceRequests,
      organisations,
      volunteers,
      processes,
      notifications,
      unreadNotificationCount,
      login,
      logout,
      switchRole,
      registerUser,
      createEmergencyCase,
      updateEmergencyCasePriority,
      updateEmergencyCaseStatus,
      addResource,
      updateResourceStock,
      runBankerSafetyCheck,
      allocateResourcesWithTransaction,
      assignVolunteerToMission,
      acceptMissionAsVolunteer,
      advanceMissionStatus,
      addSurplusFood,
      createResourceRequest,
      verifyOrganisation,
      updateShelterOccupancy,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      runCpuScheduling,
      deadlockState,
      detectDeadlock,
      resolveDeadlock,
      lastMutexSim,
      runMutexRaceConditionSimulation
    }}
  >
      {children}
    </AppContext.Provider>;
};
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
