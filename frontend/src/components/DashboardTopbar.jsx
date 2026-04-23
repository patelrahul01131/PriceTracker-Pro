import { useTheme } from "../context/ThemeContext";
import { NAV_ITEMS } from "./Sidebar";

const IcSearch = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function DashboardTopbar({ page, search, setSearch }) {
  const { theme, toggle } = useTheme();
  const currentPage = NAV_ITEMS.find((n) => n.id === page);

  const userName = localStorage.getItem("userName") || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 h-16
                       bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                       border-b border-slate-200/80 dark:border-slate-700/50
                       shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      {/* Page title */}
      <div>
        <h2
          className="text-base font-bold text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {currentPage?.label ?? "Dashboard"}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Welcome back, {userName.split(" ")[0]} 👋
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Search — hidden on mobile */}
        <div className="relative hidden sm:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <IcSearch />
          </span>
          <input
            id="topbar-search"
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52 pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all
                       bg-slate-100 dark:bg-slate-800/70
                       border border-slate-200 dark:border-slate-700
                       text-slate-800 dark:text-slate-100
                       placeholder-slate-400 dark:placeholder-slate-500
                       focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
          />
        </div>

        {/* Theme toggle */}
        <button
          id="topbar-theme-btn"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base cursor-pointer
                     bg-slate-100 dark:bg-slate-800/70
                     border border-slate-200 dark:border-slate-700
                     hover:border-violet-400 hover:scale-110 transition-all duration-200"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* User avatar */}
        <div
          id="user-avatar"
          className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-violet-400
                     flex items-center justify-center text-white text-sm font-bold
                     cursor-pointer shadow-md shadow-violet-500/30 shrink-0"
        >
          {userInitials}
        </div>
      </div>
    </header>
  );
}
