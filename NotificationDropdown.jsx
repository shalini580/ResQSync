import { useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Bell, Check, Trash2, X, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
export const NotificationDropdown = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, dismissNotification } = useApp();
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return <div
    ref={dropdownRef}
    className="absolute right-0 top-12 z-50 w-96 rounded-md border border-dust-grey-300 bg-white shadow-lg text-coffee-bean-950"
  >
      <div className="flex items-center justify-between border-b border-dust-grey-300 px-3.5 py-2.5 bg-dust-grey-100">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-coffee-bean-700" />
          <span className="text-xs font-semibold tracking-wide uppercase text-coffee-bean-900">System Notifications</span>
          <span className="rounded bg-dust-grey-300 px-1.5 py-0.2 text-[10px] font-mono text-coffee-bean-800">
            {notifications.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
    onClick={markAllNotificationsRead}
    className="flex items-center gap-1 text-[11px] text-coffee-bean-700 hover:text-coffee-bean-950 font-medium cursor-pointer"
    title="Mark all as read"
  >
            <Check className="h-3 w-3" /> Mark all read
          </button>
          <button
    onClick={onClose}
    className="text-coffee-bean-400 hover:text-coffee-bean-700 p-0.5 rounded cursor-pointer"
  >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 divide-y divide-dust-grey-200 overflow-y-auto">
        {notifications.length === 0 ? <div className="p-6 text-center text-xs text-coffee-bean-400">No active system notifications</div> : notifications.map((notif) => {
    const isCritical = notif.type === "critical";
    const isAlert = notif.type === "alert";
    const isSuccess = notif.type === "success";
    return <div
      key={notif.id}
      onClick={() => markNotificationRead(notif.id)}
      className={`relative flex items-start gap-2.5 p-3 transition-colors cursor-pointer hover:bg-dust-grey-100 ${!notif.read ? "bg-muted-teal-50/50" : "bg-white"}`}
    >
                <div className="mt-0.5 shrink-0">
                  {isCritical ? <AlertTriangle className="h-4 w-4 text-cherry-rose-600" /> : isAlert ? <AlertTriangle className="h-4 w-4 text-honey-bronze-600" /> : isSuccess ? <CheckCircle2 className="h-4 w-4 text-muted-teal-600" /> : <Info className="h-4 w-4 text-coffee-bean-600" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span
      className={`text-xs font-semibold ${isCritical ? "text-cherry-rose-700" : "text-coffee-bean-900"}`}
    >
                      {notif.title}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-coffee-bean-400">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-coffee-bean-700 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                <button
      onClick={(e) => {
        e.stopPropagation();
        dismissNotification(notif.id);
      }}
      className="shrink-0 text-coffee-bean-300 hover:text-coffee-bean-600 p-0.5 cursor-pointer"
      title="Dismiss"
    >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>;
  })}
      </div>

      <div className="border-t border-dust-grey-200 bg-dust-grey-100 px-3 py-2 text-[11px] text-coffee-bean-600 flex justify-between items-center">
        <span>DBMS Trigger & Event Pipeline</span>
        <span className="font-mono text-[10px] text-coffee-bean-500">Database event pipeline active</span>
      </div>
    </div>;
};
