import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { Search, X } from "lucide-react";
export const OrganisationsView = () => {
  const { organisations, verifyOrganisation } = useApp();
  const [activeTab, setActiveTab] = useState("Restaurant");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState(null);
  const filteredOrgs = organisations.filter(
    (o) => o.type === activeTab && (o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Registered Organisations & Shelters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Civic partners vetted by City Administration. Manages restaurant food donors, NGO partners, and shelter bed capacities.
          </p>
        </div>
      </div>

      {
    /* Tabs & Search */
  }
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-3 shadow-2xs">
        <div className="flex items-center gap-1.5">
          {["Restaurant", "NGO", "Shelter"].map((tab) => {
    const count = organisations.filter((o) => o.type === tab).length;
    const isSelected = activeTab === tab;
    return <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${isSelected ? "bg-slate-900 text-white font-semibold shadow-xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
                {tab}s ({count})
              </button>;
  })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
    type="text"
    placeholder={`Search ${activeTab.toLowerCase()}s...`}
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none"
  />
        </div>
      </div>

      {
    /* Table depending on activeTab */
  }
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "Restaurant" && <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">Restaurant Name</th>
                  <th className="py-2.5 px-3">Zone</th>
                  <th className="py-2.5 px-3 font-mono">Available Food</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((org) => <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{org.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{org.id} • {org.contactPerson}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{org.zone}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                      {org.availableFood || 0} portions
                    </td>
                    <td className="py-2.5 px-3"><StatusBadge status={org.status} /></td>
                    <td className="py-2.5 px-3"><StatusBadge status={org.verification} /></td>
                    <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
    onClick={() => setSelectedOrg(org)}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                        View
                      </button>
                      {org.verification !== "Verified" && <button
    onClick={() => verifyOrganisation(org.id, "Verified")}
    className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
  >
                          Verify
                        </button>}
                      {org.verification !== "Rejected" && <button
    onClick={() => verifyOrganisation(org.id, "Rejected")}
    className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800 hover:bg-rose-100"
  >
                          Reject
                        </button>}
                    </td>
                  </tr>)}
              </tbody>
            </table>}

          {activeTab === "NGO" && <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">NGO Name</th>
                  <th className="py-2.5 px-3">Zone</th>
                  <th className="py-2.5 px-3 font-mono">Pending Requests</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((org) => <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{org.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{org.id} • {org.contactPerson}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{org.zone}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-800">
                      {org.pendingRequests ?? 1} requests
                    </td>
                    <td className="py-2.5 px-3"><StatusBadge status={org.status} /></td>
                    <td className="py-2.5 px-3"><StatusBadge status={org.verification} /></td>
                    <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
    onClick={() => setSelectedOrg(org)}
    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                        View
                      </button>
                      {org.verification !== "Verified" && <button
    onClick={() => verifyOrganisation(org.id, "Verified")}
    className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
  >
                          Verify
                        </button>}
                      {org.verification !== "Rejected" && <button
    onClick={() => verifyOrganisation(org.id, "Rejected")}
    className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800 hover:bg-rose-100"
  >
                          Reject
                        </button>}
                    </td>
                  </tr>)}
              </tbody>
            </table>}

          {activeTab === "Shelter" && <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">Shelter Name</th>
                  <th className="py-2.5 px-3">Zone</th>
                  <th className="py-2.5 px-3 font-mono">Total Capacity</th>
                  <th className="py-2.5 px-3 font-mono">Occupied Beds</th>
                  <th className="py-2.5 px-3 font-mono">Available Beds</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((org) => {
    const cap = org.shelterCapacity || 100;
    const occ = org.occupiedBeds || 0;
    const avail = Math.max(0, cap - occ);
    return <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">{org.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{org.id} • {org.contactPerson}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{org.zone}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">{cap}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">{occ}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">{avail}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={org.status} /></td>
                      <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
      onClick={() => setSelectedOrg(org)}
      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
    >
                          View
                        </button>
                        {org.verification !== "Verified" && <button
      onClick={() => verifyOrganisation(org.id, "Verified")}
      className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
    >
                            Verify
                          </button>}
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>}
        </div>
      </div>

      {
    /* Details Modal */
  }
      {selectedOrg && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedOrg.name}</h3>
                <span className="font-mono text-[10px] text-slate-400">{selectedOrg.id} • {selectedOrg.type}</span>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Operational Zone:</span>
                <span className="font-semibold text-slate-900 font-mono">{selectedOrg.zone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Contact Person:</span>
                <span className="font-semibold text-slate-900">{selectedOrg.contactPerson}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Official Phone:</span>
                <span className="font-mono text-slate-900">{selectedOrg.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Registered Address:</span>
                <span className="text-slate-800 text-right max-w-[200px]">{selectedOrg.address}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Verification State:</span>
                <StatusBadge status={selectedOrg.verification} />
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Operation Status:</span>
                <StatusBadge status={selectedOrg.status} />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
    onClick={() => setSelectedOrg(null)}
    className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
  >
                Close
              </button>
            </div>
          </div>
        </div>}
    </div>;
};
