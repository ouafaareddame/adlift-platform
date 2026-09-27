import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordField } from "@/components/ui/PasswordField";
import { AdliftLogo } from "@/components/brand/AdliftLogo";

function apiError(err) {
  const raw = err.response?.data?.message;
  const map = {
    "Mot de passe actuel incorrect.": "Your current password is incorrect.",
    "Le nouveau mot de passe doit être différent de l'actuel.":
      "Your new password must be different from the current one.",
    "newPassword : doit contenir au moins 8 caractères": "Your new password must be at least 8 characters.",
  };
  if (raw && map[raw]) return map[raw];
  return raw || "Could not change your password. Please try again.";
}

export default function ChangePasswordPage() {
  const { isAuthenticated, user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const forced = Boolean(user?.mustChangePassword);
  const home = homeForRole(user?.role);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(current, next);
      navigate(home, { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AdliftLogo className="h-14 w-auto" />
        </div>

        <Card className="shadow-lg shadow-slate-200/70">
          <div className="mb-5 flex items-start gap-3">
            <span className="rounded-full bg-accent-soft p-2.5 text-accent">
              <KeyRound size={18} />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink">
                {forced ? "Choose your own password" : "Change password"}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {forced
                  ? "You signed in with a temporary password. Set a personal one to continue."
                  : `Signed in as ${user?.email}.`}
              </p>
            </div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <PasswordField
              id="current-password"
              label={forced ? "Temporary password" : "Current password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              hint="At least 8 characters."
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />

            {error && (
              <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <Button type="submit" variant="accent" disabled={isSubmitting} className="w-full py-3">
              {isSubmitting ? "Saving…" : "Save new password"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-ink-muted">
          {forced ? (
            <button type="button" className="font-medium text-accent hover:underline" onClick={logout}>
              Log out
            </button>
          ) : (
            <Link to={home} className="font-medium text-accent hover:underline">
              Back to workspace
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
