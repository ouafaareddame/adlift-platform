export function Card({ children, className = "" }) {
  return (
    <div className={`bg-surface rounded-[var(--radius-card)] shadow-sm shadow-slate-200/40 p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardLabel({ children }) {
  return (
    <span className="inline-block text-xs font-medium text-ink-muted bg-surface-muted rounded-full px-3 py-1">
      {children}
    </span>
  );
}
