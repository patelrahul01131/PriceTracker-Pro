import { useNavigate } from "react-router-dom";

const IcDashboard = () => (
  <svg
    className="w-[18px] h-[18px] shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IcList = () => (
  <svg
    className="w-[18px] h-[18px] shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IcBell = () => (
  <svg
    className="w-[18px] h-[18px] shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IcSettings = () => (
  <svg
    className="w-[18px] h-[18px] shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IcLogout = () => (
  <svg
    className="w-[18px] h-[18px] shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", Icon: IcDashboard }, 
  { id: "settings", label: "Settings", Icon: IcSettings },
];

export default function Sidebar({ page, setPage }) {
  const navigate = useNavigate();

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col gap-1 p-4
                      bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                      border-r border-slate-200/80 dark:border-slate-700/50
                      shadow-[4px_0_24px_rgba(0,0,0,0.04)]"
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-slate-200 dark:border-slate-700/60">
        <div
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400
                        flex items-center justify-center text-sm shadow-md shadow-violet-500/40"
        >
          📊
        </div>
        <span
          className="grad-text font-extrabold text-lg"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          PriceWatch
        </span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`nav-${id}`}
          onClick={() => setPage(id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      cursor-pointer transition-all duration-200 text-left
            ${
              page === id
                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
        >
          <Icon /> {label}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <button
        id="sidebar-logout-btn"
        onClick={() => {
          localStorage.removeItem("token");
          navigate("/login");
        }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                   cursor-pointer transition-all duration-200
                   text-slate-400 dark:text-slate-500
                   hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
      >
        <IcLogout /> Logout
      </button>
    </aside>
  );
}
