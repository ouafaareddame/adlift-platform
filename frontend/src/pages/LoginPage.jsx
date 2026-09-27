import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { PasswordField, inputClass } from "@/components/ui/PasswordField";
import { homeForRole } from "@/routes/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AdliftLogo } from "@/components/brand/AdliftLogo";

const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const leftStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

function authErrorMessage(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const raw = typeof data === "string" ? data : data?.message;

  const translations = {
    "Email ou mot de passe incorrect.": "Incorrect email or password.",
    "Ce compte a été désactivé.": "This account has been deactivated.",
    "Cette agence est désactivée.": "This workspace has been deactivated. Contact Adlift.",
    "Utilisateur non trouvé.": "User not found.",
    "Une erreur inattendue est survenue.": "An unexpected error occurred.",
  };

  if (raw && translations[raw]) return translations[raw];
  if (raw) return raw;
  if (err.code === "ECONNABORTED" || /timeout/i.test(err.message || "")) {
    return "The API took too long to respond. Restart Docker Desktop, then run docker-compose up.";
  }
  if (!err.response || status === 502 || status === 503 || status === 504) {
    return "Adlift API is not running. Start Docker Desktop, then run docker-compose up.";
  }
  return `Sign-in failed (error ${status || "network"}). Please try again.`;
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={homeForRole(user?.role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const signedIn = await login(email, password);
      navigate(signedIn.mustChangePassword ? "/change-password" : homeForRole(signedIn.role));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
        <motion.div
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center"
          variants={leftStagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="mb-8">
            <Link to="/" className="inline-block">
              <AdliftLogo className="h-16 w-auto" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Enter your credentials to access your workspace.
            </p>
          </motion.div>

          <motion.form
            variants={fadeUp}
            onSubmit={handleSubmit}
            className="mt-8"
          >
            <Card className="flex flex-col gap-4 shadow-lg shadow-slate-200/70">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <motion.div className="mt-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </motion.div>
            </Card>
          </motion.form>

          <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-ink-muted">
            Access is provided by your Adlift account manager.
          </motion.p>
        </motion.div>
      </div>

      <aside className="relative hidden overflow-hidden bg-gradient-to-b from-[#0c3554] via-[#0f4368] to-[#08263d] lg:flex lg:min-h-screen lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/35 blur-3xl" />

        <div className="relative z-10 flex flex-1 items-center justify-center px-8 pt-8">
          <div className="relative h-[380px] w-full max-w-[500px]">
            <motion.div
              className="absolute left-0 top-0 z-20 w-[280px] rounded-2xl bg-white p-5 shadow-2xl shadow-black/30"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <p className="text-[11px] font-medium text-ink-muted">Campaign mix</p>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="relative h-[96px] w-[96px] shrink-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#155686 0 42%, #3D7A9E 42% 68%, #7BA8C9 68% 86%, #C5D9E8 86% 100%)",
                  }}
                >
                  <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-sm font-semibold text-ink">12</span>
                    <span className="text-[9px] text-ink-muted">total</span>
                  </div>
                </div>
                <ul className="min-w-[110px] space-y-2 text-[11px] text-ink">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Active</span>
                    <span className="font-medium">5</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3D7A9E]" /> Scheduled</span>
                    <span className="font-medium">3</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7BA8C9]" /> Draft</span>
                    <span className="font-medium">4</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              className="absolute right-0 top-[72px] z-30 w-[230px] rounded-2xl bg-white p-5 shadow-2xl shadow-black/30"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-ink-muted">This month</p>
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">Active</span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">24 180 MAD</p>
              <p className="text-[11px] text-ink-muted">Recorded spend</p>
              <div className="mt-4 flex h-12 items-end gap-1.5">
                {[40, 55, 38, 72, 64, 88, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-accent"
                    style={{ height: `${h}%`, opacity: 0.4 + i * 0.08 }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-0 left-8 z-10 w-[320px] rounded-2xl bg-white p-5 shadow-2xl shadow-black/30"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            >
              <p className="text-[11px] font-medium text-ink-muted">Workspace campaigns</p>
              <ul className="mt-3 space-y-3">
                {[
                  { name: "Spring newsletter", type: "EMAIL", status: "Active" },
                  { name: "Ramadan social", type: "SOCIAL", status: "Scheduled" },
                  { name: "Search launch", type: "ADS", status: "Draft" },
                ].map((row) => (
                  <li key={row.name} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-ink">{row.name}</p>
                      <p className="text-[10px] text-ink-muted">{row.type}</p>
                    </div>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center px-10 pb-14 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-black/20">
            <AdliftLogo className="h-14 w-auto" />
          </div>
          <h2 className="max-w-sm text-[1.7rem] font-semibold leading-snug tracking-tight text-white">
            One place to run email, social and ads
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
            Plan campaigns, follow spend and keep your agency workspace in one cockpit.
          </p>
        </div>
      </aside>
    </div>
  );
}
