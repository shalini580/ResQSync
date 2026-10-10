import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import {
  Search,
  X,
  MapPin
} from "lucide-react";
export const RescueMissions = () => {
  const { missions, volunteers, assignVolunteerToMission } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterZone, setFilterZone] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedMission, setSelectedMission] = useState(null);
  const [assigningMission, setAssigningMission] = useState(null);
  const [chosenVolunteerId, setChosenVolunteerId] = useState("");
  const activeCount = missions.filter((m) => m.status !== "COMPLETED" && m.status !== "AVAILABLE").length;
  const availCount = missions.filter((m) => m.status === "AVAILABLE").length;
  const completedTodayCount = missions.filter((m) => m.status === "COMPLETED").length;
  const filteredMissions = missions.filter((m) => {
    const matchesSearch = m.id.toLowerCase().includes(searchTerm.toLowerCase()) || m.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) || m.assignedVolunteerName && m.assignedVolunteerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || m.priority === filterPriority;
    const matchesZone = filterZone === "ALL" || m.zone === filterZone;
    const matchesStatus = filterStatus === "ALL" || m.status === filterStatus;
    return matchesSearch && matchesPriority && matchesZone && matchesStatus;
  });
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (assigningMission && chosenVolunteerId) {
      assignVolunteerToMission(assigningMission.id, chosenVolunteerId);
      setAssigningMission(null);
      setChosenVolunteerId("");
    }
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Rescue Missions Dispatch</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Logistical dispatch units coordinating verified supply pickups, convoy escorts and field drop-offs
          </p>
        </div>
      </div>

      {
    /* Top Summary Cards */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Active In Transit / Pickup</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{activeCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Responders actively deployed</span>
        </div>

        <div className="bg-white border border-sky-200 bg-sky-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-sky-800 font-semibold block">Available Missions</span>
          <span className="text-xl font-bold font-mono text-sky-800 mt-1 block">{availCount}</span>
          <span className="text-[10px] text-sky-700 mt-0.5 block">Awaiting responder assignment</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-800 font-semibold block">Completed Today</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">{completedTodayCount}</span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Delivered and closed by dispatch</span>
        </div>
      </div>

      {
    /* Filter Bar */
  }
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 bg-white border border-slate-200 rounded p-3 shadow-2xs text-xs">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
    type="text"
    placeholder="Search mission ID, case or volunteer..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none"
  />
        </div>

        <div>
          <select
    value={filterPriority}
    onChange={(e) => setFilterPriority(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="Very Unstable">Very Unstable</option>
            <option value="Unstable">Unstable</option>
            <option value="Stable">Stable</option>
          </select>
        </div>

        <div>
          <select
    value={filterZone}
    onChange={(e) => setFilterZone(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Zones</option>
            <option value="Zone A">Zone A</option>
            <option value="Zone B">Zone B</option>
            <option value="Zone C">Zone C</option>
            <option value="Zone D">Zone D</option>
          </select>
        </div>

        <div>
          <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="PICKUP">PICKUP</option>
            <option value="IN TRANSIT">IN TRANSIT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </div>

      {
    /* Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Mission ID</th>
                <th className="py-2.5 px-3">Emergency Case</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Assigned Volunteer</th>
                <th className="py-2.5 px-3">Resources</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created At</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMissions.map((m) => <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">{m.id}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 truncate max-w-[180px]">{m.caseTitle}</div>
                    <div className="text-[10px] font-mono text-slate-400">Ref: {m.caseId}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={m.priority} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{m.zone}</td>
                  <td className="py-2.5 px-3 text-slate-800">
                    {m.assignedVolunteerName || <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-600 truncate max-w-[150px]">
                    {m.resourcesSummary}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{m.createdAt}</td>
                  <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
    onClick={() => setSelectedMission(m)}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                      View
                    </button>
                    {m.status !== "COMPLETED" && <button
    onClick={() => {
      setAssigningMission(m);
      setChosenVolunteerId(m.assignedVolunteerId || "");
    }}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                        {m.assignedVolunteerId ? "Reassign" : "Assign"}
                      </button>}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Mission Detail Drawer */
  }
      {selectedMission && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded shadow-lg max-h-[90vh] overflow-y-auto p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                    {selectedMission.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{selectedMission.caseTitle}</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Zone: {selectedMission.zone} • People in Need: {selectedMission.peopleAffected}
                </p>
              </div>
              <button onClick={() => setSelectedMission(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {
    /* Mission status & rewards */
  }
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-400 uppercase font-mono block text-[9px]">Current Status</span>
                <div className="mt-0.5"><StatusBadge status={selectedMission.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-mono block text-[9px]">Priority</span>
                <div className="mt-0.5"><StatusBadge status={selectedMission.priority} /></div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-mono block text-[9px]">Rewards Disbursed</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                  +{selectedMission.xpReward} XP / +{selectedMission.coinReward} Coins
                </span>
              </div>
            </div>

            {
    /* Route & locations */
  }
            <div className="space-y-2 border border-slate-200 rounded p-3">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                Dispatch Waypoint Routing
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Pickup Depot:</span>{" "}
                    <span className="text-slate-600">{selectedMission.pickupPoint}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Final Destination:</span>{" "}
                    <span className="text-slate-600">{selectedMission.destination}</span>
                  </div>
                </div>
              </div>
            </div>

            {
    /* Assigned volunteer */
  }
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Assigned Responder</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {selectedMission.assignedVolunteerName || "No responder assigned yet."}
                </span>
              </div>
            </div>

            {
    /* Timeline */
  }
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                Mission Execution Timeline (Audit Steps)
              </span>
              <div className="space-y-1.5">
                {selectedMission.timeline.map((step, idx) => <div key={idx} className="flex items-start gap-2 text-[11px] p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="font-mono text-slate-400 shrink-0 text-[10px] mt-0.5">{step.timestamp}</span>
                    <div>
                      <span className="font-semibold text-slate-800">{step.status}:</span>{" "}
                      <span className="text-slate-600">{step.note}</span>
                    </div>
                  </div>)}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
    onClick={() => setSelectedMission(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                Close
              </button>
            </div>
          </div>
        </div>}

      {
    /* Assign Volunteer Modal */
  }
      {assigningMission && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-900">
                Assign Responder — {assigningMission.id}
              </h3>
              <button onClick={() => setAssigningMission(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Certified Volunteer
                </label>
                <select
    value={chosenVolunteerId}
    onChange={(e) => setChosenVolunteerId(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none"
    required
  >
                  <option value="">Select a responder...</option>
                  {volunteers.map((v) => <option key={v.id} value={v.id}>
                      {v.name} ({v.id}) — {v.zone} — {v.availability} — Level {v.level}
                    </option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
    type="button"
    onClick={() => setAssigningMission(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
