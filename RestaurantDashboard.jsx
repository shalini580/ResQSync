import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { AlertTriangle, ArrowRight, Award } from "lucide-react";
export const RestaurantDashboard = () => {
  const { surplusFood, setActiveView, currentUser } = useApp();
  const myFood = surplusFood;
  const activeDonations = myFood.filter((f) => f.status === "Available" || f.status === "Reserved").length;
  const availableFoodQty = myFood.filter((f) => f.status === "Available").reduce((s, f) => s + f.quantity, 0);
  const pendingPickups = myFood.filter((f) => f.pickupStatus === "Assigned" || f.pickupStatus === "Waiting").length;
  const foodRescuedTotal = myFood.filter((f) => f.status === "Delivered").reduce((s, f) => s + f.quantity, 0) + 180;
  const contributionPoints = Math.round(foodRescuedTotal * 1.5);
  const expiryAlertItems = myFood.filter((f) => f.expiryAlertTriggered && f.status !== "Delivered");
  return <div className="p-5 space-y-5">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Restaurant Food Recovery Command
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Donor: {currentUser?.orgName || "Metro Central Kitchen"} ({currentUser?.zone})
            </p>
          </div>
          <button
    onClick={() => setActiveView("surplus-food")}
    className="rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
  >
            + Register Surplus Food
          </button>
        </div>
      </div>

      {
    /* Top Summary Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Active Batches</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{activeDonations}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">ready / reserved</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-700 font-semibold block">Available Food</span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">{availableFoodQty}</span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">portions available</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-indigo-700 font-semibold block">Pending Pickups</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">{pendingPickups}</span>
          <span className="text-[10px] text-indigo-600 mt-0.5 block">driver assigned</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Food Rescued</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{foodRescuedTotal}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">delivered to shelters</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-amber-800 font-semibold block flex items-center justify-between">
            <span>Civic Points</span>
            <Award className="h-3.5 w-3.5 text-amber-600" />
          </span>
          <span className="text-xl font-bold font-mono text-amber-800 mt-1 block">{contributionPoints}</span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">CSR recognition tier</span>
        </div>
      </div>

      {
    /* Expiry Alerts Section (Database Trigger Demonstration) */
  }
      {expiryAlertItems.length > 0 && <div className="border border-amber-300 bg-amber-50 rounded p-3.5 text-xs text-amber-900 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold font-mono text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>DBMS TRIGGER EXECUTED: UPCOMING EXPIRY ALERT</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-bold">
              URGENT PICKUP
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            The database trigger <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">trg_food_expiry_escalate</code> automatically identified batches expiring within 3 hours and escalated mission priority for rapid driver dispatch.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {expiryAlertItems.map((item) => <div key={item.id} className="bg-white p-2.5 rounded border border-amber-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-900 block">{item.foodName}</span>
                  <span className="font-mono text-[10px] text-amber-800">
                    ID: {item.id} • Expiry: {item.expiryTime} • Qty: {item.quantity} {item.unit}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-1 rounded">
                  Priority Increased
                </span>
              </div>)}
          </div>
        </div>}

      {
    /* Grid: Current Food Donations & Recent Pickups */
  }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {
    /* Current Food Donations */
  }
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Current Food Donations
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Active food batches registered for community distribution
              </p>
            </div>
            <button
    onClick={() => setActiveView("surplus-food")}
    className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900"
  >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
                <tr>
                  <th className="py-2 px-3">Batch ID</th>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3 font-mono">Quantity</th>
                  <th className="py-2 px-3">Expiry</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myFood.slice(0, 4).map((f) => <tr key={f.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{f.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[180px] truncate">{f.foodName}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{f.quantity} {f.unit}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{f.expiryTime}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={f.status} /></td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {
    /* Recent Pickups */
  }
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Recent Pickups & In Transit
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Volunteers en route from commercial kitchen to shelters
              </p>
            </div>
            <button
    onClick={() => setActiveView("pickup-tracking")}
    className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900"
  >
              <span>Track</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="p-3 divide-y divide-slate-100 text-xs">
            {myFood.filter((f) => f.pickupStatus !== "Waiting").map((item) => <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-slate-900">{item.foodName}</span>
                    <span className="font-mono text-[10px] text-indigo-700 font-bold">{item.pickupStatus}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Courier: {item.assignedVolunteerName || "Assigned Driver"}</span>
                    <span className="font-mono text-slate-400">{item.destination || "Shelter"}</span>
                  </div>
                </div>)}
          </div>
        </div>
      </div>
    </div>;
};
