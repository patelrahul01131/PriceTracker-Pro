import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import DashboardTopbar from "../components/DashboardTopbar";
import DashboardHome from "./dashboard/DashboardHome";
import MyTrackers from "./dashboard/MyTrackers";
import Alerts from "./dashboard/Alerts";
import Settings from "./dashboard/Settings";

export default function Dashboard() {
  /* ── Shared state ── */
  const [page, setPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const getProducts = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:3000/api/product/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setProducts(res.data.products);
  };

  useEffect(() => {
    getProducts();
  }, []);

  /* ── Active page renderer ── */
  const renderPage = () => {
    const props = { products, setProducts, searchTerm: search };
    switch (page) {
      case "dashboard":
        return <DashboardHome {...props} />;
      case "settings":
        return <Settings />;
      default:
        return <DashboardHome {...props} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0914]">
      {/* ── Sidebar ── */}
      <Sidebar page={page} setPage={setPage} />

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ── Topbar ── */}
        <DashboardTopbar page={page} search={search} setSearch={setSearch} />

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto p-6">{renderPage()}</main>
      </div>
    </div>
  );
}
