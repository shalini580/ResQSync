import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Plus, AlertTriangle, X, Search } from "lucide-react";
export const SurplusFoodView = () => {
  const { surplusFood, addSurplusFood, currentUser } = useApp();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("60");
  const [unit, setUnit] = useState("boxes");
  const [preparedTime, setPreparedTime] = useState("2026-10-07 05:30");
  const [expiryTime, setExpiryTime] = useState("2026-10-07 09:00");
  const [pickupLocation, setPickupLocation] = useState("Rear Kitchen Dock 2, 88 Grand Ave");
  const [zone, setZone] = useState(currentUser?.zone || "Zone A");
  const filtered = surplusFood.filter((f) => {
    const matchesSearch = f.foodName.toLowerCase().includes(searchTerm.toLowerCase()) || f.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || f.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!foodName) return;
    addSurplusFood({
      restaurantId: currentUser?.id || "R101",
      restaurantName: currentUser?.orgName || "Metro Central Kitchen",
      foodName,
      quantity: parseInt(quantity, 10) || 10,
      unit,
      preparedTime,
      expiryTime,
      pickupLocation,
      zone
    });
    setIsAddOpen(false);
    setFoodName("");
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Surplus Food Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register surplus prepared meals. Proximity to expiry automatically fires database triggers for urgent pickup escalation.
          </p>
        </div>
        <button
    onClick={() => setIsAddOpen(true)}
    className="flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
  >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add Surplus Food</span>
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
    placeholder="Search food name or batch ID..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none"
  />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 uppercase">Status:</span>
          <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="rounded border border-slate-300 py-1 px-2.5 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Batches</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Picked Up">Picked Up</option>
            <option value="Delivered">Delivered</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {
    /* Food Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Food Batch</th>
                <th className="py-2.5 px-3 font-mono">Quantity</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Expiry Time & Trigger</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Pickup Status</th>
                <th className="py-2.5 px-3.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-900">{item.foodName}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      ID: {item.id} • Prep: {item.preparedTime}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{item.zone}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-mono text-slate-800 text-[11px]">{item.expiryTime}</div>
                    {item.expiryAlertTriggered && item.status !== "Delivered" && <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        Expiry Alert — Priority increased for pickup
                      </span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[11px] font-semibold text-indigo-700">
                      {item.pickupStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-500 text-[11px] truncate max-w-[180px]">
                    {item.pickupLocation}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Add Surplus Food Modal */
  }
      {isAddOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded shadow-lg max-h-[90vh] overflow-y-auto p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Register Surplus Food Donation</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Publishes meal quantity to city pool and registers database trigger on expiry timestamp
                </p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Food Item Name *</label>
                <input
    type="text"
    required
    placeholder="e.g. 80 Boxes of Fresh Lentil Curry & Rice"
    value={foodName}
    onChange={(e) => setFoodName(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
  />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
    type="number"
    min="1"
    value={quantity}
    onChange={(e) => setQuantity(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
    required
  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
    type="text"
    value={unit}
    onChange={(e) => setUnit(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
    placeholder="boxes, packs, portions"
    required
  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prepared Time</label>
                  <input
    type="text"
    value={preparedTime}
    onChange={(e) => setPreparedTime(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 font-mono"
    placeholder="2026-10-07 05:30"
    required
  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Time (Cut-off)</label>
                  <input
    type="text"
    value={expiryTime}
    onChange={(e) => setExpiryTime(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900 font-mono"
    placeholder="2026-10-07 09:00"
    required
  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pickup Location</label>
                  <input
    type="text"
    value={pickupLocation}
    onChange={(e) => setPickupLocation(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs text-slate-900"
    placeholder="Rear Kitchen Loading Dock"
    required
  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone</label>
                  <select
    value={zone}
    onChange={(e) => setZone(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs bg-white text-slate-900"
  >
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                    <option value="Zone D">Zone D</option>
                  </select>
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
    className="rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  Commit Donation Batch
                </button>
              </div>
            </form>
          </div>
        </div>}
    </div>;
};
