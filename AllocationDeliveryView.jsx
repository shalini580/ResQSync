import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { PackageCheck, Truck, Home, History } from "lucide-react";
export const AllocationDeliveryView = () => {
  const {
    resourceRequests,
    missions,
    organisations,
    updateShelterOccupancy,
    advanceMissionStatus
  } = useApp();
  const [activeTab, setActiveTab] = useState("deliveries");
  const shelter = organisations.find((o) => o.type === "Shelter") || organisations[0];
  const [bedInput, setBedInput] = useState(shelter?.occupiedBeds || 85);
  const capacity = shelter?.shelterCapacity || 120;
  const occupied = shelter?.occupiedBeds || 85;
  const availBeds = Math.max(0, capacity - occupied);
  const occupancyPct = Math.round(occupied / (capacity || 1) * 100);
  const handleUpdateBeds = (e) => {
    e.preventDefault();
    if (shelter) {
      updateShelterOccupancy(shelter.id, bedInput);
    }
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Allocation Verification & Delivery Intake</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify allocated inventory, confirm inbound delivery handoffs and update municipal shelter cot occupancy
        </p>
      </div>

      {
    /* Tabs */
  }
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded p-2 shadow-2xs overflow-x-auto">
        {[
    { id: "deliveries", label: "1. Inbound Deliveries", icon: Truck },
    { id: "allocated", label: "2. Allocated Resources", icon: PackageCheck },
    { id: "occupancy", label: "3. Shelter Occupancy", icon: Home },
    { id: "history", label: "4. Request History", icon: History }
  ].map((tab) => {
    const isSelected = activeTab === tab.id;
    const Icon = tab.icon;
    return <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${isSelected ? "bg-slate-900 text-white font-semibold shadow-xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>;
  })}
      </div>

      {
    /* TAB 1: Deliveries */
  }
      {activeTab === "deliveries" && <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Inbound Transport Deliveries
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Live Mission Manifests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">Mission</th>
                  <th className="py-2.5 px-3">Courier Volunteer</th>
                  <th className="py-2.5 px-3">Cargo Resources</th>
                  <th className="py-2.5 px-3 font-mono">Simulated ETA</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missions.map((m) => <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3.5">
                      <div className="font-mono font-bold text-slate-900">{m.id}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{m.caseTitle}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {m.assignedVolunteerName || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{m.resourcesSummary}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {m.status === "COMPLETED" ? "Delivered" : "15 min (In transit)"}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      {m.status !== "COMPLETED" ? <button
    onClick={() => advanceMissionStatus(m.id, "COMPLETED")}
    className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
  >
                          Confirm Delivery
                        </button> : <span className="text-[11px] font-mono text-slate-400">Intake Verified</span>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>}

      {
    /* TAB 2: Allocated Resources */
  }
      {activeTab === "allocated" && <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Committed Resource Allocations
            </h3>
            <span className="text-[10px] font-mono text-slate-500">ACID Ledger Entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">Request Reference</th>
                  <th className="py-2.5 px-3">Resource Type</th>
                  <th className="py-2.5 px-3 font-mono">Quantity Requested</th>
                  <th className="py-2.5 px-3 font-mono">Quantity Allocated</th>
                  <th className="py-2.5 px-3">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resourceRequests.flatMap(
    (req) => req.items.map((it, idx) => <tr key={`${req.id}-${idx}`} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900">
                        {req.id} ({req.ngoName})
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">{it.resourceType}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{it.quantity} {it.unit}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{it.allocated} {it.unit}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
      status={it.allocated >= it.quantity ? "Allocated" : it.allocated > 0 ? "Partially Allocated" : "Pending"}
    />
                      </td>
                    </tr>)
  )}
              </tbody>
            </table>
          </div>
        </div>}

      {
    /* TAB 3: Shelter Occupancy */
  }
      {activeTab === "occupancy" && <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Municipal Shelter Bed Management
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Facility: {shelter.name} ({shelter.zone})
              </p>
            </div>
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              Occupancy: {occupancyPct}%
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded p-3 bg-slate-50 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Capacity</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{capacity}</span>
              <span className="text-[10px] text-slate-400">cots / beds</span>
            </div>

            <div className="border border-slate-200 rounded p-3 bg-slate-50 text-center">
              <span className="text-[10px] font-mono uppercase text-indigo-700 block font-semibold">Occupied Beds</span>
              <span className="text-xl font-bold font-mono text-indigo-700 mt-0.5 block">{occupied}</span>
              <span className="text-[10px] text-indigo-600">sheltered residents</span>
            </div>

            <div className="border border-slate-200 rounded p-3 bg-slate-50 text-center">
              <span className="text-[10px] font-mono uppercase text-emerald-700 block font-semibold">Available Beds</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">{availBeds}</span>
              <span className="text-[10px] text-emerald-600">open cots</span>
            </div>

            <div className="border border-slate-200 rounded p-3 bg-slate-50 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-500 block font-semibold">Capacity Stress</span>
              <span className={`text-xl font-bold font-mono mt-0.5 block ${occupancyPct > 80 ? "text-amber-700" : "text-slate-900"}`}>
                {occupancyPct}%
              </span>
              <span className="text-[10px] text-slate-400">{occupancyPct > 80 ? "Near Capacity" : "Normal"}</span>
            </div>
          </div>

          {
    /* Occupancy visual bar */
  }
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Bed Utilization Bar:</span>
              <span className="font-mono">{occupied} / {capacity} beds</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
    className={`h-full ${occupancyPct > 85 ? "bg-rose-500" : occupancyPct > 60 ? "bg-indigo-600" : "bg-emerald-600"}`}
    style={{ width: `${occupancyPct}%` }}
  />
            </div>
          </div>

          {
    /* Form to update occupancy */
  }
          <form onSubmit={handleUpdateBeds} className="pt-3 border-t border-slate-200 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Update Occupied Beds Count:</label>
              <input
    type="number"
    min="0"
    max={capacity}
    value={bedInput}
    onChange={(e) => setBedInput(parseInt(e.target.value, 10) || 0)}
    className="w-24 rounded border border-slate-300 p-1.5 text-xs font-mono text-slate-900 bg-white"
  />
            </div>
            <button
    type="submit"
    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
              Commit Bed Update
            </button>
          </form>
        </div>}

      {
    /* TAB 4: Request History */
  }
      {activeTab === "history" && <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Shelter Request Ledger History
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Historical Dispatches</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {resourceRequests.map((req) => <div key={req.id} className="p-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-900">{req.id} — {req.description}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Created: {req.createdAt} • Needed By: {req.neededBy}
                  </div>
                </div>
                <StatusBadge status={req.status} />
              </div>)}
          </div>
        </div>}
    </div>;
};
