import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { ArrowLeft } from "lucide-react";
export const RegisterPage = ({ onBackToLogin, onBackToLanding }) => {
  const { registerUser } = useApp();
  const [role, setRole] = useState("restaurant");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [zone, setZone] = useState("Zone A");
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("NGO");
  const [ngoAddress, setNgoAddress] = useState("");
  const [shelterCapacity, setShelterCapacity] = useState("100");
  const [skills, setSkills] = useState("First Aid EMT, Food Logistics, Driver");
  const [availability, setAvailability] = useState("Available");
  const [error, setError] = useState(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!name || !email) {
      setError("Please fill in required fields.");
      return;
    }
    if (role === "restaurant" && !restaurantName) {
      setError("Please provide Restaurant Name.");
      return;
    }
    if (role === "ngo" && !orgName) {
      setError("Please provide Organisation Name.");
      return;
    }
    registerUser({
      name,
      email,
      phone,
      role,
      zone,
      orgName: role === "restaurant" ? restaurantName : role === "ngo" ? orgName : void 0,
      orgType: role === "restaurant" ? "Restaurant" : orgType,
      shelterCapacity: role === "ngo" && orgType.includes("Shelter") ? parseInt(shelterCapacity, 10) : void 0,
      skills: role === "volunteer" ? skills.split(",").map((s) => s.trim()) : void 0,
      availability: role === "volunteer" ? availability : void 0
    });
  };
  return <div className="min-h-screen bg-dust-grey-50 flex flex-col justify-center items-center p-4 selection:bg-muted-teal-200">
      <div className="w-full max-w-xl bg-white border-2 border-dust-grey-300 rounded-xl shadow-md p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 border-b border-dust-grey-200 pb-4">
          <div>
            <h1 className="text-lg font-black text-coffee-bean-950 tracking-tight">
              Register New Organization / Responder
            </h1>
            <p className="text-xs text-coffee-bean-600 mt-0.5 font-medium">
              Civic Emergency Operations Network
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onBackToLanding && <button
    type="button"
    onClick={onBackToLanding}
    className="text-xs text-coffee-bean-700 hover:text-coffee-bean-950 font-bold cursor-pointer transition-colors"
  >
                Home
              </button>}
            <button
    onClick={onBackToLogin}
    className="flex items-center gap-1 text-xs text-cherry-rose-700 hover:text-cherry-rose-900 font-bold cursor-pointer transition-colors"
  >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </button>
          </div>
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
              Select Registration Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
    { r: "restaurant", label: "Restaurant / Donor", activeColor: "border-honey-bronze-600 bg-honey-bronze-500 text-white" },
    { r: "ngo", label: "NGO / Shelter", activeColor: "border-muted-teal-700 bg-muted-teal-600 text-white" },
    { r: "volunteer", label: "Volunteer Responder", activeColor: "border-cherry-rose-600 bg-cherry-rose-600 text-white" }
  ].map(({ r, label, activeColor }) => {
    const isSelected = role === r;
    return <button
      key={r}
      type="button"
      onClick={() => setRole(r)}
      className={`px-3 py-2 text-xs rounded-md border text-center font-bold transition-all cursor-pointer ${isSelected ? `${activeColor} shadow-xs` : "border-dust-grey-300 bg-white text-coffee-bean-800 hover:bg-dust-grey-50"}`}
    >
                    {label}
                  </button>;
  })}
            </div>
          </div>

          {
    /* Common fields */
  }
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                Full Name / Contact Person *
              </label>
              <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:ring-1 focus:ring-cherry-rose-600 focus:outline-none font-medium"
    placeholder="Marcus Brody"
    required
  />
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                Official Email Address *
              </label>
              <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:ring-1 focus:ring-cherry-rose-600 focus:outline-none font-medium"
    placeholder="marcus@metrokitchen.org"
    required
  />
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                Emergency Contact Phone *
              </label>
              <input
    type="tel"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:ring-1 focus:ring-cherry-rose-600 focus:outline-none font-medium"
    placeholder="+1 (555) 234-5678"
    required
  />
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                City Municipal Zone *
              </label>
              <select
    value={zone}
    onChange={(e) => setZone(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs bg-white text-coffee-bean-950 focus:border-cherry-rose-600 focus:ring-1 focus:ring-cherry-rose-600 focus:outline-none font-medium"
  >
                <option value="Zone A">Zone A - Downtown & Riverfront</option>
                <option value="Zone B">Zone B - East Industrial District</option>
                <option value="Zone C">Zone C - North Hills Residential</option>
                <option value="Zone D">Zone D - South Harbor & Logistics</option>
              </select>
            </div>
          </div>

          {
    /* Restaurant specific fields */
  }
          {role === "restaurant" && <div className="space-y-3 pt-2 border-t border-dust-grey-200">
              <div className="text-[11px] font-mono uppercase text-honey-bronze-700 font-extrabold">
                Restaurant Donation Partner Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                    Kitchen / Restaurant Name *
                  </label>
                  <input
    type="text"
    value={restaurantName}
    onChange={(e) => setRestaurantName(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-honey-bronze-600 focus:outline-none font-medium"
    placeholder="Metro Central Kitchen"
    required
  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                    Pickup Street Address
                  </label>
                  <input
    type="text"
    value={restaurantAddress}
    onChange={(e) => setRestaurantAddress(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-honey-bronze-600 focus:outline-none font-medium"
    placeholder="124 Commercial Blvd, Zone A"
  />
                </div>
              </div>
            </div>}

          {
    /* NGO specific fields */
  }
          {role === "ngo" && <div className="space-y-3 pt-2 border-t border-dust-grey-200">
              <div className="text-[11px] font-mono uppercase text-muted-teal-800 font-extrabold">
                NGO / Shelter Organization Profile
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                    Organisation Name *
                  </label>
                  <input
    type="text"
    value={orgName}
    onChange={(e) => setOrgName(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-muted-teal-600 focus:outline-none font-medium"
    placeholder="Hope Relief & Shelter Center"
    required
  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                    Organization Type
                  </label>
                  <select
    value={orgType}
    onChange={(e) => setOrgType(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs bg-white text-coffee-bean-950 focus:border-muted-teal-600 focus:outline-none font-medium"
  >
                    <option value="NGO">NGO </option>
                    <option value="Emergency Shelter">Emergency Shelter Facility</option>
                    <option value="Community Kitchen">Community Kitchen & Food Bank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                    Shelter Bed Capacity
                  </label>
                  <input
    type="number"
    value={shelterCapacity}
    onChange={(e) => setShelterCapacity(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-muted-teal-600 focus:outline-none font-medium"
    placeholder="150"
  />
                </div>
              </div>
            </div>}

          {
    /* Volunteer specific fields */
  }
          {role === "volunteer" && <div className="space-y-3 pt-2 border-t border-dust-grey-200">
              <div className="text-[11px] font-mono uppercase text-cherry-rose-700 font-extrabold">
                Volunteer Skills & Deployment Status
              </div>
              <div>
                <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                  Skills & Certifications (Comma separated)
                </label>
                <input
    type="text"
    value={skills}
    onChange={(e) => setSkills(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:outline-none font-medium"
    placeholder="First Aid EMT, Search & Rescue, Heavy Truck Driver"
  />
              </div>
              <div>
                <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                  Current Availability
                </label>
                <select
    value={availability}
    onChange={(e) => setAvailability(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs bg-white text-coffee-bean-950 focus:border-cherry-rose-600 focus:outline-none font-medium"
  >
                  <option value="Available">Available for immediate mission dispatch</option>
                  <option value="Busy">Currently on standby / training</option>
                </select>
              </div>
            </div>}

          {
    /* Password fields */
  }
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                Password *
              </label>
              <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:outline-none font-medium"
    placeholder="••••••••"
    required
  />
            </div>
            <div>
              <label className="block text-xs font-bold text-coffee-bean-800 mb-1">
                Confirm Password *
              </label>
              <input
    type="password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="w-full rounded-md border border-dust-grey-300 py-2 px-3 text-xs text-coffee-bean-950 focus:border-cherry-rose-600 focus:outline-none font-medium"
    placeholder="••••••••"
    required
  />
            </div>
          </div>

          <button
    type="submit"
    className="w-full rounded-md bg-cherry-rose-600 py-2.5 text-xs font-bold text-white hover:bg-cherry-rose-700 transition-all cursor-pointer shadow-xs hover:shadow-md mt-3"
  >
            Submit Registration
          </button>
        </form>
      </div>
    </div>;
};
