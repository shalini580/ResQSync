import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ShieldCheck, Flame, Utensils, CheckCircle2 } from "lucide-react";
export const RewardsView = () => {
  const { volunteers, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState("progress");
  const xp = currentUser?.xp || 1450;
  const coins = currentUser?.coins || 380;
  const level = currentUser?.level || 4;
  const completedMissions = 18;
  const nextLevelXp = level * 400;
  const currentLevelBase = (level - 1) * 400;
  const progressInLevel = xp - currentLevelBase;
  const neededForNext = Math.max(0, nextLevelXp - xp);
  const pct = Math.min(100, Math.round(progressInLevel / 400 * 100));
  const badges = [
    {
      id: "b-first",
      title: "First Rescue",
      desc: "Completed initial certified emergency relief mission.",
      earned: true,
      earnedAt: "2026-09-12",
      icon: CheckCircle2,
      color: "bg-muted-teal-600 text-white"
    },
    {
      id: "b-crit",
      title: "Critical Hero",
      desc: "Responded to 5+ Level 1 Critical incidents under high urgency.",
      earned: true,
      earnedAt: "2026-10-02",
      icon: ShieldCheck,
      color: "bg-cherry-rose-600 text-white"
    },
    {
      id: "b-food",
      title: "Food Saver",
      desc: "Diverted and delivered over 200kg of commercial surplus meals.",
      earned: true,
      earnedAt: "2026-10-06",
      icon: Utensils,
      color: "bg-honey-bronze-500 text-white"
    },
    {
      id: "b-streak",
      title: "Rescue Streak",
      desc: "Maintained 7 consecutive days of active dispatch readiness.",
      earned: false,
      progress: "4 / 7 days completed",
      icon: Flame,
      color: "bg-dust-grey-300 text-dust-grey-600"
    }
  ];
  const sortedLeaderboard = [...volunteers].sort((a, b) => b.xp - a.xp);
  return <div className="p-5 space-y-4">
      {
    /* Top Header */
  }
      <div className="bg-white border-2 border-dust-grey-300 rounded-lg p-4 shadow-2xs">
        <h2 className="text-base font-black text-coffee-bean-950 tracking-tight">
          Volunteer Recognition & Civic Ledger
        </h2>
        <p className="text-xs text-coffee-bean-600 mt-0.5 font-medium">
          Automatic gamification tiers awarded via backend stored procedures and database triggers
        </p>
      </div>

      {
    /* Tabs */
  }
      <div className="flex items-center gap-1.5 bg-white border border-dust-grey-300 rounded-lg p-2 shadow-2xs">
        {[
    { id: "progress", label: "1. Civic Progress" },
    { id: "badges", label: "2. Professional Badges" },
    { id: "leaderboard", label: "3. City Leaderboard" }
  ].map((tab) => {
    const isSelected = activeTab === tab.id;
    return <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${isSelected ? "bg-coffee-bean-900 text-white shadow-xs" : "text-coffee-bean-700 hover:bg-muted-teal-50 hover:text-coffee-bean-950"}`}
    >
              {tab.label}
            </button>;
  })}
      </div>

      {
    /* TAB 1: Progress */
  }
      {activeTab === "progress" && <div className="bg-white border-2 border-dust-grey-300 rounded-lg p-5 shadow-xs space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-dust-grey-300 rounded-lg p-3 bg-dust-grey-50 text-center">
              <span className="text-[10px] font-mono uppercase text-coffee-bean-500 block font-bold">Current Rank</span>
              <span className="text-xl font-black font-mono text-coffee-bean-950 mt-0.5 block">Level {level}</span>
              <span className="text-[10px] text-coffee-bean-600 font-semibold">Certified Responder</span>
            </div>

            <div className="border border-muted-teal-300 rounded-lg p-3 bg-muted-teal-50 text-center">
              <span className="text-[10px] font-mono uppercase text-muted-teal-800 block font-bold">Total Civic XP</span>
              <span className="text-xl font-black font-mono text-muted-teal-800 mt-0.5 block">{xp} XP</span>
              <span className="text-[10px] text-muted-teal-700 font-semibold">{neededForNext} XP to Level {level + 1}</span>
            </div>

            <div className="border border-honey-bronze-300 rounded-lg p-3 bg-honey-bronze-50 text-center">
              <span className="text-[10px] font-mono uppercase text-honey-bronze-800 block font-bold">Relief Coins</span>
              <span className="text-xl font-black font-mono text-honey-bronze-800 mt-0.5 block">{coins}</span>
              <span className="text-[10px] text-honey-bronze-700 font-semibold">Fuel & gear credits</span>
            </div>

            <div className="border border-cherry-rose-300 rounded-lg p-3 bg-cherry-rose-50 text-center">
              <span className="text-[10px] font-mono uppercase text-cherry-rose-700 block font-bold">Completed Missions</span>
              <span className="text-xl font-black font-mono text-cherry-rose-700 mt-0.5 block">{completedMissions}</span>
              <span className="text-[10px] text-cherry-rose-600 font-semibold">verified deployments</span>
            </div>
          </div>

          {
    /* Level Progress Bar */
  }
          <div className="space-y-2 border-t border-dust-grey-200 pt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-coffee-bean-900">
                Level {level} → Level {level + 1} Progress
              </span>
              <span className="font-mono text-coffee-bean-600 font-bold">
                {progressInLevel} / 400 XP ({pct}%)
              </span>
            </div>

            <div className="w-full h-3 bg-dust-grey-200 rounded-full overflow-hidden">
              <div
    className="h-full bg-honey-bronze-500 rounded-full transition-all duration-500 shadow-xs"
    style={{ width: `${pct}%` }}
  />
            </div>
            <p className="text-[11px] text-coffee-bean-600">
              Each completed relief delivery awards +150 XP and +30 Coins. Critical emergency missions award +250 XP.
            </p>
          </div>
        </div>}

      {
    /* TAB 2: Badges */
  }
      {activeTab === "badges" && <div className="bg-white border-2 border-dust-grey-300 rounded-lg p-5 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badges.map((b) => {
    const Icon = b.icon;
    return <div
      key={b.id}
      className={`border rounded-lg p-4 flex items-start gap-3.5 transition-all ${b.earned ? "border-dust-grey-300 bg-white shadow-2xs" : "border-dashed border-dust-grey-300 bg-dust-grey-50/60 opacity-80"}`}
    >
                  <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${b.color} shadow-xs`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-coffee-bean-950">{b.title}</h3>
                      {b.earned ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted-teal-100 text-muted-teal-800 font-bold">
                          EARNED
                        </span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dust-grey-200 text-dust-grey-700 font-bold">
                          LOCKED
                        </span>}
                    </div>
                    <p className="text-[11px] text-coffee-bean-700 font-medium">{b.desc}</p>
                    {b.earned && <span className="text-[10px] font-mono text-coffee-bean-500 block">
                        Awarded: {b.earnedAt}
                      </span>}
                    {b.progress && <span className="text-[10px] font-mono text-honey-bronze-700 block font-bold">
                        Progress: {b.progress}
                      </span>}
                  </div>
                </div>;
  })}
          </div>
        </div>}

      {
    /* TAB 3: Leaderboard */
  }
      {activeTab === "leaderboard" && <div className="bg-white border-2 border-dust-grey-300 rounded-lg p-5 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dust-grey-100 border-b border-dust-grey-300 text-[11px] font-mono text-coffee-bean-600 uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Volunteer</th>
                  <th className="py-2.5 px-3">Zone</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Civic XP</th>
                  <th className="py-2.5 px-3">Relief Coins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dust-grey-200">
                {sortedLeaderboard.map((v, i) => {
    const isCurrent = v.id === currentUser?.id || v.name === currentUser?.name;
    return <tr
      key={v.id}
      className={isCurrent ? "bg-muted-teal-50/70 font-bold" : "hover:bg-dust-grey-50"}
    >
                      <td className="py-2.5 px-3 font-mono">
                        {i === 0 ? "\u{1F947} #1" : i === 1 ? "\u{1F948} #2" : i === 2 ? "\u{1F949} #3" : `#${i + 1}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-coffee-bean-950 font-bold">{v.name}</span>
                        {isCurrent && <span className="ml-2 text-[10px] font-mono text-muted-teal-700 bg-muted-teal-100 px-1.5 py-0.2 rounded font-bold">
                            YOU
                          </span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-coffee-bean-600">{v.zone}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-coffee-bean-800">Lvl {v.level}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-teal-800 font-bold">{v.xp} XP</td>
                      <td className="py-2.5 px-3 font-mono text-honey-bronze-700 font-bold">{v.coins}</td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>
        </div>}
    </div>;
};
