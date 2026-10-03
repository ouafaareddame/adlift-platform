import { useQuery } from "@tanstack/react-query";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { CampaignModal } from "@/components/campaigns/CampaignModal";
import { EmailPanel } from "@/components/campaigns/EmailPanel";
import { fetchCampaignKpis, fetchCampaignMetricsHistory } from "@/api/campaigns";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/campaigns";
import { formatCount, formatMoney, formatPct } from "@/lib/format";

export function CampaignDetailDialog({ campaign, isAdmin, onClose, onMetricsChanged }) {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["campaign-kpis", campaign.id],
    queryFn: () => fetchCampaignKpis(campaign.id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["campaign-metrics", campaign.id],
    queryFn: () => fetchCampaignMetricsHistory(campaign.id),
  });

  return (
    <CampaignModal title={campaign.name} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-ink-muted">
          {campaign.type ? TYPE_LABEL[campaign.type] || campaign.type : ""} ·{" "}
          {STATUS_LABEL[campaign.status] || campaign.status} · {campaign.startDate} → {campaign.endDate}
        </p>
        {campaign.description && <p className="text-ink">{campaign.description}</p>}
        {kpisLoading && <p className="text-ink-muted">Loading KPIs…</p>}
        <BudgetBar
          spent={campaign.spent}
          budget={campaign.budget}
          usage={campaign.budgetUsage}
          nearLimit={campaign.status === "ACTIVE"}
        />
        {kpis && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Impressions", value: formatCount(kpis.totalImpressions) },
              { label: "Clicks", value: formatCount(kpis.totalClicks) },
              { label: "Conversions", value: formatCount(kpis.totalConversions) },
              { label: "Spend", value: formatMoney(kpis.totalBudgetSpent) },
              { label: "CTR", value: formatPct(kpis.averageCtr) },
              { label: "CPC", value: formatMoney(kpis.averageCpc) },
            ].map((item) => (
              <div key={item.label} className="rounded-[var(--radius-control)] bg-accent-soft p-3">
                <p className="text-xs text-ink-muted">{item.label}</p>
                <p className="mt-1 font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        )}
        {campaign.type === "EMAIL" && (
          <EmailPanel campaign={campaign} isAdmin={isAdmin} onMetricsChanged={onMetricsChanged} />
        )}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Metrics history</p>
          {history.length === 0 ? (
            <p className="text-xs text-ink-subtle">
              No metrics recorded yet
              {isAdmin && campaign.status === "ACTIVE" && !campaign.emailSent
                ? " — use Metrics to add the first entry."
                : "."}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-[var(--radius-control)] border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-muted text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Recorded</th>
                    <th className="px-3 py-2 text-right font-medium">Impr.</th>
                    <th className="px-3 py-2 text-right font-medium">Clicks</th>
                    <th className="px-3 py-2 text-right font-medium">Conv.</th>
                    <th className="px-3 py-2 text-right font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-ink-muted">
                        {new Date(entry.recordedAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2 text-right text-ink">{formatCount(entry.impressions)}</td>
                      <td className="px-3 py-2 text-right text-ink">{formatCount(entry.clicks)}</td>
                      <td className="px-3 py-2 text-right text-ink">{formatCount(entry.conversions)}</td>
                      <td className="px-3 py-2 text-right text-ink">{formatMoney(entry.budgetSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </CampaignModal>
  );
}
