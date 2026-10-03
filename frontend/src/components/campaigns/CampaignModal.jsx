import { Card } from "@/components/ui/Card";

export function CampaignModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" className="text-sm text-ink-muted hover:text-ink" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}
