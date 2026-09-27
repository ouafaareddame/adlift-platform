import { motion } from "framer-motion";
import { AdliftLogo } from "@/components/brand/AdliftLogo";

const campaigns = [
  { name: "Spring newsletter", type: "EMAIL", status: "Active" },
  { name: "Ramadan social", type: "SOCIAL", status: "Scheduled" },
  { name: "Search launch", type: "ADS", status: "Draft" },
];

export function ProductShowcase({ footer = true, className = "" }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-[#0c3554] via-[#0f4368] to-[#08263d] ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/35 blur-3xl" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-8 pt-8">
        <div className="relative h-[380px] w-full max-w-[500px]">
          <motion.div
            className="absolute left-0 top-0 z-20 w-[280px] rounded-2xl bg-white p-5 shadow-2xl shadow-black/30"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <p className="text-[11px] font-medium text-ink-muted">Campaign mix</p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative h-[96px] w-[96px] shrink-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(#155686 0 42%, #3D7A9E 42% 68%, #7BA8C9 68% 86%, #C5D9E8 86% 100%)",
                }}
              >
                <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-sm font-semibold text-ink">12</span>
                  <span className="text-[9px] text-ink-muted">total</span>
                </div>
              </div>
              <ul className="min-w-[110px] space-y-2 text-[11px] text-ink">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-accent" /> Active
                  </span>
                  <span className="font-medium">5</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#3D7A9E]" /> Scheduled
                  </span>
                  <span className="font-medium">3</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#7BA8C9]" /> Draft
                  </span>
                  <span className="font-medium">4</span>
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            className="absolute right-0 top-[72px] z-30 w-[230px] rounded-2xl bg-white p-5 shadow-2xl shadow-black/30"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-ink-muted">This month</p>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                Active
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">24 180 MAD</p>
            <p className="text-[11px] text-ink-muted">Recorded spend</p>
            <div className="mt-4 flex h-12 items-end gap-1.5">
              {[40, 55, 38, 72, 64, 88, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-accent"
                  style={{ height: `${h}%`, opacity: 0.4 + i * 0.08 }}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-0 left-8 z-10 w-[320px] rounded-2xl bg-white p-5 shadow-2xl shadow-black/30"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            <p className="text-[11px] font-medium text-ink-muted">Workspace campaigns</p>
            <ul className="mt-3 space-y-3">
              {campaigns.map((row) => (
                <li key={row.name} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-ink">{row.name}</p>
                    <p className="text-[10px] text-ink-muted">{row.type}</p>
                  </div>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {footer ? (
        <div className="relative z-10 flex flex-col items-center px-10 pb-14 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-black/20">
            <AdliftLogo className="h-14 w-auto" />
          </div>
          <h2 className="max-w-sm text-[1.7rem] font-semibold leading-snug tracking-tight text-white">
            One place to run email, social and ads
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
            Plan campaigns, follow spend and keep your agency workspace in one cockpit.
          </p>
        </div>
      ) : (
        <div className="h-10" />
      )}
    </div>
  );
}
