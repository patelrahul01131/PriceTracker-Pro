import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ── Icons ── */
const IconUser = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
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
const IconCheck = () => (
  <svg
    className="w-3 h-3"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
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

/* ── Password strength ── */
function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = [
  "",
  "bg-red-500",
  "bg-amber-400",
  "bg-blue-500",
  "bg-emerald-500",
];
const STRENGTH_TEXT = [
  "",
  "text-red-500",
  "text-amber-500",
  "text-blue-500",
  "text-emerald-500",
];

/* ── Shared input class ── */
const inputCls = `w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200
  bg-slate-100 dark:bg-slate-800/70
  border border-slate-200 dark:border-slate-700
  text-slate-900 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:focus:ring-violet-500/20`;

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showCnf, setShowCnf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [agreed, setAgreed] = useState(false);

  const strength = getStrength(form.password);

  const handleChange = (e) => {
    setError("");
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (strength < 2) {
      setError("Please choose a stronger password.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms of Service.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("Account created! Redirecting…");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.message || "Signup failed.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
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
        className="anim-float-3 absolute top-1/3 right-[5%] w-[280px] h-[280px] rounded-full
                      bg-pink-400/15 dark:bg-pink-500/15 blur-[80px] pointer-events-none"
      />

      {/* Card */}
      <div
        className="anim-fade-up relative z-10 w-full max-w-[460px] mt-16
                      bg-white/70 dark:bg-slate-900/70
                      backdrop-blur-2xl
                      border border-white/60 dark:border-slate-700/50
                      rounded-3xl
                      shadow-2xl shadow-violet-500/10 dark:shadow-black/40
                      overflow-hidden"
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-600 via-violet-400 to-pink-400" />

        <div className="p-9">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-7">
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
            Create account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Start tracking product prices in minutes
          </p>

          {/* Error / Success banners */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl text-sm font-medium
                            bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400"
            >
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl text-sm font-medium
                            bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
            >
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-name"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <IconUser />
                </span>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="John Doe"
                  className={inputCls}
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-email"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <IconMail />
                </span>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputCls}
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-password"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <IconLock />
                </span>
                <input
                  id="signup-password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className={inputCls}
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 cursor-pointer transition-colors"
                >
                  {showPwd ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="mt-1 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300
                                               ${i <= strength ? STRENGTH_COLOR[strength] : "bg-slate-200 dark:bg-slate-700"}`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-xs font-semibold ${STRENGTH_TEXT[strength]}`}
                  >
                    {STRENGTH_LABEL[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-confirm"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <IconLock />
                </span>
                <input
                  id="signup-confirm"
                  name="confirm"
                  type={showCnf ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className={inputCls}
                  value={form.confirm}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowCnf((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 cursor-pointer transition-colors"
                >
                  {showCnf ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {form.confirm && form.password !== form.confirm && (
                <span className="text-xs text-red-500 font-medium">
                  Passwords don&apos;t match
                </span>
              )}
              {form.confirm &&
                form.password === form.confirm &&
                form.confirm.length > 0 && (
                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <IconCheck /> Passwords match
                  </span>
                )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                id="agree-terms"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="accent-violet-600 w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
              />
              <span>
                I agree to the{" "}
                <a
                  href="#"
                  className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                >
                  Terms of Service
                </a>
                {" & "}
                <a
                  href="#"
                  className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                >
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white cursor-pointer
                               bg-gradient-to-r from-violet-600 to-violet-400
                               shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50
                               hover:-translate-y-0.5 active:scale-[0.97]
                               transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="anim-spin w-5 h-5 rounded-full border-2 border-white/30 border-t-white inline-block" />
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              or sign up with
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Social */}
          <div className="flex gap-3">
            {[
              {
                id: "google-signup-btn",
                icon: <IconGoogle />,
                label: "Google",
              },
              {
                id: "github-signup-btn",
                icon: <IconGithub />,
                label: "GitHub",
              },
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
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
