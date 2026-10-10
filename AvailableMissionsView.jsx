import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Search, X } from "lucide-react";
export const AvailableMissionsView = () => {
  const { missions, acceptMissionAsVolunteer, setActiveView } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterZone, setFilterZone] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [selectedMission, setSelectedMission] = useState(null);
  const [acceptAlert, setAcceptAlert] = useState(null);
  const availableMissions = missions.filter((m) => m.status === "AVAILABLE");
  const filtered = availableMissions.filter((m) => {
    const matchesSearch = m.id.toLowerCase().includes(searchTerm.toLowerCase()) || m.caseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "ALL" || m.priority === filterPriority;
    const matchesZone = filterZone === "ALL" || m.zone === filterZone;
    const matchesType = filterType === "ALL" || m.emergencyType === filterType;
    return matchesSearch && matchesPriority && matchesZone && matchesType;
  });
  const handleAccept = (mId) => {
    const res = acceptMissionAsVolunteer(mId);
    if (res.success) {
      setAcceptAlert({ msg: res.message, isError: false });
      setTimeout(() => {
        setActiveView("my-mission");
      }, 700);
    } else {
      setAcceptAlert({ msg: res.message, isError: true });
    }
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Available Rescue Missions</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Accept unassigned field deployments. Protected by Concurrency Mutex locks to prevent conflicting double-assignments.
        </p>
      </div>

      {acceptAlert && <div
    className={`p-3 rounded border text-xs flex items-center justify-between ${acceptAlert.isError ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
  >
          <span>{acceptAlert.msg}</span>
          <button onClick={() => setAcceptAlert(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>}

      {
    /* Filter Bar */
  }
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 bg-white border border-slate-200 rounded p-3 shadow-2xs text-xs">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
    type="text"
    placeholder="Search mission title or ID..."
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
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Hazards</option>
            <option value="Flood">Flood</option>
            <option value="Fire">Fire</option>
            <option value="Medical">Medical</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {
    /* Missions Grid / List */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.length === 0 ? <div className="col-span-2 bg-white border border-slate-200 rounded p-8 text-center text-xs text-slate-400">
            No unassigned missions match the filter criteria.
          </div> : filtered.map((m) => {
    const isCritical = m.priority === "Critical";
    return <div
      key={m.id}
      className={`bg-white border rounded p-4 shadow-2xs space-y-3 transition-colors ${isCritical ? "border-rose-300 bg-rose-50/15" : "border-slate-200 hover:border-slate-300"}`}
    >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">
                        {m.id}
                      </span>
                      <StatusBadge status={m.priority} />
                      <span className="font-mono text-[10px] text-slate-500">{m.zone}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-xs mt-1.5 line-clamp-1">
                      {m.caseTitle}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs text-indigo-700 block">
                      +{m.xpReward} XP
                    </span>
                    <span className="font-mono text-[10px] text-amber-700 block">
                      +{m.coinReward} Coins
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                  <div className="text-slate-700">
                    Cargo: <strong>{m.resourcesSummary}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    People in Sector: {m.peopleAffected} • Ref: {m.caseId}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    Pickup: {m.pickupPoint}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-[10px] text-slate-400">
                    Mutex Lock: UNLOCKED (Ready)
                  </span>
                  <div className="flex gap-2">
                    <button
      onClick={() => setSelectedMission(m)}
      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
                      View
                    </button>
                    <button
      onClick={() => handleAccept(m.id)}
      className="rounded bg-slate-900 px-3.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
    >
                      Accept Mission
                    </button>
                  </div>
                </div>
              </div>;
  })}
      </div>

      {
    /* View Detail Modal */
  }
      {selectedMission && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900">{selectedMission.caseTitle}</h3>
                <span className="font-mono text-[10px] text-slate-400">{selectedMission.id} ({selectedMission.zone})</span>
              </div>
              <button onClick={() => setSelectedMission(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Priority:</span>
                <StatusBadge status={selectedMission.priority} />
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>People in Sector:</span>
                <span className="font-mono font-semibold">{selectedMission.peopleAffected}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Pickup Point:</span>
                <span className="text-right text-slate-900">{selectedMission.pickupPoint}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Destination:</span>
                <span className="text-right text-slate-900">{selectedMission.destination}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Rewards:</span>
                <span className="font-mono text-indigo-700 font-bold">
                  +{selectedMission.xpReward} XP / +{selectedMission.coinReward} Coins
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
    onClick={() => setSelectedMission(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                Close
              </button>
              <button
    onClick={() => {
      handleAccept(selectedMission.id);
      setSelectedMission(null);
    }}
    className="rounded bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                Accept Mission
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
