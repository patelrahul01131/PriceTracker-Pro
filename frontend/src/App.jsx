import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { useEffect } from "react";
import axios from "axios";
import "./index.css";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProductDetail from "./pages/ProductDetail";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/product/:id" element={<ProductDetail />} />
      </Routes>
    </ThemeProvider>
  );
}
