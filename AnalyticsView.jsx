import { useApp } from "../../context/AppContext";
export const AnalyticsView = () => {
  const { emergencyCases, surplusFood, missions, volunteers, resources } = useApp();
  const foodRescuedTotal = surplusFood.filter((f) => f.status === "Delivered" || f.status === "Reserved").reduce((sum, f) => sum + f.quantity, 0);
  const casesResolvedCount = emergencyCases.filter((c) => c.status === "Resolved" || c.status === "Resources Allocated").length;
  const missionCompletedCount = missions.filter((m) => m.status === "COMPLETED").length;
  const missionCompletionRate = Math.round(missionCompletedCount / (missions.length || 1) * 100);
  const activeVolunteersCount = volunteers.filter((v) => v.availability === "Available" || v.availability === "Busy").length;
  const avgResponseTime = "14.2 min";
  const cityHealthScore = 88;
  const priorityDist = {
    Critical: emergencyCases.filter((c) => c.priority === "Critical").length,
    "Very Unstable": emergencyCases.filter((c) => c.priority === "Very Unstable").length,
    Unstable: emergencyCases.filter((c) => c.priority === "Unstable").length,
    Stable: emergencyCases.filter((c) => c.priority === "Stable").length,
    Low: emergencyCases.filter((c) => c.priority === "Low").length
  };
  const typeDist = {
    Flood: emergencyCases.filter((c) => c.type === "Flood").length,
    Fire: emergencyCases.filter((c) => c.type === "Fire").length,
    Medical: emergencyCases.filter((c) => c.type === "Medical").length,
    Infrastructure: emergencyCases.filter((c) => c.type === "Infrastructure").length,
    Other: emergencyCases.filter((c) => c.type === "Other").length
  };
  const sortedVolunteers = [...volunteers].sort((a, b) => b.xp - a.xp);
  return <div className="p-5 space-y-5">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Municipal Operations Analytics & Evaluation
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time aggregated DBMS Views providing transparency into response velocity, resource throughput and responder performance
        </p>
      </div>

      {
    /* 6 Top Key Metric Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Food Rescued</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{foodRescuedTotal}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">meals diverted</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Cases Managed</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{emergencyCases.length}</span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">{casesResolvedCount} in active care</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Mission Success</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{missionCompletionRate}%</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{missionCompletedCount} delivered</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Active Responders</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{activeVolunteersCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">field verified</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Avg Dispatch ETA</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{avgResponseTime}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">intake to route</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-800 font-semibold block">City Health Score</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">{cityHealthScore}%</span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Resilient & Stable</span>
        </div>
      </div>

      {
    /* Analytics Charts Grid */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {
    /* Chart 1: Cases by Priority */
  }
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Emergency Cases by Priority
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Triage breakdown</span>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(priorityDist).map(([pName, count]) => {
    const maxVal = Math.max(1, ...Object.values(priorityDist));
    const pct = count / maxVal * 100;
    return <div key={pName} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-700 font-medium">{pName}</span>
                    <span className="font-mono text-slate-900 font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
      className={`h-full rounded-full ${pName === "Critical" ? "bg-rose-600" : pName === "Very Unstable" ? "bg-orange-500" : pName === "Unstable" ? "bg-amber-500" : "bg-emerald-600"}`}
      style={{ width: `${Math.max(8, pct)}%` }}
    />
                  </div>
                </div>;
  })}
          </div>
        </div>

        {
    /* Chart 2: Cases by Emergency Type */
  }
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Cases by Incident Type
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Hazard categorization</span>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(typeDist).map(([tName, count]) => {
    const maxVal = Math.max(1, ...Object.values(typeDist));
    const pct = count / maxVal * 100;
    return <div key={tName} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-700 font-medium">{tName}</span>
                    <span className="font-mono text-slate-900 font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
      className="h-full rounded-full bg-slate-800"
      style={{ width: `${Math.max(8, pct)}%` }}
    />
                  </div>
                </div>;
  })}
          </div>
        </div>

        {
    /* Chart 3: Resources Reserved vs Available */
  }
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Resources Utilized vs Stocked
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Buffer utilization</span>
          </div>

          <div className="space-y-2 text-xs">
            {["Food", "Water", "Medicine", "Vehicles"].map((rType) => {
    const avail = resources.filter((r) => r.type === rType).reduce((s, r) => s + r.available, 0);
    const reserved = resources.filter((r) => r.type === rType).reduce((s, r) => s + r.reserved, 0);
    const total = avail + reserved || 1;
    const resPct = reserved / total * 100;
    return <div key={rType} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-700 font-medium">{rType}</span>
                    <span className="font-mono text-slate-500">
                      Reserved: <strong className="text-slate-900">{reserved}</strong> / Avail: {avail}
                    </span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2 flex overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: `${resPct}%` }} title="Reserved" />
                    <div className="bg-emerald-600 h-full" style={{ width: `${100 - resPct}%` }} title="Available" />
                  </div>
                </div>;
  })}
          </div>
        </div>
      </div>

      {
    /* Volunteer Leaderboard Preview */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-3">
        <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Volunteer Responder Leaderboard
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ranked automatically via DBMS Trigger <code className="text-slate-700 font-mono">sp_award_volunteer_rewards</code>
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">VIEW: v_volunteer_rankings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Volunteer</th>
                <th className="py-2 px-3">Zone</th>
                <th className="py-2 px-3 font-mono">Civic XP</th>
                <th className="py-2 px-3 font-mono">Relief Coins</th>
                <th className="py-2 px-3 font-mono">Completed Missions</th>
                <th className="py-2 px-3 font-mono">Badge Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedVolunteers.map((vol, idx) => <tr key={vol.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    #{idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{vol.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{vol.id}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{vol.zone}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{vol.xp} XP</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700">{vol.coins}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">{vol.completedMissions}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">Level {vol.level}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
