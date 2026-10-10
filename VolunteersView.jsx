import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Search, X } from "lucide-react";
export const VolunteersView = () => {
  const { volunteers, missions, assignVolunteerToMission, setActiveView } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAvail, setFilterAvail] = useState("ALL");
  const [filterZone, setFilterZone] = useState("ALL");
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [assigningVol, setAssigningVol] = useState(null);
  const [chosenMissionId, setChosenMissionId] = useState("");
  const totalVolunteers = volunteers.length;
  const availCount = volunteers.filter((v) => v.availability === "Available").length;
  const busyCount = volunteers.filter((v) => v.availability === "Busy").length;
  const offlineCount = volunteers.filter((v) => v.availability === "Offline").length;
  const filtered = volunteers.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.id.toLowerCase().includes(searchTerm.toLowerCase()) || v.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAvail = filterAvail === "ALL" || v.availability === filterAvail;
    const matchesZone = filterZone === "ALL" || v.zone === filterZone;
    return matchesSearch && matchesAvail && matchesZone;
  });
  const availableMissionsList = missions.filter((m) => m.status === "AVAILABLE");
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (assigningVol && chosenMissionId) {
      assignVolunteerToMission(chosenMissionId, assigningVol.id);
      setAssigningVol(null);
      setChosenMissionId("");
    }
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Volunteer Responders Roster</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active field personnel with skill badges, civic XP levels and live mission dispatch records
          </p>
        </div>
      </div>

      {
    /* Top Summary Cards */
  }
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Total Volunteers</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{totalVolunteers}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Registered field responders</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-emerald-800 font-semibold block">Available</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block">{availCount}</span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Ready for immediate callout</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-amber-800 font-semibold block">Busy on Mission</span>
          <span className="text-xl font-bold font-mono text-amber-800 mt-1 block">{busyCount}</span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">En route or active on ground</span>
        </div>

        <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">Offline</span>
          <span className="text-xl font-bold font-mono text-slate-500 mt-1 block">{offlineCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Rest cycle / standby</span>
        </div>
      </div>

      {
    /* Filter Bar */
  }
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-white border border-slate-200 rounded p-3 shadow-2xs text-xs">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
    type="text"
    placeholder="Search volunteer name, ID, or skill..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none"
  />
        </div>

        <div>
          <select
    value={filterAvail}
    onChange={(e) => setFilterAvail(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs bg-white text-slate-900 focus:outline-none"
  >
            <option value="ALL">All Availability</option>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
            <option value="Offline">Offline</option>
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
      </div>

      {
    /* Volunteers Table */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3.5">Volunteer</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Availability</th>
                <th className="py-2.5 px-3">Skills</th>
                <th className="py-2.5 px-3">Current Mission</th>
                <th className="py-2.5 px-3 font-mono">Completed</th>
                <th className="py-2.5 px-3 font-mono">XP</th>
                <th className="py-2.5 px-3 font-mono">Level</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-900">{v.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{v.id} • {v.phone}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{v.zone}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={v.availability} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 truncate max-w-[180px]">
                    {v.skills.join(", ")}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">
                    {v.currentMissionId || <span className="text-slate-400 italic">None</span>}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{v.completedMissions}</td>
                  <td className="py-2.5 px-3 font-mono text-indigo-700 font-semibold">{v.xp}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Lvl {v.level}</td>
                  <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
    onClick={() => setSelectedVolunteer(v)}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                      Profile
                    </button>
                    {v.availability === "Available" && <button
    onClick={() => {
      setAssigningVol(v);
      setChosenMissionId(availableMissionsList[0]?.id || "");
    }}
    className="rounded border border-slate-900 bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
  >
                        Assign
                      </button>}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Volunteer Profile Modal */
  }
      {selectedVolunteer && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedVolunteer.name}</h3>
                <span className="font-mono text-[10px] text-slate-400">Responder ID: {selectedVolunteer.id}</span>
              </div>
              <button onClick={() => setSelectedVolunteer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-200 text-center">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Civic Level</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">Level {selectedVolunteer.level}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">XP Earned</span>
                <span className="text-base font-bold font-mono text-indigo-700 mt-0.5 block">{selectedVolunteer.xp} XP</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Completed</span>
                <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">{selectedVolunteer.completedMissions}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Operational Zone:</span>
                <span className="font-semibold text-slate-900 font-mono">{selectedVolunteer.zone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Availability:</span>
                <StatusBadge status={selectedVolunteer.availability} />
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Emergency Contact:</span>
                <span className="font-mono text-slate-800">{selectedVolunteer.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Current Mission:</span>
                <span className="font-mono text-slate-800">{selectedVolunteer.currentMissionId || "None"}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Certified Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedVolunteer.skills.map((s, idx) => <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                    {s}
                  </span>)}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
    onClick={() => setSelectedVolunteer(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                Close
              </button>
            </div>
          </div>
        </div>}

      {
    /* Assign Mission Modal */
  }
      {assigningVol && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-900">
                Assign Mission to {assigningVol.name} ({assigningVol.id})
              </h3>
              <button onClick={() => setAssigningVol(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {availableMissionsList.length === 0 ? <p className="text-slate-500 py-3 text-center">
                No missions currently in AVAILABLE status. Allocate resources to generate missions.
              </p> : <form onSubmit={handleAssignSubmit} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Available Mission
                  </label>
                  <select
    value={chosenMissionId}
    onChange={(e) => setChosenMissionId(e.target.value)}
    className="w-full rounded border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none"
    required
  >
                    {availableMissionsList.map((m) => <option key={m.id} value={m.id}>
                        {m.id}: {m.caseTitle} ({m.zone}) — {m.priority}
                      </option>)}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
    type="button"
    onClick={() => setAssigningVol(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                    Cancel
                  </button>
                  <button
    type="submit"
    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                    Confirm Assign
                  </button>
                </div>
              </form>}
          </div>
        </div>}
    </div>;
};
