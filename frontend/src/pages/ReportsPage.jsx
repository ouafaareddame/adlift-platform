import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Download, Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdliftLogo } from "@/components/brand/AdliftLogo";
import { useAuth } from "@/context/AuthContext";
import { exportReport, fetchReport } from "@/api/campaigns";
import { fetchTenants } from "@/api/tenants";
import { currentMonthRange, downloadBlob, formatCount, formatMoney, formatPct, toIsoDate } from "@/lib/format";

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

const STATUS_LABEL = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};
const TYPE_LABEL = { EMAIL: "Email", SOCIAL: "Social", ADS: "Ads" };

function presets() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    { label: "This month", ...currentMonthRange() },
    {
      label: "Last month",
      startDate: toIsoDate(new Date(y, m - 1, 1)),
      endDate: toIsoDate(new Date(y, m, 0)),
    },
    {
      label: "Last 90 days",
      startDate: toIsoDate(new Date(y, m, now.getDate() - 89)),
      endDate: toIsoDate(now),
    },
    { label: "This year", startDate: `${y}-01-01`, endDate: `${y}-12-31` },
  ];
}

export default function ReportsPage() {
  const { hasRole } = useAuth();
  const isDirector = hasRole("SUPER_ADMIN");
  const [searchParams, setSearchParams] = useSearchParams();
  const [exportError, setExportError] = useState(null);

  const month = currentMonthRange();
  const startDate = searchParams.get("startDate") || month.startDate;
  const endDate = searchParams.get("endDate") || month.endDate;
  const tenantId = searchParams.get("tenant") || "";
  const validRange = startDate <= endDate;

  const { data: tenantsPage } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => fetchTenants({ page: 0, size: 100 }),
    enabled: isDirector,
  });
  const tenants = tenantsPage?.content || [];
  const tenant = tenants.find((item) => item.id === tenantId);

  const filters = { startDate, endDate, tenantId: isDirector ? tenantId : undefined };
  const canLoad = validRange && (!isDirector || Boolean(tenantId));

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ["report", filters],
    queryFn: () => fetchReport(filters),
    enabled: canLoad,
  });

  function patch(values) {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  async function handleExport() {
    setExportError(null);
    try {
      const blob = await exportReport(filters);
      const slug = (tenant?.name || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await downloadBlob(blob, `adlift-report-${slug}-${startDate}-${endDate}.csv`);
    } catch {
      setExportError("Could not export the report. Please try again.");
    }
  }

  const rows = report?.rows || [];
  const totals = report?.totals;

  const kpis = totals
    ? [
        { label: "Spend", value: formatMoney(totals.spent), hint: `Budget of listed campaigns: ${formatMoney(totals.budget)}` },
        { label: "Impressions", value: formatCount(totals.impressions), hint: `${formatCount(totals.clicks)} clicks` },
        { label: "CTR", value: formatPct(totals.ctr), hint: `CPC ${formatMoney(totals.cpc)}` },
        {
          label: "Conversions",
          value: formatCount(totals.conversions),
          hint: `${formatPct(totals.conversionRate)} of clicks`,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="hidden print:block">
        <AdliftLogo className="h-12 w-auto" />
        <p className="mt-4 text-xl font-semibold text-ink">
          Campaign report{tenant ? ` · ${tenant.name}` : ""}
        </p>
        <p className="text-sm text-ink-muted">
          {startDate} → {endDate}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Reports</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Performance recorded during a period — ready to share with the client.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="bg-surface text-xs" disabled={!report} onClick={() => window.print()}>
            <Printer size={14} />
            Print / PDF
          </Button>
          <Button variant="accent" className="text-xs" disabled={!report} onClick={handleExport}>
            <Download size={14} />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border border-accent-soft/80 print:hidden">
        <div className={`grid gap-3 ${isDirector ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {isDirector && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
              Client
              <select className={fieldClass} value={tenantId} onChange={(e) => patch({ tenant: e.target.value })}>
                <option value="">Choose a client…</option>
                {tenants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            From
            <input
              type="date"
              className={fieldClass}
              value={startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            To
            <input
              type="date"
              className={fieldClass}
              value={endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {presets().map((preset) => {
            const active = preset.startDate === startDate && preset.endDate === endDate;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => patch({ startDate: preset.startDate, endDate: preset.endDate })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent-soft/70"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </Card>

      {!validRange && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
          The end date must be on or after the start date.
        </p>
      )}
      {exportError && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">{exportError}</p>
      )}

      {isDirector && !tenantId && (
        <Card className="border border-accent-soft/80 py-10 text-center text-sm text-ink-muted">
          Choose a client to build its report.
        </Card>
      )}

      {canLoad && isLoading && <p className="text-sm text-ink-muted">Building report…</p>}
      {canLoad && isError && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
          {error?.response?.data?.message || "Could not build the report."}
        </p>
      )}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border border-accent-soft/80">
                <p className="text-sm font-medium text-ink-muted">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{kpi.value}</p>
                <p className="mt-1 text-xs text-ink-subtle">{kpi.hint}</p>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden border border-accent-soft/80 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm print:min-w-0 print:text-xs">
                <thead className="bg-accent-soft/60 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Budget</th>
                    <th className="px-4 py-3 text-right font-medium">Spend</th>
                    <th className="px-4 py-3 text-right font-medium">Impressions</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                    <th className="px-4 py-3 text-right font-medium">CTR</th>
                    <th className="px-4 py-3 text-right font-medium">CPC</th>
                    <th className="px-4 py-3 text-right font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-ink-muted">
                        No campaign ran or recorded metrics during this period.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.campaignId} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{row.name}</p>
                        <p className="text-xs text-ink-subtle">
                          {TYPE_LABEL[row.type] || row.type} · {row.startDate} → {row.endDate}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{STATUS_LABEL[row.status] || row.status}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">{formatMoney(row.budget)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{formatMoney(row.spent)}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatCount(row.impressions)}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatCount(row.clicks)}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatPct(row.ctr)}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatMoney(row.cpc)}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatCount(row.conversions)}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && totals && (
                  <tfoot>
                    <tr className="border-t-2 border-accent-soft bg-surface-muted font-semibold text-ink">
                      <td className="px-4 py-3" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right">{formatMoney(totals.budget)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(totals.spent)}</td>
                      <td className="px-4 py-3 text-right">{formatCount(totals.impressions)}</td>
                      <td className="px-4 py-3 text-right">{formatCount(totals.clicks)}</td>
                      <td className="px-4 py-3 text-right">{formatPct(totals.ctr)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(totals.cpc)}</td>
                      <td className="px-4 py-3 text-right">{formatCount(totals.conversions)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
          <p className="text-xs text-ink-subtle">
            Figures only include metrics recorded between {startDate} and {endDate}.
          </p>
        </>
      )}
    </div>
  );
}
