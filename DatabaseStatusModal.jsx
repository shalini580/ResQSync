import { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  X,
  Terminal,
  Table,
  Settings,
  HardDrive,
} from "lucide-react";
export const DatabaseStatusModal = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schemaSql, setSchemaSql] = useState("");
  const [showSchema, setShowSchema] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("3306");
  const [user, setUser] = useState("root");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("resqsync_db");
  const [connectMessage, setConnectMessage] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const fetchStatus = async () => {
    setLoading(true);
    const data = await api.getDbStatus();
    setStatus(data);
    if (data.host) setHost(data.host);
    if (data.port) setPort(data.port.toString());
    if (data.user) setUser(data.user);
    if (data.database) setDatabase(data.database);
    setLoading(false);
  };
  const handleConnectLocalDb = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectMessage(null);
    try {
      const res = await api.connectDb({
        host,
        port: parseInt(port, 10),
        user,
        password,
        database,
      });
      if (res?.success) {
        setConnectMessage({
          success: true,
          text: `Successfully connected to local MySQL on ${host}:${port}/${database}!`,
        });
      } else {
        setConnectMessage({
          success: false,
          text:
            res?.error ||
            `Could not connect to ${host}:${port}. Using persistent local database file (data/resqsync_local_db.json).`,
        });
      }
      await fetchStatus();
    } catch (err) {
      setConnectMessage({
        success: false,
        text: err.message || "Connection attempt failed.",
      });
    } finally {
      setIsConnecting(false);
    }
  };
  const loadSchema = async () => {
    if (!schemaSql) {
      const sql = await api.getSchemaSql();
      setSchemaSql(sql);
    }
    setShowSchema(true);
  };
  const copySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
      <div className="relative w-full max-w-2xl rounded-xl border-2 border-dust-grey-300 bg-white shadow-2xl text-coffee-bean-950 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dust-grey-300 bg-dust-grey-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-coffee-bean-900 text-honey-bronze-400 shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-coffee-bean-950 flex items-center gap-2">
                <span>Local Database & MySQL Engine</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${status?.connected ? "bg-muted-teal-100 text-muted-teal-900 border-muted-teal-300" : "bg-honey-bronze-100 text-honey-bronze-900 border-honey-bronze-300"}`}
                >
                  {status?.connected
                    ? "MYSQL CONNECTED"
                    : "LOCAL STORAGE ACTIVE"}
                </span>
              </h2>
              <p className="text-[11px] text-coffee-bean-600 font-mono">
                Persistent local database file + Node.js MySQL backend
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded border border-dust-grey-300 bg-white text-coffee-bean-700 hover:bg-dust-grey-100 cursor-pointer disabled:opacity-50"
              title="Refresh Status"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded border border-dust-grey-300 bg-white text-coffee-bean-400 hover:text-coffee-bean-700 hover:bg-dust-grey-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Local Storage Card */}
            <div className="rounded-lg border border-dust-grey-300 bg-dust-grey-50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-coffee-bean-600 font-bold uppercase flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-muted-teal-700" />
                  Local Database File
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-muted-teal-100 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-teal-900">
                  <CheckCircle2 className="h-3 w-3 text-muted-teal-600" />
                  PERSISTENT
                </span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-coffee-bean-800">
                <div className="truncate">
                  File:{" "}
                  <code className="bg-white px-1 py-0.5 rounded border border-dust-grey-200">
                    data/resqsync_local_db.json
                  </code>
                </div>
                <div>Format: Relational JSON Schema</div>
                <div>Status: Auto-saves every modification</div>
              </div>
            </div>

            {/* Local MySQL Status Card */}
            <div className="rounded-lg border border-dust-grey-300 bg-dust-grey-50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-coffee-bean-600 font-bold uppercase flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-honey-bronze-600" />
                  Local MySQL Server
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold ${status?.connected ? "bg-muted-teal-100 text-muted-teal-900" : "bg-honey-bronze-100 text-honey-bronze-900 border border-honey-bronze-300"}`}
                >
                  {status?.connected ? "ONLINE" : "WAITING FOR CONNECTION"}
                </span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-coffee-bean-800">
                <div>
                  Target: {status?.host || "127.0.0.1"}:{status?.port || 3306}
                </div>
                <div>
                  Database:{" "}
                  <span className="font-bold text-cherry-rose-700">
                    {status?.database || "resqsync_db"}
                  </span>
                </div>
                <div>User: {status?.user || "root"}</div>
              </div>
            </div>
          </div>

          {/* Connect Local MySQL Form */}
          <div className="rounded-lg border-2 border-honey-bronze-300 bg-honey-bronze-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-coffee-bean-950 flex items-center gap-1.5 text-xs">
                <Settings className="h-4 w-4 text-honey-bronze-700" />
                Connect Your Local MySQL Database
              </span>
              <span className="text-[10px] font-mono text-coffee-bean-600">
                XAMPP • WAMP • Local MySQL • Docker
              </span>
            </div>

            <form onSubmit={handleConnectLocalDb} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-coffee-bean-600 mb-0.5">
                    DB_HOST
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full rounded border border-dust-grey-300 bg-white px-2.5 py-1.5 font-mono text-xs text-coffee-bean-950 focus:border-honey-bronze-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-coffee-bean-600 mb-0.5">
                    DB_PORT
                  </label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="3306"
                    className="w-full rounded border border-dust-grey-300 bg-white px-2.5 py-1.5 font-mono text-xs text-coffee-bean-950 focus:border-honey-bronze-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-coffee-bean-600 mb-0.5">
                    DB_USER
                  </label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="root"
                    className="w-full rounded border border-dust-grey-300 bg-white px-2.5 py-1.5 font-mono text-xs text-coffee-bean-950 focus:border-honey-bronze-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-coffee-bean-600 mb-0.5">
                    DB_PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="(empty if none)"
                    className="w-full rounded border border-dust-grey-300 bg-white px-2.5 py-1.5 font-mono text-xs text-coffee-bean-950 focus:border-honey-bronze-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="w-1/2">
                  <label className="block text-[10px] font-mono text-coffee-bean-600 mb-0.5">
                    DB_NAME
                  </label>
                  <input
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="resqsync_db"
                    className="w-full rounded border border-dust-grey-300 bg-white px-2.5 py-1.5 font-mono text-xs text-coffee-bean-950 focus:border-honey-bronze-500 focus:outline-none"
                  />
                </div>
                <div className="w-1/2 flex items-end">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full rounded bg-coffee-bean-900 px-4 py-2 text-xs font-bold text-white hover:bg-coffee-bean-950 cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Database className="h-3.5 w-3.5 text-honey-bronze-400" />
                    )}
                    <span>
                      {isConnecting
                        ? "Connecting..."
                        : "Connect to Local MySQL"}
                    </span>
                  </button>
                </div>
              </div>

              {connectMessage && (
                <div
                  className={`p-2.5 rounded text-[11px] font-medium flex items-start gap-1.5 border ${connectMessage.success ? "bg-muted-teal-50 text-muted-teal-900 border-muted-teal-300" : "bg-honey-bronze-100 text-coffee-bean-900 border-honey-bronze-300"}`}
                >
                  {connectMessage.success ? (
                    <CheckCircle2 className="h-4 w-4 text-muted-teal-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-honey-bronze-700 shrink-0 mt-0.5" />
                  )}
                  <span>{connectMessage.text}</span>
                </div>
              )}
            </form>
          </div>

          {/* MySQL Table Registry with Row Counts */}
          <div className="rounded-lg border border-dust-grey-300 bg-white p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-coffee-bean-950 flex items-center gap-1.5 text-xs">
                <Table className="h-4 w-4 text-coffee-bean-700" />
                Local Database Tables (Live Counts)
              </span>
              <span className="font-mono text-[10px] text-coffee-bean-500">
                10 Relational Tables
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {status?.tables &&
                Object.entries(status.tables).map(([tableName, count]) => (
                  <div
                    key={tableName}
                    className="flex items-center justify-between rounded border border-dust-grey-200 bg-dust-grey-50 px-2.5 py-1.5 font-mono text-[11px]"
                  >
                    <span className="text-coffee-bean-800 font-medium truncate">
                      {tableName}
                    </span>
                    <span className="rounded bg-coffee-bean-900 text-white px-1.5 py-0.2 text-[10px] font-bold">
                      {count} rows
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Setup Instructions & SQL Schema */}
          <div className="rounded-lg border border-dust-grey-300 bg-dust-grey-100 p-4 space-y-3 text-xs">
            <div className="font-bold text-coffee-bean-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-coffee-bean-700" />
                How to Import schema.sql in Windows PowerShell
              </span>
              <span className="text-[10px] bg-cherry-rose-100 text-cherry-rose-800 font-mono font-bold px-2 py-0.5 rounded border border-cherry-rose-200">
                Fix for '&lt;' error in PowerShell
              </span>
            </div>

            <div className="rounded bg-white p-3 border border-dust-grey-200 space-y-2 text-[11px] text-coffee-bean-800">
              <p className="text-coffee-bean-700">
                In Windows PowerShell, the{" "}
                <code className="bg-dust-grey-100 px-1 py-0.5 rounded font-mono font-bold text-cherry-rose-700">
                  &lt;
                </code>{" "}
                symbol gives the error:{" "}
                <em>"The '&lt;' operator is reserved for future use."</em>
                Use one of these working PowerShell commands:
              </p>

              {/* Option 1: Get-Content pipe */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-coffee-bean-900 text-[10px] uppercase font-mono">
                    Method 1: Native PowerShell Pipe (Recommended)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        "Get-Content schema.sql | mysql -u root -p resqsync_db",
                      );
                      setCopiedCmd("cmd1");
                      setTimeout(() => setCopiedCmd(""), 2e3);
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono text-muted-teal-800 hover:text-muted-teal-900 font-bold bg-muted-teal-50 px-2 py-0.5 rounded border border-muted-teal-200 cursor-pointer"
                  >
                    {copiedCmd === "cmd1" ? (
                      <Check className="h-3 w-3 text-muted-teal-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedCmd === "cmd1" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="bg-coffee-bean-950 text-dust-grey-100 p-2 rounded font-mono text-[11px] overflow-x-auto select-all">
                  Get-Content schema.sql | mysql -u root -p resqsync_db
                </pre>
              </div>

              {/* Option 2: cmd.exe wrapper */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-coffee-bean-900 text-[10px] uppercase font-mono">
                    Method 2: Use cmd.exe inside PowerShell
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        'cmd.exe /c "mysql -u root -p resqsync_db < schema.sql"',
                      );
                      setCopiedCmd("cmd2");
                      setTimeout(() => setCopiedCmd(""), 2e3);
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono text-muted-teal-800 hover:text-muted-teal-900 font-bold bg-muted-teal-50 px-2 py-0.5 rounded border border-muted-teal-200 cursor-pointer"
                  >
                    {copiedCmd === "cmd2" ? (
                      <Check className="h-3 w-3 text-muted-teal-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedCmd === "cmd2" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="bg-coffee-bean-950 text-dust-grey-100 p-2 rounded font-mono text-[11px] overflow-x-auto select-all">
                  cmd.exe /c "mysql -u root -p resqsync_db &lt; schema.sql"
                </pre>
              </div>

              {/* Option 3: MySQL interactive source */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-coffee-bean-900 text-[10px] uppercase font-mono">
                    Method 3: Inside MySQL prompt (Works everywhere)
                  </span>
                </div>
                <div className="bg-dust-grey-50 border border-dust-grey-200 rounded p-2 font-mono text-[10px] text-coffee-bean-900 space-y-0.5">
                  <p>
                    1. Connect:{" "}
                    <span className="font-bold">mysql -u root -p</span>
                  </p>
                  <p>
                    2. Create DB:{" "}
                    <span className="font-bold">
                      CREATE DATABASE IF NOT EXISTS resqsync_db;
                    </span>
                  </p>
                  <p>
                    3. Select DB:{" "}
                    <span className="font-bold">USE resqsync_db;</span>
                  </p>
                  <p>
                    4. Execute file:{" "}
                    <span className="font-bold">source schema.sql;</span>
                  </p>
                </div>
              </div>

              {/* XAMPP note if mysql command not recognized */}
              <p className="text-[10px] text-coffee-bean-600 italic">
                * If PowerShell says <code>'mysql' is not recognized</code>, add
                MySQL to your PATH or use:{" "}
                <code className="font-bold">
                  &amp; "C:\xampp\mysql\bin\mysql.exe" -u root -p resqsync_db
                </code>
              </p>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                onClick={loadSchema}
                className="flex items-center gap-1.5 rounded bg-coffee-bean-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-coffee-bean-950 cursor-pointer shadow-xs"
              >
                <Database className="h-3.5 w-3.5 text-honey-bronze-400" />
                View & Copy Full schema.sql
              </button>
              <a
                href="/schema.sql"
                download="schema.sql"
                className="flex items-center gap-1.5 rounded border border-dust-grey-300 bg-white px-3 py-1.5 text-[11px] font-bold text-coffee-bean-800 hover:bg-dust-grey-100 cursor-pointer shadow-xs"
              >
                <HardDrive className="h-3.5 w-3.5 text-muted-teal-600" />
                Download schema.sql File
              </a>
            </div>
          </div>

          {/* Schema SQL Viewer Popup */}
          {showSchema && (
            <div className="border border-dust-grey-300 rounded-lg bg-dust-grey-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-coffee-bean-900">
                  schema.sql
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copySql}
                    className="flex items-center gap-1 rounded border border-dust-grey-300 bg-white px-2 py-1 text-[11px] font-bold text-coffee-bean-800 hover:bg-dust-grey-100 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-muted-teal-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copied ? "Copied!" : "Copy SQL"}</span>
                  </button>
                  <button
                    onClick={() => setShowSchema(false)}
                    className="text-coffee-bean-500 hover:text-coffee-bean-800 cursor-pointer text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
              <pre className="max-h-48 overflow-y-auto rounded bg-coffee-bean-950 p-3 text-[10px] font-mono text-dust-grey-200 leading-relaxed">
                {schemaSql || "-- Loading schema.sql..."}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dust-grey-300 bg-white px-5 py-3 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="rounded-md bg-dust-grey-200 px-4 py-1.5 text-xs font-bold text-coffee-bean-900 hover:bg-dust-grey-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
