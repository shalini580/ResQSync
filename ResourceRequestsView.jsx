import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Plus, X, Search, Trash2 } from "lucide-react";
export const ResourceRequestsView = () => {
  const { resourceRequests, createResourceRequest, currentUser } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [emergencyType, setEmergencyType] = useState("Flood");
  const [zone, setZone] = useState(currentUser?.zone || "Zone B");
  const [priority, setPriority] = useState("Critical");
  const [peopleAffected, setPeopleAffected] = useState("80");
  const [neededBy, setNeededBy] = useState("2026-10-07 10:00");
  const [description, setDescription] = useState("");
  const [requestItems, setRequestItems] = useState([
    { resourceType: "Food", quantity: 120, unit: "meals" },
    { resourceType: "Water", quantity: 200, unit: "litres" }
  ]);
  const handleAddItemRow = () => {
    setRequestItems((prev) => [...prev, { resourceType: "Medicine", quantity: 20, unit: "kits" }]);
  };
  const handleRemoveItemRow = (index) => {
    setRequestItems((prev) => prev.filter((_, i) => i !== index));
  };
  const handleItemChange = (index, field, value) => {
    setRequestItems(
      (prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  };
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (requestItems.length === 0) return;
    createResourceRequest({
      ngoId: currentUser?.id || "NGO-01",
      ngoName: currentUser?.orgName || "Hope Shelter & Relief",
      zone,
      emergencyType,
      priority,
      peopleAffected: parseInt(peopleAffected, 10) || 1,
      neededBy,
      description,
      items: requestItems.map((it) => ({
        ...it,
        allocated: 0
      }))
    });
    setIsCreateOpen(false);
    setDescription("");
  };
  const filtered = resourceRequests.filter((r) => {
    const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) || r.ngoName.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || r.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Emergency Resource Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit multi-item supply petitions for affected shelter populations directly to the City Allocation Engine
          </p>
        </div>
        <button
    onClick={() => setIsCreateOpen(true)}
    className="flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
  >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Create Resource Request</span>
        </button>
      </div>

      {
    /* Filter Bar */
  }
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded p-3 shadow-2xs text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
    type="text"
    placeholder="Search request ID, description..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none"
  />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Priority:</span>
          <select
    value={filterPriority}
    onChange={(e) => setFilterPriority(e.target.value)}
    className="rounded border border-slate-300 py-1 px-2.5 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="Very Unstable">Very Unstable</option>
            <option value="Unstable">Unstable</option>
            <option value="Stable">Stable</option>
          </select>
        </div>
      </div>

      {
    /* Requests Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Request ID</th>
                <th className="py-2.5 px-3">Organisation</th>
                <th className="py-2.5 px-3">Requested Resources (Multi-Item)</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3 font-mono">Affected</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3.5">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((req) => <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">{req.id}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{req.ngoName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Type: {req.emergencyType}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {req.items.map((it, idx) => <span
    key={idx}
    className="font-mono text-[11px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-800"
  >
                          {it.resourceType}: <strong className="text-slate-900">{it.quantity} {it.unit}</strong>
                          {it.allocated > 0 && <span className="text-emerald-700 ml-1">({it.allocated} alloc)</span>}
                        </span>)}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={req.priority} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-800">{req.peopleAffected}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{req.zone}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-slate-400 text-[11px]">{req.createdAt}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Multi-Item Create Request Modal */
  }
      {isCreateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded shadow-lg max-h-[90vh] overflow-y-auto p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Create Multi-Item Resource Request</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bundles multiple supply categories into a single atomic transactional petition
                </p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Hazard</label>
                  <select
    value={emergencyType}
    onChange={(e) => setEmergencyType(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white text-slate-900"
  >
                    <option value="Flood">Flood</option>
                    <option value="Fire">Fire</option>
                    <option value="Medical">Medical</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone</label>
                  <select
    value={zone}
    onChange={(e) => setZone(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white text-slate-900"
  >
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                    <option value="Zone D">Zone D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Triage Priority</label>
                  <select
    value={priority}
    onChange={(e) => setPriority(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white text-slate-900"
  >
                    <option value="Critical">Critical (Immediate danger)</option>
                    <option value="Very Unstable">Very Unstable</option>
                    <option value="Unstable">Unstable</option>
                    <option value="Stable">Stable</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">People Displaced / In Need</label>
                  <input
    type="number"
    min="1"
    value={peopleAffected}
    onChange={(e) => setPeopleAffected(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    required
  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Needed By Timestamp</label>
                <input
    type="text"
    value={neededBy}
    onChange={(e) => setNeededBy(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900 font-mono"
    placeholder="2026-10-07 10:00"
    required
  />
              </div>

              {
    /* Multi-Item Resources Repeater */
  }
              <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-700 font-semibold">
                    Requested Items (Multi-Item Specification)
                  </span>
                  <button
    type="button"
    onClick={handleAddItemRow}
    className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {requestItems.map((item, idx) => <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                      <select
    value={item.resourceType}
    onChange={(e) => handleItemChange(idx, "resourceType", e.target.value)}
    className="rounded border border-slate-300 p-1 text-xs bg-white text-slate-900"
  >
                        <option value="Food">Food</option>
                        <option value="Water">Water</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Vehicles">Vehicles</option>
                      </select>

                      <input
    type="number"
    min="1"
    value={item.quantity}
    onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)}
    className="w-20 rounded border border-slate-300 p-1 text-xs text-slate-900 font-mono"
    placeholder="Qty"
    required
  />

                      <input
    type="text"
    value={item.unit}
    onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
    className="w-24 rounded border border-slate-300 p-1 text-xs text-slate-900"
    placeholder="Unit"
    required
  />

                      {requestItems.length > 1 && <button
    type="button"
    onClick={() => handleRemoveItemRow(idx)}
    className="text-slate-400 hover:text-rose-600 p-1"
  >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>}
                    </div>)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Shelter Context</label>
                <textarea
    rows={2}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Detail demographic vulnerability (infants, elderly) and urgency..."
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900"
    required
  />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
    type="button"
    onClick={() => setIsCreateOpen(false)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Dispatch Request to City
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
