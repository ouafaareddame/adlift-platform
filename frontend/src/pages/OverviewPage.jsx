import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Building2, FileText, Megaphone, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { fetchOverview } from "@/api/campaigns";
import { fetchTenants } from "@/api/tenants";
import { formatCount, formatMoney, formatPct } from "@/lib/format";

function usageOf(budget, spent) {
  const b = Number(budget || 0);
  return b > 0 ? (Number(spent || 0) * 100) / b : null;
}

export default function OverviewPage() {
  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => fetchTenants({ page: 0, size: 100 }),
  });
  const overviewQuery = useQuery({ queryKey: ["overview"], queryFn: fetchOverview });

  const isLoading = tenantsQuery.isLoading || overviewQuery.isLoading;
  const isError = tenantsQuery.isError || overviewQuery.isError;

  const statsByTenant = new Map((overviewQuery.data?.tenants || []).map((row) => [row.tenantId, row]));
  const rows = (tenantsQuery.data?.content || [])
    .map((tenant) => ({ tenant, stats: statsByTenant.get(tenant.id) || {} }))
    .sort((a, b) => Number(b.stats.spent || 0) - Number(a.stats.spent || 0));

  const totals = overviewQuery.data?.totals || {};
  const activeClients = rows.filter((row) => row.tenant.status === "ACTIVE").length;
  const alerts = Number(totals.overBudgetCount || 0) + Number(totals.nearBudgetCount || 0);

  const cards = [
    {
      label: "Active clients",
      value: formatCount(activeClients),
      hint: `${formatCount(rows.length)} workspaces in total`,
      icon: Building2,
      tone: "bg-accent-soft text-accent",
    },
    {
      label: "Active campaigns",
      value: formatCount(totals.activeCampaigns),
      hint: `${formatCount(totals.campaigns)} campaigns across all clients`,
      icon: Megaphone,
      tone: "bg-success-soft text-success",
    },
    {
      label: "Spend managed",
      value: formatMoney(totals.spent),
      hint: `of ${formatMoney(totals.budget)} planned`,
      icon: Wallet,
      tone: "bg-accent-soft text-accent",
    },
    {
      label: "Budget alerts",
      value: formatCount(alerts),
      hint: `${formatCount(totals.overBudgetCount)} reached or over · ${formatCount(totals.nearBudgetCount)} above 80%`,
      icon: AlertTriangle,
      tone: alerts > 0 ? "bg-warning-soft text-warning" : "bg-surface-muted text-ink-subtle",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink-muted">Activity and spend across every Adlift client.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reports">
            <Button variant="ghost" className="bg-surface text-xs">
              <FileText size={14} />
              Reports
            </Button>
          </Link>
          <Link to="/tenants">
            <Button variant="accent" className="text-xs">
              Manage clients
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Loading overview…</p>}
      {isError && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
          Could not load the overview. Check that auth-service and campaign-service are running.
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, hint, icon: Icon, tone }) => (
              <Card key={label} className="border border-accent-soft/80">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-ink-muted">{label}</p>
                  <span className={`rounded-full p-2 ${tone}`}>
                    <Icon size={16} />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
                <p className="mt-2 text-xs text-ink-subtle">{hint}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden border border-accent-soft/80 p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-ink">Clients</p>
              <p className="text-xs text-ink-subtle">Sorted by spend</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-accent-soft/60 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Campaigns</th>
                    <th className="px-4 py-3 font-medium">Budget</th>
                    <th className="px-4 py-3 font-medium">Impressions</th>
                    <th className="px-4 py-3 font-medium">CTR</th>
                    <th className="px-4 py-3 font-medium">Conversions</th>
                    <th className="px-4 py-3 font-medium">Alerts</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-ink-muted">
                        No client yet.{" "}
                        <Link to="/tenants" className="font-medium text-accent hover:underline">
                          Create the first workspace
                        </Link>
                      </td>
                    </tr>
                  )}
                  {rows.map(({ tenant, stats }) => {
                    const impressions = Number(stats.impressions || 0);
                    const clicks = Number(stats.clicks || 0);
                    const over = Number(stats.overBudgetCount || 0);
                    const near = Number(stats.nearBudgetCount || 0);
                    return (
                      <tr key={tenant.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{tenant.name}</p>
                          <p className="text-xs text-ink-subtle">
                            {tenant.status === "ACTIVE" ? tenant.adminEmail || tenant.email : "Inactive"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-ink">
                          {formatCount(stats.activeCampaigns)}
                          <span className="text-ink-subtle"> active / {formatCount(stats.campaigns)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <BudgetBar
                            compact
                            spent={stats.spent}
                            budget={stats.budget}
                            usage={usageOf(stats.budget, stats.spent)}
                            nearLimit={false}
                          />
                        </td>
                        <td className="px-4 py-3 text-ink">{formatCount(impressions)}</td>
                        <td className="px-4 py-3 text-ink">
                          {formatPct(impressions > 0 ? (clicks * 100) / impressions : 0)}
                        </td>
                        <td className="px-4 py-3 text-ink">{formatCount(stats.conversions)}</td>
                        <td className="px-4 py-3">
                          {over + near === 0 ? (
                            <span className="text-xs text-ink-subtle">—</span>
                          ) : (
                            <div className="flex flex-col gap-1 text-[11px] font-semibold">
                              {over > 0 && (
                                <span className="w-fit rounded-full bg-accent-soft px-2 py-0.5 text-accent">
                                  {over} budget reached
                                </span>
                              )}
                              {near > 0 && (
                                <span className="w-fit rounded-full bg-warning-soft px-2 py-0.5 text-warning">
                                  {near} near limit
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/reports?tenant=${tenant.id}`}>
                            <Button variant="ghost" className="px-2 py-1.5 text-xs">
                              <FileText size={14} />
                              Report
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
