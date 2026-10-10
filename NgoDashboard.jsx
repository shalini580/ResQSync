import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { ArrowRight, AlertTriangle } from "lucide-react";
export const NgoDashboard = () => {
  const { resourceRequests, missions, organisations, currentUser, setActiveView } = useApp();
  const activeRequests = resourceRequests.filter((r) => r.status !== "Delivered" && r.status !== "Cancelled").length;
  const criticalRequests = resourceRequests.filter((r) => r.priority === "Critical").length;
  const allocatedCount = resourceRequests.filter((r) => r.status === "Allocated" || r.status === "Partially Allocated").length;
  const pendingDeliveries = missions.filter((m) => m.status === "IN TRANSIT" || m.status === "PICKUP").length;
  const completedRequests = resourceRequests.filter((r) => r.status === "Delivered").length + 3;
  const shelterOrg = organisations.find((o) => o.type === "Shelter") || organisations[0];
  const cap = shelterOrg?.shelterCapacity || 120;
  const occ = shelterOrg?.occupiedBeds || 85;
  const occPct = Math.round(occ / (cap || 1) * 100);
  return <div className="p-5 space-y-5">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              NGO Relief & Shelter Intake Hub
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Managing Organisation: {currentUser?.orgName || "Hope Shelter & Relief"} ({currentUser?.zone})
            </p>
          </div>
          <button
    onClick={() => setActiveView("resource-requests")}
    className="rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
  >
            + Create Resource Request
          </button>
        </div>
      </div>

      {
    /* Top 6 Summary Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Active Requests</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{activeRequests}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">awaiting dispatch</span>
        </div>

        <div className="bg-white border border-rose-200 bg-rose-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-rose-700 font-semibold block flex items-center justify-between">
            <span>Critical</span>
            <AlertTriangle className="h-3 w-3 text-rose-600" />
          </span>
          <span className="text-xl font-bold font-mono text-rose-700 mt-1 block">{criticalRequests}</span>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Priority 1 demand</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-indigo-700 font-semibold block">Allocated Resources</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">{allocatedCount}</span>
          <span className="text-[10px] text-indigo-600 mt-0.5 block">Banker approved</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Pending Inbound</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{pendingDeliveries}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">trucks en route</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-700 font-semibold block">Completed</span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">{completedRequests}</span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">fulfilled requests</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Shelter Occupancy</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{occPct}%</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{occ}/{cap} beds occupied</span>
        </div>
      </div>

      {
    /* Grid: Active Requests & Incoming Deliveries */
  }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {
    /* Active Resource Requests */
  }
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Active Relief Petitions
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current supply requirements submitted to City Controller
              </p>
            </div>
            <button
    onClick={() => setActiveView("resource-requests")}
    className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900"
  >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {resourceRequests.map((req) => <div key={req.id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                      {req.id}
                    </span>
                    <span className="font-semibold text-slate-900">{req.ngoName}</span>
                    <span className="font-mono text-[10px] text-slate-400">({req.zone})</span>
                  </div>
                  <StatusBadge status={req.priority} />
                </div>

                <div className="text-[11px] text-slate-600 line-clamp-1">
                  {req.description}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2 font-mono text-[11px]">
                    {req.items.map((it, idx) => <span key={idx} className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                        {it.resourceType}: <strong className="text-slate-900">{it.quantity} {it.unit}</strong> (Allocated: {it.allocated})
                      </span>)}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </div>)}
          </div>
        </div>

        {
    /* Incoming Deliveries */
  }
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Incoming Supply Shipments
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vehicles currently moving toward shelter distribution gate
              </p>
            </div>
            <button
    onClick={() => setActiveView("allocation-delivery")}
    className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900"
  >
              <span>Intake</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 p-3 text-xs space-y-2">
            {missions.filter((m) => m.status !== "COMPLETED").map((m) => <div key={m.id} className="p-2.5 rounded border border-slate-200 bg-slate-50/70 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono font-bold text-slate-900">{m.id}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="font-medium text-slate-800">{m.resourcesSummary}</div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Driver: {m.assignedVolunteerName || "En route"}</span>
                    <span className="font-mono">{m.destination}</span>
                  </div>
                </div>)}
          </div>
        </div>
      </div>
    </div>;
};
