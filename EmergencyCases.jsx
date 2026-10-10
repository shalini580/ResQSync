import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import {
  Plus,
  Search,
  X,
  Cpu,
  History
} from "lucide-react";
export const EmergencyCases = () => {
  const {
    emergencyCases,
    createEmergencyCase,
    updateEmergencyCasePriority,
    setActiveView
  } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterZone, setFilterZone] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailCase, setDetailCase] = useState(null);
  const [priorityModalCase, setPriorityModalCase] = useState(null);
  const [newPriorityValue, setNewPriorityValue] = useState("Critical");
  const [priorityReason, setPriorityReason] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("Flood");
  const [formZone, setFormZone] = useState("Zone A");
  const [formPeople, setFormPeople] = useState("50");
  const [formPriority, setFormPriority] = useState("Very Unstable");
  const [formDesc, setFormDesc] = useState("");
  const [formFood, setFormFood] = useState("80");
  const [formWater, setFormWater] = useState("150");
  const [formMed, setFormMed] = useState("20");
  const [formVeh, setFormVeh] = useState("2");
  const [formVol, setFormVol] = useState("5");
  const filteredCases = emergencyCases.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || c.priority === filterPriority;
    const matchesType = filterType === "ALL" || c.type === filterType;
    const matchesZone = filterZone === "ALL" || c.zone === filterZone;
    const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
    return matchesSearch && matchesPriority && matchesType && matchesZone && matchesStatus;
  });
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formTitle) return;
    createEmergencyCase({
      title: formTitle,
      type: formType,
      zone: formZone,
      peopleAffected: parseInt(formPeople, 10) || 1,
      priority: formPriority,
      status: "Reported",
      description: formDesc,
      requiredResources: {
        food: parseInt(formFood, 10) || 0,
        water: parseInt(formWater, 10) || 0,
        medicine: parseInt(formMed, 10) || 0,
        vehicles: parseInt(formVeh, 10) || 0,
        volunteers: parseInt(formVol, 10) || 0
      }
    });
    setIsCreateOpen(false);
    setFormTitle("");
    setFormDesc("");
  };
  const handlePriorityUpdate = (e) => {
    e.preventDefault();
    if (priorityModalCase) {
      updateEmergencyCasePriority(priorityModalCase.id, newPriorityValue, priorityReason);
      setPriorityModalCase(null);
      setPriorityReason("");
    }
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header & Action */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Emergency Cases</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active incidents mapped directly to OS Process scheduling priorities & ACID transaction queues
          </p>
        </div>

        <button
    onClick={() => setIsCreateOpen(true)}
    className="flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
  >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Create Emergency Case</span>
        </button>
      </div>

      {
    /* Filter & Search Bar */
  }
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 bg-white border border-slate-200 rounded p-3 shadow-2xs text-xs">
        {
    /* Search */
  }
        <div className="md:col-span-2 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
    type="text"
    placeholder="Search by ID, title, or keywords..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
  />
        </div>

        {
    /* Priority Filter */
  }
        <div>
          <select
    value={filterPriority}
    onChange={(e) => setFilterPriority(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none bg-white"
  >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="Very Unstable">Very Unstable</option>
            <option value="Unstable">Unstable</option>
            <option value="Stable">Stable</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {
    /* Type Filter */
  }
        <div>
          <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none bg-white"
  >
            <option value="ALL">All Types</option>
            <option value="Flood">Flood</option>
            <option value="Fire">Fire</option>
            <option value="Earthquake">Earthquake</option>
            <option value="Medical">Medical</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {
    /* Zone Filter */
  }
        <div>
          <select
    value={filterZone}
    onChange={(e) => setFilterZone(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none bg-white"
  >
            <option value="ALL">All Zones</option>
            <option value="Zone A">Zone A</option>
            <option value="Zone B">Zone B</option>
            <option value="Zone C">Zone C</option>
            <option value="Zone D">Zone D</option>
          </select>
        </div>

        {
    /* Status Filter */
  }
        <div>
          <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none bg-white"
  >
            <option value="ALL">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="In Progress">In Progress</option>
            <option value="Resources Allocated">Resources Allocated</option>
            <option value="Under Control">Under Control</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {
    /* Emergency Cases Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-tight">
              <tr>
                <th className="py-2.5 px-3.5">Case ID</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Emergency Type</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">People Affected</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created At</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-slate-400">
                    No emergency cases match the selected filter criteria.
                  </td>
                </tr> : filteredCases.map((c) => <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                      {c.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        PID {c.processId} • State: {c.processState}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{c.type}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{c.zone}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{c.peopleAffected}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.priority} />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-slate-700">{c.status}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{c.createdAt}</td>
                    <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
    onClick={() => setDetailCase(c)}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
    title="View Case & OS Process Details"
  >
                        View
                      </button>
                      <button
    onClick={() => {
      setPriorityModalCase(c);
      setNewPriorityValue(c.priority);
    }}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
    title="Change Priority (Trigger OS reschedule)"
  >
                        Priority
                      </button>
                      <button
    onClick={() => setActiveView("resource-allocation")}
    className="rounded border border-slate-900 bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800 shadow-2xs"
    title="Allocate Resources with Banker's Safety Check"
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
    /* Case Details Drawer / Modal */
  }
      {detailCase && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded shadow-lg max-h-[90vh] overflow-y-auto p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                    {detailCase.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{detailCase.title}</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Registered: {detailCase.createdAt} in {detailCase.zone}
                </p>
              </div>
              <button
    onClick={() => setDetailCase(null)}
    className="text-slate-400 hover:text-slate-600 p-1"
  >
                <X className="h-4 w-4" />
              </button>
            </div>

            {
    /* OS Process Management Linkage (Core Project Requirement) */
  }
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-700 font-semibold font-mono text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-slate-600" />
                  OPERATING SYSTEM PROCESS MAPPING
                </span>
                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                  Kernel PCB Entry #0x{detailCase.processId.toString(16)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white border border-slate-200 rounded p-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Process ID</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">PID {detailCase.processId}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Process State</span>
                  <div className="mt-0.5">
                    <StatusBadge status={detailCase.processState} />
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-mono">Scheduling Priority</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    Level {detailCase.schedulingPriority} (Preemptive)
                  </span>
                </div>
              </div>
            </div>

            {
    /* Description & Resources */
  }
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block">Description</label>
                <p className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                  {detailCase.description || "No detailed narrative provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded p-2.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Required Resources
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div>Food: <span className="font-semibold text-slate-800">{detailCase.requiredResources.food} pkts</span></div>
                    <div>Water: <span className="font-semibold text-slate-800">{detailCase.requiredResources.water} L</span></div>
                    <div>Medicine: <span className="font-semibold text-slate-800">{detailCase.requiredResources.medicine} kits</span></div>
                    <div>Vehicles: <span className="font-semibold text-slate-800">{detailCase.requiredResources.vehicles} units</span></div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-2.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Allocated Resources (Committed)
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div>Food: <span className="font-semibold text-emerald-700">{detailCase.allocatedResources?.food || 0} pkts</span></div>
                    <div>Water: <span className="font-semibold text-emerald-700">{detailCase.allocatedResources?.water || 0} L</span></div>
                    <div>Medicine: <span className="font-semibold text-emerald-700">{detailCase.allocatedResources?.medicine || 0} kits</span></div>
                    <div>Vehicles: <span className="font-semibold text-emerald-700">{detailCase.allocatedResources?.vehicles || 0} units</span></div>
                  </div>
                </div>
              </div>
            </div>

            {
    /* Audit Log / Case History */
  }
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-slate-700 font-semibold text-[11px]">
                <History className="h-3.5 w-3.5 text-slate-600" />
                <span>CASE AUDIT LOG & TRIGGER TIMELINE</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {detailCase.auditLog.map((log, idx) => <div
    key={idx}
    className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] flex items-start justify-between"
  >
                    <div>
                      <div className="font-semibold text-slate-800">{log.action}</div>
                      <div className="text-slate-600 mt-0.5">{log.notes || `Performed by ${log.actor}`}</div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                      {log.timestamp}
                    </span>
                  </div>)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
    onClick={() => setDetailCase(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                Close
              </button>
            </div>
          </div>
        </div>}

      {
    /* Priority Change Modal */
  }
      {priorityModalCase && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900">
                Change Priority — {priorityModalCase.id}
              </h3>
              <button onClick={() => setPriorityModalCase(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-slate-600">
              Updating priority reschedules the associated OS process (PID {priorityModalCase.processId}) and logs an audit record.
            </p>

            <form onSubmit={handlePriorityUpdate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Priority</label>
                <select
    value={newPriorityValue}
    onChange={(e) => setNewPriorityValue(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2.5 text-xs bg-white text-slate-900 focus:outline-none"
  >
                  <option value="Critical">Critical (P1)</option>
                  <option value="Very Unstable">Very Unstable (P2)</option>
                  <option value="Unstable">Unstable (P3)</option>
                  <option value="Stable">Stable (P4)</option>
                  <option value="Low">Low (P5)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes / Justification</label>
                <input
    type="text"
    placeholder="e.g. Floodwater breaching secondary residential levee"
    value={priorityReason}
    onChange={(e) => setPriorityReason(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none"
    required
  />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
    type="button"
    onClick={() => setPriorityModalCase(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Update & Trigger Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>}

      {
    /* Create Emergency Case Modal */
  }
      {isCreateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded shadow-lg max-h-[90vh] overflow-y-auto p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create Emergency Case</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allocates new PCB process slot and queues incident for CPU priority dispatch
                </p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Case Title *</label>
                <input
    type="text"
    required
    placeholder="e.g. Flash Flood Inundation near Low-Lying Sector 4"
    value={formTitle}
    onChange={(e) => setFormTitle(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:outline-none"
  />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Type</label>
                  <select
    value={formType}
    onChange={(e) => setFormType(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
                    <option value="Flood">Flood</option>
                    <option value="Fire">Fire</option>
                    <option value="Earthquake">Earthquake</option>
                    <option value="Medical">Medical</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone</label>
                  <select
    value={formZone}
    onChange={(e) => setFormZone(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                    <option value="Zone D">Zone D</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">People Affected</label>
                  <input
    type="number"
    min="1"
    value={formPeople}
    onChange={(e) => setFormPeople(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:outline-none"
  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
    value={formPriority}
    onChange={(e) => setFormPriority(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
                    <option value="Critical">Critical</option>
                    <option value="Very Unstable">Very Unstable</option>
                    <option value="Unstable">Unstable</option>
                    <option value="Stable">Stable</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Description</label>
                <textarea
    rows={2}
    placeholder="Detail severity, geographic markers and hazard level..."
    value={formDesc}
    onChange={(e) => setFormDesc(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
  />
              </div>

              {
    /* Required Resources Grid */
  }
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-500 block">
                  Required Resources (Claim Vector)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Food (pkts)</label>
                    <input
    type="number"
    value={formFood}
    onChange={(e) => setFormFood(e.target.value)}
    className="w-full rounded border border-slate-300 p-1 text-xs bg-white"
  />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Water (L)</label>
                    <input
    type="number"
    value={formWater}
    onChange={(e) => setFormWater(e.target.value)}
    className="w-full rounded border border-slate-300 p-1 text-xs bg-white"
  />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Med Kits</label>
                    <input
    type="number"
    value={formMed}
    onChange={(e) => setFormMed(e.target.value)}
    className="w-full rounded border border-slate-300 p-1 text-xs bg-white"
  />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Vehicles</label>
                    <input
    type="number"
    value={formVeh}
    onChange={(e) => setFormVeh(e.target.value)}
    className="w-full rounded border border-slate-300 p-1 text-xs bg-white"
  />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Volunteers</label>
                    <input
    type="number"
    value={formVol}
    onChange={(e) => setFormVol(e.target.value)}
    className="w-full rounded border border-slate-300 p-1 text-xs bg-white"
  />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
    type="button"
    onClick={() => setIsCreateOpen(false)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="rounded bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Register Case & Spawn Process
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
