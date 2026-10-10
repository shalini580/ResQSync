import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/common/Header";
import { Sidebar } from "./components/common/Sidebar";
import { LandingPage } from "./components/landing/LandingPage";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { CitySimulation } from "./components/admin/CitySimulation";
import { EmergencyCases } from "./components/admin/EmergencyCases";
import { ResourcesView } from "./components/admin/ResourcesView";
import { ResourceAllocation } from "./components/admin/ResourceAllocation";
import { RescueMissions } from "./components/admin/RescueMissions";
import { VolunteersView } from "./components/admin/VolunteersView";
import { OrganisationsView } from "./components/admin/OrganisationsView";
import { OsSimulation } from "./components/admin/OsSimulation";
import { DbmsArchitectureLab } from "./components/admin/DbmsArchitectureLab";
import { AnalyticsView } from "./components/admin/AnalyticsView";
import { RestaurantDashboard } from "./components/restaurant/RestaurantDashboard";
import { SurplusFoodView } from "./components/restaurant/SurplusFoodView";
import { PickupTrackingView } from "./components/restaurant/PickupTrackingView";
import { DonationHistoryView } from "./components/restaurant/DonationHistoryView";
import { NgoDashboard } from "./components/ngo/NgoDashboard";
import { ResourceRequestsView } from "./components/ngo/ResourceRequestsView";
import { AllocationDeliveryView } from "./components/ngo/AllocationDeliveryView";
import { VolunteerDashboard } from "./components/volunteer/VolunteerDashboard";
import { AvailableMissionsView } from "./components/volunteer/AvailableMissionsView";
import { MyMissionView } from "./components/volunteer/MyMissionView";
import { RewardsView } from "./components/volunteer/RewardsView";
const AppContent = () => {
  const { currentUser, activeView, login } = useApp();
  const [authView, setAuthView] = useState("landing");
  if (!currentUser) {
    if (authView === "login") {
      return <LoginPage
        onGoToRegister={() => setAuthView("register")}
        onBackToLanding={() => setAuthView("landing")}
      />;
    }
    if (authView === "register") {
      return <RegisterPage
        onBackToLogin={() => setAuthView("login")}
        onBackToLanding={() => setAuthView("landing")}
      />;
    }
    return <LandingPage
      onGoToLogin={() => setAuthView("login")}
      onGoToRegister={() => setAuthView("register")}
    />;
  }
  const renderActiveView = () => {
    switch (currentUser.role) {
      case "admin":
        switch (activeView) {
          case "dashboard":
            return <AdminDashboard />;
          case "city-simulation":
            return <CitySimulation />;
          case "emergency-cases":
            return <EmergencyCases />;
          case "resources":
            return <ResourcesView />;
          case "resource-allocation":
            return <ResourceAllocation />;
          case "rescue-missions":
            return <RescueMissions />;
          case "volunteers":
            return <VolunteersView />;
          case "organisations":
            return <OrganisationsView />;
          case "os-simulation":
            return <OsSimulation />;
          case "dbms-architecture":
            return <DbmsArchitectureLab />;
          case "analytics":
            return <AnalyticsView />;
          default:
            return <AdminDashboard />;
        }
      case "restaurant":
        switch (activeView) {
          case "dashboard":
          case "restaurant-dashboard":
            return <RestaurantDashboard />;
          case "surplus-food":
            return <SurplusFoodView />;
          case "pickup-tracking":
            return <PickupTrackingView />;
          case "donation-history":
            return <DonationHistoryView />;
          default:
            return <RestaurantDashboard />;
        }
      case "ngo":
        switch (activeView) {
          case "dashboard":
          case "ngo-dashboard":
            return <NgoDashboard />;
          case "resource-requests":
            return <ResourceRequestsView />;
          case "allocation-delivery":
            return <AllocationDeliveryView />;
          default:
            return <NgoDashboard />;
        }
      case "volunteer":
        switch (activeView) {
          case "dashboard":
          case "volunteer-dashboard":
            return <VolunteerDashboard />;
          case "available-missions":
            return <AvailableMissionsView />;
          case "my-mission":
            return <MyMissionView />;
          case "rewards":
            return <RewardsView />;
          default:
            return <VolunteerDashboard />;
        }
      default:
        return <AdminDashboard />;
    }
  };
  return <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans antialiased">
      {
    /* Left Fixed/Sticky Sidebar */
  }
      <Sidebar />

      {
    /* Main Content Area */
  }
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>;
};
export default function App() {
  return <AppProvider>
      <AppContent />
    </AppProvider>;
}
