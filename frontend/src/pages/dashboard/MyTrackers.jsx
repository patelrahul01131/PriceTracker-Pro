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

  const removeProduct = (id) => setProducts((p) => p.filter((x) => x._id !== (id || x.id)));

  const filtered = products.filter((p) => {
    const term = (searchTerm || "").toLowerCase();
    if (!term) return true;
    return (
      p.name?.toLowerCase().includes(term) || 
      p.platform?.toLowerCase().includes(term) ||
      p.brand?.toLowerCase().includes(term)
    );
  });

  const isError = msg.startsWith("error:");
  const msgText = msg.replace(/^(success|error):/, "");

  return (
    <div className="space-y-6">
      {/* URL input card */}
      <div className="p-6 rounded-3xl
                      bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl
                      border border-white/60 dark:border-slate-700/50 shadow-sm">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
          <span className="text-xl">➕</span> Add a new tracker
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 ml-7">
          Paste a product URL from Amazon, Flipkart, Myntra, JioMart, BigBasket or Mi.com.
        </p>
        <div className="flex gap-3">
          <input
            id="trackers-url-input"
            type="url"
            placeholder="Paste product link here..."
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none transition-all
                       bg-slate-50 dark:bg-slate-800/40
                       border border-slate-200 dark:border-slate-700/60
                       text-slate-900 dark:text-slate-100
                       placeholder-slate-400 dark:placeholder-slate-500
                       focus:bg-white dark:focus:bg-slate-800/80
                       focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setMsg(""); }}
            onKeyDown={(e) => e.key === "Enter" && addTracker()}
          />
          <button
            id="trackers-add-btn"
            onClick={addTracker}
            disabled={adding}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold
                       text-white cursor-pointer whitespace-nowrap
                       bg-gradient-to-r from-violet-600 to-violet-400
                       shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40
                       hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200
                       disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {adding
              ? <span className="anim-spin w-5 h-5 rounded-full border-2 border-white/30 border-t-white inline-block" />
              : <><IcAdd /> Track Price</>}
          </button>
        </div>
        {msg && (
          <div className={`flex items-center gap-2 mt-4 px-4 py-3 rounded-2xl text-sm font-semibold animate-fade-in
            ${isError
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400"
              : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400"}`}>
            {isError ? "⚠️" : "✅"} {msgText}
          </div>
        )}
      </div>

      {/* Full tracker table */}
      <div className="rounded-3xl overflow-hidden
                      bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl
                      border border-white/60 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-lg">🗂️</span> All Tracked Products
          </h3>
          <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-extrabold">
            {filtered.length} trackers
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
              {searchTerm ? "No results found for your search." : "No trackers yet. Add your first product URL above!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((p) => {
                  const currentPrice = Number(p.price);
                  const regPrice = Number(p.register_price);
                  const diff = currentPrice - regPrice;
                  const pct = regPrice ? ((diff / regPrice) * 100).toFixed(1) : 0;
                  const isDown = diff < 0;
                  const isZero = diff === 0;

                  return (
                    <tr key={p._id || p.id} className="hover:bg-violet-50/20 dark:hover:bg-violet-900/10 transition-colors group">
                      {/* Product */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-110 transition-transform">
                            {p.image ? (
                              <img src={p.image} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-xl">📦</span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 max-w-[220px] truncate leading-tight mb-1">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                {p.platform || "Store"}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {p.brand || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Price */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-base font-black ${isDown ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-500" : "text-slate-800 dark:text-slate-100"}`}>
                            {currentPrice > 0 ? inr(currentPrice) : <span className="text-slate-300 text-xs animate-pulse">Wait…</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through decoration-slate-300">
                            {inr(regPrice)}
                          </span>
                        </div>
                      </td>

                      {/* Change */}
                      <td className="px-6 py-4">
                        <div className={`flex flex-col text-xs font-black ${isDown || isZero ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                          <span className="flex items-center gap-1">
                            {isZero ? "—" : isDown ? "▼" : "▲"}{" "}
                            {diff !== 0 ? inr(Math.abs(diff)) : "Price Unchanged"}
                          </span>
                          {diff !== 0 && (
                            <span className="text-[10px] opacity-70">
                              ({isDown || isZero ? "" : "+"}{pct}%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight
                          ${p.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          {p.status}
                        </span>
                      </td>

                      {/* Last check */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          <span>{p.last_check_date ? new Date(p.last_check_date).toLocaleDateString() : "Never"}</span>
                          <span className="opacity-60">{p.last_check_date ? new Date(p.last_check_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            id={`refresh-${p._id}`}
                            className="p-2 rounded-xl border border-slate-100 dark:border-slate-700
                                       text-slate-400 hover:text-violet-500 hover:border-violet-300
                                       dark:hover:border-violet-600 transition-all cursor-pointer bg-white dark:bg-slate-800/40 shadow-sm"
                          >
                            <IcRefresh />
                          </button>
                          <button
                            id={`remove-${p._id}`}
                            onClick={(e) => { e.stopPropagation(); removeProduct(p._id); }}
                            className="p-2 rounded-xl border border-slate-100 dark:border-slate-700
                                       text-slate-400 hover:text-red-500 hover:border-red-300
                                       dark:hover:border-red-700 transition-all cursor-pointer bg-white dark:bg-slate-800/40 shadow-sm"
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
