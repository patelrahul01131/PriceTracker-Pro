import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

/* ── helpers ── */
const fmt = (n) => (n != null ? "₹" + Number(n).toLocaleString("en-IN") : "—");
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        minute: "2-digit",
        hour: "2-digit",
        second: "2-digit",
      })
    : "—";

/* ── Custom tooltip for chart ── */
function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-sm shadow-xl border border-white/20 bg-slate-900/90 backdrop-blur text-slate-100">
      <p className="font-semibold text-violet-300">{label}</p>
      <p>
        Price:{" "}
        <span className="font-bold text-white">
          ₹{Number(payload[0].value).toLocaleString("en-IN")}
        </span>
      </p>
    </div>
  );
}

/* ── Buy / Hold suggestion engine ── */
function buildSuggestion(product) {
  const history = product.lastcheck || [];
  const currentPrice = Number(product.price);
  const registerPrice = Number(product.register_price);

  if (history.length < 2) {
    return {
      verdict: "WATCH",
      color: "yellow",
      icon: "👀",
      reason:
        "Not enough price history yet. We need at least 2 check-ins to make a suggestion.",
    };
  }

  // Stats
  const prices = history.map((h) => Number(h.price)).filter(Boolean);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const pctDropFromRegister =
    ((registerPrice - currentPrice) / registerPrice) * 100;
  const pctFromAllTimeHigh = ((maxPrice - currentPrice) / maxPrice) * 100;

  // Trend: is the price falling over last 3 checks?
  const last3 = prices.slice(-3);
  const recentTrend =
    last3.length >= 2 ? last3[last3.length - 1] - last3[0] : 0;

  if (currentPrice <= minPrice) {
    return {
      verdict: "BUY NOW",
      color: "emerald",
      icon: "🔥",
      reason: `This is the ALL-TIME LOW price tracked (${fmt(minPrice)}). ${pctDropFromRegister > 0 ? `That's a ${pctDropFromRegister.toFixed(1)}% drop from the original tracked price!` : ""}`,
    };
  }

  if (currentPrice < avgPrice && recentTrend < 0) {
    return {
      verdict: "BUY",
      color: "green",
      icon: "✅",
      reason: `Price (${fmt(currentPrice)}) is below the average price of ${fmt(Math.round(avgPrice))} and has been trending down. Good time to buy.`,
    };
  }

  if (pctFromAllTimeHigh >= 15 && currentPrice <= avgPrice) {
    return {
      verdict: "BUY",
      color: "green",
      icon: "✅",
      reason: `Price is ${pctFromAllTimeHigh.toFixed(1)}% lower than the all-time tracked high of ${fmt(maxPrice)}.`,
    };
  }

  if (recentTrend < 0 && currentPrice > avgPrice) {
    return {
      verdict: "WAIT",
      color: "yellow",
      icon: "⏳",
      reason: `Price is falling but still above the average of ${fmt(Math.round(avgPrice))}. Wait for it to drop a bit more.`,
    };
  }

  if (currentPrice >= maxPrice || recentTrend > 0) {
    return {
      verdict: "DON'T BUY",
      color: "red",
      icon: "🚫",
      reason: `Price is near its tracked high (${fmt(maxPrice)}) and trending upward. Hold off for a better deal.`,
    };
  }

  return {
    verdict: "WATCH",
    color: "yellow",
    icon: "👀",
    reason: `Price is relatively stable around ${fmt(Math.round(avgPrice))}. Keep monitoring.`,
  };
}

const verdictStyles = {
  emerald: {
    card: "from-emerald-500/20 to-emerald-900/10 border-emerald-500/40",
    badge: "bg-emerald-500 text-white",
    text: "text-emerald-400",
  },
  green: {
    card: "from-green-500/20 to-green-900/10 border-green-500/40",
    badge: "bg-green-500 text-white",
    text: "text-green-400",
  },
  yellow: {
    card: "from-yellow-500/20 to-yellow-900/10 border-yellow-500/40",
    badge: "bg-yellow-500 text-slate-900",
    text: "text-yellow-400",
  },
  red: {
    card: "from-red-500/20 to-red-900/10 border-red-500/40",
    badge: "bg-red-500 text-white",
    text: "text-red-400",
  },
};

/* ── Loading skeleton ── */
function Skeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0914] p-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-slate-200 dark:bg-slate-800 mb-8" />
      <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 mb-6" />
      <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null); // { type: 'success'|'error', msg, newPrice }
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem("token");

  /* fetch product */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/product/${id}`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        setProduct(res.data.product);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  /* toggle active / inactive */
  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await axios.patch(
        `http://localhost:3000/api/product/${id}/toggle-check`,
        {},
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      setProduct(res.data.product);
    } catch {
      /* silent */
    } finally {
      setToggling(false);
    }
  };

  /* manual price check */
  const handleManualCheck = async () => {
    setManualChecking(true);
    setCheckResult(null);
    try {
      const res = await axios.post(
        `http://localhost:3000/api/product/${id}/manual-check`,
        {},
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const updated = res.data.product;
      const oldPrice = product.price;
      setProduct(updated);
      const newPrice = updated.price;
      const dropped = newPrice < oldPrice;
      const same = newPrice === oldPrice;
      setCheckResult({
        type: "success",
        msg: same
          ? `Price unchanged — still ${fmt(newPrice)}`
          : dropped
            ? `Price dropped! ${fmt(oldPrice)} → ${fmt(newPrice)} 🎉`
            : `Price went up. ${fmt(oldPrice)} → ${fmt(newPrice)}`,
        newPrice,
        dropped,
        same,
      });
    } catch (err) {
      setCheckResult({
        type: "error",
        msg:
          err.response?.data?.message ||
          "Failed to fetch latest price. Try again.",
      });
    } finally {
      setManualChecking(false);
      // auto-dismiss toast after 4 s
      setTimeout(() => setCheckResult(null), 4000);
    }
  };

  /* ── states ── */
  if (loading) return <Skeleton />;
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0914]">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );

  /* ── derived data ── */
  const history = product.lastcheck || [];
  const chartData = history.map((h) => ({
    date: fmtDate(h.date),
    price: Number(h.price),
  }));

  const prices = history.map((h) => Number(h.price)).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const avgPrice = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : null;

  const diff = product.price - product.register_price;
  const pct = product.register_price
    ? ((diff / product.register_price) * 100).toFixed(1)
    : null;
  const isDown = diff < 0;

  const suggestion = buildSuggestion(product);
  const vs = verdictStyles[suggestion.color];
  const isActive = product.status === "active";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0914] text-slate-800 dark:text-slate-100">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0a0914]/90 backdrop-blur-xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline"
        >
          ← Dashboard
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[300px]">
          {product.name}
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Hero card ── */}
        <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-sm">
          {/* image */}
          <div className="flex-shrink-0 w-full sm:w-44 h-44 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-5xl">📦</span>
            )}
          </div>

          {/* info */}
          <div className="flex-1 flex flex-col gap-3">
            {/* title row */}
            <div className="flex flex-wrap items-start gap-2">
              <h1
                className="text-xl font-bold text-slate-900 dark:text-slate-50 flex-1"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {product.name}
              </h1>
              {/* active toggle button */}
              <button
                id="toggle-check-btn"
                onClick={handleToggle}
                disabled={toggling || manualChecking}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all duration-200
                  ${
                    isActive
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/20"
                      : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {toggling ? (
                  <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                  />
                )}
                {isActive ? "Checks ON" : "Checks OFF"}
              </button>

              {/* manual check button */}
              <button
                id="manual-check-btn"
                onClick={handleManualCheck}
                disabled={manualChecking || toggling}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border
                  bg-violet-500/10 border-violet-500/40 text-violet-500 hover:bg-violet-500/20
                  transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {manualChecking ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-violet-500 border-t-transparent animate-spin inline-block" />
                    Checking…
                  </>
                ) : (
                  <>🔄 Check Now</>
                )}
              </button>
            </div>

            {/* meta chips */}
            <div className="flex flex-wrap gap-2">
              {product.platform && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                  {product.platform.toUpperCase()}
                </span>
              )}
              {product.brand && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {product.brand}
                </span>
              )}
              {product.category && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {product.category}
                </span>
              )}
              {product.rating != null && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                  ★ {product.rating}
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  product.inStock
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}
              >
                {product.inStock ? "In Stock" : "-"}
              </span>
            </div>

            {/* price row */}
            <div className="flex flex-wrap gap-6 mt-1">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Tracked At</p>
                <p className="text-lg font-extrabold text-slate-500 dark:text-slate-400 line-through">
                  {fmt(product.register_price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Current Price</p>
                <p
                  className={`text-2xl font-extrabold ${
                    isDown
                      ? "text-emerald-600 dark:text-emerald-400"
                      : diff > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {fmt(product.price)}
                </p>
              </div>
              {pct !== null && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Change</p>
                  <p
                    className={`text-lg font-bold ${
                      isDown
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isDown ? "▼" : "▲"} {Math.abs(pct)}%
                  </p>
                </div>
              )}
            </div>

            {/* link */}
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline mt-1"
                id="product-view-link"
              >
                🔗 View on {product.platform || "Store"} →
              </a>
            )}

            {/* ── manual check result toast ── */}
            {checkResult && (
              <div
                className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-xl text-sm font-medium animate-pulse-once
                  ${
                    checkResult.type === "success"
                      ? checkResult.dropped
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
                        : checkResult.same
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-400"
                          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400"
                  }`}
              >
                {checkResult.type === "success"
                  ? checkResult.dropped
                    ? "🎉"
                    : checkResult.same
                      ? "ℹ️"
                      : "⚠️"
                  : "❌"}
                {checkResult.msg}
              </div>
            )}
          </div>
        </div>

        {/* ── Price stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "All-Time Low",
              value: fmt(minPrice),
              icon: "📉",
              color: "text-emerald-500",
            },
            {
              label: "All-Time High",
              value: fmt(maxPrice),
              icon: "📈",
              color: "text-red-500",
            },
            {
              label: "Average Price",
              value: fmt(avgPrice),
              icon: "📊",
              color: "text-violet-500",
            },
            {
              label: "Price Checks",
              value: history.length,
              icon: "🔍",
              color: "text-blue-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-sm flex flex-col gap-1"
            >
              <span className="text-xl">{s.icon}</span>
              <span className={`text-xl font-extrabold ${s.color}`}>
                {s.value}
              </span>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Buy suggestion card ── */}
        <div
          className={`p-5 rounded-2xl border bg-gradient-to-br ${vs.card} backdrop-blur-xl`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{suggestion.icon}</span>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">
                AI Suggestion
              </p>
              <span
                className={`px-3 py-1 rounded-full text-sm font-extrabold uppercase ${vs.badge}`}
              >
                {suggestion.verdict}
              </span>
            </div>
          </div>
          <p className={`text-sm font-medium ${vs.text}`}>
            {suggestion.reason}
          </p>
        </div>

        {/* ── Price History Chart ── */}
        <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              📈 Price History
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {history.length} data point{history.length !== 1 ? "s" : ""}
            </span>
          </div>

          {chartData.length < 1 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="text-4xl">📭</span>
              <p className="text-sm">
                No price history yet. Check back after the first price check.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  strokeOpacity={0.25}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155", strokeOpacity: 0.3 }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => "₹" + Number(v).toLocaleString("en-IN")}
                  width={80}
                />
                <Tooltip content={<PriceTooltip />} />
                {/* average reference line */}
                {avgPrice && (
                  <ReferenceLine
                    y={avgPrice}
                    stroke="#a78bfa"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg ${fmt(avgPrice)}`,
                      fill: "#a78bfa",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                )}
                {/* register price reference */}
                {product.register_price && (
                  <ReferenceLine
                    y={Number(product.register_price)}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Tracked ${fmt(product.register_price)}`,
                      fill: "#f59e0b",
                      fontSize: 10,
                      position: "insideBottomRight",
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fill="url(#priceGrad)"
                  dot={{ fill: "#7c3aed", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#a78bfa", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Price history table ── */}
        {history.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                🗓️ Price Check Log
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                    {["Date", "Price", "vs Register"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h, i) => {
                    const chgPct = product.register_price
                      ? (
                          ((Number(h.price) - Number(product.register_price)) /
                            Number(product.register_price)) *
                          100
                        ).toFixed(1)
                      : null;
                    const chgDown =
                      product.register_price &&
                      Number(h.price) < Number(product.register_price);

                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100 dark:border-slate-800/60 text-center"
                      >
                        <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                          {fmtDate(h.date)}
                        </td>
                        <td
                          className={`px-5 py-3 text-sm font-semibold ${
                            h.price === minPrice
                              ? "text-emerald-600 dark:text-emerald-400"
                              : h.price === maxPrice
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {fmt(h.price)}
                          {h.price === minPrice && (
                            <span className="ml-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                              low
                            </span>
                          )}
                          {h.price === maxPrice && h.price !== minPrice && (
                            <span className="ml-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                              high
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-5 py-3 text-sm font-semibold ${
                            chgDown
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {chgPct !== null
                            ? `${chgDown ? "▼" : "▲"} ${Math.abs(chgPct)}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Description ── */}
        {product.description && (
          <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              📝 Description
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
