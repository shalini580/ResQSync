import { useApp } from "../../context/AppContext";
import {
  LayoutDashboard,
  Grid3X3,
  AlertOctagon,
  Boxes,
  Cpu,
  Truck,
  Users,
  Building2,
  BarChart3,
  UtensilsCrossed,
  Clock,
  History,
  FileText,
  PackageCheck,
  Compass,
  Award,
  Layers,
  Database,
} from "lucide-react";
export const Sidebar = () => {
  const { currentUser, activeView, setActiveView } = useApp();
  if (!currentUser) return null;
  const getNavItems = () => {
    switch (currentUser.role) {
      case "admin":
        return [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "city-simulation", label: "City Simulation", icon: Grid3X3 },
          {
            id: "emergency-cases",
            label: "Emergency Cases",
            icon: AlertOctagon,
          },
          { id: "resources", label: "Resources", icon: Boxes },
          {
            id: "resource-allocation",
            label: "Resource Allocation",
            icon: Layers,
          },
          { id: "rescue-missions", label: "Rescue Missions", icon: Truck },
          { id: "volunteers", label: "Volunteers", icon: Users },
          { id: "organisations", label: "Organisations", icon: Building2 },
          { id: "os-simulation", label: "OS Simulation", icon: Cpu },
          {
            id: "dbms-architecture",
            label: "DBMS Architecture",
            icon: Database,
          },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
        ];
      case "restaurant":
        return [
          {
            id: "restaurant-dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
          },
          { id: "surplus-food", label: "Surplus Food", icon: UtensilsCrossed },
          { id: "pickup-tracking", label: "Pickup Tracking", icon: Clock },
          { id: "donation-history", label: "Donation History", icon: History },
        ];
      case "ngo":
        return [
          { id: "ngo-dashboard", label: "Dashboard", icon: LayoutDashboard },
          {
            id: "resource-requests",
            label: "Resource Requests",
            icon: FileText,
          },
          {
            id: "allocation-delivery",
            label: "Allocation & Delivery",
            icon: PackageCheck,
          },
        ];
      case "volunteer":
        return [
          {
            id: "volunteer-dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
          },
          {
            id: "available-missions",
            label: "Available Missions",
            icon: Compass,
          },
          { id: "my-mission", label: "My Mission", icon: Truck },
          { id: "rewards", label: "Rewards & Leaderboard", icon: Award },
        ];
      default:
        return [];
    }
  };
  const navItems = getNavItems();
  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-dust-grey-300 bg-white flex flex-col justify-between select-none">
      {/* Top Brand Banner */}
      <div>
        <div className="flex h-16 items-center px-5 border-b border-dust-grey-300">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cherry-rose-600 text-white font-mono font-black text-sm shadow-sm ring-2 ring-cherry-rose-200">
              RS
            </div>
            <div>
              <span className="font-extrabold text-coffee-bean-950 tracking-tight text-base block leading-none">
                ResQSync
              </span>
              <span className="text-[10px] text-coffee-bean-600 font-mono tracking-wider block mt-1 font-semibold">
                CIVIC EMERGENCY RELIEF
              </span>
            </div>
          </div>
        </div>

        {/* Role identification badge */}
        <div className="px-4 py-2.5 bg-dust-grey-100 border-b border-dust-grey-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-mono font-bold text-coffee-bean-500">
              ROLE:
            </span>
            <span className="font-bold text-coffee-bean-950 text-[11px] capitalize">
              {currentUser.role === "admin"
                ? "City Controller"
                : currentUser.role === "ngo"
                  ? "NGO / Shelter"
                  : currentUser.role === "restaurant"
                    ? "Food Partner"
                    : "Volunteer"}
            </span>
          </div>
          <span className="inline-block h-2 w-2 rounded-full bg-muted-teal-500 ring-2 ring-muted-teal-200" />
        </div>

        {/* Nav Items List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${isActive ? "bg-coffee-bean-900 text-white shadow-xs" : "text-coffee-bean-700 hover:bg-muted-teal-50 hover:text-coffee-bean-950"}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-honey-bronze-400" : "text-coffee-bean-500"}`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
