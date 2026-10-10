import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Compass, Truck } from "lucide-react";
export const VolunteerDashboard = () => {
  const { missions, currentUser, setActiveView, acceptMissionAsVolunteer } = useApp();
  const availableMissions = missions.filter((m) => m.status === "AVAILABLE");
  const myActiveMission = missions.find(
    (m) => (m.assignedVolunteerId === currentUser?.id || m.assignedVolunteerId === "V12") && m.status !== "COMPLETED"
  );
  const completedMissionsCount = 18;
  const xp = currentUser?.xp || 1450;
  const coins = currentUser?.coins || 380;
  const level = currentUser?.level || 4;
  const nextLevelXp = level * 400;
  const xpPct = Math.round(xp % 400 / 400 * 100);
  const criticalNearby = availableMissions.filter(
    (m) => m.priority === "Critical" || m.priority === "Very Unstable"
  );
  return <div className="p-5 space-y-5">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Responder Dispatch & Operations Command
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Responder: {currentUser?.name} • Zone: {currentUser?.zone} • Skills: EMT First Aid, Driver
            </p>
          </div>
          {myActiveMission ? <button
    onClick={() => setActiveView("my-mission")}
    className="flex items-center gap-1.5 rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs"
  >
              <Truck className="h-3.5 w-3.5" />
              <span>Resume Active Mission ({myActiveMission.id})</span>
            </button> : <button
    onClick={() => setActiveView("available-missions")}
    className="flex items-center gap-1.5 rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs"
  >
              <Compass className="h-3.5 w-3.5" />
              <span>Browse Available Missions</span>
            </button>}
        </div>
      </div>

      {
    /* Top 6 Summary Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Available Missions</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{availableMissions.length}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">ready for claim</span>
        </div>

        <div className="bg-white border border-indigo-200 bg-indigo-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-indigo-700 font-semibold block">Active Mission</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">
            {myActiveMission ? myActiveMission.id : "None"}
          </span>
          <span className="text-[10px] text-indigo-600 mt-0.5 block">
            {myActiveMission ? myActiveMission.status : "Ready to deploy"}
          </span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-800 font-semibold block">Completed</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">{completedMissionsCount}</span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">rescues verified</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-indigo-700 font-semibold block">Civic XP</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">{xp}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">points earned</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-amber-800 font-semibold block">Relief Coins</span>
          <span className="text-xl font-bold font-mono text-amber-800 mt-1 block">{coins}</span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">rewards ledger</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-900 font-semibold block">Responder Level</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">Level {level}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{xpPct}% to Level {level + 1}</span>
        </div>
      </div>

      {
    /* Grid: Active Mission & Critical Missions Nearby */
  }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {
    /* Active Mission Card */
  }
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Current Operational Assignment
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Your currently locked and active mission route</p>
            </div>
            {myActiveMission && <StatusBadge status={myActiveMission.status} />}
          </div>

          {myActiveMission ? <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 text-sm">{myActiveMission.caseTitle}</span>
                  <StatusBadge status={myActiveMission.priority} />
                </div>
                <div className="text-[11px] text-slate-600">
                  Cargo: <strong>{myActiveMission.resourcesSummary}</strong>
                </div>
                <div className="text-[11px] text-slate-500 font-mono pt-1">
                  Pickup: {myActiveMission.pickupPoint} → Destination: {myActiveMission.destination}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] font-mono text-slate-500">
                  Potential Reward: +{myActiveMission.xpReward} XP / +{myActiveMission.coinReward} Coins
                </span>
                <button
    onClick={() => setActiveView("my-mission")}
    className="rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Manage Mission Progress →
                </button>
              </div>
            </div> : <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <p>You have no active missions currently claimed.</p>
              <button
    onClick={() => setActiveView("available-missions")}
    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
                Browse Available Missions
              </button>
            </div>}
        </div>

        {
    /* Critical Missions Nearby */
  }
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Critical Missions in Your Sector
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">High priority dispatches requiring immediate assistance</p>
            </div>
            <button
    onClick={() => setActiveView("available-missions")}
    className="text-[11px] text-slate-700 hover:text-slate-900 font-medium"
  >
              View All →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {criticalNearby.length === 0 ? <div className="p-6 text-center text-slate-400 text-xs">No unassigned critical missions in zone.</div> : criticalNearby.map((m) => <div
    key={m.id}
    className="p-3 rounded border border-rose-200 bg-rose-50/30 flex items-center justify-between"
  >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{m.id}</span>
                      <StatusBadge status={m.priority} />
                    </div>
                    <div className="font-semibold text-slate-900 truncate">{m.caseTitle}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Zone: {m.zone} • Reward: +{m.xpReward} XP / +{m.coinReward} Coins
                    </div>
                  </div>
                  <button
    onClick={() => {
      acceptMissionAsVolunteer(m.id);
      setActiveView("my-mission");
    }}
    className="shrink-0 rounded bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
  >
                    Accept
                  </button>
                </div>)}
          </div>
        </div>
      </div>

      {
    /* Level Progress Bar & Rewards */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-2">
        <div className="flex justify-between items-baseline text-xs">
          <span className="font-semibold text-slate-900">
            Progress to Level {level + 1}
          </span>
          <span className="font-mono text-slate-500 text-[11px]">
            {xp} / {nextLevelXp} XP ({xpPct}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>
    </div>;
};
