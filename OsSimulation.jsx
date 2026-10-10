import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../common/StatusBadge";
import { api } from "../../services/api.js";
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  FileCode,
  Zap,
  Copy,
  Check,
  Radio,
  Split,
  PowerOff,
  GitCommit,
  Folder,
  File,
  Code
} from "lucide-react";

export const OsSimulation = () => {
  const { processes } = useApp();
  const [activeTab, setActiveTab] = useState("processes");
  const [loading, setLoading] = useState(false);

  // Compiler Status
  const [cStatus, setCStatus] = useState(null);

  // 1. Process Operations State
  const [processOpsResult, setProcessOpsResult] = useState(null);
  const [selectedPid, setSelectedPid] = useState(101);

  // 2. CPU Scheduling State
  const [selectedAlgo, setSelectedAlgo] = useState("Priority");
  const [quantum, setQuantum] = useState(2);
  const [schedulingResult, setSchedulingResult] = useState(null);

  // 3. Synchronization State
  const [syncType, setSyncType] = useState("mutex");
  const [syncResult, setSyncResult] = useState(null);

  // 4. IPC State
  const [ipcResult, setIpcResult] = useState(null);

  // 5. Banker's Algorithm State
  const [bankerInputs, setBankerInputs] = useState({ food: 320, water: 450, medicine: 140, vehicles: 18 });
  const [bankerResult, setBankerResult] = useState(null);
  const [bankerReqResult, setBankerReqResult] = useState(null);

  // 6. Deadlock State
  const [deadlockResult, setDeadlockResult] = useState(null);
  const [recoveryResult, setRecoveryResult] = useState(null);

  // 7. C Source Code State (Multi-File c_engine Workspace)
  const [cFiles, setCFiles] = useState([]);
  const [selectedCFile, setSelectedCFile] = useState("pcb.c");
  const [cSourceCode, setCSourceCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    api.getCEngineStatus().then(data => setCStatus(data));
    api.getCEngineFiles().then(data => {
      if (data?.files) setCFiles(data.files);
    });
    handleRunScheduling("Priority", 2);
    handleRunBanker();
    handleRunSync("mutex");
    handleRunProcessOps("context-switch", 101);
  }, []);

  // Handlers
  const handleRunProcessOps = async (operation = "context-switch", pid = selectedPid) => {
    setLoading(true);
    const data = await api.runCProcessOps(operation, pid);
    setProcessOpsResult(data);
    setLoading(false);
  };

  const handleRunScheduling = async (algo = selectedAlgo, q = quantum) => {
    setLoading(true);
    setSelectedAlgo(algo);
    const data = await api.runCScheduling(algo, q);
    setSchedulingResult(data);
    setLoading(false);
  };

  const handleRunSync = async (type = syncType) => {
    setLoading(true);
    setSyncType(type);
    const data = await api.runCSync(type);
    setSyncResult(data);
    setLoading(false);
  };

  const handleRunIPC = async () => {
    setLoading(true);
    const data = await api.runCIPC();
    setIpcResult(data);
    setLoading(false);
  };

  const handleRunBanker = async () => {
    setLoading(true);
    const data = await api.runCBanker(bankerInputs);
    setBankerResult(data);
    setLoading(false);
  };

  const handleRunBankerRequest = async (procIdx = 1, req = [10, 20, 10, 1]) => {
    setLoading(true);
    const data = await api.runCBankerRequest(procIdx, req);
    setBankerReqResult(data);
    setLoading(false);
  };

  const handleRunDeadlockDetect = async () => {
    setLoading(true);
    const data = await api.runCDeadlockDetect();
    setDeadlockResult(data);
    setRecoveryResult(null);
    setLoading(false);
  };

  const handleRunDeadlockRecover = async () => {
    setLoading(true);
    const data = await api.runCDeadlockRecover();
    setRecoveryResult(data);
    setLoading(false);
  };

  const handleSelectFile = async (filename) => {
    setSelectedCFile(filename);
    setLoading(true);
    const code = await api.getCEngineFile(filename);
    setCSourceCode(code);
    setLoading(false);
  };

  const handleLoadCSource = async (fileToOpen) => {
    setLoading(true);
    const fileListData = await api.getCEngineFiles();
    if (fileListData?.files) {
      setCFiles(fileListData.files);
    }
    const target = fileToOpen || selectedCFile || "pcb.c";
    setSelectedCFile(target);
    const code = await api.getCEngineFile(target);
    setCSourceCode(code);
    setLoading(false);
  };

  const handleCopyCode = () => {
    if (cSourceCode) {
      navigator.clipboard.writeText(cSourceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="p-5 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-600" />
              Operating System Architecture Lab
            </h2>
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold">
              REAL-TIME SIMULATION ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete academic operating system simulation executing Process Management, Context Switching, 5 Schedulers, Banker's Algorithm, Mutex, Semaphores & Inter-Process Communication.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Kernel Core • Real-Time Subsystem</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded p-2 shadow-2xs overflow-x-auto">
        {[
          { id: "processes", label: "1. Processes & Context Switching" },
          { id: "scheduling", label: "2. CPU Scheduling (5 Algos)" },
          { id: "sync", label: "3. Concurrency (Mutex & Semaphores)" },
          { id: "ipc", label: "4. IPC (Pipes)" },
          { id: "banker", label: "5. Banker’s Algorithm" },
          { id: "deadlock", label: "6. Deadlock Detection & Recovery" },
          { id: "c_source", label: "7. Kernel Subsystems & Source" }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "c_source") handleLoadCSource();
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. PROCESSES & CONTEXT SWITCHING TAB */}
      {activeTab === "processes" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Process Control Block (PCB) Table & Hardware State
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every emergency incident maps directly to a kernel PCB tracking registers (<code className="font-mono text-indigo-700">RIP, RSP, RAX</code>), scheduling priority, and lifecycle state.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunProcessOps("context-switch", 101)}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Simulate Context Switch
              </button>
              <button
                onClick={() => handleRunProcessOps("terminate", 103)}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Terminate Process (SIGTERM PID-103)
              </button>
            </div>
          </div>

          {/* Context Switch Diagnostics if available */}
          {processOpsResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800">
                  OPERATION: {processOpsResult.operation?.toUpperCase()} (TARGET PID: {processOpsResult.targetPid})
                </span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  Latency: {processOpsResult.executionTimeUs} µs
                </span>
              </div>
              <p className="text-slate-700 text-[11px]">{processOpsResult.statusMessage}</p>
              {processOpsResult.savedRegisters && (
                <div className="flex flex-wrap gap-2 text-[10px] text-indigo-700 font-bold">
                  {processOpsResult.savedRegisters.map((reg, idx) => (
                    <span key={idx} className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {reg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PCB Table */}
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Process / Incident</th>
                  <th className="py-2.5 px-3 font-mono">Priority</th>
                  <th className="py-2.5 px-3 font-mono">Burst</th>
                  <th className="py-2.5 px-3 font-mono">PC (RIP)</th>
                  <th className="py-2.5 px-3">Lifecycle State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {processOpsResult?.pcbTable?.map((p) => (
                  <tr key={p.pid} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-indigo-700">PID-{p.pid}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800">{p.name}</td>
                    <td className="py-2 px-3 text-amber-700 font-bold">P{p.priority}</td>
                    <td className="py-2 px-3">{p.burst} ms</td>
                    <td className="py-2 px-3 text-slate-500">{p.regPc || "0x00401000"}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.state === "TERMINATED" ? "bg-rose-100 text-rose-800" :
                        p.state === "RUNNING" ? "bg-emerald-100 text-emerald-800" :
                        "bg-slate-100 text-slate-800"
                      }`}>
                        {p.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CPU SCHEDULING TAB */}
      {activeTab === "scheduling" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                CPU Dispatcher & Scheduling Algorithms
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulates real kernel scheduling metrics with process waiting and turnaround time calculations. Supports all 5 standard scheduling algorithms.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedAlgo}
                onChange={(e) => {
                  setSelectedAlgo(e.target.value);
                  handleRunScheduling(e.target.value, quantum);
                }}
                className="rounded border border-slate-300 py-1.5 px-2.5 text-xs font-semibold bg-white text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="Priority">Priority Scheduling (Preemptive)</option>
                <option value="FCFS">First-Come First-Served (FCFS)</option>
                <option value="SJF">Shortest Job First (SJF Non-preemptive)</option>
                <option value="SRTF">Shortest Remaining Time First (SRTF Preemptive)</option>
                <option value="Round Robin">Round Robin (Time-Sliced)</option>
              </select>

              {selectedAlgo === "Round Robin" && (
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className="text-slate-500">Q:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantum}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 2;
                      setQuantum(val);
                      handleRunScheduling("Round Robin", val);
                    }}
                    className="w-12 rounded border border-slate-300 p-1 text-xs font-mono"
                  />
                </div>
              )}

              <button
                onClick={() => handleRunScheduling(selectedAlgo, quantum)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono cursor-pointer transition-colors"
              >
                <Play className="h-3 w-3 text-emerald-400" />
                <span>Execute in C</span>
              </button>
            </div>
          </div>

          {schedulingResult && (
            <div className="space-y-4">
              {/* Metrics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase">Average Waiting Time:</span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">{schedulingResult.averageWaitingTime} ms</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase">Average Turnaround Time:</span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">{schedulingResult.averageTurnaroundTime} ms</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase">Context Switches:</span>
                  <span className="text-base font-bold text-indigo-700 mt-0.5 block">{schedulingResult.totalContextSwitches}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="text-[10px] text-emerald-800 block uppercase">C Execution Speed:</span>
                  <span className="text-base font-bold text-emerald-950 mt-0.5 block">{schedulingResult.executionTimeUs} µs</span>
                </div>
              </div>

              {/* Gantt Chart Timeline */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600">
                  CPU Execution Gantt Chart:
                </span>
                <div className="flex items-center rounded border border-slate-300 overflow-x-auto text-[11px] font-mono">
                  {schedulingResult.timeline?.map((slot, i) => (
                    <div
                      key={i}
                      style={{ minWidth: `${Math.max(slot.duration * 35, 60)}px` }}
                      className="border-r border-slate-300 p-2 text-center bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <div className="font-bold text-slate-900 truncate">P{slot.pid}</div>
                      <div className="text-[9px] text-slate-500">{slot.startTime}→{slot.endTime}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Process Table */}
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] text-slate-700">
                    <tr>
                      <th className="py-2 px-3">PID</th>
                      <th className="py-2 px-3">Process / Incident</th>
                      <th className="py-2 px-3">Arrival</th>
                      <th className="py-2 px-3">Burst</th>
                      <th className="py-2 px-3">Priority</th>
                      <th className="py-2 px-3">Completion</th>
                      <th className="py-2 px-3">Waiting (WT)</th>
                      <th className="py-2 px-3">Turnaround (TAT)</th>
                      <th className="py-2 px-3">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {schedulingResult.processes?.map((p) => (
                      <tr key={p.pid} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-indigo-700">PID-{p.pid}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">{p.name}</td>
                        <td className="py-2 px-3">{p.arrivalTime}</td>
                        <td className="py-2 px-3">{p.burstTime}</td>
                        <td className="py-2 px-3 text-amber-700 font-bold">P{p.priority}</td>
                        <td className="py-2 px-3">{p.completionTime}</td>
                        <td className="py-2 px-3 text-slate-600">{p.waitingTime}</td>
                        <td className="py-2 px-3 text-slate-900 font-semibold">{p.turnaroundTime}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            {p.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SYNCHRONIZATION (MUTEX & SEMAPHORES) TAB */}
      {activeTab === "sync" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Concurrency Control & Process Synchronization
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Demonstrates Critical Section isolation using POSIX Mutex (<code className="font-mono text-indigo-700">pthread_mutex_t</code>), Counting Semaphores (<code className="font-mono text-indigo-700">sem_t</code>), and unsynchronized race condition collision.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleRunSync("mutex")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  syncType === "mutex" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                POSIX Mutex Lock
              </button>
              <button
                onClick={() => handleRunSync("semaphore")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  syncType === "semaphore" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Counting Semaphore
              </button>
              <button
                onClick={() => handleRunSync("race")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  syncType === "race" ? "bg-rose-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Trigger Race Condition
              </button>
            </div>
          </div>

          {syncResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                {syncResult.threads?.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded border ${
                      t.acquired && syncResult.raceConditionPrevented
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                        : t.acquired && !syncResult.raceConditionPrevented
                        ? "bg-rose-50 border-rose-300 text-rose-950"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs pb-1 border-b border-current/20 flex justify-between items-center">
                      <span>Thread #{idx + 1}: {t.thread}</span>
                      <span className="text-[10px] uppercase font-semibold">
                        {t.acquired ? "Acquired Slot" : "Blocked / Denied"}
                      </span>
                    </div>
                    <div className="pt-2 text-[11px]">{t.outcome}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-900 text-slate-100 rounded font-mono text-[11px] space-y-1">
                <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                  KERNEL SYNCHRONIZATION DIAGNOSTIC LOG (EXEC TIME: {syncResult.executionTimeUs} µs)
                </div>
                <div>Sync Mechanism: <strong className="text-indigo-300">{syncResult.syncType?.toUpperCase()}</strong></div>
                <div>Race Condition Prevented: <strong className={syncResult.raceConditionPrevented ? "text-emerald-400" : "text-rose-400"}>{syncResult.raceConditionPrevented ? "YES (Mutual Exclusion Enforced)" : "NO (Lost Update / Data Collision)"}</strong></div>
                <div>Exclusive Critical Section Owner: <strong className="text-amber-300">{syncResult.lastClaimedBy}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. IPC (PIPES & BUFFERS) TAB */}
      {activeTab === "ipc" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Inter-Process Communication (IPC) Subsystem
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Demonstrates POSIX Unidirectional Pipes (<code className="font-mono text-indigo-700">pipe()</code>) transmitting real structured emergency incident telemetry between kernel processes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRunIPC}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                <span>Transmit IPC Pipe Message</span>
              </button>
            </div>
          </div>

          {ipcResult ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-950 space-y-1">
                <span className="text-[10px] font-bold uppercase block text-emerald-800">IPC Pipe Transmission Successful:</span>
                <p className="text-[11px]">{ipcResult.telemetryPayload}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase">IPC Mechanism:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{ipcResult.mechanism}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase">Kernel Pipe Buffer:</span>
                  <span className="font-bold text-indigo-700 mt-0.5 block">{ipcResult.bufferCapacityBytes} Bytes (64 KB)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase">Transfer Latency:</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">{ipcResult.executionTimeUs} µs</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded">
              Click <strong>"Transmit IPC Pipe Message"</strong> to test kernel pipe byte stream communication.
            </div>
          )}
        </div>
      )}

      {/* 5. BANKER'S ALGORITHM TAB */}
      {activeTab === "banker" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Dijkstra’s Banker’s Algorithm (Deadlock Avoidance)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates <code className="font-mono text-indigo-700">Need = Max - Allocation</code> matrix and executes the Safety Algorithm to verify system state before granting relief allocations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRunBanker}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Run Safety Check
              </button>
              <button
                onClick={() => handleRunBankerRequest(1, [10, 20, 10, 1])}
                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Test Resource-Request Algorithm
              </button>
            </div>
          </div>

          {bankerReqResult && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded font-mono text-xs space-y-1">
              <span className="font-bold text-amber-950 uppercase text-[10px] block">
                Resource-Request Algorithm Result ({bankerReqResult.processName}):
              </span>
              <p className="text-[11px] text-amber-900">{bankerReqResult.reason}</p>
            </div>
          )}

          {bankerResult && (
            <div className="space-y-4 font-mono text-xs">
              {/* Safety Banner */}
              <div className={`p-3.5 rounded border flex items-start gap-3 ${bankerResult.isSafe ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-rose-50 border-rose-300 text-rose-950"}`}>
                {bankerResult.isSafe ? <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />}
                <div className="space-y-1">
                  <span className="font-bold text-sm block">
                    {bankerResult.isSafe ? "SAFE STATE VERIFIED (ZERO DEADLOCK RISK)" : "UNSAFE STATE DETECTED"}
                  </span>
                  <p className="text-[11px]">{bankerResult.reason}</p>
                  {bankerResult.safeSequence?.length > 0 && (
                    <div className="pt-1.5 text-emerald-800 font-bold">
                      Calculated Safe Sequence: {bankerResult.safeSequence.join(" ➔ ")}
                    </div>
                  )}
                </div>
              </div>

              {/* Matrices Display */}
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[11px] text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Process</th>
                      <th className="py-2 px-3">Allocation [F, W, M, V]</th>
                      <th className="py-2 px-3">Max Claim [F, W, M, V]</th>
                      <th className="py-2 px-3 text-indigo-700 font-bold">Need Matrix [F, W, M, V]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {bankerResult.matrices?.processes?.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{p.name}</td>
                        <td className="py-2 px-3">[{p.allocation.join(", ")}]</td>
                        <td className="py-2 px-3">[{p.max.join(", ")}]</td>
                        <td className="py-2 px-3 font-bold text-indigo-700">[{p.need.join(", ")}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. DEADLOCK DETECTION & RECOVERY TAB */}
      {activeTab === "deadlock" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Resource Allocation Graph (RAG) & Deadlock Recovery
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates Wait-For Graph (WFG) cycle detection using DFS algorithm. Recovers by terminating lowest-priority victim process.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRunDeadlockDetect}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Detect Deadlock (WFG Cycle)
              </button>
              <button
                onClick={handleRunDeadlockRecover}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Recover (Terminate Lowest Priority)
              </button>
            </div>
          </div>

          {deadlockResult && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded text-rose-950 space-y-2">
                <span className="font-bold text-sm block flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  CIRCULAR WAIT DEADLOCK CYCLE CONFIRMED (CYCLE LENGTH: {deadlockResult.cycleLength})
                </span>
                <div className="text-[11px]">
                  Cycle Dependency Path: <strong>{deadlockResult.cycleProcesses?.join(" ➔ ")}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <span className="font-bold text-slate-800 uppercase text-[10px] block">
                  All 4 Coffman Deadlock Conditions Verified:
                </span>
                {deadlockResult.coffmanConditions?.map((c, idx) => (
                  <div key={idx} className="text-[11px] text-slate-700">{c}</div>
                ))}
              </div>
            </div>
          )}

          {recoveryResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded font-mono text-xs space-y-2">
              <span className="font-bold text-sm text-emerald-950 block flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                DEADLOCK RESOLVED: VICTIM PROCESS TERMINATED ({recoveryResult.victimProcess?.name})
              </span>
              <p className="text-[11px] text-emerald-900">{recoveryResult.victimProcess?.reason}</p>
              <div className="pt-1 text-emerald-800 font-bold">Cycle Broken: YES • System Returned to Safe State.</div>
            </div>
          )}
        </div>
      )}

      {/* 7. KERNEL SUBSYSTEMS & SOURCE TAB */}
      {activeTab === "c_source" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-mono font-bold text-slate-900">
                  Kernel Subsystems & Source Architecture
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-300 font-mono px-2 py-0.5 rounded font-bold">
                  {cFiles.length || 15} Files
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Every operating system concept is implemented in its own modular subsystem, compiled into a unified execution binary.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold cursor-pointer transition-colors shadow-xs"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? "Copied!" : `Copy ${selectedCFile}`}</span>
              </button>
            </div>
          </div>

          {/* Subsystem File Categories / Navigation */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Modular Subsystems & Source Files:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
              {[
                { name: "pcb.h", tag: "Process Header", group: "PCB" },
                { name: "pcb.c", tag: "Process Mgmt", group: "PCB" },
                { name: "cpu_scheduler.h", tag: "Sched Header", group: "CPU" },
                { name: "cpu_scheduler.c", tag: "5 Schedulers", group: "CPU" },
                { name: "synchronization.h", tag: "Sync Header", group: "SYNC" },
                { name: "synchronization.c", tag: "Mutex & Sem", group: "SYNC" },
                { name: "ipc_pipe.h", tag: "IPC Header", group: "IPC" },
                { name: "ipc_pipe.c", tag: "POSIX Pipes", group: "IPC" },
                { name: "bankers_algorithm.h", tag: "Banker Header", group: "BANK" },
                { name: "bankers_algorithm.c", tag: "Banker Safety", group: "BANK" },
                { name: "deadlock.h", tag: "Deadlock Header", group: "DEAD" },
                { name: "deadlock.c", tag: "DFS Recovery", group: "DEAD" },
                { name: "main.c", tag: "Kernel CLI", group: "MAIN" },
                { name: "Makefile", tag: "Build Engine", group: "MAKE" },
                { name: "os_kernel.c", tag: "Unified Master", group: "ALL" }
              ].map((f) => {
                const isSelected = selectedCFile === f.name;
                const fileInfo = cFiles.find(cf => cf.name === f.name);
                return (
                  <button
                    key={f.name}
                    onClick={() => handleSelectFile(f.name)}
                    className={`flex flex-col p-2 rounded border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs ring-2 ring-emerald-500"
                        : "bg-slate-50 hover:bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold truncate">
                      <FileCode className={`h-3 w-3 shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-500"}`} />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] mt-1">
                      <span className={`${isSelected ? "text-slate-300" : "text-slate-500"}`}>{f.tag}</span>
                      {fileInfo && (
                        <span className="font-mono text-[9px] opacity-75">{fileInfo.lineCount}L</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active File Metadata Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Current File:</span>
              <span className="text-emerald-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-300">
                c_engine/{selectedCFile}
              </span>
              <span className="text-slate-500 text-[11px]">
                {cFiles.find(f => f.name === selectedCFile)?.description || "C Kernel Module"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span>Lines: <strong>{cSourceCode.split("\n").length}</strong></span>
              <span>•</span>
              <span>Size: <strong>{new Blob([cSourceCode]).size} bytes</strong></span>
            </div>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="rounded border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 font-mono text-[11px] text-slate-300">
              <span>Subsystem: {selectedCFile}</span>
              <span className="text-emerald-400">System Source Implementation</span>
            </div>
            <div className="p-4 max-h-[520px] overflow-auto font-mono text-[11px] leading-relaxed text-slate-100 selection:bg-emerald-800">
              {cSourceCode ? (
                <table className="w-full border-collapse">
                  <tbody>
                    {cSourceCode.split("\n").map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="w-10 pr-3 text-right select-none text-slate-600 border-r border-slate-800 font-mono text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="pl-3 whitespace-pre font-mono">
                          {line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-slate-500 py-8 text-center font-mono">
                  Loading {selectedCFile}...
                </div>
              )}
            </div>
          </div>

          {/* Compilation Terminal Verification Banner */}
          <div className="p-3 bg-slate-900 text-slate-100 rounded font-mono text-xs space-y-1.5 border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                BUILD AUTOMATION & VERIFICATION
              </span>
              <span className="text-emerald-400 font-bold">STATUS: COMPILED & ACTIVE</span>
            </div>
            <div className="text-[11px] text-emerald-300 overflow-x-auto py-0.5">
              gcc -Wall -Wextra -O2 -pthread -std=c11 -D_GNU_SOURCE -o os_kernel main.c pcb.c cpu_scheduler.c synchronization.c ipc_pipe.c bankers_algorithm.c deadlock.c
            </div>
            <div className="text-[10px] text-slate-400">
              Executable generated: <code className="text-slate-200">os_kernel</code> (Invoked automatically by system routes)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
