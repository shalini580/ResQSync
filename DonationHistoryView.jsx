import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Award } from "lucide-react";
export const DonationHistoryView = () => {
  const { surplusFood } = useApp();
  const totalDonationsCount = surplusFood.length + 8;
  const foodRescuedTotal = surplusFood.reduce((s, f) => s + f.quantity, 0) + 340;
  const contributionPoints = Math.round(foodRescuedTotal * 1.5);
  const historyList = [
    ...surplusFood.map((f) => ({
      date: f.createdAt,
      food: f.foodName,
      quantity: `${f.quantity} ${f.unit}`,
      destination: f.destination || "Hope Shelter & Relief",
      volunteer: f.assignedVolunteerName || "Alex Rivera (V12)",
      status: f.status
    })),
    {
      date: "2026-10-06 18:30",
      food: "Wholewheat Bread & Vegetable Stew Cans",
      quantity: "90 packs",
      destination: "Zone C Shelter Federation",
      volunteer: "Rahul Sharma (V24)",
      status: "Delivered"
    },
    {
      date: "2026-10-06 12:15",
      food: "Boiled Egg & High-Protein Lentil Kits",
      quantity: "120 boxes",
      destination: "City Central Community Hall",
      volunteer: "Maya Chen (V18)",
      status: "Delivered"
    },
    {
      date: "2026-10-05 20:00",
      food: "Prepared Vegetable Rice Portions",
      quantity: "130 boxes",
      destination: "North Star Relief Centre",
      volunteer: "Sarah Jenkins (V31)",
      status: "Delivered"
    }
  ];
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Civic Food Donation Ledger</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited record of all commercial kitchen contributions registered with City Food Recovery Network
        </p>
      </div>

      {
    /* Summary Cards */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Total Donations Registered</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{totalDonationsCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">batches provided</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-800 font-semibold block">Food Rescued</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">{foodRescuedTotal}</span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">portions safely delivered</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-amber-800 font-semibold block flex items-center justify-between">
            <span>Contribution Points</span>
            <Award className="h-3.5 w-3.5 text-amber-600" />
          </span>
          <span className="text-xl font-bold font-mono text-amber-800 mt-1 block">{contributionPoints}</span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Municipal ESG certification</span>
        </div>
      </div>

      {
    /* History Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Date & Time</th>
                <th className="py-2.5 px-3">Food Description</th>
                <th className="py-2.5 px-3 font-mono">Quantity</th>
                <th className="py-2.5 px-3">Destination Shelter</th>
                <th className="py-2.5 px-3">Courier Volunteer</th>
                <th className="py-2.5 px-3.5">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyList.map((item, idx) => <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">{item.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{item.food}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-slate-700">{item.destination}</td>
                  <td className="py-2.5 px-3 text-slate-600">{item.volunteer}</td>
                  <td className="py-2.5 px-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
