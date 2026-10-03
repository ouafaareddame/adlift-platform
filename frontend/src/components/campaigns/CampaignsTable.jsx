import { Pencil, Trash2, ArrowRight, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BudgetBar } from "@/components/ui/BudgetBar";
import {
  NEXT_ACTION,
  NEXT_STATUS,
  STATUS_LABEL,
  STATUS_STYLES,
  TYPE_LABEL,
  campaignPermissions,
} from "@/lib/campaigns";

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status] || ""}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function CampaignsTable({
  campaigns,
  isLoading,
  isError,
  isAdmin,
  page,
  totalPages,
  statusPending,
  deletePending,
  onOpen,
  onEdit,
  onAdvance,
  onMetrics,
  onDelete,
  onPage,
}) {
  return (
    <Card className="overflow-hidden border border-accent-soft/80 p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-accent-soft/60 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Spend / budget</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-ink-muted">
                  Loading campaigns…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-danger">
                  Could not load campaigns.
                </td>
              </tr>
            )}
            {!isLoading && !isError && campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-ink-muted">
                  No campaigns yet. {isAdmin ? "Create one to start tracking performance." : ""}
                </td>
              </tr>
            )}
            {campaigns.map((campaign) => {
              const next = NEXT_STATUS[campaign.status];
              const { canEdit, canDelete, canMetrics, canAdvance } = campaignPermissions(campaign, isAdmin);
              return (
                <tr key={campaign.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-ink hover:text-accent"
                      onClick={() => onOpen(campaign)}
                    >
                      {campaign.name}
                    </button>
                    {campaign.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-ink-subtle">{campaign.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{TYPE_LABEL[campaign.type] || campaign.type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {campaign.startDate} → {campaign.endDate}
                  </td>
                  <td className="px-4 py-3">
                    <BudgetBar
                      compact
                      spent={campaign.spent}
                      budget={campaign.budget}
                      usage={campaign.budgetUsage}
                      nearLimit={campaign.status === "ACTIVE"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {canEdit && (
                        <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => onEdit(campaign)}>
                          <Pencil size={14} />
                          Edit
                        </Button>
                      )}
                      {canAdvance && next && (
                        <Button
                          variant="ghost"
                          className="px-2 py-1.5 text-xs text-accent"
                          disabled={statusPending}
                          onClick={() => onAdvance(campaign, next)}
                        >
                          <ArrowRight size={14} />
                          {NEXT_ACTION[campaign.status]}
                        </Button>
                      )}
                      {canMetrics && (
                        <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => onMetrics(campaign)}>
                          <Activity size={14} />
                          Metrics
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="danger"
                          className="px-2 py-1.5 text-xs"
                          disabled={deletePending}
                          onClick={() => onDelete(campaign)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <Button variant="ghost" className="text-xs" disabled={page === 0} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-ink-muted">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            className="text-xs"
            disabled={page + 1 >= totalPages}
            onClick={() => onPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}
