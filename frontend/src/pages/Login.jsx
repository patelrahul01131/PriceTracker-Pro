import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

/* ── SVG Icons ── */
const IconMail = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);
const IconLock = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const IconGoogle = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);
const IconGithub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

/* ── Shared input class ── */
const inputCls = `w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200
  bg-slate-100 dark:bg-slate-800/70
  border border-slate-200 dark:border-slate-700
  text-slate-900 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:focus:ring-violet-500/20`;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", {
        email,
        password,
      });
      if (res.data && res.data.token) {
        localStorage.setItem("token", res.data.token);
        if (res.data.user) {
          localStorage.setItem("userName", res.data.user.name || "User");
          localStorage.setItem("userEmail", res.data.user.email || "");
        }
        navigate("/dashboard");
      } else {
        setError(res.data?.message || "Login failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-6
                    bg-slate-50 dark:bg-[#0a0914]"
    >
      {/* BG Orbs */}
      <div
        className="anim-float absolute -top-44 -left-44 w-[520px] h-[520px] rounded-full
                      bg-violet-500/25 dark:bg-violet-600/20 blur-[100px] pointer-events-none"
      />
      <div
        className="anim-float-2 absolute -bottom-44 -right-44 w-[420px] h-[420px] rounded-full
                      bg-amber-400/20 dark:bg-amber-500/15 blur-[100px] pointer-events-none"
      />
      <div
        className="anim-float-3 absolute top-1/2 right-[8%] w-[300px] h-[300px] rounded-full
                      bg-pink-400/15 dark:bg-pink-500/15 blur-[80px] pointer-events-none"
      />

      {/* Card */}
      <div
        className="anim-fade-up relative z-10 w-full max-w-[440px] mt-16
                      bg-white/70 dark:bg-slate-900/70
                      backdrop-blur-2xl
                      border border-white/60 dark:border-slate-700/50
                      rounded-3xl
                      shadow-2xl shadow-violet-500/10 dark:shadow-black/40
                      overflow-hidden"
      >
        {/* top gradient line */}
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-600 via-violet-400 to-pink-400" />

        <div className="p-10">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8">
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-400
                            flex items-center justify-center text-base shadow-lg shadow-violet-500/40"
            >
              📊
            </div>
            <span
              className="grad-text font-extrabold text-xl"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              PriceWatch
            </span>
          </div>

          <h1
            className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mb-1"
            style={{
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.5px",
            }}
          >
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-7">
            Sign in to continue tracking prices
          </p>

          {/* Error banner */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 mb-5 rounded-xl text-sm font-medium
                            bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400"
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <IconMail />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputCls}
                  value={email}
                  onChange={(e) => {
                    setError("");
                    setEmail(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <IconLock />
                </span>
                <input
                  id="login-password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                  value={password}
                  onChange={(e) => {
                    setError("");
                    setPassword(e.target.value);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 cursor-pointer transition-colors"
                >
                  {showPwd ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  className="accent-violet-600 w-4 h-4 rounded cursor-pointer"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer
                               bg-gradient-to-r from-violet-600 to-violet-400
                               shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50
                               hover:-translate-y-0.5 active:scale-[0.97]
                               transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="anim-spin w-5 h-5 rounded-full border-2 border-white/30 border-t-white inline-block" />
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Social */}
          <div className="flex gap-3">
            {[
              { id: "google-login-btn", icon: <IconGoogle />, label: "Google" },
              { id: "github-login-btn", icon: <IconGithub />, label: "GitHub" },
            ].map(({ id, icon, label }) => (
              <button
                key={id}
                id={id}
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                                 bg-slate-100 dark:bg-slate-800/60
                                 border border-slate-200 dark:border-slate-700
                                 text-slate-600 dark:text-slate-300
                                 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400
                                 hover:-translate-y-0.5 transition-all duration-200"
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
