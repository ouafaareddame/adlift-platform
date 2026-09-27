import { NavLink } from "react-router-dom";
import { LayoutDashboard, Megaphone, Users, Building2, LogOut, FileText, Gauge } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdliftLogo } from "@/components/brand/AdliftLogo";

const navItemsByRole = {
  AGENCY_ADMIN: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/campaigns", label: "Campaigns", icon: Megaphone },
    { to: "/reports", label: "Reports", icon: FileText },
    { to: "/members", label: "Members", icon: Users },
  ],
  CLIENT: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/campaigns", label: "Campaigns", icon: Megaphone },
    { to: "/reports", label: "Reports", icon: FileText },
  ],
  SUPER_ADMIN: [
    { to: "/overview", label: "Overview", icon: Gauge },
    { to: "/tenants", label: "Clients", icon: Building2 },
    { to: "/reports", label: "Reports", icon: FileText },
  ],
};

export default function Sidebar({ open = false, onNavigate }) {
  const { user, logout } = useAuth();
  const items = navItemsByRole[user?.role] || [];

  return (
    <aside
      className={`z-50 w-60 shrink-0 flex-col justify-between rounded-[var(--radius-card)] bg-gradient-to-b from-accent-soft to-background p-4 ${
        open ? "fixed inset-y-4 left-4 flex shadow-lg" : "hidden"
      } lg:sticky lg:top-4 lg:z-auto lg:flex lg:h-[calc(100vh-2rem)] lg:shadow-none print:hidden`}
    >
      <div>
        <div className="mb-6 px-1">
          <AdliftLogo className="h-14 w-auto max-w-[150px]" />
        </div>

        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
          General
        </p>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface text-accent shadow-sm shadow-slate-200/50"
                    : "text-ink-muted hover:bg-surface/70"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface/70"
      >
        <LogOut size={18} />
        Log out
      </button>
    </aside>
  );
}
