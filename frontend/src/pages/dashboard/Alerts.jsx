const inr = (n) => "₹" + n.toLocaleString("en-IN");

export default function Alerts({ products }) {
  const triggered = products.filter((p) => p.cur <= p.alert && p.alert > 0);
  const watching  = products.filter((p) => !(p.cur <= p.alert && p.alert > 0));

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      bg-violet-50 dark:bg-violet-900/20
                      border border-violet-200 dark:border-violet-800/40
                      text-violet-700 dark:text-violet-300">
        <span className="text-lg shrink-0">💡</span>
        <span>
          You will receive an email &amp; in-app notification when a tracked product&apos;s
          price drops to or below your alert target.
        </span>
      </div>

      {/* Triggered alerts */}
      {triggered.length > 0 && (
        <div className="rounded-2xl overflow-hidden
                        bg-emerald-50/60 dark:bg-emerald-900/10 backdrop-blur-xl
                        border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-emerald-200 dark:border-emerald-800/30">
            <span className="text-base">🎉</span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Triggered Alerts ({triggered.length})
            </span>
          </div>
          <AlertTable rows={triggered} triggered />
        </div>
      )}

      {/* All alerts */}
      <div className="rounded-2xl overflow-hidden
                      bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                      border border-white/60 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">🔔 All Alert Thresholds</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold">
            {products.length} total
          </span>
        </div>
        {products.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-slate-400 dark:text-slate-500">No trackers yet. Add products from My Trackers.</p>
          </div>
        ) : (
          <AlertTable rows={products} />
        )}
      </div>
    </div>
  );
}

function AlertTable({ rows, triggered = false }) {
  const inr = (n) => "₹" + n.toLocaleString("en-IN");

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/40">
            {["Product", "Current Price", "Alert Target", "Savings", "Status"].map((h) => (
              <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const isTriggered = p.cur <= p.alert && p.alert > 0;
            const savings     = p.alert > 0 ? p.cur - p.alert : 0;
            return (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800/40 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors">
                {/* Product */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">
                      {p.emoji}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 max-w-[160px] truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.site}</div>
                    </div>
                  </div>
                </td>

                {/* Current price */}
                <td className="px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {inr(p.cur)}
                </td>

                {/* Alert target */}
                <td className="px-5 py-3 text-sm font-semibold text-violet-600 dark:text-violet-400">
                  {p.alert > 0 ? inr(p.alert) : <span className="text-slate-400">Not set</span>}
                </td>

                {/* Savings */}
                <td className="px-5 py-3 text-sm font-semibold">
                  {savings < 0
                    ? <span className="text-emerald-600">Save {inr(Math.abs(savings))}</span>
                    : savings > 0
                      ? <span className="text-red-500">Over by {inr(savings)}</span>
                      : <span className="text-slate-400">—</span>}
                </td>

                {/* Status */}
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                    ${isTriggered
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isTriggered ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {isTriggered ? "Triggered" : "Watching"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
