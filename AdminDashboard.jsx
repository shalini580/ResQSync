import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import {
  AlertTriangle,
  Activity,
  ArrowRight
} from "lucide-react";
export const AdminDashboard = () => {
  const {
    emergencyCases,
    resources,
    missions,
    surplusFood,
    volunteers,
    resourceRequests,
    setActiveView
  } = useApp();
  const activeEmergencies = emergencyCases.filter((c) => c.status !== "Resolved").length;
  const criticalCases = emergencyCases.filter((c) => c.priority === "Critical").length;
  const pendingRequests = resourceRequests.filter((r) => r.status === "Pending").length;
  const totalAvailableResources = resources.reduce((sum, r) => sum + r.available, 0);
  const activeMissions = missions.filter((m) => m.status !== "COMPLETED").length;
  const availableVolunteers = volunteers.filter((v) => v.availability === "Available").length;
  const foodRescuedCount = surplusFood.filter((f) => f.status === "Delivered" || f.status === "Reserved").reduce((sum, f) => sum + f.quantity, 0);
  const healthScore = Math.max(
    45,
    Math.min(96, Math.round(92 - criticalCases * 8 - (pendingRequests > 0 ? 5 : 0)))
  );
  const foodAvail = resources.filter((r) => r.type === "Food").reduce((s, r) => s + r.available, 0);
  const waterAvail = resources.filter((r) => r.type === "Water").reduce((s, r) => s + r.available, 0);
  const medAvail = resources.filter((r) => r.type === "Medicine").reduce((s, r) => s + r.available, 0);
  const vehAvail = resources.filter((r) => r.type === "Vehicles").reduce((s, r) => s + r.available, 0);
  const bedAvail = resources.filter((r) => r.type === "Shelter Beds").reduce((s, r) => s + r.available, 0);
  return <div className="space-y-5 p-5">
      {
    /* Top Summary Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <div className="bg-white border border-dust-grey-200 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-dust-grey-500 uppercase tracking-wider font-mono">
            Active Emergencies
          </div>
          <div className="mt-1 text-xl font-bold text-dust-grey-900">{activeEmergencies}</div>
          <div className="text-[10px] text-dust-grey-500 mt-0.5">Across 4 zones</div>
        </div>

        <div className="bg-white border border-cherry-rose-200 bg-cherry-rose-50/20 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-cherry-rose-700 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Critical Cases</span>
            <AlertTriangle className="h-3.5 w-3.5 text-cherry-rose-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-cherry-rose-700">{criticalCases}</div>
          <div className="text-[10px] text-cherry-rose-600 font-mono mt-0.5">Priority 1 In Queue</div>
        </div>

        <div className="bg-white border border-honey-bronze-200 bg-honey-bronze-50/20 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-honey-bronze-800 uppercase tracking-wider font-mono">
            Pending Requests
          </div>
          <div className="mt-1 text-xl font-bold text-honey-bronze-900">{pendingRequests}</div>
          <div className="text-[10px] text-honey-bronze-600 mt-0.5">Shelters waiting</div>
        </div>

        <div className="bg-white border border-dust-grey-200 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-dust-grey-500 uppercase tracking-wider font-mono">
            Avail Resources
          </div>
          <div className="mt-1 text-xl font-bold text-dust-grey-950 font-mono">{totalAvailableResources}</div>
          <div className="text-[10px] text-dust-grey-500 mt-0.5">Stocked units</div>
        </div>

        <div className="bg-white border border-dust-grey-200 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-dust-grey-500 uppercase tracking-wider font-mono">
            Active Missions
          </div>
          <div className="mt-1 text-xl font-bold text-dust-grey-900">{activeMissions}</div>
          <div className="text-[10px] text-dust-grey-500 mt-0.5">In transit / pickup</div>
        </div>

        <div className="bg-white border border-muted-teal-200 bg-muted-teal-50/20 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-muted-teal-800 uppercase tracking-wider font-mono">
            Avail Volunteers
          </div>
          <div className="mt-1 text-xl font-bold text-muted-teal-900">{availableVolunteers}</div>
          <div className="text-[10px] text-muted-teal-600 mt-0.5">Ready for dispatch</div>
        </div>

        <div className="bg-white border border-honey-bronze-200 bg-honey-bronze-50/20 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-honey-bronze-800 uppercase tracking-wider font-mono">
            Food Rescued
          </div>
          <div className="mt-1 text-xl font-bold text-honey-bronze-900">{foodRescuedCount}</div>
          <div className="text-[10px] text-honey-bronze-700 mt-0.5">Portions diverted</div>
        </div>

        <div className="bg-white border border-muted-teal-300 bg-muted-teal-50/30 rounded p-3 shadow-2xs">
          <div className="text-[10px] font-semibold text-muted-teal-900 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>City Health</span>
            <Activity className="h-3.5 w-3.5 text-muted-teal-700" />
          </div>
          <div className="mt-1 text-xl font-bold text-muted-teal-900 font-mono">{healthScore}%</div>
          <div className="text-[10px] text-muted-teal-800 mt-0.5 font-medium">Operational Stable</div>
        </div>
      </div>

      {
    /* Main Grid: Priority Cases & Active Missions */
  }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {
    /* Priority Emergency Cases */
  }
        <div className="lg:col-span-7 bg-white border border-dust-grey-200 rounded shadow-2xs">
          <div className="flex items-center justify-between border-b border-dust-grey-200 px-4 py-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-dust-grey-900 font-mono">
                A. Priority Emergency Cases (Triage Queue)
              </h2>
              <p className="text-[11px] text-dust-grey-500 mt-0.5">
                Active municipal cases mapped to OS process execution table
              </p>
            </div>
            <button
    onClick={() => setActiveView("emergency-cases")}
    className="flex items-center gap-1 text-[11px] font-medium text-dust-grey-700 hover:text-dust-grey-950 cursor-pointer"
  >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dust-grey-50 border-b border-dust-grey-200 text-[11px] font-mono text-dust-grey-500 uppercase">
                <tr>
                  <th className="py-2 px-3">Case ID</th>
                  <th className="py-2 px-3">Emergency</th>
                  <th className="py-2 px-3">Zone</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Affected</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dust-grey-100">
                {emergencyCases.slice(0, 5).map((c) => <tr key={c.id} className="hover:bg-dust-grey-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-dust-grey-800">{c.id}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-dust-grey-950 truncate max-w-[160px]">{c.title}</div>
                      <div className="text-[10px] text-dust-grey-500 font-mono">PID {c.processId} • {c.type}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-dust-grey-600 text-[11px]">{c.zone}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.priority} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-dust-grey-700">{c.peopleAffected}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-dust-grey-700">{c.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
    onClick={() => setActiveView("resource-allocation")}
    className="rounded border border-dust-grey-300 bg-white px-2 py-0.5 text-[11px] font-medium text-dust-grey-700 hover:bg-dust-grey-50 cursor-pointer"
  >
                        Allocate
                      </button>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {
    /* Active Missions */
  }
        <div className="lg:col-span-5 bg-white border border-dust-grey-200 rounded shadow-2xs">
          <div className="flex items-center justify-between border-b border-dust-grey-200 px-4 py-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-dust-grey-900 font-mono">
                B. Active Missions (Field Logistics)
              </h2>
              <p className="text-[11px] text-dust-grey-500 mt-0.5">
                Dispatch status and route transit verification
              </p>
            </div>
            <button
    onClick={() => setActiveView("rescue-missions")}
    className="flex items-center gap-1 text-[11px] font-medium text-dust-grey-700 hover:text-dust-grey-950 cursor-pointer"
  >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dust-grey-50 border-b border-dust-grey-200 text-[11px] font-mono text-dust-grey-500 uppercase">
                <tr>
                  <th className="py-2 px-3">Mission</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Volunteer</th>
                  <th className="py-2 px-3">Zone</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dust-grey-100">
                {missions.slice(0, 4).map((m) => <tr key={m.id} className="hover:bg-dust-grey-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-dust-grey-800">{m.id}</div>
                      <div className="text-[10px] text-dust-grey-500 truncate max-w-[120px]">{m.caseTitle}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={m.priority} />
                    </td>
                    <td className="py-2.5 px-3 text-dust-grey-700 text-[11px]">
                      {m.assignedVolunteerName || <span className="text-dust-grey-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-dust-grey-600 text-[11px]">{m.zone}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {
    /* Bottom Grid: Resource Availability & Recent Activity */
  }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {
    /* Resource Availability */
  }
        <div className="lg:col-span-6 bg-white border border-dust-grey-200 rounded shadow-2xs p-4">
          <div className="flex items-center justify-between border-b border-dust-grey-200 pb-2.5 mb-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-dust-grey-900 font-mono">
                C. City Resource Availability (Aggregate View)
              </h2>
              <p className="text-[11px] text-dust-grey-500 mt-0.5">
                Current unreserved stock across municipal depots
              </p>
            </div>
            <button
    onClick={() => setActiveView("resources")}
    className="text-[11px] font-medium text-dust-grey-700 hover:text-dust-grey-950 cursor-pointer"
  >
              Manage Inventory
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="border border-dust-grey-200 rounded p-2.5 bg-dust-grey-50">
              <span className="text-[10px] font-mono uppercase text-dust-grey-500 block">Food Packs</span>
              <span className="text-base font-bold font-mono text-dust-grey-800 mt-0.5 block">{foodAvail}</span>
              <span className="text-[10px] text-dust-grey-400">packets</span>
            </div>
            <div className="border border-dust-grey-200 rounded p-2.5 bg-dust-grey-50">
              <span className="text-[10px] font-mono uppercase text-dust-grey-500 block">Clean Water</span>
              <span className="text-base font-bold font-mono text-dust-grey-800 mt-0.5 block">{waterAvail}</span>
              <span className="text-[10px] text-dust-grey-400">litres</span>
            </div>
            <div className="border border-dust-grey-200 rounded p-2.5 bg-dust-grey-50">
              <span className="text-[10px] font-mono uppercase text-dust-grey-500 block">Med Kits</span>
              <span className="text-base font-bold font-mono text-dust-grey-800 mt-0.5 block">{medAvail}</span>
              <span className="text-[10px] text-dust-grey-400">kits</span>
            </div>
            <div className="border border-dust-grey-200 rounded p-2.5 bg-dust-grey-50">
              <span className="text-[10px] font-mono uppercase text-dust-grey-500 block">Vehicles</span>
              <span className="text-base font-bold font-mono text-dust-grey-800 mt-0.5 block">{vehAvail}</span>
              <span className="text-[10px] text-dust-grey-400">4x4 & vans</span>
            </div>
            <div className="border border-dust-grey-200 rounded p-2.5 bg-dust-grey-50">
              <span className="text-[10px] font-mono uppercase text-dust-grey-500 block">Shelter Beds</span>
              <span className="text-base font-bold font-mono text-dust-grey-800 mt-0.5 block">{bedAvail}</span>
              <span className="text-[10px] text-dust-grey-400">cots</span>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-dust-grey-100 flex items-center justify-between text-[11px] text-dust-grey-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-teal-500" />
              <span>Banker’s Safety Margin: Sufficient for 4 concurrent processes</span>
            </div>
            <button
    onClick={() => setActiveView("os-simulation")}
    className="text-dust-grey-900 hover:underline font-mono text-[10px] cursor-pointer"
  >
              RUN BANKER MATRIX →
            </button>
          </div>
        </div>

        {
    /* Recent Activity Log */
  }
        <div className="lg:col-span-6 bg-white border border-dust-grey-200 rounded shadow-2xs p-4">
          <div className="flex items-center justify-between border-b border-dust-grey-200 pb-2.5 mb-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-dust-grey-900 font-mono">
                D. Municipal Audit & Event Ledger
              </h2>
              <p className="text-[11px] text-dust-grey-500 mt-0.5">
                Real-time transactions, state transitions and triggers
              </p>
            </div>
            <span className="text-[10px] font-mono text-dust-grey-400">WAL / Transaction Log</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 p-2 bg-dust-grey-50 border border-dust-grey-200 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-cherry-rose-500 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-dust-grey-800">Critical Case E101 Escalated</span>
                  <span className="text-[10px] font-mono text-dust-grey-400">05:45</span>
                </div>
                <p className="text-[11px] text-dust-grey-600 mt-0.5">
                  Riverbank breach priority elevated to Critical. PID 101 moved to head of Priority Queue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 bg-dust-grey-50 border border-dust-grey-200 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-teal-500 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-dust-grey-800">Resources Allocated via Banker's Verification</span>
                  <span className="text-[10px] font-mono text-dust-grey-400">06:00</span>
                </div>
                <p className="text-[11px] text-dust-grey-600 mt-0.5">
                  Transaction TX-7741 committed: 120 Food, 250 Water, 4 Vehicles locked for Case E101.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 bg-dust-grey-50 border border-dust-grey-200 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-coffee-bean-500 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-dust-grey-800">Mission M204 Completed</span>
                  <span className="text-[10px] font-mono text-dust-grey-400">05:30</span>
                </div>
                <p className="text-[11px] text-dust-grey-600 mt-0.5">
                  Volunteer Rahul Sharma (V24) delivered supplies. Stored procedure sp_award_rewards executed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 bg-dust-grey-50 border border-dust-grey-200 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-honey-bronze-500 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-dust-grey-800">Food Donation F301 Expiry Alert Triggered</span>
                  <span className="text-[10px] font-mono text-dust-grey-400">06:05</span>
                </div>
                <p className="text-[11px] text-dust-grey-600 mt-0.5">
                  Metro Central Kitchen batch expiring within 3 hours. Pickup priority auto-incremented.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
