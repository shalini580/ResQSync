import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Database,
  Cpu
} from "lucide-react";
export const ResourceAllocation = () => {
  const {
    emergencyCases,
    resources,
    runBankerSafetyCheck,
    allocateResourcesWithTransaction
  } = useApp();
  const activeCases = emergencyCases.filter((c) => c.status !== "Resolved");
  const [selectedCaseId, setSelectedCaseId] = useState(activeCases[0]?.id || "E101");
  const selectedCase = emergencyCases.find((c) => c.id === selectedCaseId) || emergencyCases[0];
  const [reqFood, setReqFood] = useState(selectedCase?.requiredResources.food || 100);
  const [reqWater, setReqWater] = useState(selectedCase?.requiredResources.water || 200);
  const [reqMed, setReqMed] = useState(selectedCase?.requiredResources.medicine || 30);
  const [reqVeh, setReqVeh] = useState(selectedCase?.requiredResources.vehicles || 4);
  const [reqVol, setReqVol] = useState(selectedCase?.requiredResources.volunteers || 8);
  const handleSelectCase = (id) => {
    setSelectedCaseId(id);
    const target = emergencyCases.find((c) => c.id === id);
    if (target) {
      setReqFood(target.requiredResources.food);
      setReqWater(target.requiredResources.water);
      setReqMed(target.requiredResources.medicine);
      setReqVeh(target.requiredResources.vehicles);
      setReqVol(target.requiredResources.volunteers);
      setSafetyResult(null);
      setTxState(null);
    }
  };
  const [safetyResult, setSafetyResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txLogs, setTxLogs] = useState([]);
  const [txState, setTxState] = useState(null);
  const [txMessage, setTxMessage] = useState(null);
  const availFood = resources.filter((r) => r.type === "Food").reduce((s, r) => s + r.available, 0);
  const availWater = resources.filter((r) => r.type === "Water").reduce((s, r) => s + r.available, 0);
  const availMed = resources.filter((r) => r.type === "Medicine").reduce((s, r) => s + r.available, 0);
  const availVeh = resources.filter((r) => r.type === "Vehicles").reduce((s, r) => s + r.available, 0);
  const handleRunSafetyCheck = () => {
    const res = runBankerSafetyCheck({
      food: reqFood,
      water: reqWater,
      medicine: reqMed,
      vehicles: reqVeh
    });
    setSafetyResult(res);
  };
  const handleCommitAllocation = async () => {
    setIsProcessing(true);
    setTxLogs([]);
    setTxState("CHECKING");
    const logs = [];
    const stepLogger = (step) => {
      logs.push(step);
      setTxLogs([...logs]);
      if (step.includes("LOCK")) setTxState("LOCKING");
      if (step.includes("COMMIT")) setTxState("COMMITTED");
      if (step.includes("ROLLBACK") || step.includes("FAILED")) setTxState("ROLLED_BACK");
    };
    const outcome = await allocateResourcesWithTransaction(
      selectedCase.id,
      {
        food: reqFood,
        water: reqWater,
        medicine: reqMed,
        vehicles: reqVeh,
        volunteers: reqVol
      },
      stepLogger
    );
    setIsProcessing(false);
    setTxMessage(outcome.message);
  };
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Resource Allocation & Deadlock Avoidance Subsystem
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive demonstration of Banker’s Algorithm Safety State verification paired with ACID DB Transactions & Exclusive Locks
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
            <Cpu className="h-3.5 w-3.5 text-slate-700" />
            <span>ALGORITHM: BANKER (Edsger Dijkstra)</span>
          </div>
        </div>

        {
    /* Case selector tabs */
  }
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold mr-1">
            Active Cases:
          </span>
          {activeCases.map((c) => <button
    key={c.id}
    onClick={() => handleSelectCase(c.id)}
    className={`px-2.5 py-1 rounded border text-xs font-mono transition-colors ${selectedCase?.id === c.id ? "bg-slate-900 border-slate-900 text-white font-semibold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
  >
              {c.id} ({c.type})
            </button>)}
        </div>
      </div>

      {
    /* Main 3-Column Layout: Left (Case & Request) | Middle (Available vs Requested) | Right (Safety & Transaction) */
  }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {
    /* Left Column: Selected Case Details & Request */
  }
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
          <div className="border-b border-slate-200 pb-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {selectedCase.id}
              </span>
              <StatusBadge status={selectedCase.priority} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1.5">{selectedCase.title}</h3>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Zone: {selectedCase.zone} • People Affected: {selectedCase.peopleAffected}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Emergency Type:</span>
              <span className="font-semibold text-slate-900">{selectedCase.type}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Current Status:</span>
              <span className="font-mono text-slate-900">{selectedCase.status}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>OS Process ID:</span>
              <span className="font-mono font-bold text-slate-900">PID {selectedCase.processId}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Process State:</span>
              <span className="font-mono text-emerald-700">{selectedCase.processState}</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase font-semibold text-slate-700 block mb-1.5">
              Requested Resource Vector (Claim)
            </label>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Food (packets):</span>
                <input
    type="number"
    min="0"
    value={reqFood}
    onChange={(e) => setReqFood(parseInt(e.target.value, 10) || 0)}
    className="w-24 rounded border border-slate-300 py-1 px-2 font-mono text-right text-xs bg-white text-slate-900"
  />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Water (litres):</span>
                <input
    type="number"
    min="0"
    value={reqWater}
    onChange={(e) => setReqWater(parseInt(e.target.value, 10) || 0)}
    className="w-24 rounded border border-slate-300 py-1 px-2 font-mono text-right text-xs bg-white text-slate-900"
  />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Medicine (kits):</span>
                <input
    type="number"
    min="0"
    value={reqMed}
    onChange={(e) => setReqMed(parseInt(e.target.value, 10) || 0)}
    className="w-24 rounded border border-slate-300 py-1 px-2 font-mono text-right text-xs bg-white text-slate-900"
  />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Vehicles (units):</span>
                <input
    type="number"
    min="0"
    value={reqVeh}
    onChange={(e) => setReqVeh(parseInt(e.target.value, 10) || 0)}
    className="w-24 rounded border border-slate-300 py-1 px-2 font-mono text-right text-xs bg-white text-slate-900"
  />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Volunteers:</span>
                <input
    type="number"
    min="0"
    value={reqVol}
    onChange={(e) => setReqVol(parseInt(e.target.value, 10) || 0)}
    className="w-24 rounded border border-slate-300 py-1 px-2 font-mono text-right text-xs bg-white text-slate-900"
  />
              </div>
            </div>
          </div>
        </div>

        {
    /* Middle Column: Available Resources & Comparison */
  }
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
          <div className="border-b border-slate-200 pb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Available Resources vs. Request
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Available instance vector [A] in Banker's State matrix
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            {
    /* Food comparison */
  }
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-slate-800">Food Packs</span>
                <span className="font-mono text-[11px]">
                  Req: <span className="font-bold text-slate-900">{reqFood}</span> / Avail:{" "}
                  <span className="font-bold text-emerald-700">{availFood}</span>
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
    className={`h-full ${reqFood > availFood ? "bg-rose-500" : "bg-emerald-600"}`}
    style={{ width: `${Math.min(100, reqFood / (availFood || 1) * 100)}%` }}
  />
              </div>
              {reqFood > availFood && <div className="text-[10px] text-rose-600 mt-1 font-mono">
                  ⚠ Insufficient stock: Exceeds available capacity
                </div>}
            </div>

            {
    /* Water comparison */
  }
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-slate-800">Clean Water (L)</span>
                <span className="font-mono text-[11px]">
                  Req: <span className="font-bold text-slate-900">{reqWater}</span> / Avail:{" "}
                  <span className="font-bold text-emerald-700">{availWater}</span>
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
    className={`h-full ${reqWater > availWater ? "bg-rose-500" : "bg-emerald-600"}`}
    style={{ width: `${Math.min(100, reqWater / (availWater || 1) * 100)}%` }}
  />
              </div>
              {reqWater > availWater && <div className="text-[10px] text-rose-600 mt-1 font-mono">
                  ⚠ Insufficient stock: Exceeds available capacity
                </div>}
            </div>

            {
    /* Medicine comparison */
  }
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-slate-800">Medicine Trauma Kits</span>
                <span className="font-mono text-[11px]">
                  Req: <span className="font-bold text-slate-900">{reqMed}</span> / Avail:{" "}
                  <span className="font-bold text-emerald-700">{availMed}</span>
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
    className={`h-full ${reqMed > availMed ? "bg-rose-500" : "bg-emerald-600"}`}
    style={{ width: `${Math.min(100, reqMed / (availMed || 1) * 100)}%` }}
  />
              </div>
              {reqMed > availMed && <div className="text-[10px] text-rose-600 mt-1 font-mono">
                  ⚠ Insufficient stock: Exceeds available capacity
                </div>}
            </div>

            {
    /* Vehicles comparison */
  }
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-slate-800">Vehicles (4x4 & Vans)</span>
                <span className="font-mono text-[11px]">
                  Req: <span className="font-bold text-slate-900">{reqVeh}</span> / Avail:{" "}
                  <span className="font-bold text-emerald-700">{availVeh}</span>
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
    className={`h-full ${reqVeh > availVeh ? "bg-rose-500" : "bg-emerald-600"}`}
    style={{ width: `${Math.min(100, reqVeh / (availVeh || 1) * 100)}%` }}
  />
              </div>
              {reqVeh > availVeh && <div className="text-[10px] text-rose-600 mt-1 font-mono">
                  ⚠ Insufficient stock: Exceeds available capacity
                </div>}
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Safety Condition: Request ≤ Available AND Request ≤ Need
          </div>
        </div>

        {
    /* Right Column: Allocation Safety & Transaction Execution */
  }
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Allocation Safety & Lock Panel
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Banker’s safety sequence check + ACID Two-Phase commit
              </p>
            </div>

            {
    /* Banker's Safety result box */
  }
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-700 font-mono">
                  BANKER’S SAFETY CHECK
                </span>
                <button
    type="button"
    onClick={handleRunSafetyCheck}
    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
  >
                  Verify Safe State
                </button>
              </div>

              {safetyResult ? safetyResult.isSafe ? <div className="border border-emerald-300 bg-emerald-50 rounded p-3 text-xs space-y-1.5 text-emerald-900">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>SAFE STATE CONFIRMED</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-tight">
                      Allocating these resources leaves the system in a deadlock-free state.
                    </p>
                    <div className="bg-white/80 rounded border border-emerald-200 p-2 font-mono text-[11px] text-emerald-950 font-semibold">
                      Safe Sequence: {safetyResult.safeSequence.join(" \u2192 ")}
                    </div>
                  </div> : <div className="border border-rose-300 bg-rose-50 rounded p-3 text-xs space-y-1.5 text-rose-900">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-rose-800">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      <span>UNSAFE STATE DETECTED</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-tight">
                      {safetyResult.reason}
                    </p>
                  </div> : <div className="border border-slate-200 bg-slate-50 rounded p-3 text-center text-xs text-slate-500">
                  Click "Verify Safe State" to compute Work and Finish vectors.
                </div>}
            </div>

            {
    /* Transaction Pipeline Visualization */
  }
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-700 font-semibold">
                <span className="flex items-center gap-1">
                  <Database className="h-3.5 w-3.5 text-slate-600" />
                  ACID TRANSACTION STATUS
                </span>
                <span className="text-[10px] text-slate-500">TX-7741</span>
              </div>

              {
    /* Step pipeline indicator */
  }
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                <div
    className={`p-1 rounded border ${txState === "CHECKING" || txState === "LOCKING" || txState === "COMMITTED" ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold" : "bg-slate-50 border-slate-200 text-slate-400"}`}
  >
                  1. Check
                </div>
                <div
    className={`p-1 rounded border ${txState === "LOCKING" || txState === "COMMITTED" ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold" : "bg-slate-50 border-slate-200 text-slate-400"}`}
  >
                  2. Lock
                </div>
                <div
    className={`p-1 rounded border ${txState === "COMMITTED" ? "bg-purple-50 border-purple-300 text-purple-800 font-semibold" : "bg-slate-50 border-slate-200 text-slate-400"}`}
  >
                  3. Allocate
                </div>
                <div
    className={`p-1 rounded border ${txState === "COMMITTED" ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold" : txState === "ROLLED_BACK" ? "bg-rose-50 border-rose-300 text-rose-800 font-semibold" : "bg-slate-50 border-slate-200 text-slate-400"}`}
  >
                  {txState === "ROLLED_BACK" ? "Rollback" : "4. Commit"}
                </div>
              </div>

              {
    /* Execution log terminal */
  }
              {txLogs.length > 0 && <div className="bg-slate-900 text-slate-100 rounded p-2.5 font-mono text-[10px] space-y-1 max-h-24 overflow-y-auto">
                  {txLogs.map((log, i) => <div key={i} className="flex items-center gap-1.5">
                      <span className="text-emerald-400">›</span>
                      <span>{log}</span>
                    </div>)}
                </div>}

              {txMessage && <div
    className={`p-2 rounded border text-xs font-mono ${txState === "COMMITTED" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}
  >
                  {txMessage}
                </div>}
            </div>
          </div>

          {
    /* Allocation Actions */
  }
          <div className="pt-3 border-t border-slate-200 flex gap-2">
            <button
    onClick={handleCommitAllocation}
    disabled={isProcessing}
    className="flex-1 flex items-center justify-center gap-1.5 rounded bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
  >
              <Lock className="h-3.5 w-3.5" />
              <span>{isProcessing ? "Executing Transaction..." : "Allocate Resources"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>;
};
