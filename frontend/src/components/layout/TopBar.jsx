import { useEffect, useRef, useState } from "react";
import { Search, Bell, Menu, Check, ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotifications,
  fetchUnreadCount,
  isNotificationRead,
  markNotificationRead,
  notificationTarget,
  translateNotification,
} from "@/api/notifications";
import { roleLabel } from "@/lib/roles";
import { useFeedback } from "@/context/FeedbackContext";
import { homeForRole } from "@/routes/ProtectedRoute";

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TopBar({ onMenu }) {
  const { user, logout, switchWorkspace } = useAuth();
  const { notify } = useFeedback();
  const workspaces = user?.workspaces || [];
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const name = user?.email?.split("@")[0] || "User";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("keyword") || searchParams.get("q") || "");
  const panelRef = useRef(null);

  useEffect(() => {
    setQuery(searchParams.get("keyword") || searchParams.get("q") || "");
  }, [searchParams]);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications({ page: 0, size: 20 }),
    enabled: open,
  });

  const notifications = data?.content || [];

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  useEffect(() => {
    function onPointerDown(event) {
      if (!panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    }
    if (open || accountOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, accountOpen]);

  async function openWorkspace(workspace) {
    setAccountOpen(false);
    if (workspace.tenantId === user?.tenantId) return;
    try {
      const session = await switchWorkspace(workspace.tenantId);
      // Cached pages belong to the previous workspace.
      queryClient.clear();
      navigate(homeForRole(session.role));
      notify(`You are now in ${session.tenantName}.`);
    } catch {
      notify("Could not open this workspace. Please try again.", "error");
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const value = query.trim();
    if (isSuperAdmin) {
      navigate(value ? `/tenants?q=${encodeURIComponent(value)}` : "/tenants");
      return;
    }
    const params = new URLSearchParams(location.pathname === "/campaigns" ? searchParams : undefined);
    if (value) params.set("keyword", value);
    else params.delete("keyword");
    params.delete("page");
    navigate(`/campaigns${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <header className="relative z-30 flex items-center gap-3 print:hidden rounded-[var(--radius-card)] border border-white/70 bg-surface/80 px-4 py-3 shadow-sm shadow-slate-200/40 backdrop-blur">
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent lg:hidden"
        aria-label="Open menu"
        onClick={onMenu}
      >
        <Menu size={18} />
      </button>
      <form className="relative min-w-0 flex-1" onSubmit={submitSearch}>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch(e);
          }}
          placeholder={isSuperAdmin ? "Search clients…" : "Search campaigns…"}
          className="w-full rounded-[var(--radius-control)] border-0 bg-background py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:ring-2 focus:ring-accent-soft"
        />
      </form>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent hover:bg-accent hover:text-white"
          aria-label="Notifications"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] border border-accent-soft bg-surface shadow-lg shadow-slate-300/40">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <p className="text-xs text-ink-muted">
                {unread > 0 ? `${unread} unread` : "You're up to date"}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {isLoading && <p className="px-4 py-6 text-sm text-ink-muted">Loading…</p>}
              {!isLoading && notifications.length === 0 && (
                <p className="px-4 py-6 text-sm text-ink-muted">
                  {isSuperAdmin
                    ? "No notifications yet. Changes to client workspaces will appear here."
                    : "No notifications yet. Campaign and team changes will appear here."}
                </p>
              )}
              {notifications.map((item) => {
                const read = isNotificationRead(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`block w-full border-t border-slate-100 px-4 py-3 text-left hover:bg-accent-soft/50 ${
                      read ? "opacity-70" : "bg-accent-soft/30"
                    }`}
                    onClick={() => {
                      if (!read) readMutation.mutate(item.id);
                      const target = notificationTarget(item, user?.role);
                      if (target) navigate(target);
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm text-ink">{translateNotification(item.message)}</p>
                    <p className="mt-1 text-[11px] text-ink-subtle">{formatWhen(item.createdAt)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="relative" ref={accountRef}>
        <button
          type="button"
          className="flex items-center gap-2 rounded-[var(--radius-control)] px-1 py-1 hover:bg-accent-soft/60"
          aria-label="Account menu"
          aria-expanded={accountOpen}
          onClick={() => setAccountOpen((value) => !value)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-white">
            {name.slice(0, 2)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium text-ink">{name}</span>
            <span className="block max-w-40 truncate text-[11px] text-ink-muted">
              {user?.tenantName && user?.role !== "SUPER_ADMIN"
                ? `${roleLabel(user?.role)} · ${user.tenantName}`
                : roleLabel(user?.role)}
            </span>
          </span>
          <ChevronDown size={14} className="hidden text-ink-subtle sm:block" />
        </button>
        {accountOpen && (
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[var(--radius-card)] border border-accent-soft bg-surface py-1 shadow-lg shadow-slate-300/40">
            <p className="truncate border-b border-slate-100 px-4 py-2.5 text-xs text-ink-muted">{user?.email}</p>
            {workspaces.length > 1 && (
              <div className="border-b border-slate-100 py-1">
                <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                  Workspaces
                </p>
                {workspaces.map((workspace) => {
                  const current = workspace.tenantId === user?.tenantId;
                  return (
                    <button
                      key={workspace.tenantId}
                      type="button"
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-accent-soft/50 ${
                        current ? "font-semibold text-accent" : "text-ink"
                      }`}
                      aria-current={current ? "true" : undefined}
                      onClick={() => openWorkspace(workspace)}
                    >
                      <span className="truncate">{workspace.name}</span>
                      {current && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-accent-soft/50"
              onClick={() => {
                setAccountOpen(false);
                navigate("/change-password");
              }}
            >
              <KeyRound size={15} />
              Change password
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-accent-soft/50"
              onClick={logout}
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
