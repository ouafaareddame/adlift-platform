import { Button } from "@/components/ui/Button";
import { CampaignModal } from "@/components/campaigns/CampaignModal";
import { fieldClass } from "@/lib/campaigns";

export function CampaignMetricsDialog({ campaign, metrics, setMetrics, error, pending, onClose, onSubmit }) {
  return (
    <CampaignModal title={`Record metrics · ${campaign.name}`} onClose={onClose}>
      <p className="-mt-2 mb-3 text-xs text-ink-muted">
        Enter the figures for a new period only. They are added to the campaign totals and kept in its history.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            impressions: Number(metrics.impressions),
            clicks: Number(metrics.clicks),
            conversions: Number(metrics.conversions),
            budgetSpent: Number(metrics.budgetSpent),
          });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Impressions
          <input
            required
            type="number"
            min="0"
            className={fieldClass}
            value={metrics.impressions}
            onChange={(e) => setMetrics({ ...metrics, impressions: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Clicks
          <input
            required
            type="number"
            min="0"
            className={fieldClass}
            value={metrics.clicks}
            onChange={(e) => setMetrics({ ...metrics, clicks: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Conversions
          <input
            required
            type="number"
            min="0"
            className={fieldClass}
            value={metrics.conversions}
            onChange={(e) => setMetrics({ ...metrics, conversions: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Budget spent (MAD)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className={fieldClass}
            value={metrics.budgetSpent}
            onChange={(e) => setMetrics({ ...metrics, budgetSpent: e.target.value })}
          />
        </label>
        {error && (
          <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Save metrics"}
        </Button>
      </form>
    </CampaignModal>
  );
}
