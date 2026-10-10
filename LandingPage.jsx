import { useState } from "react";
import {
  ShieldAlert,
  ArrowRight,
  Boxes,
  Users,
  UtensilsCrossed,
  Cpu,
  Database,
  Activity,
  CheckCircle2,
  Flame,
  Droplets,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
export const LandingPage = ({ onGoToLogin, onGoToRegister }) => {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <div className="min-h-screen bg-dust-grey-50 text-coffee-bean-950 font-sans antialiased selection:bg-muted-teal-200">
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-dust-grey-300 bg-white/95 backdrop-blur-xs shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cherry-rose-600 text-white font-mono font-black text-sm shadow-xs ring-2 ring-cherry-rose-200">
              RS
            </div>
            <div>
              <span className="font-extrabold text-base text-coffee-bean-950 tracking-tight block leading-none">
                ResQSync
              </span>
              <span className="text-[10px] text-coffee-bean-600 font-mono tracking-wider block mt-0.5 font-semibold">
                CIVIC EMERGENCY SIMULATION
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-coffee-bean-700">
            <button
              onClick={() => scrollToSection("hero")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("motivation")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              Why ResQSync
            </button>
            <button
              onClick={() => scrollToSection("emergencies")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              Emergencies
            </button>
            <button
              onClick={() => scrollToSection("what-we-manage")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection("roles")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              Roles
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("os-dbms")}
              className="hover:text-cherry-rose-600 transition-colors cursor-pointer"
            >
              OS & DBMS
            </button>
          </nav>

          {/* Right Most: Login & Register Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToLogin}
              className="rounded-md border border-dust-grey-300 px-3.5 py-1.5 text-xs font-bold text-coffee-bean-800 hover:bg-dust-grey-100 transition-colors cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={onGoToRegister}
              className="rounded-md bg-cherry-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-cherry-rose-700 transition-colors shadow-xs cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section
        id="hero"
        className="border-b border-dust-grey-300 bg-white py-16 sm:py-20 relative overflow-hidden"
      >
        {/* Subtle decorative color accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-muted-teal-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-honey-bronze-100/40 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-muted-teal-300 bg-muted-teal-50 px-3.5 py-1 text-[11px] font-mono font-bold text-muted-teal-800 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-muted-teal-500 animate-pulse" />
            Resource Coordination & Civic Emergency Relief Simulation Platform
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-coffee-bean-950 tracking-tight leading-tight">
            Resource Coordination
            <span className="text-cherry-rose-600">
              & Emergency Relief Platform{" "}
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-coffee-bean-700 leading-relaxed font-medium">
            ResQSync is a city simulation platform that coordinates emergency
            cases, food, resources, NGOs, shelters and volunteers through
            priority-based decision making and safe resource allocation.
          </p>

          <p className="max-w-3xl mx-auto text-xs text-coffee-bean-600 leading-relaxed font-mono">
            It brings emergency response, surplus food management and volunteer
            coordination into one integrated system while demonstrating
            practical Operating System and DBMS concepts.
          </p>

          {/* Hero CTA Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-2 rounded-md bg-cherry-rose-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-cherry-rose-700 transition-all shadow-sm cursor-pointer hover:shadow-md"
            >
              <span>Login to System</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onGoToRegister}
              className="rounded-md bg-muted-teal-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-muted-teal-700 transition-all shadow-sm cursor-pointer hover:shadow-md"
            >
              Register
            </button>
          </div>
        </div>
      </section>

      {/* 3. QUICK SYSTEM OVERVIEW - COLORFUL METRIC CARDS */}
      <section className="border-b border-dust-grey-300 bg-dust-grey-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-7">
            <span className="text-[10px] font-mono uppercase tracking-wider text-coffee-bean-600 font-bold block">
              REAL-TIME SIMULATION METRICS
            </span>
            <h2 className="text-lg font-extrabold text-coffee-bean-950 mt-0.5">
              Quick System Overview
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 5 Active Emergencies - Cherry Rose */}
            <div className="bg-white border-2 border-cherry-rose-300 rounded-lg p-4 text-center shadow-xs hover:border-cherry-rose-500 transition-colors">
              <span className="text-3xl sm:text-4xl font-black font-mono text-cherry-rose-600 block">
                5
              </span>
              <span className="text-xs font-bold text-cherry-rose-900 mt-1 block">
                Active Emergencies
              </span>
              <span className="text-[10px] text-cherry-rose-600 font-mono mt-0.5 block font-medium">
                Floods, fires & medical
              </span>
            </div>

            {/* 1,250 Available Resources - Muted Teal */}
            <div className="bg-white border-2 border-muted-teal-300 rounded-lg p-4 text-center shadow-xs hover:border-muted-teal-500 transition-colors">
              <span className="text-3xl sm:text-4xl font-black font-mono text-muted-teal-700 block">
                1,250
              </span>
              <span className="text-xs font-bold text-muted-teal-900 mt-1 block">
                Available Resources
              </span>
              <span className="text-[10px] text-muted-teal-600 font-mono mt-0.5 block font-medium">
                Food, water, kits, cots
              </span>
            </div>

            {/* 32 Available Volunteers - Honey Bronze */}
            <div className="bg-white border-2 border-honey-bronze-300 rounded-lg p-4 text-center shadow-xs hover:border-honey-bronze-500 transition-colors">
              <span className="text-3xl sm:text-4xl font-black font-mono text-honey-bronze-600 block">
                32
              </span>
              <span className="text-xs font-bold text-honey-bronze-900 mt-1 block">
                Available Volunteers
              </span>
              <span className="text-[10px] text-honey-bronze-700 font-mono mt-0.5 block font-medium">
                Certified responders
              </span>
            </div>

            {/* 8 Active Missions - Coffee Bean */}
            <div className="bg-white border-2 border-coffee-bean-300 rounded-lg p-4 text-center shadow-xs hover:border-coffee-bean-500 transition-colors">
              <span className="text-3xl sm:text-4xl font-black font-mono text-coffee-bean-800 block">
                8
              </span>
              <span className="text-xs font-bold text-coffee-bean-950 mt-1 block">
                Active Missions
              </span>
              <span className="text-[10px] text-coffee-bean-600 font-mono mt-0.5 block font-medium">
                In pickup & transit
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROJECT MOTIVATION & PROBLEM STATEMENT (Based directly on user motivation brief) */}
      <section
        id="motivation"
        className="border-b border-dust-grey-300 bg-white py-16"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-coffee-bean-950 tracking-tight mt-1">
              Why ResQSync Was Built
            </h2>
            <p className="text-xs sm:text-sm text-coffee-bean-600 mt-2 font-medium">
              Understanding the critical coordination gap in emergency response,
              surplus food distribution, and municipal logistics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* The Coordination Challenge */}
            <div className="bg-dust-grey-100 border-2 border-dust-grey-300 rounded-xl p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-cherry-rose-100 border border-cherry-rose-300 px-2.5 py-1 text-xs font-bold text-cherry-rose-800">
                  <AlertTriangle className="h-4 w-4 text-cherry-rose-600" />
                  <span>The Real-World Challenge</span>
                </div>
                <h3 className="text-lg font-extrabold text-coffee-bean-950 leading-snug">
                  Fragmented Activities Lead to Delays & Waste
                </h3>
                <p className="text-xs sm:text-sm text-coffee-bean-700 leading-relaxed font-normal">
                  Emergency situations require quick decisions and proper
                  coordination of people and resources. Different emergency
                  cases have different levels of urgency, while resources such
                  as food, water, medicines, and volunteers are limited.
                </p>
                <p className="text-xs sm:text-sm text-coffee-bean-700 leading-relaxed font-normal">
                  If these activities are managed separately, it becomes
                  difficult to decide which emergency should be handled first
                  and how available resources should be used effectively.
                </p>
                <div className="bg-white border border-dust-grey-300 rounded-lg p-3 text-xs text-coffee-bean-800 space-y-1.5 font-medium">
                  <div className="text-cherry-rose-700 font-bold flex items-center gap-1.5">
                    <span>•</span> Surplus food wasted: Restaurants hold edible
                    meals while shelters experience shortages.
                  </div>
                  <div className="text-honey-bronze-800 font-bold flex items-center gap-1.5">
                    <span>•</span> Uncoordinated volunteers: Willing responders
                    lack dispatch guidance or duplicate efforts.
                  </div>
                  <div className="text-coffee-bean-900 font-bold flex items-center gap-1.5">
                    <span>•</span> Triage bottleneck: Critical life-threatening
                    cases compete with non-urgent requests.
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-dust-grey-300 text-[11px] font-mono text-coffee-bean-600">
                Without a unified system, delays and resource starvation occur.
              </div>
            </div>

            {/* The ResQSync Solution */}
            <div className="bg-muted-teal-50/50 border-2 border-muted-teal-300 rounded-xl p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md bg-muted-teal-100 border border-muted-teal-300 px-2.5 py-1 text-xs font-bold text-muted-teal-800">
                  <CheckCircle2 className="h-4 w-4 text-muted-teal-600" />
                  <span>The ResQSync Solution</span>
                </div>
                <h3 className="text-lg font-extrabold text-coffee-bean-950 leading-snug">
                  One Unified Simulation & Execution Platform
                </h3>
                <p className="text-xs sm:text-sm text-coffee-bean-800 leading-relaxed font-normal">
                  This motivated us to develop <strong>ResQSync</strong>, a
                  simulation-based system that brings emergency cases,
                  resources, surplus food, rescue missions, and volunteers
                  together into one platform.
                </p>
                <p className="text-xs sm:text-sm text-coffee-bean-800 leading-relaxed font-normal">
                  The system provides dedicated interfaces for{" "}
                  <strong>Admin</strong>, <strong>Restaurant</strong>,{" "}
                  <strong>NGO / Shelter</strong>, and <strong>Volunteer</strong>{" "}
                  users so that each participant can perform their respective
                  role seamlessly.
                </p>
              </div>

              <div className="pt-3 border-t border-muted-teal-200 text-[11px] font-mono text-muted-teal-800">
                ResQSync connects every stakeholder in a synchronized municipal
                lifecycle.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPECIFIC EMERGENCY TYPES MANAGED */}
      <section
        id="emergencies"
        className="border-b border-dust-grey-300 bg-dust-grey-50 py-16"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cherry-rose-600 font-bold block">
              CLASSIFIED EMERGENCY TRIAGE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-coffee-bean-950 tracking-tight mt-1">
              Specific Emergencies ResQSync Handles
            </h2>
            <p className="text-xs sm:text-sm text-coffee-bean-600 mt-2 font-medium">
              Every emergency has distinct priority weighting, required
              supplies, and personnel qualifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Floods */}
            <div className="bg-white border-2 border-cherry-rose-200 rounded-lg p-4 space-y-2.5 shadow-2xs hover:border-cherry-rose-400 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cherry-rose-600 text-white">
                  <Droplets className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono bg-cherry-rose-100 text-cherry-rose-800 border border-cherry-rose-300 px-2 py-0.5 rounded font-bold">
                  PRIORITY 1 (CRITICAL)
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-coffee-bean-950">
                Floods & Water Inundation
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                High-water rescues, potable drinking water purification kits,
                rescue rafts, and evacuation cots to temporary shelters.
              </p>
              <div className="text-[11px] font-mono text-cherry-rose-700 border-t border-dust-grey-200 pt-1.5 font-semibold">
                Required: Water Crates, Cots, Boats
              </div>
            </div>

            {/* Fires */}
            <div className="bg-white border-2 border-honey-bronze-300 rounded-lg p-4 space-y-2.5 shadow-2xs hover:border-honey-bronze-500 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-honey-bronze-500 text-white">
                  <Flame className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono bg-honey-bronze-100 text-honey-bronze-900 border border-honey-bronze-300 px-2 py-0.5 rounded font-bold">
                  PRIORITY 1 (CRITICAL)
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-coffee-bean-950">
                Structural & Wildfires
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Rapid perimeter evacuation, trauma burn dressing kits, emergency
                oxygen, and immediate volunteer logistic cordoning.
              </p>
              <div className="text-[11px] font-mono text-honey-bronze-800 border-t border-dust-grey-200 pt-1.5 font-semibold">
                Required: Medical Kits, Responders
              </div>
            </div>

            {/* Earthquakes */}
            <div className="bg-white border-2 border-coffee-bean-300 rounded-lg p-4 space-y-2.5 shadow-2xs hover:border-coffee-bean-500 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-coffee-bean-700 text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono bg-coffee-bean-100 text-coffee-bean-900 border border-coffee-bean-300 px-2 py-0.5 rounded font-bold">
                  PRIORITY 2 (HIGH)
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-coffee-bean-950">
                Earthquakes & Collapses
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Structural debris zone search, field shelter setup, ready-to-eat
                ration distribution, and mass transport vehicles.
              </p>
              <div className="text-[11px] font-mono text-coffee-bean-800 border-t border-dust-grey-200 pt-1.5 font-semibold">
                Required: Rations, Heavy Vehicles, Cots
              </div>
            </div>

            {/* Medical Emergencies */}
            <div className="bg-white border-2 border-muted-teal-300 rounded-lg p-4 space-y-2.5 shadow-2xs hover:border-muted-teal-500 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted-teal-600 text-white">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono bg-muted-teal-100 text-muted-teal-900 border border-muted-teal-300 px-2 py-0.5 rounded font-bold">
                  PRIORITY 1 (CRITICAL)
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-coffee-bean-950">
                Medical & Triage Crises
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Mass casualty medical incidents requiring immediate EMT
                volunteers, emergency medications, IV fluid crates, and patient
                transport.
              </p>
              <div className="text-[11px] font-mono text-muted-teal-800 border-t border-dust-grey-200 pt-1.5 font-semibold">
                Required: Trauma Meds, EMT Responders
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHAT RESQSYNC MANAGES - 4 CORE PILLARS */}
      <section
        id="what-we-manage"
        className="border-b border-dust-grey-300 bg-white py-14"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-coffee-bean-600 font-bold block">
              SYSTEM CAPABILITIES
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-coffee-bean-950 tracking-tight mt-1">
              What ResQSync Manages
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Emergency Management */}
            <div className="border border-cherry-rose-200 rounded-lg p-5 bg-cherry-rose-50/40 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cherry-rose-600 text-white shadow-xs">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-cherry-rose-950">
                Emergency Management
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Manage floods, fires, earthquakes and medical emergencies
                according to their urgency and priority.
              </p>
            </div>

            {/* Resource Allocation */}
            <div className="border border-muted-teal-200 rounded-lg p-5 bg-muted-teal-50/40 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted-teal-600 text-white shadow-xs">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-muted-teal-950">
                Resource Allocation
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Allocate limited food, water, medicines, vehicles and volunteers
                based on availability and emergency requirements.
              </p>
            </div>

            {/* Food Rescue */}
            <div className="border border-honey-bronze-200 rounded-lg p-5 bg-honey-bronze-50/40 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-honey-bronze-500 text-white shadow-xs">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-honey-bronze-950">
                Food Rescue
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Redirect usable surplus food from restaurants to NGOs, shelters
                and emergency-affected areas before it is wasted.
              </p>
            </div>

            {/* Volunteer Coordination */}
            <div className="border border-coffee-bean-200 rounded-lg p-5 bg-coffee-bean-50/40 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-coffee-bean-700 text-white shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-coffee-bean-950">
                Volunteer Coordination
              </h3>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Assign volunteers to rescue and delivery missions and track each
                mission from pickup to completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BUILT FOR COORDINATED RESPONSE (4 ROLES) */}
      <section
        id="roles"
        className="border-b border-dust-grey-300 bg-dust-grey-50 py-14"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-coffee-bean-600 font-bold block">
              MULTI-STAKEHOLDER ARCHITECTURE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-coffee-bean-950 tracking-tight mt-1">
              Built for Coordinated Response
            </h2>
            <p className="text-xs text-coffee-bean-600 mt-1 font-medium">
              Dedicated interfaces ensure each participant performs their role
              without system conflict.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Admin / City Controller */}
            <div className="bg-white border-2 border-coffee-bean-200 rounded-lg p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-coffee-bean-950">
                  Admin / City Controller
                </h3>
                <span className="text-[10px] font-mono bg-coffee-bean-800 text-white px-2.5 py-0.5 rounded font-bold">
                  ROLE 01
                </span>
              </div>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Monitor emergency cases, resources, volunteers, rescue missions
                and overall city operations.
              </p>
              <div className="pt-2 text-[11px] font-mono text-coffee-bean-600 border-t border-dust-grey-200">
                Key Views: City Grid Simulation, Banker's Safety Engine, Process Scheduler, Audit Ledger
              </div>
            </div>

            {/* Restaurant */}
            <div className="bg-white border-2 border-honey-bronze-300 rounded-lg p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-coffee-bean-950">
                  Restaurant
                </h3>
                <span className="text-[10px] font-mono bg-honey-bronze-600 text-white px-2.5 py-0.5 rounded font-bold">
                  ROLE 02
                </span>
              </div>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Add surplus food, manage available donations and track food
                pickup and delivery.
              </p>
              <div className="pt-2 text-[11px] font-mono text-coffee-bean-600 border-t border-dust-grey-200">
                Key Views: Surplus Food Registry, Expiry Alerts Trigger, 4-Stage
                Pickup Tracking
              </div>
            </div>

            {/* NGO / Shelter */}
            <div className="bg-white border-2 border-muted-teal-300 rounded-lg p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-coffee-bean-950">
                  NGO / Shelter
                </h3>
                <span className="text-[10px] font-mono bg-muted-teal-700 text-white px-2.5 py-0.5 rounded font-bold">
                  ROLE 03
                </span>
              </div>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Create resource requests, track allocated resources, confirm
                deliveries and manage shelter requirements.
              </p>
              <div className="pt-2 text-[11px] font-mono text-coffee-bean-600 border-t border-dust-grey-200">
                Key Views: Multi-Item Petitions, Inbound Manifest Verification,
                Bed Cot Occupancy
              </div>
            </div>

            {/* Volunteer */}
            <div className="bg-white border-2 border-cherry-rose-300 rounded-lg p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-coffee-bean-950">
                  Volunteer
                </h3>
                <span className="text-[10px] font-mono bg-cherry-rose-600 text-white px-2.5 py-0.5 rounded font-bold">
                  ROLE 04
                </span>
              </div>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                View and accept rescue missions, deliver resources, complete
                missions and earn rewards.
              </p>
              <div className="pt-2 text-[11px] font-mono text-coffee-bean-600 border-t border-dust-grey-200">
                Key Views: Mutex-Protected Mission Claim, 5-Stage Live Timeline,
                XP Badges & Leaderboard
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW RESQSYNC WORKS - 6 COLORFUL STEPS */}
      <section
        id="how-it-works"
        className="border-b border-dust-grey-300 bg-white py-14"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-coffee-bean-600 font-bold block">
              OPERATIONAL LIFECYCLE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-coffee-bean-950 tracking-tight mt-1">
              How ResQSync Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="border border-cherry-rose-200 rounded-lg p-4 bg-cherry-rose-50/50 space-y-1.5 shadow-2xs">
              <div className="font-mono text-xs font-bold text-cherry-rose-700">
                01. Emergency or Request Created
              </div>
              <p className="text-xs text-coffee-bean-700">
                An emergency case or resource requirement is submitted to the
                system.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-honey-bronze-200 rounded-lg p-4 bg-honey-bronze-50/50 space-y-1.5 shadow-2xs">
              <div className="font-mono text-xs font-bold text-honey-bronze-800">
                02. Priority Processing
              </div>
              <p className="text-xs text-coffee-bean-700">
                Critical and high-priority cases are processed before less
                urgent requests.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border border-muted-teal-200 rounded-lg p-4 bg-muted-teal-50/50 space-y-1.5 shadow-2xs">
              <div className="font-mono text-xs font-bold text-muted-teal-800">
                03. Safe Resource Allocation
              </div>
              <p className="text-xs text-coffee-bean-700">
                Available resources are checked and allocated according to
                priority and system safety.
              </p>
            </div>

            {/* Step 4 */}
            <div className="border border-coffee-bean-200 rounded-lg p-4 bg-coffee-bean-50/50 space-y-1.5 shadow-2xs">
              <div className="font-mono text-xs font-bold text-coffee-bean-900">
                04. Rescue Mission Assigned
              </div>
              <p className="text-xs text-coffee-bean-700">
                Suitable volunteers and required resources are assigned to the
                mission.
              </p>
            </div>

            {/* Step 5 */}
            <div className="border border-honey-bronze-200 rounded-lg p-4 bg-honey-bronze-50/50 space-y-1.5 shadow-2xs">
              <div className="font-mono text-xs font-bold text-honey-bronze-800">
                05. Pickup and Delivery
              </div>
              <p className="text-xs text-coffee-bean-700">
                The volunteer collects the allocated resources and delivers them
                to the required location.
              </p>
            </div>

            {/* Step 6 */}
            <div className="border border-muted-teal-200 rounded-lg p-4 bg-muted-teal-50/50 space-y-1.5 shadow-2xs">
              <div className="font-mono text-xs font-bold text-muted-teal-800">
                06. Mission Completed
              </div>
              <p className="text-xs text-coffee-bean-700">
                The mission is completed, system records are updated and
                volunteer rewards are generated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. OPERATING SYSTEM + DBMS INTEGRATION (Academic Core) */}
      <section
        id="os-dbms"
        className="border-b border-dust-grey-300 bg-white py-14"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-coffee-bean-600 font-bold block">
              ACADEMIC SOFTWARE ENGINEERING FOUNDATIONS
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-coffee-bean-950 tracking-tight mt-1">
              Operating System & DBMS Integration
            </h2>
            <p className="text-xs text-coffee-bean-600 mt-1 font-medium">
              Another motivation for the project is to apply concepts learned in
              Operating Systems and Database Management Systems to a practical
              emergency situation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OS Concepts */}
            <div className="border-2 border-cherry-rose-200 rounded-lg p-5 bg-cherry-rose-50/30 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-cherry-rose-200 pb-2.5">
                <Cpu className="h-5 w-5 text-cherry-rose-600" />
                <h3 className="text-sm font-extrabold text-cherry-rose-950">
                  Operating System Concepts
                </h3>
              </div>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                Emergency cases are treated as tasks and prioritized according
                to their urgency, demonstrating practical concepts:
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono text-coffee-bean-900">
                {[
                  "Process Management",
                  "CPU Priority Scheduling",
                  "Process State Transitions",
                  "Mutex Locks & Concurrency",
                  "Banker\u2019s Safety Algorithm",
                  "Deadlock Avoidance",
                  "Preemptive Triage Queue",
                  "Inter-Process IPC Signals",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-white p-2 rounded border border-cherry-rose-200 shadow-2xs"
                  >
                    <span className="text-cherry-rose-600 font-bold">›</span>
                    <span className="text-[11px] truncate font-semibold">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DBMS Concepts */}
            <div className="border-2 border-muted-teal-200 rounded-lg p-5 bg-muted-teal-50/30 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-muted-teal-200 pb-2.5">
                <Database className="h-5 w-5 text-muted-teal-700" />
                <h3 className="text-sm font-extrabold text-muted-teal-950">
                  Database Management Concepts
                </h3>
              </div>
              <p className="text-xs text-coffee-bean-700 leading-relaxed font-medium">
                The database manages users, resources, food donations, emergency
                cases, and rescue missions while maintaining data consistency:
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono text-coffee-bean-900">
                {[
                  "Relational Schema & 3NF",
                  "ACID Transaction Properties",
                  "Row-Level Concurrency Locks",
                  "Triggers on Surplus Expiry",
                  "Stored Allocation Procedures",
                  "Audit Logging Views",
                  "Integrity Constraints",
                  "Crash Recovery & Consistency",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-white p-2 rounded border border-muted-teal-200 shadow-2xs"
                  >
                    <span className="text-muted-teal-700 font-bold">›</span>
                    <span className="text-[11px] truncate font-semibold">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CORE SYSTEM FEATURES */}
      <section
        id="features"
        className="border-b border-dust-grey-300 bg-dust-grey-50 py-14"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-coffee-bean-600 font-bold block">
              SYSTEM CAPABILITIES
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-coffee-bean-950 tracking-tight mt-1">
              Core System Features
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {[
              "Priority-Based Emergency Management",
              "Simulated City Monitoring",
              "Food and Resource Management",
              "Surplus Food Rescue",
              "NGO and Shelter Requests",
              "Volunteer Rescue Missions",
              "Safe Resource Allocation",
              "Mission Tracking",
              "XP, Coins and Badges",
              "Volunteer Leaderboard",
              "Emergency Analytics",
              "City Health Score",
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white border border-dust-grey-300 rounded-md p-3 flex items-start gap-2 shadow-2xs hover:border-muted-teal-400 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 text-muted-teal-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-coffee-bean-900">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA BANNER */}
      <section className="bg-coffee-bean-900 text-white py-16 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Coordinate Resources. Prioritize Emergencies. Support Faster
            Response.
          </h2>
          <p className="text-xs sm:text-sm text-dust-grey-200 max-w-2xl mx-auto leading-relaxed">
            ResQSync provides a practical and controlled environment for
            understanding how emergency coordination can be combined with
            Operating System and DBMS concepts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onGoToLogin}
              className="rounded-md bg-cherry-rose-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-cherry-rose-700 transition-all shadow-sm cursor-pointer hover:shadow-md"
            >
              Login to System
            </button>
            <button
              onClick={onGoToRegister}
              className="rounded-md bg-muted-teal-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-muted-teal-700 transition-all shadow-sm cursor-pointer hover:shadow-md"
            >
              Register
            </button>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-coffee-bean-950 py-10 text-xs text-dust-grey-400 border-t border-coffee-bean-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-extrabold text-sm text-white">
                ResQSync
              </span>
              <p className="text-[11px] text-dust-grey-400 mt-0.5">
                Resource Coordination & Emergency Relief
              </p>
            </div>

            <div className="flex items-center gap-5 text-xs font-medium">
              <button
                onClick={() => scrollToSection("hero")}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("motivation")}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Why ResQSync
              </button>
              <button
                onClick={() => scrollToSection("emergencies")}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Emergencies
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="hover:text-white cursor-pointer transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={onGoToLogin}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Login
              </button>
              <button
                onClick={onGoToRegister}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Register
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-coffee-bean-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-dust-grey-500 font-mono">
            <span>Academic Emergency Response Simulation Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
