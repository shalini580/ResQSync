import { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import {
  Database,
  Layers,
  Lock,
  Zap,
  ShieldCheck,
  FileCode,
  Table,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight
} from "lucide-react";

export const DbmsArchitectureLab = () => {
  const [activeTab, setActiveTab] = useState("acid");
  const [loading, setLoading] = useState(false);

  // ACID Transaction State
  const [acidScenario, setAcidScenario] = useState("commit");
  const [acidResult, setAcidResult] = useState(null);

  // Lock State
  const [lockMode, setLockMode] = useState("FOR_UPDATE");
  const [lockResult, setLockResult] = useState(null);

  // Views State
  const [selectedView, setSelectedView] = useState("v_active_emergencies_summary");
  const [viewData, setViewData] = useState(null);

  // Index Optimizer State
  const [explainData, setExplainData] = useState(null);

  // Catalog State
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    api.getDbCatalog().then(data => setCatalog(data));
    api.getExplainIndexPlan().then(data => setExplainData(data));
    loadViewData("v_active_emergencies_summary");
    handleRunAcid("commit");
    handleRunLock("FOR_UPDATE");
  }, []);

  const handleRunAcid = async (scenario = acidScenario) => {
    setLoading(true);
    setAcidScenario(scenario);
    const data = await api.simulateAcidTransaction(scenario, "em_1");
    setAcidResult(data);
    setLoading(false);
  };

  const handleRunLock = async (mode = lockMode) => {
    setLoading(true);
    setLockMode(mode);
    const data = await api.simulateDbLock(mode);
    setLockResult(data);
    setLoading(false);
  };

  const loadViewData = async (viewName) => {
    setLoading(true);
    setSelectedView(viewName);
    const data = await api.getDbView(viewName);
    setViewData(data);
    setLoading(false);
  };

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-honey-bronze-600" />
              DBMS Architecture Lab
            </h2>
            <span className="font-mono text-[10px] bg-honey-bronze-100 text-honey-bronze-900 border border-honey-bronze-300 px-2 py-0.5 rounded font-bold">
              TRANSACTIONAL ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Production-grade demonstrations of ACID Transactions, Row-Level Locks (<code className="font-mono text-indigo-700 bg-slate-100 px-1 py-0.5 rounded">SELECT ... FOR UPDATE</code>), Triggers, Stored Procedures, Views & B-Tree Indexing.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>DATABASE: resqsync_db</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded p-2 shadow-2xs overflow-x-auto">
        {[
          { id: "acid", label: "1. ACID Transactions" },
          { id: "locks", label: "2. Concurrency & Row Locks (2PL)" },
          { id: "triggers", label: "3. Database Triggers" },
          { id: "procedures", label: "4. Stored Procedures" },
          { id: "views", label: "5. Virtual Views" },
          { id: "indexing", label: "6. B-Tree Indexing & EXPLAIN" }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* 1. ACID TRANSACTIONS TAB */}
      {activeTab === "acid" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                ACID Properties & Transaction Isolation Engine
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates multi-statement emergency relief allocations inside <code className="font-mono text-indigo-700">START TRANSACTION ... COMMIT / ROLLBACK</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunAcid("commit")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  acidScenario === "commit"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Test Scenario 1: COMMIT (Valid Request)
              </button>
              <button
                onClick={() => handleRunAcid("rollback")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  acidScenario === "rollback"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Test Scenario 2: ROLLBACK (Underflow Trigger)
              </button>
            </div>
          </div>

          {acidResult && (
            <div className="space-y-4">
              {/* ACID 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-xs space-y-1">
                  <div className="font-bold text-emerald-950 font-mono uppercase text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    A — Atomicity
                  </div>
                  <p className="text-emerald-900 text-[11px]">
                    {acidResult.acidProperties?.atomicity}
                  </p>
                </div>

                <div className="p-3 rounded border border-indigo-200 bg-indigo-50 text-xs space-y-1">
                  <div className="font-bold text-indigo-950 font-mono uppercase text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    C — Consistency
                  </div>
                  <p className="text-indigo-900 text-[11px]">
                    {acidResult.acidProperties?.consistency}
                  </p>
                </div>

                <div className="p-3 rounded border border-amber-200 bg-amber-50 text-xs space-y-1">
                  <div className="font-bold text-amber-950 font-mono uppercase text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                    I — Isolation
                  </div>
                  <p className="text-amber-900 text-[11px]">
                    {acidResult.acidProperties?.isolation}
                  </p>
                </div>

                <div className="p-3 rounded border border-slate-300 bg-slate-50 text-xs space-y-1">
                  <div className="font-bold text-slate-950 font-mono uppercase text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
                    D — Durability
                  </div>
                  <p className="text-slate-800 text-[11px]">
                    {acidResult.acidProperties?.durability}
                  </p>
                </div>
              </div>

              {/* Transaction Terminal Logs */}
              <div className="rounded bg-slate-950 text-slate-100 p-4 font-mono text-[11px] border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800 flex justify-between">
                  <span>INNODB TRANSACTION LOG EXECUTION TRACE (CASE ID: em_1)</span>
                  <span className={acidResult.scenario === "COMMIT" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    STATUS: {acidResult.status}
                  </span>
                </div>
                {acidResult.transactionLogs?.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">›</span>
                    <span className={log.includes("ROLLBACK") || log.includes("ERROR") ? "text-rose-300 font-semibold" : log.includes("COMMIT") ? "text-emerald-300 font-semibold" : "text-slate-300"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CONCURRENCY & ROW LOCKS TAB */}
      {activeTab === "locks" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Concurrency Control & Two-Phase Locking (2PL)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Demonstrates how Row-Level Exclusive Locks (<code className="font-mono text-indigo-700">SELECT ... FOR UPDATE</code>) prevent lost updates and race condition collisions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunLock("FOR_UPDATE")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  lockMode === "FOR_UPDATE"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Pessimistic Lock (FOR UPDATE)
              </button>
              <button
                onClick={() => handleRunLock("NONE")}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                  lockMode === "NONE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Non-Locking (Trigger Race Collision)
              </button>
            </div>
          </div>

          {lockResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Lock Mode Selected:</span>
                  <span className="text-sm font-bold text-indigo-700 mt-0.5 block">{lockResult.lockMode}</span>
                </div>
                <div className={`p-3 rounded border ${lockResult.raceConditionResult === "ELIMINATED" ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-rose-50 border-rose-300 text-rose-950"}`}>
                  <span className="text-[10px] block uppercase font-bold">Race Condition Status:</span>
                  <span className="text-sm font-bold mt-0.5 block">{lockResult.raceConditionResult}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Exclusive Slot Owner:</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{lockResult.winner}</span>
                </div>
              </div>

              {/* 2-Phase Locking Timeline */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3 font-mono text-xs">
                <span className="font-bold text-slate-900 text-xs block uppercase">
                  Rigorous Two-Phase Locking (2PL) Execution Lifecycle:
                </span>
                <div className="space-y-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">Phase 1: Growing</span>
                    <span className="text-slate-700 text-[11px]">{lockResult.twoPhaseLocking?.growingPhase}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">Execution & Hold</span>
                    <span className="text-slate-700 text-[11px]">{lockResult.twoPhaseLocking?.holdAndExecute}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Phase 2: Shrinking</span>
                    <span className="text-slate-700 text-[11px]">{lockResult.twoPhaseLocking?.shrinkingPhase}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. DATABASE TRIGGERS TAB */}
      {activeTab === "triggers" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Automated Database Triggers
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Event-driven routines invoked automatically by the database engine before or after data mutations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {catalog?.triggers?.map((t, idx) => (
              <div key={idx} className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-mono font-bold text-slate-900">{t.name}</span>
                  <span className="font-mono text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                    {t.timing}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Target Table: </span>
                  <span className="font-mono font-semibold text-slate-800">{t.table}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                  {t.purpose}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950 text-slate-100 rounded font-mono text-[11px] space-y-1">
            <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
              SAMPLE TRIGGER DEFINITION (PREVENTS NEGATIVE MUNICIPAL INVENTORY)
            </div>
            <pre className="text-emerald-400 whitespace-pre-wrap overflow-x-auto text-[11px]">
{`CREATE TRIGGER trg_prevent_resource_underflow
BEFORE UPDATE ON resources
FOR EACH ROW
BEGIN
  IF NEW.available_units < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'DBMS TRIGGER ERROR: Available resource units cannot be negative.';
  END IF;
END;`}
            </pre>
          </div>
        </div>
      )}

      {/* 4. STORED PROCEDURES TAB */}
      {activeTab === "procedures" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              Server-Side Stored Procedures
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Encapsulates complex transactional business logic within pre-compiled database procedures.
            </p>
          </div>

          <div className="space-y-4">
            {catalog?.storedProcedures?.map((sp, idx) => (
              <div key={idx} className="p-4 rounded border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-mono font-bold text-slate-900 text-sm">CALL {sp.name}(...)</span>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    PRE-COMPILED
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Parameters:</span>
                  <code className="font-mono text-indigo-700 text-[11px] bg-white p-1 rounded border border-slate-200 block">
                    {sp.parameters}
                  </code>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">ACID & Locking Guarantees:</span>
                  <p className="text-[11px] text-slate-700 mt-0.5">{sp.acidGuarantees}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DATABASE VIEWS TAB */}
      {activeTab === "views" && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Relational Virtual Views
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pre-defined virtual tables abstracting multi-table joins and analytical group-by aggregations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {catalog?.views?.map((v) => (
                <button
                  key={v}
                  onClick={() => loadViewData(v)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    selectedView === v
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {viewData && (
            <div className="space-y-3">
              <div className="p-2.5 bg-slate-100 rounded border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
                <span className="font-bold text-slate-900">Definition: </span>
                {viewData.definition}
              </div>

              <div className="overflow-x-auto rounded border border-slate-200 max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] text-slate-700 sticky top-0">
                    <tr>
                      {viewData.rows?.[0] &&
                        Object.keys(viewData.rows[0]).map((col) => (
                          <th key={col} className="py-2 px-3 capitalize">
                            {col.replace(/_/g, " ")}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {viewData.rows?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 text-slate-800">
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. B-TREE INDEXING & EXPLAIN TAB */}
      {activeTab === "indexing" && explainData && (
        <div className="bg-white border border-slate-200 rounded shadow-2xs p-4 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
              B-Tree Composite Indexing & Query Optimizer EXPLAIN Plan
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Demonstrates query plan optimizer comparison: Multi-column Composite B-Tree Index vs Full Table Scan (ALL).
            </p>
          </div>

          {/* Benchmark Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* With Index */}
            <div className="p-4 rounded border-2 border-emerald-300 bg-emerald-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-200">
                <span className="font-mono font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  WITH B-TREE COMPOSITE INDEX
                </span>
                <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  {explainData.withIndex?.executionTimeMs} ms
                </span>
              </div>
              <div className="font-mono text-[11px] space-y-1 text-slate-800">
                <div>Type: <strong className="text-emerald-700">{explainData.withIndex?.type}</strong> (Constant Reference)</div>
                <div>Key Used: <strong>{explainData.withIndex?.keyUsed}</strong></div>
                <div>Rows Examined: <strong className="text-emerald-700 text-sm">{explainData.withIndex?.rowsExamined} row</strong></div>
                <div>Extra: <strong>{explainData.withIndex?.extra}</strong></div>
              </div>
              <p className="text-[11px] text-emerald-900 pt-2 border-t border-emerald-200 font-medium">
                {explainData.withIndex?.verdict}
              </p>
            </div>

            {/* Without Index */}
            <div className="p-4 rounded border-2 border-rose-300 bg-rose-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-rose-200">
                <span className="font-mono font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  WITHOUT INDEX (FULL TABLE SCAN)
                </span>
                <span className="font-mono text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                  {explainData.withoutIndex?.executionTimeMs} ms
                </span>
              </div>
              <div className="font-mono text-[11px] space-y-1 text-slate-800">
                <div>Type: <strong className="text-rose-700">{explainData.withoutIndex?.type}</strong> (Full Table Scan)</div>
                <div>Key Used: <strong className="text-rose-700">NULL</strong></div>
                <div>Rows Examined: <strong className="text-rose-700 text-sm">{explainData.withoutIndex?.rowsExamined} rows</strong></div>
                <div>Extra: <strong>{explainData.withoutIndex?.extra}</strong></div>
              </div>
              <p className="text-[11px] text-rose-900 pt-2 border-t border-rose-200 font-medium">
                {explainData.withoutIndex?.verdict}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 text-slate-100 rounded font-mono text-[11px] flex items-center justify-between">
            <span>QUERY OPTIMIZATION RESULT:</span>
            <span className="text-emerald-400 font-bold text-sm">{explainData.performanceBoostFactor}</span>
          </div>
        </div>
      )}
    </div>
  );
};
