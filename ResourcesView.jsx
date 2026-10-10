import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Plus, Search, X, AlertTriangle } from "lucide-react";
export const ResourcesView = () => {
  const { resources, addResource, updateResourceStock } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterZone, setFilterZone] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("Food");
  const [zone, setZone] = useState("Zone A");
  const [totalQuantity, setTotalQuantity] = useState("500");
  const [unit, setUnit] = useState("packets");
  const [editTotal, setEditTotal] = useState(0);
  const [editAvailable, setEditAvailable] = useState(0);
  const [editReserved, setEditReserved] = useState(0);
  const totalStockSum = resources.reduce((sum, r) => sum + r.totalQuantity, 0);
  const totalAvailSum = resources.reduce((sum, r) => sum + r.available, 0);
  const totalResSum = resources.reduce((sum, r) => sum + r.reserved, 0);
  const lowStockCount = resources.filter((r) => r.status === "Low Stock" || r.status === "Unavailable").length;
  const filtered = resources.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || r.type === filterType;
    const matchesZone = filterZone === "ALL" || r.zone === filterZone;
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    return matchesSearch && matchesType && matchesZone && matchesStatus;
  });
  const handleAddSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(totalQuantity, 10) || 100;
    addResource({
      name: name || `${type} Supplies`,
      type,
      zone,
      totalQuantity: qty,
      available: qty,
      reserved: 0,
      unit,
      status: "Available"
    });
    setIsAddOpen(false);
    setName("");
  };
  const openEditModal = (r) => {
    setEditingResource(r);
    setEditTotal(r.totalQuantity);
    setEditAvailable(r.available);
    setEditReserved(r.reserved);
  };
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editingResource) {
      updateResourceStock(editingResource.id, editTotal, editAvailable, editReserved);
      setEditingResource(null);
    }
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Municipal Resource Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock ledger across zones. Provides basis for Banker’s safety algorithm matrices.
          </p>
        </div>
        <button
    onClick={() => setIsAddOpen(true)}
    className="flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
  >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add Resource</span>
        </button>
      </div>

      {
    /* Top Summary Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Total Resources</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{totalStockSum.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Aggregated municipal items</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-700 font-semibold block">Available Uncommitted</span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">{totalAvailSum.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Ready for emergency claims</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-indigo-700 font-semibold block">Reserved in Transit</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">{totalResSum.toLocaleString()}</span>
          <span className="text-[10px] text-indigo-600 mt-0.5 block">Locked by active dispatch missions</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-amber-800 font-semibold block flex items-center justify-between">
            <span>Low Stock Depots</span>
            <AlertTriangle className="h-3 w-3 text-amber-600" />
          </span>
          <span className="text-xl font-bold font-mono text-amber-800 mt-1 block">{lowStockCount}</span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Depleted / Re-order trigger</span>
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
    placeholder="Search resource name or ID..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none"
  />
        </div>

        <div>
          <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Types</option>
            <option value="Food">Food</option>
            <option value="Water">Water</option>
            <option value="Medicine">Medicine</option>
            <option value="Vehicles">Vehicles</option>
            <option value="Shelter Beds">Shelter Beds</option>
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
            <option value="Available">Available</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {
    /* Resources Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Resource</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3 font-mono">Total Qty</th>
                <th className="py-2.5 px-3 font-mono">Available</th>
                <th className="py-2.5 px-3 font-mono">Reserved</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Updated At</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{r.id} • {r.type}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{r.zone}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{r.totalQuantity}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">{r.available}</td>
                  <td className="py-2.5 px-3 font-mono text-indigo-700">{r.reserved}</td>
                  <td className="py-2.5 px-3 text-slate-500">{r.unit}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{r.updatedAt}</td>
                  <td className="py-2.5 px-3.5 text-right">
                    <button
    onClick={() => openEditModal(r)}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                      Update Stock
                    </button>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Edit Stock Modal */
  }
      {editingResource && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900">Update Stock: {editingResource.name}</h3>
                <p className="text-[10px] font-mono text-slate-400">{editingResource.id} ({editingResource.zone})</p>
              </div>
              <button onClick={() => setEditingResource(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Capacity / Physical Stock</label>
                <input
    type="number"
    value={editTotal}
    onChange={(e) => setEditTotal(parseInt(e.target.value, 10) || 0)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    required
  />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Available (Unreserved)</label>
                  <input
    type="number"
    value={editAvailable}
    onChange={(e) => setEditAvailable(parseInt(e.target.value, 10) || 0)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    required
  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reserved in Missions</label>
                  <input
    type="number"
    value={editReserved}
    onChange={(e) => setEditReserved(parseInt(e.target.value, 10) || 0)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    required
  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
    type="button"
    onClick={() => setEditingResource(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Commit Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>}

      {
    /* Add Resource Modal */
  }
      {isAddOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-900">Add Municipal Resource Stock</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resource Name *</label>
                <input
    type="text"
    placeholder="e.g. Inflatable Rescue Boats or Surgical Saline"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    required
  />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
    value={type}
    onChange={(e) => setType(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white text-slate-900"
  >
                    <option value="Food">Food</option>
                    <option value="Water">Water</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Shelter Beds">Shelter Beds</option>
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
                  <label className="block font-semibold text-slate-700 mb-1">Total Quantity</label>
                  <input
    type="number"
    value={totalQuantity}
    onChange={(e) => setTotalQuantity(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    required
  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
    type="text"
    value={unit}
    onChange={(e) => setUnit(e.target.value)}
    className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900"
    placeholder="packets, litres, kits"
    required
  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
    type="button"
    onClick={() => setIsAddOpen(false)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                  Cancel
                </button>
                <button
    type="submit"
    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Register in Inventory
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
