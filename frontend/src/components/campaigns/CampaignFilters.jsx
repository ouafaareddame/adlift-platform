import { Card } from "@/components/ui/Card";
import { STATUSES, STATUS_LABEL, TYPES, TYPE_LABEL, fieldClass } from "@/lib/campaigns";

export function CampaignFilters({ keywordInput, onKeywordChange, status, type, startDate, endDate, onFilter }) {
  return (
    <Card className="border border-accent-soft/80">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          Search
          <input
            value={keywordInput}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Campaign name"
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          Status
          <select value={status} onChange={(e) => onFilter({ status: e.target.value })} className={fieldClass}>
            <option value="">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          Type
          <select value={type} onChange={(e) => onFilter({ type: e.target.value })} className={fieldClass}>
            <option value="">All types</option>
            {TYPES.map((item) => (
              <option key={item} value={item}>
                {TYPE_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => onFilter({ startDate: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => onFilter({ endDate: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>
    </Card>
  );
}
