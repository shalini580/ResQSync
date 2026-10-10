import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import {
  Building,
  Home,
  Utensils,
  Truck,
  Users,
  Filter,
  Activity
} from "lucide-react";
export const CitySimulation = () => {
  const {
    emergencyCases,
    resources,
    missions,
    surplusFood,
    volunteers,
    organisations,
    setActiveView
  } = useApp();
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const zones = ["Zone A", "Zone B", "Zone C", "Zone D"];
  const zoneInfo = {
    "Zone A": { name: "Central District & Riverfront", desc: "Commercial core, river basin sector with flood breach point", risk: "Critical" },
    "Zone B": { name: "Northern Industrial Belt", desc: "Manufacturing plants, warehouse clusters, chemical facility", risk: "Very Unstable" },
    "Zone C": { name: "Eastern Port & Flyover Corridor", desc: "Harbor logistics, elevated highway, transport junctions", risk: "Unstable" },
    "Zone D": { name: "Southern Residential & Camps", desc: "Low-density municipal transitional shelters, relief depot", risk: "Stable" }
  };
  const criticalCasesCount = emergencyCases.filter((c) => c.priority === "Critical").length;
  const activeMissionsCount = missions.filter((m) => m.status !== "COMPLETED").length;
  const totalFood = resources.filter((r) => r.type === "Food").reduce((s, r) => s + r.available, 0);
  const totalWater = resources.filter((r) => r.type === "Water").reduce((s, r) => s + r.available, 0);
  const totalMed = resources.filter((r) => r.type === "Medicine").reduce((s, r) => s + r.available, 0);
  const totalVeh = resources.filter((r) => r.type === "Vehicles").reduce((s, r) => s + r.available, 0);
  const totalVols = volunteers.filter((v) => v.availability === "Available").length;
  const cityHealth = Math.max(45, Math.min(95, 92 - criticalCasesCount * 8));
  return <div className="p-5 space-y-4">
      {
    /* Top Filter Bar */
  }
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700 font-mono uppercase">Entity Filter:</span>
          <div className="flex gap-1.5">
            {["All", "Critical", "Emergencies", "Resources", "Missions"].map((f) => <button
    key={f}
    onClick={() => setActiveFilter(f)}
    className={`px-2.5 py-1 text-xs rounded border transition-colors ${activeFilter === f ? "bg-slate-900 border-slate-900 text-white font-medium" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
  >
                {f}
              </button>)}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span>COORDINATE MATRIX: 4 DISCRETE SECTORS</span>
        </div>
      </div>

      {
    /* Main Grid: 4-Zone Matrix (Left) + City Status Panel (Right) */
  }
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {
    /* Simulated City Grid (4 Zones) */
  }
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zid) => {
    const zCases = emergencyCases.filter((c) => c.zone === zid);
    const zCritical = zCases.filter((c) => c.priority === "Critical" || c.priority === "Very Unstable");
    const zOrgs = organisations.filter((o) => o.zone === zid);
    const zRestaurants = zOrgs.filter((o) => o.type === "Restaurant");
    const zShelters = zOrgs.filter((o) => o.type === "Shelter");
    const zNgos = zOrgs.filter((o) => o.type === "NGO");
    const zVols = volunteers.filter((v) => v.zone === zid);
    const zMissions = missions.filter((m) => m.zone === zid && m.status !== "COMPLETED");
    const zRes = resources.filter((r) => r.zone === zid);
    const isHighlighted = activeFilter === "All" || activeFilter === "Critical" && zCritical.length > 0 || activeFilter === "Emergencies" && zCases.length > 0 || activeFilter === "Missions" && zMissions.length > 0 || activeFilter === "Resources";
    return <div
      key={zid}
      className={`bg-white border rounded p-4 shadow-2xs flex flex-col justify-between transition-all ${!isHighlighted ? "opacity-40 border-slate-200" : "border-slate-300 ring-1 ring-slate-200"}`}
    >
                {
      /* Zone Header */
    }
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-white font-mono text-xs font-bold">
                        {zid.split(" ")[1]}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">{zid}</h3>
                        <p className="text-[10px] text-slate-500">{zoneInfo[zid].name}</p>
                      </div>
                    </div>
                    <StatusBadge status={zoneInfo[zid].risk} />
                  </div>

                  {
      /* Summary counts */
    }
                  <div className="grid grid-cols-3 gap-1.5 py-1 text-center font-mono text-[11px] bg-slate-50 rounded border border-slate-200 mb-3">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Incidents</span>
                      <span className="font-bold text-slate-800">{zCases.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Missions</span>
                      <span className="font-bold text-slate-800">{zMissions.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Volunteers</span>
                      <span className="font-bold text-slate-800">{zVols.length}</span>
                    </div>
                  </div>

                  {
      /* Discrete Entity Cards */
    }
                  <div className="space-y-2 text-xs">
                    {
      /* Emergencies in this zone */
    }
                    {(activeFilter === "All" || activeFilter === "Critical" || activeFilter === "Emergencies") && zCases.map((c) => <div
      key={c.id}
      className={`p-2 rounded border flex items-center justify-between ${c.priority === "Critical" ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-800"}`}
    >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-white/80 border border-slate-200">
                              {c.id}
                            </span>
                            <span className="truncate text-xs font-medium">{c.title}</span>
                          </div>
                          <StatusBadge status={c.priority} />
                        </div>)}

                    {
      /* Active Missions */
    }
                    {(activeFilter === "All" || activeFilter === "Missions") && zMissions.map((m) => <div
      key={m.id}
      className="p-2 rounded border border-purple-200 bg-purple-50/50 flex items-center justify-between text-purple-900"
    >
                          <div className="flex items-center gap-2 min-w-0">
                            <Truck className="h-3.5 w-3.5 shrink-0 text-purple-700" />
                            <span className="font-mono text-[10px] font-semibold">{m.id}</span>
                            <span className="truncate text-[11px] text-purple-800">{m.resourcesSummary}</span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            {m.status}
                          </span>
                        </div>)}

                    {
      /* Organisations */
    }
                    {(activeFilter === "All" || activeFilter === "Resources") && <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200">
                          <Utensils className="h-3 w-3 text-slate-500" />
                          <span>{zRestaurants.length} Restaurants</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200">
                          <Home className="h-3 w-3 text-slate-500" />
                          <span>{zShelters.length} Shelters</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200">
                          <Building className="h-3 w-3 text-slate-500" />
                          <span>{zNgos.length} NGOs</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span>{zVols.length} Volunteers</span>
                        </div>
                      </div>}
                  </div>
                </div>

                {
      /* Zone Footer */
    }
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono text-[10px]">
                    Depot Stock: {zRes.reduce((s, r) => s + r.available, 0)} units
                  </span>
                  <button
      onClick={() => setActiveView("resource-allocation")}
      className="font-medium text-slate-800 hover:underline text-[11px]"
    >
                    Allocate to {zid} →
                  </button>
                </div>
              </div>;
  })}
        </div>

        {
    /* Right-Side City Status Panel */
  }
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                City Status Panel
              </h2>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Real-time state vector aggregating all municipal sectors
            </p>
          </div>

          {
    /* Metric list */
  }
          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Critical Cases:</span>
              <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {criticalCasesCount}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Active Missions:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {activeMissionsCount}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Food Available:</span>
              <span className="font-mono font-bold text-slate-800">{totalFood} packets</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Water Available:</span>
              <span className="font-mono font-bold text-slate-800">{totalWater} litres</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Medicine Available:</span>
              <span className="font-mono font-bold text-slate-800">{totalMed} kits</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Vehicles Available:</span>
              <span className="font-mono font-bold text-slate-800">{totalVeh} 4x4 / vans</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Volunteers Available:</span>
              <span className="font-mono font-bold text-slate-800">{totalVols} responders</span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-800 font-semibold">City Health Score:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-emerald-700">
                <Activity className="h-4 w-4" />
                <span>{cityHealth}%</span>
              </div>
            </div>
          </div>

          {
    /* Quick Actions */
  }
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <button
    onClick={() => setActiveView("emergency-cases")}
    className="w-full flex items-center justify-center gap-1.5 rounded bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
  >
              <span>+ Register Incident Case</span>
            </button>
            <button
    onClick={() => setActiveView("os-simulation")}
    className="w-full flex items-center justify-center gap-1.5 rounded border border-slate-300 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
  >
              <span>Inspect OS Process Queue →</span>
            </button>
          </div>
        </div>
      </div>
    </div>;
};
