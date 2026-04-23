import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const inputCls = `w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all
  bg-slate-100 dark:bg-slate-800/70
  border border-slate-200 dark:border-slate-700
  text-slate-900 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10`;

function SettingSection({ title, children }) {
  return (
    <div className="p-6 rounded-2xl space-y-4
                    bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                    border border-white/60 dark:border-slate-700/50 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800/60"
          style={{ fontFamily: "'Outfit', sans-serif" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldRow({ label, id, type = "text", defaultValue, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      <input id={id} type={type} defaultValue={defaultValue} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

export default function Settings() {
  const { theme, toggle } = useTheme();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-[540px] space-y-5">

      {/* Profile */}
      <SettingSection title="👤 Profile">
        <FieldRow id="settings-name"  label="Full Name"       type="text"  defaultValue={localStorage.getItem("userName") || ""} />
        <FieldRow id="settings-email" label="Email Address"   type="email" defaultValue={localStorage.getItem("userEmail") || ""} />
        <FieldRow id="settings-phone" label="Phone (optional)" type="tel"  placeholder="+91 98765 43210" />
      </SettingSection>

      {/* Security */}
      <SettingSection title="🔒 Security">
        <FieldRow id="settings-cur-password" label="Current Password"  type="password" placeholder="••••••••" />
        <FieldRow id="settings-new-password" label="New Password"      type="password" placeholder="••••••••" />
        <FieldRow id="settings-cnf-password" label="Confirm Password"  type="password" placeholder="••••••••" />
      </SettingSection>

      {/* Tracking preferences */}
      <SettingSection title="⚙️ Tracking Preferences">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-interval" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Price Check Interval
          </label>
          <select
            id="settings-interval"
            className={`${inputCls} cursor-pointer`}
          >
            <option>Every 30 minutes</option>
            <option>Every 1 hour</option>
            <option>Every 6 hours</option>
            <option>Every 12 hours</option>
            <option>Every 24 hours</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          {[
            { id: "notify-email",  label: "Email alerts when price drops"              },
            { id: "notify-push",   label: "Browser push notifications"                 },
            { id: "notify-weekly", label: "Weekly price summary digest"                },
          ].map(({ id, label }) => (
            <label key={id} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                id={id}
                type="checkbox"
                defaultChecked={id === "notify-email"}
                className="accent-violet-600 w-4 h-4 rounded cursor-pointer"
              />
              {label}
            </label>
          ))}
        </div>
      </SettingSection>

      {/* Appearance */}
      <SettingSection title="🎨 Appearance">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl
                        bg-slate-100 dark:bg-slate-800/50
                        border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Currently using {theme} theme
            </p>
          </div>
          <button
            id="settings-theme-btn"
            onClick={toggle}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all
                       border border-slate-300 dark:border-slate-600
                       text-slate-600 dark:text-slate-300
                       hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400
                       hover:bg-violet-50 dark:hover:bg-violet-900/20"
          >
            Switch to {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </SettingSection>

      {/* Save + feedback */}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                        bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40
                        text-emerald-600 dark:text-emerald-400">
          ✅ Settings saved successfully!
        </div>
      )}
      <button
        id="settings-save-btn"
        onClick={handleSave}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white cursor-pointer
                   bg-gradient-to-r from-violet-600 to-violet-400
                   shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                   hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
      >
        Save All Changes
      </button>
    </div>
  );
}
