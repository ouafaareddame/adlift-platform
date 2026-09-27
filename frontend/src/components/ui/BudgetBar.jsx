import { formatMoney } from "@/lib/format";

// "Near limit" only makes sense while money can still be spent (active campaign).
export function budgetTone(usage, { nearLimit = true } = {}) {
  if (usage == null) return { bar: "bg-slate-300", text: "text-ink-subtle", chip: "bg-surface-muted", label: null };
  if (usage > 100) return { bar: "bg-danger", text: "text-danger", chip: "bg-danger-soft", label: "Over budget" };
  if (usage >= 100) return { bar: "bg-accent-hover", text: "text-accent", chip: "bg-accent-soft", label: "Budget reached" };
  if (usage >= 80 && nearLimit) return { bar: "bg-warning", text: "text-warning", chip: "bg-warning-soft", label: "Near limit" };
  return { bar: "bg-accent", text: "text-ink-muted", chip: "bg-surface-muted", label: null };
}

export function BudgetBar({ spent, budget, usage, compact = false, nearLimit = true }) {
  const tone = budgetTone(usage, { nearLimit });
  const width = Math.min(Number(usage ?? 0), 100);

  return (
    <div className={compact ? "min-w-[140px]" : "w-full"}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-ink">{formatMoney(spent)}</span>
        <span className="text-ink-subtle">of {formatMoney(budget)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${width}%` }} />
      </div>
      <p className={`mt-1 text-[11px] ${tone.text}`}>
        {usage == null ? "No budget set" : `${Math.round(usage)}% used`}
        {tone.label ? ` · ${tone.label}` : ""}
      </p>
    </div>
  );
}
