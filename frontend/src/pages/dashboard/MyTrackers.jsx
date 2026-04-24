import { useState } from "react";

const IcAdd     = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcTrash   = () => <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcRefresh = () => <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>;
const IcLink    = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;

const inr = (n) => "₹" + n.toLocaleString("en-IN");

const TABLE_HEADERS = ["Product", "Current Price", "Change", "Status", "Last Check", "Actions"];

export default function MyTrackers({ products, setProducts, searchTerm }) {
  const [urlInput, setUrlInput] = useState("");
  const [adding, setAdding]     = useState(false);
  const [msg, setMsg]           = useState("");

  const addTracker = async () => {
    if (!urlInput.trim()) { setMsg("error:Please enter a product URL."); return; }
    try { new URL(urlInput); } catch { setMsg("error:Please enter a valid URL."); return; }
    setAdding(true); setMsg("");
    await new Promise((r) => setTimeout(r, 1100));
    const hostname = new URL(urlInput).hostname;
    setProducts((p) => [{
      id: Date.now(), name: `New Product — ${hostname}`, site: hostname,
      emoji: "🛒", cur: 0, old: 0, status: "active", trend: "neutral", last: "Just now", alert: 0,
    }, ...p]);
    setUrlInput("");
    setAdding(false);
    setMsg("success:Tracker added! Price check will begin shortly.");
    setTimeout(() => setMsg(""), 4000);
  };

  const removeProduct = (id) => setProducts((p) => p.filter((x) => x.id !== id));

  const filtered = products.filter((p) => {
    const term = (searchTerm || "").toLowerCase();
    if (!term) return true;
    return p.name?.toLowerCase().includes(term) || p.platform?.toLowerCase().includes(term);
  });

  const isError = msg.startsWith("error:");
  const msgText = msg.replace(/^(success|error):/, "");

  return (
    <div className="space-y-5">
      {/* URL input card */}
      <div className="p-5 rounded-2xl
                      bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                      border border-white/60 dark:border-slate-700/50 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">➕ Add a new tracker</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Paste any product URL from Amazon, Flipkart, Myntra, Croma, and more.
        </p>
        <div className="flex gap-2">
          <input
            id="trackers-url-input"
            type="url"
            placeholder="https://www.amazon.in/dp/..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all
                       bg-slate-100 dark:bg-slate-800/70
                       border border-slate-200 dark:border-slate-700
                       text-slate-900 dark:text-slate-100
                       placeholder-slate-400 dark:placeholder-slate-500
                       focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setMsg(""); }}
            onKeyDown={(e) => e.key === "Enter" && addTracker()}
          />
          <button
            id="trackers-add-btn"
            onClick={addTracker}
            disabled={adding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold
                       text-white cursor-pointer whitespace-nowrap
                       bg-gradient-to-r from-violet-600 to-violet-400
                       shadow-md shadow-violet-500/25 hover:shadow-violet-500/40
                       hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200
                       disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {adding
              ? <span className="anim-spin w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block" />
              : <><IcAdd /> Track Price</>}
          </button>
        </div>
        {msg && (
          <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-sm font-medium
            ${isError
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400"
              : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400"}`}>
            {isError ? "⚠️" : "✅"} {msgText}
          </div>
        )}
      </div>

      {/* Full tracker table */}
      <div className="rounded-2xl overflow-hidden
                      bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                      border border-white/60 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            🗂️ All Tracked Products
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold">
            {filtered.length} total
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              {searchTerm ? "No results for your search." : "No trackers yet. Add a URL above!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const d   = p.cur - p.old;
                  const pct = p.old ? ((d / p.old) * 100).toFixed(1) : 0;
                  return (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800/40 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors">
                      {/* Product */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg shrink-0">
                            {p.emoji}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 max-w-[180px] truncate">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                              <IcLink />{p.site}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                        {p.cur > 0 ? inr(p.cur) : <span className="text-slate-400 text-xs animate-pulse">Fetching…</span>}
                      </td>

                      {/* Change */}
                      <td className="px-5 py-3 text-sm font-semibold">
                        {p.old > 0 ? (
                          <span className={d < 0 ? "text-emerald-600" : d > 0 ? "text-red-500" : "text-slate-400"}>
                            {d < 0 ? "▼" : d > 0 ? "▲" : "—"}{" "}
                            {d !== 0 ? inr(Math.abs(d)) : "No change"}
                            {d !== 0 && <span className="ml-1 opacity-60 text-xs">({pct}%)</span>}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                          ${p.status === "active"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>

                      {/* Last check */}
                      <td className="px-5 py-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {p.last}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            id={`refresh-${p.id}`}
                            title="Refresh price"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                                       text-slate-400 hover:text-violet-500 hover:border-violet-300
                                       dark:hover:border-violet-600 transition-all cursor-pointer"
                          >
                            <IcRefresh />
                          </button>
                          <button
                            id={`remove-${p.id}`}
                            onClick={() => removeProduct(p.id)}
                            title="Remove tracker"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                                       text-slate-400 hover:text-red-500 hover:border-red-300
                                       dark:hover:border-red-700 transition-all cursor-pointer"
                          >
                            <IcTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
