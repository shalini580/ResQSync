import React from "react";
import { useApp } from "../../context/AppContext";
export const PickupTrackingView = () => {
  const { surplusFood } = useApp();
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Food Pickup Transit Tracking</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time delivery progress monitoring donated food from restaurant pickup docks to community shelters
        </p>
      </div>

      {
    /* Table with progress indicator */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Donation ID</th>
                <th className="py-2.5 px-3">Food Item</th>
                <th className="py-2.5 px-3 font-mono">Quantity</th>
                <th className="py-2.5 px-3">Assigned Volunteer</th>
                <th className="py-2.5 px-3 font-mono">Pickup Window</th>
                <th className="py-2.5 px-3">Destination Shelter</th>
                <th className="py-2.5 px-3.5">Transit Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {surplusFood.map((item) => {
    const stages = ["Waiting", "Assigned", "Picked Up", "Delivered"];
    const currentIdx = stages.indexOf(item.pickupStatus);
    return <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{item.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.foodName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Zone: {item.zone}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {item.assignedVolunteerName || <span className="text-slate-400 italic">Awaiting driver</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {item.preparedTime.split(" ")[1] || "06:00"} – {item.expiryTime.split(" ")[1] || "12:00"}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {item.destination || "Hope Shelter / City Depot"}
                    </td>
                    <td className="py-3 px-3.5">
                      {
      /* 4-step progress indicator */
    }
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        {stages.map((stage, sIdx) => {
      const isDone = sIdx <= currentIdx;
      const isCurrent = sIdx === currentIdx;
      return <React.Fragment key={stage}>
                              <span
        className={`px-1.5 py-0.5 rounded border text-[9px] ${isCurrent ? "bg-slate-900 border-slate-900 text-white font-bold" : isDone ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium" : "bg-slate-100 border-slate-200 text-slate-400"}`}
      >
                                {stage}
                              </span>
                              {sIdx < stages.length - 1 && <span className={`text-[9px] ${isDone ? "text-emerald-600" : "text-slate-300"}`}>
                                  →
                                </span>}
                            </React.Fragment>;
    })}
                      </div>
                    </td>
                  </tr>;
  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
