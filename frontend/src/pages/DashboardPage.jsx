import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  Percent,
  Wallet,
  Filter,
  Download,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/api/client";
import { fetchCampaigns } from "@/api/campaigns";
import { BudgetBar, budgetTone } from "@/components/ui/BudgetBar";
import { formatCount, formatMoney, formatPct } from "@/lib/format";

const ACCENT = "#155686";
const ACCENT_SOFT = "#e4eef5";
const ACCENT_SOFT_STRONG = "#7BA8C9";
const SUCCESS = "#059669";

// Log scale: with a 2 % CTR a linear bar for clicks would be 50× shorter than impressions.
function funnelWidth(value, top) {
  if (!value || !top) return 0;
  return Math.max(4, (Math.log10(value + 1) / Math.log10(top + 1)) * 100);
}

const MIX_PALETTE = [
  { key: "DRAFT", label: "Draft", color: "#C5D9E8" },
  { key: "SCHEDULED", label: "Scheduled", color: "#7BA8C9" },
  { key: "ACTIVE", label: "Active", color: "#155686" },
  { key: "COMPLETED", label: "Completed", color: "#3D7A9E" },
  { key: "ARCHIVED", label: "Archived", color: "#0F4368" },
];

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const hasMixFilters = Boolean(status || type);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["campaign-dashboard"],
    queryFn: async () => {
      const response = await apiClient.get("/api/campaigns/dashboard");
      return response.data;
    },
  });

  const { data: campaignsPage } = useQuery({
    queryKey: ["campaigns", { page: 0, size: 100, status, type }],
    queryFn: () => fetchCampaigns({ page: 0, size: 100, status, type }),
  });

  const impressions = Number(data?.totalImpressions ?? 0);
  const clicks = Number(data?.totalClicks ?? 0);
  const conversions = Number(data?.totalConversions ?? 0);
  const spend = Number(data?.totalBudgetSpent ?? 0);
  const totalCampaigns = Number(data?.totalCampaigns ?? 0);
  const activeCampaigns = Number(data?.activeCampaigns ?? 0);
  const ctr = impressions > 0 ? (clicks * 100) / impressions : 0;
  const totalBudget = Number(data?.totalBudget ?? 0);
  const budgetUsage = totalBudget > 0 ? (spend * 100) / totalBudget : null;
  const budgetAlerts = data?.budgetAlerts || [];
  const overCount = Number(data?.overBudgetCount ?? 0);
  const nearCount = Number(data?.nearBudgetCount ?? 0);
  const hasActivity =
    impressions > 0 || clicks > 0 || conversions > 0 || spend > 0 || totalCampaigns > 0;
  const isAdmin = hasRole("AGENCY_ADMIN");

  const highlight = [
    {
      label: "Impressions",
      value: formatCount(impressions),
      hint: "All recorded metrics",
      icon: Eye,
      tone: "bg-accent-soft text-accent",
    },
    {
      label: "Total spend",
      value: formatMoney(spend),
      hint: budgetUsage == null ? "No budget planned" : `${Math.round(budgetUsage)}% of ${formatMoney(totalBudget)} planned`,
      icon: Wallet,
      tone: "bg-success-soft text-success",
    },
    {
      label: "Average CTR",
      value: formatPct(ctr),
      hint: "Clicks / impressions",
      icon: Percent,
      tone: "bg-warning-soft text-warning",
    },
  ];

  const funnel = [
    { name: "Impressions", value: impressions || 0, fill: ACCENT_SOFT_STRONG },
    { name: "Clicks", value: clicks || 0, fill: ACCENT },
    { name: "Conversions", value: conversions || 0, fill: SUCCESS },
  ];

  const listed = campaignsPage?.content || [];
  const mixTotal = listed.length;
  const mixActive = listed.filter((campaign) => campaign.status === "ACTIVE").length;
  const displayTotal = hasMixFilters ? mixTotal : totalCampaigns;
  const displayActive = hasMixFilters ? mixActive : activeCampaigns;

  const statusCounts = MIX_PALETTE.map((item) => ({
    ...item,
    value: listed.filter((campaign) => campaign.status === item.key).length,
  }));
  const mix = statusCounts.filter((item) => item.value > 0);
  const emptyMix = [{ name: "Empty", label: "Empty", value: 1, color: ACCENT_SOFT }];
  const mixData = mix.length > 0 ? mix : emptyMix;

  async function exportCsv() {
    const response = await apiClient.get("/api/campaigns/export", {
      responseType: "blob",
      params: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campaigns.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function patchDashboard(patch) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              className="bg-surface py-2 text-xs"
              onClick={() => setFilterOpen((open) => !open)}
            >
              <Filter size={14} />
              Filter mix
            </Button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-72 space-y-2 rounded-[var(--radius-card)] border border-accent-soft bg-surface p-3 shadow-lg">
                <label className="block text-xs font-medium text-ink-muted">
                  Status
                  <select
                    className="mt-1 w-full rounded-[var(--radius-control)] border border-slate-200 px-2 py-1.5 text-sm text-ink"
                    value={status}
                    onChange={(e) => patchDashboard({ status: e.target.value })}
                  >
                    <option value="">All statuses</option>
                    {MIX_PALETTE.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-ink-muted">
                  Type
                  <select
                    className="mt-1 w-full rounded-[var(--radius-control)] border border-slate-200 px-2 py-1.5 text-sm text-ink"
                    value={type}
                    onChange={(e) => patchDashboard({ type: e.target.value })}
                  >
                    <option value="">All types</option>
                    <option value="EMAIL">Email</option>
                    <option value="SOCIAL">Social</option>
                    <option value="ADS">Ads</option>
                  </select>
                </label>
                <Button
                  type="button"
                  variant="accent"
                  className="w-full py-1.5 text-xs"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (status) params.set("status", status);
                    if (type) params.set("type", type);
                    navigate(`/campaigns${params.toString() ? `?${params}` : ""}`);
                  }}
                >
                  View matching campaigns
                </Button>
              </div>
            )}
          </div>
          {isAdmin && (
            <Button type="button" variant="ghost" className="bg-surface py-2 text-xs" onClick={exportCsv}>
              <Download size={14} />
              Export
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Loading metrics from your workspace…</p>}

      {isError && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
          Could not load dashboard metrics. Check that campaign-service is running.
        </p>
      )}

      {!isLoading && !isError && !hasActivity && (
        <Card className="border border-accent-soft/80 py-12 text-center">
          <h2 className="text-lg font-semibold text-ink">No campaigns yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            {isAdmin
              ? "Create a campaign, move it to Active, then record impressions, clicks, conversions and spend."
              : "Your agency has not created any campaign yet. Results will appear here as soon as one is Active."}
          </p>
          {isAdmin && (
            <div className="mt-6">
              <Button variant="accent" onClick={() => navigate("/campaigns?new=1")}>
                Create your first campaign
              </Button>
            </div>
          )}
        </Card>
      )}

      {!isLoading && !isError && hasActivity && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {highlight.map(({ label, value, hint, icon: Icon, tone }) => (
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

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="border border-accent-soft/80 xl:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Funnel</p>
                <p className="text-xs text-ink-subtle">All recorded metrics</p>
              </div>
              <ul className="space-y-5 pt-2">
                {funnel.map((stage, index) => {
                  const previous = index > 0 ? funnel[index - 1] : null;
                  const rate = previous && previous.value > 0 ? (stage.value * 100) / previous.value : null;
                  return (
                    <li key={stage.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-ink">{stage.name}</span>
                        <span className="text-ink">
                          <span className="font-semibold">{formatCount(stage.value)}</span>
                          {rate != null && (
                            <span className="ml-2 text-xs text-ink-subtle">
                              {formatPct(rate)} of {previous.name.toLowerCase()}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${funnelWidth(stage.value, funnel[0].value)}%`, backgroundColor: stage.fill }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[11px] text-ink-subtle">Bar length on a logarithmic scale so every stage stays readable.</p>
            </Card>

            <Card className="border border-accent-soft/80 xl:col-span-2">
              <p className="text-sm font-medium text-ink">Campaign mix</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{formatCount(displayTotal)}</p>
              <p className="text-xs text-success">
                {displayTotal > 0
                  ? `${formatCount(displayActive)} active${hasMixFilters ? " in this filter" : ""}`
                  : "No campaigns match"}
              </p>
              <div className="mx-auto h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mixData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={mix.length > 1 ? 3 : 0}
                      stroke="none"
                    >
                      {mixData.map((entry) => (
                        <Cell key={entry.key || entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const pct = displayTotal > 0 ? Math.round((Number(value) * 100) / displayTotal) : 0;
                        return [`${value} (${pct}%)`, name];
                      }}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgb(15 23 42 / 0.08)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
                {MIX_PALETTE.map((item) => {
                  const count = statusCounts.find((row) => row.key === item.key)?.value || 0;
                  const pct = displayTotal > 0 ? Math.round((count * 100) / displayTotal) : 0;
                  return (
                    <span key={item.key} className="inline-flex items-center gap-1.5">
                      <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label} {displayTotal > 0 ? `${pct}%` : ""}
                    </span>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="border border-accent-soft/80 xl:col-span-2">
              <p className="text-sm font-medium text-ink">Budget</p>
              <p className="mt-1 text-xs text-ink-subtle">Spend recorded against all planned budgets</p>
              <div className="mt-4">
                <BudgetBar spent={spend} budget={totalBudget} usage={budgetUsage} nearLimit={false} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-[var(--radius-control)] bg-danger-soft p-3">
                  <p className="text-xl font-semibold text-danger">{overCount}</p>
                  <p className="text-[11px] text-ink-muted">Budget reached or over</p>
                </div>
                <div className="rounded-[var(--radius-control)] bg-warning-soft p-3">
                  <p className="text-xl font-semibold text-warning">{nearCount}</p>
                  <p className="text-[11px] text-ink-muted">Above 80%</p>
                </div>
              </div>
            </Card>

            <Card className="border border-accent-soft/80 xl:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Budget alerts</p>
                <button
                  type="button"
                  className="text-xs font-medium text-accent hover:underline"
                  onClick={() => navigate("/campaigns")}
                >
                  All campaigns
                </button>
              </div>
              {budgetAlerts.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">
                  Every campaign is below 80% of its budget.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {budgetAlerts.map((alert) => {
                    const tone = budgetTone(alert.budgetUsage);
                    return (
                      <li key={alert.campaignId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{alert.name}</p>
                          <p className="text-xs text-ink-subtle">
                            {formatMoney(alert.spent)} of {formatMoney(alert.budget)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.chip} ${tone.text}`}
                        >
                          {Math.round(alert.budgetUsage)}% · {tone.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
