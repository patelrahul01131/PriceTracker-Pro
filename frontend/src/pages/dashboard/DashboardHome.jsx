import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const IcAdd = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcTrash = () => (
  <svg
    className="w-[15px] h-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);
const IcRefresh = () => (
  <svg
    className="w-[14px] h-[14px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
  </svg>
);

const inr = (n) => "₹" + n.toLocaleString("en-IN");

/* ── Stat Card ── */
function StatCard({ emoji, value, label, badge, badgeColor }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2
                    bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                    border border-white/60 dark:border-slate-700/50
                    shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 to-violet-400" />
      <span className="text-2xl">{emoji}</span>
      <span
        className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 leading-none"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {value}
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
        {label}
      </span>
      {badge && (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/* ── URL Tracker Input ── */
function UrlTracker({ products, setProducts }) {
  const [urlInput, setUrlInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  const getProducts = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:3000/api/product/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setProducts(res.data.products);
  };

  const addTracker = async () => {
    if (!urlInput.trim()) {
      setMsg("error:Please enter a product URL.");
      return;
    }
    try {
      new URL(urlInput);
    } catch {
      setMsg("error:Please enter a valid URL.");
      return;
    }
    setAdding(true);
    setMsg("Please Wait We Are Fetching data .....");

    try {
      const token = localStorage.getItem("token");
      console.log(token);
      const res = await axios.post(
        "http://localhost:3000/api/product/track",
        { url: urlInput }, // body
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }, // config
      );

      const data = res.data;

      if (!data.length < 1) {
        setMsg("error:" + data.message);
        throw new Error(data.message || "Failed to add tracker");
      }

      // Add to local state

      setUrlInput("");
      setMsg("success:Tracker added! Price check will begin shortly.");
      getProducts();
    } catch (err) {
      if (err.status === 500) {
        setMsg("error: Could not fetch product try again later");
      } else if (err.status === 401) {
        setMsg("error: You are not authenticated");
      } else {
        setMsg("error: " + err.response.data.message);
      }
    } finally {
      setAdding(false);
    }
  };

  const isError = msg.startsWith("error:");
  const msgText = msg.replace(/^(success|error):/, "");

  return (
    <div
      className="p-5 rounded-2xl
                    bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                    border border-white/60 dark:border-slate-700/50 shadow-sm"
    >
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        ➕ Track a new product
      </p>
      <div className="flex gap-2">
        <input
          id="home-url-input"
          type="url"
          placeholder="Paste Amazon / Flipkart / Myntra product URL…"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all
                     bg-slate-100 dark:bg-slate-800/70
                     border border-slate-200 dark:border-slate-700
                     text-slate-900 dark:text-slate-100
                     placeholder-slate-400 dark:placeholder-slate-500
                     focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            setMsg("");
          }}
          onKeyDown={(e) => e.key === "Enter" && addTracker()}
        />
        <button
          id="home-track-btn"
          onClick={addTracker}
          disabled={adding}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold
                     text-white cursor-pointer whitespace-nowrap
                     bg-gradient-to-r from-violet-600 to-violet-400
                     shadow-md shadow-violet-500/25 hover:shadow-violet-500/40
                     hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200
                     disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {adding ? (
            <span className="anim-spin w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block" />
          ) : (
            <>
              <IcAdd /> Track Price
            </>
          )}
        </button>
      </div>
      {msg && (
        <div
          className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-sm font-medium
          ${
            isError
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400"
              : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {isError ? "⚠️" : "✅"} {msgText}
        </div>
      )}
    </div>
  );
}

/* ── Mini product table (shows top 5 on home) ── */
function MiniTable({ products, onRemove, searchTerm, onProductClick }) {
  const filtered = products.filter(
    (p) => {
      const term = (searchTerm || "").toLowerCase();
      if (!term) return true;
      return p.name?.toLowerCase().includes(term) || p.platform?.toLowerCase().includes(term);
    }
  );

  return (
    <div
      className="rounded-2xl overflow-hidden
                    bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl
                    border border-white/60 dark:border-slate-700/50 shadow-sm"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          📋 Recent Trackers
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {searchTerm ? "No results found for your search." : "No trackers yet. Add one above!"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                {[
                  "Image",
                  "Product",
                  "Platform",
                  "Brand",
                  "Rating",
                  "Register Price",
                  "Current Price",
                  "Change",
                  "Status",
                  "Last Check",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="gap-1">
              {filtered.map((p) => {
                return (
                  <tr
                    key={p._id || p.id}
                    onClick={() =>
                      onProductClick && onProductClick(p._id || p.id)
                    }
                    className="border-b text-center border-slate-100 dark:border-slate-800/60 cursor-pointer hover:bg-violet-50/60 dark:hover:bg-violet-900/10 transition-colors duration-150"
                  >
                    <td className="px-5 py-3">
                      <img
                        className="w-10 h-10 object-contain rounded mx-auto"
                        src={p.image}
                        alt={p.name}
                      />
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700 text-center dark:text-slate-200 max-w-[200px] truncate">
                      {p.name}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700 text-center dark:text-slate-200">
                      {p.platform ? p.platform.toUpperCase() : "N/A"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700 text-center dark:text-slate-200">
                      {p.brand ? p.brand.toUpperCase() : "N/A"}
                    </td>
                    {p.rating ? (
                      <td className="px-5 py-3 text-sm text-yellow-500 text-center dark:text-yellow-400">
                        {p.rating + " ★"}
                      </td>
                    ) : (
                      <td className="px-5 py-3 text-sm text-slate-700 text-center dark:text-slate-200">
                        N/A
                      </td>
                    )}
                    <td className="px-5 py-3 text-sm text-slate-700 text-center dark:text-slate-200">
                      ₹{p.register_price}
                    </td>
                    {p.price < p.register_price ? (
                      <td className="px-5 py-3 text-sm text-green-700 text-center dark:text-green-400">
                        ₹{p.price}
                      </td>
                    ) : (
                      <td className="px-5 py-3 text-sm text-red-700 text-center dark:text-red-400">
                        ₹{p.price}
                      </td>
                    )}

                    {(() => {
                      const diff = p.price - p.register_price;
                      const pct = ((diff / p.register_price) * 100).toFixed(1);
                      const isDown = diff < 0;
                      const isZero = diff === 0;

                      return (
                        <td
                          className={`px-5 py-3 text-sm text-center font-semibold
                              ${
                                isDown || isZero
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-700 dark:text-red-400"
                              }`}
                        >
                          {isZero ? "—" : isDown ? "▼" : "▲"} ₹
                          {Math.abs(diff).toLocaleString()}{" "}
                          <span className="text-xs opacity-75">
                            ({isZero || isDown ? "" : "+"}
                            {pct}%)
                          </span>
                        </td>
                      );
                    })()}

                    {p.status === "active" ? (
                      <td className="px-5 py-3 text-sm text-green-700 text-center dark:text-green-400">
                        Active
                      </td>
                    ) : (
                      <td className="px-5 py-3 text-sm text-red-700 text-center dark:text-red-400">
                        Inactive
                      </td>
                    )}
                    <td className="px-5 py-3 text-sm text-slate-400 text-center dark:text-slate-500">
                      {p.last_check_date
                        ? new Date(p.last_check_date).toLocaleString()
                        : p.createdAt
                          ? new Date(p.createdAt).toLocaleString()
                          : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardHome({ products, setProducts, searchTerm }) {
  const navigate = useNavigate();
  const [dropped_price_products_state, setDropped_price_products_state] =
    useState([]);

  const [risen_price_products_state, setRisen_price_products_state] = useState(
    [],
  );

  const removeProduct = (id) =>
    setProducts((p) => p.filter((x) => x.id !== id));
  const active = products.filter((p) => p.status === "active").length;
  const dropped = products.filter((p) => p.trend === "down").length;
  const risen = products.filter((p) => p.trend === "up").length;

  const getProducts = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:3000/api/product/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data.products; // ✅ return data instead of setting state here
  };

  useEffect(() => {
    const init = async () => {
      const fetchedProducts = await getProducts(); // ✅ wait for data
      setProducts(fetchedProducts); // ✅ set products

      // ✅ now filter from fetched data directly, not from state
      const dropped = fetchedProducts.filter((p) => {
        console.log("register price : ", Number(p.register_price));
        return Number(p.price) < Number(p.register_price);
      });

      const risen = fetchedProducts.filter((p) => {
        return Number(p.price) > Number(p.register_price);
      });

      setDropped_price_products_state(dropped);
      setRisen_price_products_state(risen);
    };

    init();
  }, []);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          emoji="📦"
          value={products.length}
          label="Total Trackers"
          badge="Tracked"
          badgeColor="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
        />
        <StatCard
          emoji="📉"
          value={dropped_price_products_state.length}
          label="Prices Dropped"
          badge="↓ Good deal"
          badgeColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          emoji="📈"
          value={risen_price_products_state.length}
          label="Prices Risen"
          badge="↑ Alert"
          badgeColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        />
        <StatCard
          emoji="🔔"
          value={active}
          label="Active Checks"
          badge="Running"
          badgeColor="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
        />
      </div>

      {/* Quick URL tracker */}
      <UrlTracker products={products} setProducts={setProducts} />

      {/* Recent trackers mini table */}
      <MiniTable
        products={products}
        onRemove={removeProduct}
        searchTerm={searchTerm}
        onProductClick={(id) => navigate(`/dashboard/product/${id}`)}
      />
    </div>
  );
}
