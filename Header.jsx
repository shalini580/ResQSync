import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { NotificationDropdown } from "./NotificationDropdown";
import { Bell, LogOut } from "lucide-react";
export const Header = () => {
  const { currentUser, activeView, unreadNotificationCount, logout } = useApp();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const getViewMeta = () => {
    switch (activeView) {
      // Admin
      case "dashboard":
        return {
          title: "City Controller Operations Dashboard",
          subtitle:
            "Real-time incident response, allocation queue & municipal status",
        };
      case "city-simulation":
        return {
          title: "Simulated City Grid (Zones A\u2013D)",
          subtitle:
            "Spatial entity matrix of resources, active incidents & rescue units",
        };
      case "emergency-cases":
        return {
          title: "Emergency Cases Registry",
          subtitle:
            "Incident triage with OS Process IDs, Priority Scheduling & Audit Logs",
        };
      case "resources":
        return {
          title: "Municipal Resource Inventory",
          subtitle:
            "Zone-level stock tracking: Food, Water, Medicine, Vehicles & Cots",
        };
      case "resource-allocation":
        return {
          title: "Resource Allocation & Banker\u2019s Safety Verification",
          subtitle:
            "Deadlock avoidance algorithm & row-level DBMS transaction management",
        };
      case "rescue-missions":
        return {
          title: "Rescue Missions Dispatch",
          subtitle:
            "Lifecycle tracking: Assigned \u2192 Pickup \u2192 In Transit \u2192 Delivered \u2192 Completed",
        };
      case "volunteers":
        return {
          title: "Volunteer Responders Roster",
          subtitle:
            "Responder availability, skill certification, XP levels & assignment",
        };
      case "organisations":
        return {
          title: "Registered Organisations & Shelters",
          subtitle:
            "Vetting and capacity management for Restaurants, NGOs and Shelters",
        };
      case "os-simulation":
        return {
          title: "Operating System Architecture Lab",
          subtitle:
            "Process PCB Management, 5 CPU Schedulers, Banker’s Algorithm, Deadlock WFG, Mutex, Semaphores & IPC",
        };
      case "dbms-architecture":
        return {
          title: "DBMS Architecture Lab",
          subtitle:
            "ACID Transactions, Row-Level Locks, Triggers, Stored Procedures, Views & Indexing",
        };
      case "analytics":
        return {
          title: "City Health & Mission Analytics",
          subtitle:
            "Incident resolution metrics, supply efficiency & responder leaderboard",
        };
      // Restaurant
      case "restaurant-dashboard":
        return {
          title: "Restaurant Surplus Control Panel",
          subtitle:
            "Active food donations, expiry countdowns & pickup dispatches",
        };
      case "surplus-food":
        return {
          title: "Surplus Food Registry",
          subtitle:
            "Manage batches, auto-trigger urgent pickup on impending expiry",
        };
      case "pickup-tracking":
        return {
          title: "Food Pickup Tracking",
          subtitle:
            "Monitor assigned volunteer transit from commercial kitchen to shelter",
        };
      case "donation-history":
        return {
          title: "Civic Donation History",
          subtitle:
            "Historical food rescue ledger and community contribution points",
        };
      // NGO
      case "ngo-dashboard":
        return {
          title: "NGO / Shelter Management Hub",
          subtitle:
            "Relief requests, shelter bed occupancy and inbound supply missions",
        };
      case "resource-requests":
        return {
          title: "Emergency Resource Requests",
          subtitle:
            "Submit multi-item supply petitions for affected shelter populations",
        };
      case "allocation-delivery":
        return {
          title: "Allocation Verification & Delivery Intake",
          subtitle: "Verify inbound vehicle shipments and update bed occupancy",
        };
      // Volunteer
      case "volunteer-dashboard":
        return {
          title: "Responder Command Dashboard",
          subtitle:
            "Available nearby incidents, active mission telemetry, XP and rewards",
        };
      case "available-missions":
        return {
          title: "Available Rescue Missions",
          subtitle:
            "Accept critical missions (Protected by Mutex concurrency control)",
        };
      case "my-mission":
        return {
          title: "Active Mission Progress",
          subtitle:
            "Execute 5-stage relief mission with real-time waypoint reporting",
        };
      case "rewards":
        return {
          title: "Volunteer Achievements & Leaderboard",
          subtitle:
            "Civic XP level progress, rescue badges and municipal rankings",
        };
      default:
        return {
          title: "ResQSync Operations",
          subtitle: "Emergency relief and resource coordination platform",
        };
    }
  };
  const { title, subtitle } = getViewMeta();
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-dust-grey-300 bg-white px-5 shadow-xs">
      {/* Title & Subtitle */}
      <div className="flex flex-col justify-center min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight text-coffee-bean-950 truncate">
            {title}
          </h1>
          <span className="hidden sm:inline-flex items-center rounded border border-muted-teal-300 bg-muted-teal-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-teal-800">
            {currentUser?.zone}
          </span>
        </div>
        <p className="text-[11px] text-coffee-bean-600 truncate hidden md:block">
          {subtitle}
        </p>
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative flex h-8 w-8 items-center justify-center rounded border border-dust-grey-300 bg-white text-coffee-bean-700 hover:bg-dust-grey-100 hover:text-coffee-bean-950 cursor-pointer transition-colors"
            title="System Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cherry-rose-600 px-1 text-[9px] font-bold text-white shadow-xs">
                {unreadNotificationCount}
              </span>
            )}
          </button>
          <NotificationDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-2 pl-1 border-l border-dust-grey-300">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-coffee-bean-950 leading-tight">
              {currentUser?.name}
            </span>
            <span className="text-[10px] font-mono text-coffee-bean-600 uppercase font-semibold">
              {currentUser?.role === "admin"
                ? "City Controller"
                : currentUser?.role === "ngo"
                  ? "Shelter Coord"
                  : currentUser?.role === "restaurant"
                    ? "Food Partner"
                    : "Field Responder"}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded border border-dust-grey-300 text-coffee-bean-700 hover:bg-cherry-rose-50 hover:text-cherry-rose-700 hover:border-cherry-rose-300 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
