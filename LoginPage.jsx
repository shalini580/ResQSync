import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ArrowRight, Lock, Mail } from "lucide-react";
export const LoginPage = ({ onGoToRegister, onBackToLanding }) => {
  const { login } = useApp();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState(null);
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === "admin") setEmail("admin@gmail.com");
    else if (newRole === "restaurant") setEmail("marcus@gmail.com");
    else if (newRole === "ngo") setEmail("shantingo@gmail.com");
    else if (newRole === "volunteer") setEmail("alex@gmail.com");
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter a valid email address");
      return;
    }
    const ok = login(email, role);
    if (!ok) {
      setError("Login failed. Please check credentials.");
    }
  };
  return <div className="min-h-screen bg-dust-grey-50 flex flex-col justify-center items-center p-4 selection:bg-muted-teal-200">
      <div className="w-full max-w-md bg-white border-2 border-dust-grey-300 rounded-xl shadow-md p-6 md:p-8">
        {onBackToLanding && <div className="mb-4">
            <button
    type="button"
    onClick={onBackToLanding}
    className="text-xs text-coffee-bean-600 hover:text-coffee-bean-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
  >
              ← Back to Home
            </button>
          </div>}

        {
    /* System Title */
  }
        <div className="text-center mb-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-cherry-rose-600 text-white font-mono font-black text-lg mb-2 shadow-xs ring-2 ring-cherry-rose-200">
            RS
          </div>
          <h1 className="text-xl font-extrabold text-coffee-bean-950 tracking-tight">
            ResQSync
          </h1>
          <p className="text-xs text-coffee-bean-600 mt-1 font-medium">
             Resource Coordination & Emergency Relief Simulation
          </p>
        </div>

        {error && <div className="mb-4 rounded-md border border-cherry-rose-300 bg-cherry-rose-50 p-2.5 text-xs text-cherry-rose-800 font-medium">
            {error}
          </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {
    /* Role selector */
  }
          <div>
            <label className="block text-xs font-bold text-coffee-bean-800 mb-1.5">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
    { r: "admin", label: "Admin / Controller", activeColor: "border-coffee-bean-900 bg-coffee-bean-900 text-white" },
    { r: "restaurant", label: "Restaurant Partner", activeColor: "border-honey-bronze-600 bg-honey-bronze-500 text-white" },
    { r: "ngo", label: "NGO / Shelter", activeColor: "border-muted-teal-700 bg-muted-teal-600 text-white" },
    { r: "volunteer", label: "Volunteer Responder", activeColor: "border-cherry-rose-600 bg-cherry-rose-600 text-white" }
  ].map(({ r, label, activeColor }) => {
    const isSelected = role === r;
    return <button
      key={r}
      type="button"
      onClick={() => handleRoleChange(r)}
      className={`px-3 py-2 text-xs rounded-md border text-left font-bold transition-all cursor-pointer ${isSelected ? `${activeColor} shadow-xs` : "border-dust-grey-300 bg-white text-coffee-bean-800 hover:bg-dust-grey-50"}`}
    >
                    {label}
                  </button>;
  })}
            </div>
          </div>

          {
    /* Email */
  }
          <div>
            <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-coffee-bean-400" />
              <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 pl-9 pr-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:ring-1 focus:ring-cherry-rose-600 focus:outline-none font-medium"
    placeholder="name@organization.org"
    required
  />
            </div>
          </div>

          {
    /* Password */
  }
          <div>
            <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-coffee-bean-400" />
              <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 pl-9 pr-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:ring-1 focus:ring-cherry-rose-600 focus:outline-none font-medium"
    placeholder="••••••••"
    required
  />
            </div>
          </div>

          {
    /* Submit */
  }
          <button
    type="submit"
    className="w-full flex items-center justify-center gap-2 rounded-md bg-cherry-rose-600 py-2.5 text-xs font-bold text-white hover:bg-cherry-rose-700 transition-all cursor-pointer shadow-xs hover:shadow-md mt-2"
  >
            <span>Sign In to Terminal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {
    /* Evaluation quick presets */
  }
        <div className="mt-6 pt-5 border-t border-dust-grey-200">
          <div className="text-[11px] font-bold text-coffee-bean-600 uppercase tracking-wider mb-2 font-mono">
            Demo Evaluation Accounts:
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
    type="button"
    onClick={() => handleRoleChange("admin")}
    className="text-left p-2 rounded-md border border-dust-grey-300 bg-dust-grey-50 hover:bg-dust-grey-100 cursor-pointer transition-colors"
  >
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-coffee-bean-900" />
                <span className="font-bold block text-coffee-bean-900">Admin</span>
              </div>
              <span className="text-coffee-bean-600 text-[10px] block mt-0.5">City Controller</span>
            </button>
            <button
    type="button"
    onClick={() => handleRoleChange("restaurant")}
    className="text-left p-2 rounded-md border border-dust-grey-300 bg-dust-grey-50 hover:bg-dust-grey-100 cursor-pointer transition-colors"
  >
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-honey-bronze-500" />
                <span className="font-bold block text-coffee-bean-900">Restaurant</span>
              </div>
              <span className="text-coffee-bean-600 text-[10px] block mt-0.5">Metro Central Kitchen</span>
            </button>
            <button
    type="button"
    onClick={() => handleRoleChange("ngo")}
    className="text-left p-2 rounded-md border border-dust-grey-300 bg-dust-grey-50 hover:bg-dust-grey-100 cursor-pointer transition-colors"
  >
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-teal-500" />
                <span className="font-bold block text-coffee-bean-900">NGO / Shelter</span>
              </div>
              <span className="text-coffee-bean-600 text-[10px] block mt-0.5">Hope Shelter</span>
            </button>
            <button
    type="button"
    onClick={() => handleRoleChange("volunteer")}
    className="text-left p-2 rounded-md border border-dust-grey-300 bg-dust-grey-50 hover:bg-dust-grey-100 cursor-pointer transition-colors"
  >
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cherry-rose-600" />
                <span className="font-bold block text-coffee-bean-900">Volunteer</span>
              </div>
              <span className="text-coffee-bean-600 text-[10px] block mt-0.5">Alex Rivera (V12)</span>
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
    type="button"
    onClick={onGoToRegister}
    className="text-xs text-cherry-rose-700 hover:text-cherry-rose-900 underline font-bold cursor-pointer"
  >
              Register as Restaurant, NGO or Volunteer
            </button>
          </div>
        </div>
      </div>

      
    </div>;
};
