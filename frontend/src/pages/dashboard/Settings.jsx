import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

const inputCls = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200
  bg-slate-50 dark:bg-slate-800/40
  border border-slate-200 dark:border-slate-700/60
  text-slate-900 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus:bg-white dark:focus:bg-slate-800/80
  focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10`;

function SettingSection({ title, icon, children }) {
  return (
    <div className="p-6 md:p-8 rounded-3xl space-y-6
                    bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl
                    border border-white/60 dark:border-slate-700/50 
                    shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight"
            style={{ fontFamily: "'Outfit', sans-serif" }}>
          {title}
        </h3>
      </div>
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, id, type = "text", value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      <input 
        id={id} 
        type={type} 
        value={value} 
        onChange={onChange}
        placeholder={placeholder} 
        className={inputCls} 
      />
    </div>
  );
}

export default function Settings() {
  const { theme, toggle } = useTheme();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    trackingPreferences: {
      interval: "Every 24 hours",
      notifyEmail: true,
      notifyPush: false,
      notifyWeekly: false
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = res.data.user;
        setFormData(prev => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          trackingPreferences: user.trackingPreferences || prev.trackingPreferences
        }));
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    
    if (id.startsWith("notify-")) {
      const key = id.replace("notify-", "notify");
      setFormData(prev => ({
        ...prev,
        trackingPreferences: { ...prev.trackingPreferences, [key]: checked }
      }));
    } else if (id === "settings-interval") {
      setFormData(prev => ({
        ...prev,
        trackingPreferences: { ...prev.trackingPreferences, interval: value }
      }));
    } else {
      const key = id.replace("settings-", "");
      setFormData(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    setMsg({ type: "", text: "" });

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        trackingPreferences: formData.trackingPreferences
      };

      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const res = await axios.put("http://localhost:3000/api/auth/me", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local storage if name changed
      if (res.data.user.name) {
        localStorage.setItem("userName", res.data.user.name);
      }

      setMsg({ type: "success", text: "Settings saved successfully!" });
      
      // clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Failed to update settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ type: "", text: "" }), 4000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[600px] animate-pulse space-y-6">
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[750px] space-y-8 pb-12 mx-auto">

      <div className="space-y-1">
        <h1 className="text-center text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Account Settings
        </h1>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Manage your personal information, security, and preferences.
        </p>
      </div>

      {/* Profile */}
      <SettingSection title="Personal Information" icon="👤">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow id="settings-name" label="Full Name" type="text" value={formData.name} onChange={handleChange} />
          <FieldRow id="settings-email" label="Email Address" type="email" value={formData.email} onChange={handleChange} />
        </div>
      </SettingSection>

      {/* Security */}
      <SettingSection title="Security & Passwords" icon="🔒">
        <FieldRow id="settings-currentPassword" label="Current Password" type="password" placeholder="••••••••" value={formData.currentPassword} onChange={handleChange} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow id="settings-newPassword" label="New Password" type="password" placeholder="••••••••" value={formData.newPassword} onChange={handleChange} />
          <FieldRow id="settings-confirmPassword" label="Confirm Password" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
        </div>
        <p className="text-xs text-slate-400 pl-1">Leave blank if you don't want to change your password.</p>
      </SettingSection>

      {/* Tracking preferences */}
      <SettingSection title="Tracking Preferences" icon="⚙️">
        <div className="flex flex-col gap-2">
          <label htmlFor="settings-interval" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
            Price Check Interval
          </label>
          <select
            id="settings-interval"
            value={formData.trackingPreferences.interval}
            onChange={handleChange}
            className={`${inputCls} cursor-pointer appearance-none`}
          >
            <option value="Every 30 minutes">Every 30 minutes</option>
            <option value="Every 1 hour">Every 1 hour</option>
            <option value="Every 6 hours">Every 6 hours</option>
            <option value="Every 12 hours">Every 12 hours</option>
            <option value="Every 24 hours">Every 24 hours</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
          {[
            { id: "notify-Email", prop: "notifyEmail", label: "Email alerts when price drops" },
            { id: "notify-Push", prop: "notifyPush", label: "Browser push notifications" },
            { id: "notify-Weekly", prop: "notifyWeekly", label: "Weekly price summary digest" },
          ].map(({ id, prop, label }) => (
            <label key={id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                id={id}
                type="checkbox"
                checked={formData.trackingPreferences[prop]}
                onChange={handleChange}
                className="accent-violet-600 w-4 h-4 rounded cursor-pointer"
              />
              {label}
            </label>
          ))}
        </div>
      </SettingSection>

      {/* Appearance */}
      <SettingSection title="Appearance" icon="🎨">
        <div className="flex items-center justify-between p-5 rounded-2xl
                        bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/60
                        border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
              {theme === "dark" ? "🌙" : "☀️"}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Switch to {theme === "dark" ? "light" : "dark"} interface
              </p>
            </div>
          </div>
          <button
            id="settings-theme-btn"
            onClick={toggle}
            className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all
                       bg-white dark:bg-slate-800 shadow-sm
                       border border-slate-200 dark:border-slate-600
                       text-slate-700 dark:text-slate-200
                       hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400
                       active:scale-95"
          >
            Toggle Theme
          </button>
        </div>
      </SettingSection>

      {/* Save + feedback */}
      <div className="sticky bottom-6 z-10 p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_10px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgb(0,0,0,0.3)] flex flex-col gap-4">
        {msg.text && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold
                          ${msg.type === "success" 
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400"}`}>
            {msg.type === "success" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}
        <button
          id="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl font-bold text-white cursor-pointer
                     bg-gradient-to-r from-violet-600 to-violet-500
                     shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50
                     hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200
                     disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
        >
          {saving ? (
            <>
              <span className="anim-spin w-5 h-5 rounded-full border-2 border-white/30 border-t-white inline-block" />
              Saving Changes...
            </>
          ) : (
            "Save All Changes"
          )}
        </button>
      </div>

    </div>
  );
}
