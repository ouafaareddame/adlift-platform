const variants = {
  primary: "bg-ink text-white hover:bg-ink/90",
  accent: "bg-accent text-white hover:bg-accent-hover",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-muted",
  danger: "bg-danger-soft text-danger hover:bg-danger/10",
};

export function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
