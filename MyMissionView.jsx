import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import {
  Truck,
  MapPin,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
export const MyMissionView = () => {
  const { missions, advanceMissionStatus, currentUser, setActiveView } = useApp();
  const activeMission = missions.find(
    (m) => (m.assignedVolunteerId === currentUser?.id || m.assignedVolunteerId === "V12") && m.status !== "COMPLETED"
  );
  const [completedAward, setCompletedAward] = useState(null);
  const stages = ["ASSIGNED", "PICKUP", "IN TRANSIT", "DELIVERED", "COMPLETED"];
  const currentStageIdx = activeMission ? stages.indexOf(activeMission.status) : 0;
  const getNextAction = () => {
    if (!activeMission) return null;
    switch (activeMission.status) {
      case "ASSIGNED":
        return { label: "Start Pickup (Verify Cargo)", next: "PICKUP" };
      case "PICKUP":
        return { label: "Start Delivery (Depart Depot)", next: "IN TRANSIT" };
      case "IN TRANSIT":
        return { label: "Confirm Drop-off at Staging Gate", next: "DELIVERED" };
      case "DELIVERED":
        return { label: "Complete Mission & Claim Rewards", next: "COMPLETED" };
      default:
        return null;
    }
  };
  const nextAction = getNextAction();
  const handleAdvance = () => {
    if (activeMission && nextAction) {
      if (nextAction.next === "COMPLETED") {
        setCompletedAward({
          xp: activeMission.xpReward,
          coins: activeMission.coinReward,
          badge: activeMission.priority === "Critical" ? "Critical Incident Hero" : "Rapid Responder"
        });
      }
      advanceMissionStatus(activeMission.id, nextAction.next);
    }
  };
  if (!activeMission && !completedAward) {
    return <div className="p-5">
        <div className="bg-white border border-slate-200 rounded p-8 text-center space-y-3">
          <Truck className="h-8 w-8 text-slate-400 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900">No Active Mission Deployed</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have a mission in transit. Visit the available missions board to claim emergency relief runs.
          </p>
          <button
      onClick={() => setActiveView("available-missions")}
      className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
    >
            Browse Available Missions
          </button>
        </div>
      </div>;
  }
  return <div className="p-5 space-y-5">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Relief Mission</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live mission telemetry, route waypoints and status execution pipeline
            </p>
          </div>
          {activeMission && <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">{activeMission.id}</span>
              <StatusBadge status={activeMission.status} />
            </div>}
        </div>
      </div>

      {
    /* Completion Modal / Celebration */
  }
      {completedAward && <div className="border border-emerald-300 bg-emerald-50 rounded p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Mission Completed Successfully!</span>
          </div>
          <p className="text-xs text-emerald-800">
            Field delivery verified by City Dispatch. Stored procedure <code className="font-mono font-semibold">sp_award_volunteer_rewards</code> has executed and credited your account.
          </p>
          <div className="flex flex-wrap gap-4 pt-1 font-mono text-xs">
            <div className="bg-white p-2.5 rounded border border-emerald-200">
              <span className="text-slate-400 block text-[9px] uppercase">Civic XP Award</span>
              <span className="text-emerald-700 font-bold text-base">+{completedAward.xp} XP</span>
            </div>
            <div className="bg-white p-2.5 rounded border border-emerald-200">
              <span className="text-slate-400 block text-[9px] uppercase">Relief Coins</span>
              <span className="text-amber-700 font-bold text-base">+{completedAward.coins} Coins</span>
            </div>
            {completedAward.badge && <div className="bg-white p-2.5 rounded border border-emerald-200">
                <span className="text-slate-400 block text-[9px] uppercase">Badge Unlocked</span>
                <span className="text-indigo-700 font-bold text-base">{completedAward.badge}</span>
              </div>}
          </div>
          <div className="pt-2">
            <button
    onClick={() => {
      setCompletedAward(null);
      setActiveView("rewards");
    }}
    className="rounded bg-emerald-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
  >
              View Rewards & Leaderboard →
            </button>
          </div>
        </div>}

      {
    /* Main Mission Panel */
  }
      {activeMission && <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {
    /* Left Details */
  }
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <div className="flex justify-between items-baseline">
                <span className="font-mono font-bold text-slate-800">{activeMission.id}</span>
                <StatusBadge status={activeMission.priority} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{activeMission.caseTitle}</h3>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Zone: {activeMission.zone} • Hazard: {activeMission.emergencyType} • Ref: {activeMission.caseId}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Assigned Emergency Cargo
              </span>
              <div className="font-semibold text-slate-900 text-sm">{activeMission.resourcesSummary}</div>
              <div className="text-slate-500 text-[11px]">
                Secured from municipal reserve with exclusive lock.
              </div>
            </div>

            {
    /* Waypoints */
  }
            <div className="border border-slate-200 rounded p-3 space-y-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Routing Instructions
              </span>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">1. Pickup Depot:</span>
                    <div className="text-slate-600">{activeMission.pickupPoint}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">2. Target Destination:</span>
                    <div className="text-slate-600">{activeMission.destination}</div>
                  </div>
                </div>
              </div>
            </div>

            {
    /* Action Button Section */
  }
            {nextAction && <div className="pt-2 border-t border-slate-200">
                <button
    onClick={handleAdvance}
    className="w-full flex items-center justify-center gap-2 rounded bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
  >
                  <span>{nextAction.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>}
          </div>

          {
    /* Right: 5-Stage Timeline */
  }
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-4">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Mission Execution Timeline
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">5-stage state pipeline</p>
            </div>

            <div className="space-y-3 text-xs">
              {stages.map((st, idx) => {
    const isPassed = idx < currentStageIdx;
    const isCurrent = idx === currentStageIdx;
    return <div key={st} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-mono font-bold ${isCurrent ? "border-slate-900 bg-slate-900 text-white ring-2 ring-slate-200" : isPassed ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-400"}`}
    >
                        {isPassed ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      {idx < stages.length - 1 && <div
      className={`w-0.5 h-6 ${isPassed ? "bg-emerald-400" : "bg-slate-200"}`}
    />}
                    </div>

                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span
      className={`font-mono text-xs font-semibold ${isCurrent ? "text-slate-900" : isPassed ? "text-emerald-800" : "text-slate-400"}`}
    >
                          {st}
                        </span>
                        {isCurrent && <span className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded">
                            CURRENT STAGE
                          </span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {st === "ASSIGNED" && "Volunteer responder verified and locked"}
                        {st === "PICKUP" && "Verifying emergency manifest at depot"}
                        {st === "IN TRANSIT" && "Navigating route detour to sector"}
                        {st === "DELIVERED" && "Supplies handed to ground coordinator"}
                        {st === "COMPLETED" && "Closed in audit ledger and rewards disbursed"}
                      </p>
                    </div>
                  </div>;
  })}
            </div>
          </div>
        </div>}
    </div>;
};
