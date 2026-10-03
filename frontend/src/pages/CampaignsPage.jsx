import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowRight, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useFeedback } from "@/context/FeedbackContext";
import { refreshNotifications } from "@/api/notifications";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { EmailPanel } from "@/components/campaigns/EmailPanel";
import { formatCount, formatMoney, formatPct } from "@/lib/format";
import {
  changeCampaignStatus,
  createCampaign,
  deleteCampaign,
  fetchCampaignKpis,
  fetchCampaignMetricsHistory,
  fetchCampaigns,
  recordCampaignMetrics,
  updateCampaign,
} from "@/api/campaigns";

const TYPES = ["EMAIL", "SOCIAL", "ADS"];
const STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED", "ARCHIVED"];
const STATUS_LABEL = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};
const TYPE_LABEL = {
  EMAIL: "Email",
  SOCIAL: "Social",
  ADS: "Ads",
};
const NEXT_STATUS = {
  DRAFT: "SCHEDULED",
  SCHEDULED: "ACTIVE",
  ACTIVE: "COMPLETED",
  COMPLETED: "ARCHIVED",
};
const NEXT_ACTION = {
  DRAFT: "Move to scheduled",
  SCHEDULED: "Move to active",
  ACTIVE: "Mark completed",
  COMPLETED: "Archive",
};

const STATUS_STYLES = {
  DRAFT: "bg-surface-muted text-ink-muted",
  SCHEDULED: "bg-accent-soft text-accent",
  ACTIVE: "bg-success-soft text-success",
  COMPLETED: "bg-warning-soft text-warning",
  ARCHIVED: "bg-surface-muted text-ink-subtle",
};

function emptyForm() {
  return {
    name: "",
    description: "",
    type: "ADS",
    startDate: "",
    endDate: "",
    budget: "",
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type,
    startDate: form.startDate,
    endDate: form.endDate,
    budget: Number(form.budget),
  };
}

function apiError(err) {
  const raw = err.response?.data?.message;
  const map = {
    "Seule une campagne en DRAFT peut être modifiée.": "Only a DRAFT campaign can be edited.",
    "Seule une campagne en DRAFT ou ARCHIVED peut être supprimée.":
      "Only DRAFT or ARCHIVED campaigns can be deleted.",
    "Les métriques ne peuvent être saisies que sur une campagne ACTIVE.":
      "Metrics can only be recorded on an ACTIVE campaign.",
    "La date de fin doit être postérieure ou égale à la date de début.":
      "End date must be on or after the start date.",
    "Campagne non trouvée.": "Campaign not found.",
    "Les clics ne peuvent pas dépasser les impressions.": "Clicks cannot be higher than impressions.",
    "Les conversions ne peuvent pas dépasser les clics.": "Conversions cannot be higher than clicks.",
    "Cet email a été envoyé via Brevo : ses statistiques sont mises à jour automatiquement.":
      "This email was sent through Brevo; its figures are updated automatically.",
  };
  if (raw && map[raw]) return map[raw];
  if (raw?.startsWith("Transition invalide")) return "This status change is not allowed.";
  return raw || "Something went wrong. Please try again.";
}

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status] || ""}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function Modal({ title, children, onClose }) {
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

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export default function CampaignsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("AGENCY_ADMIN");
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();

  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const page = Number(searchParams.get("page") || 0);
  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput, 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [metricsFor, setMetricsFor] = useState(null);
  const [metrics, setMetrics] = useState({ impressions: "", clicks: "", conversions: "", budgetSpent: "" });
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  useEffect(() => {
    if (debouncedKeyword === keyword) return;
    patchFilters({ keyword: debouncedKeyword });
    // patchFilters is recreated each render; keyword+debounced is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || !isAdmin) return;
    openCreate();
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAdmin]);

  function patchFilters(patch, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (resetPage) next.delete("page");
    setSearchParams(next);
  }

  const filters = useMemo(
    () => ({ page, size: 10, status, type, keyword, startDate, endDate }),
    [page, status, type, keyword, startDate, endDate]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["campaigns", filters],
    queryFn: () => fetchCampaigns(filters),
  });

  const campaigns = data?.content || [];
  const totalPages = data?.totalPages || 0;

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["campaign-kpis", detail?.id],
    queryFn: () => fetchCampaignKpis(detail.id),
    enabled: Boolean(detail?.id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["campaign-metrics", detail?.id],
    queryFn: () => fetchCampaignMetricsHistory(detail.id),
    enabled: Boolean(detail?.id),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["campaign-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["campaign-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["campaign-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["report"] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? updateCampaign(editing.id, payload) : createCampaign(payload)),
    onSuccess: (saved) => {
      notify(editing ? `“${saved.name}” has been updated.` : `“${saved.name}” has been created as a draft.`);
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm());
      refresh();
    },
    onError: (err) => setError(apiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ campaign, next }) => changeCampaignStatus(campaign.id, next),
    onSuccess: (_, { campaign, next }) => {
      refresh();
      refreshNotifications(queryClient);
      notify(`“${campaign.name}” is now ${STATUS_LABEL[next]}.`);
    },
    onError: (err) => notify(apiError(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (campaign) => deleteCampaign(campaign.id),
    onSuccess: (_, campaign) => {
      refresh();
      notify(`“${campaign.name}” has been deleted.`);
    },
    onError: (err) => notify(apiError(err), "error"),
  });

  const metricsMutation = useMutation({
    mutationFn: ({ id, payload }) => recordCampaignMetrics(id, payload),
    onSuccess: () => {
      notify(`Metrics recorded for “${metricsFor?.name}”.`);
      setMetricsFor(null);
      refresh();
    },
    onError: (err) => setError(apiError(err)),
  });

  async function advanceStatus(campaign, next) {
    const ok = await confirm({
      title: `${NEXT_ACTION[campaign.status]}?`,
      message: `“${campaign.name}” will move to ${STATUS_LABEL[next]}. A campaign cannot go back to a previous step.`,
      confirmLabel: NEXT_ACTION[campaign.status],
      tone: next === "ACTIVE" || next === "SCHEDULED" ? "default" : "danger",
    });
    if (ok) statusMutation.mutate({ campaign, next });
  }

  async function confirmDelete(campaign) {
    const ok = await confirm({
      title: `Delete “${campaign.name}”?`,
      message: "The campaign and its metrics history will be permanently removed.",
      confirmLabel: "Delete",
    });
    if (ok) deleteMutation.mutate(campaign);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEdit(campaign) {
    setEditing(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description || "",
      type: campaign.type,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      budget: String(campaign.budget ?? ""),
    });
    setError(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-ink-muted">Email, social and ads — isolated to your workspace.</p>
        </div>
        {isAdmin && (
          <Button variant="accent" onClick={openCreate}>
            <Plus size={16} />
            New campaign
          </Button>
        )}
      </div>

      <Card className="border border-accent-soft/80">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Search
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Campaign name"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Status
            <select
              value={status}
              onChange={(e) => patchFilters({ status: e.target.value })}
              className={fieldClass}
            >
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
            <select
              value={type}
              onChange={(e) => patchFilters({ type: e.target.value })}
              className={fieldClass}
            >
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
              onChange={(e) => patchFilters({ startDate: e.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => patchFilters({ endDate: e.target.value })}
              className={fieldClass}
            />
          </label>
        </div>
      </Card>

      {error && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

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
                const canEdit = isAdmin && campaign.status === "DRAFT";
                const canDelete = isAdmin && (campaign.status === "DRAFT" || campaign.status === "ARCHIVED");
                const canMetrics = isAdmin && campaign.status === "ACTIVE" && !campaign.emailSent;
                return (
                  <tr key={campaign.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-medium text-ink hover:text-accent"
                        onClick={() => setDetail(campaign)}
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
                          <Button variant="ghost" className="px-2 py-1.5 text-xs" onClick={() => openEdit(campaign)}>
                            <Pencil size={14} />
                            Edit
                          </Button>
                        )}
                        {isAdmin && next && (
                          <Button
                            variant="ghost"
                            className="px-2 py-1.5 text-xs text-accent"
                            disabled={statusMutation.isPending}
                            onClick={() => advanceStatus(campaign, next)}
                          >
                            <ArrowRight size={14} />
                            {NEXT_ACTION[campaign.status]}
                          </Button>
                        )}
                        {canMetrics && (
                          <Button
                            variant="ghost"
                            className="px-2 py-1.5 text-xs"
                            onClick={() => {
                              setMetricsFor(campaign);
                              setMetrics({ impressions: "", clicks: "", conversions: "", budgetSpent: "" });
                              setError(null);
                            }}
                          >
                            <Activity size={14} />
                            Metrics
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            className="px-2 py-1.5 text-xs"
                            disabled={deleteMutation.isPending}
                            onClick={() => confirmDelete(campaign)}
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
            <Button variant="ghost" className="text-xs" disabled={page === 0} onClick={() => patchFilters({ page: String(page - 1) }, false)}>
              Previous
            </Button>
            <span className="text-xs text-ink-muted">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              className="text-xs"
              disabled={page + 1 >= totalPages}
              onClick={() => patchFilters({ page: String(page + 1) }, false)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {formOpen && (
        <Modal title={editing ? "Edit campaign" : "New campaign"} onClose={() => setFormOpen(false)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              saveMutation.mutate(toPayload(form));
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Name
              <input
                required
                className={fieldClass}
                placeholder="Spring newsletter"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Description
              <textarea
                className={fieldClass}
                rows={3}
                placeholder="Optional"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Type
              <select
                className={fieldClass}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((item) => (
                  <option key={item} value={item}>
                    {TYPE_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                From
                <input
                  required
                  type="date"
                  className={fieldClass}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                To
                <input
                  required
                  type="date"
                  className={fieldClass}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Budget (MAD)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className={fieldClass}
                placeholder="0.00"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </label>
            <Button type="submit" variant="accent" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create campaign"}
            </Button>
          </form>
        </Modal>
      )}

      {metricsFor && (
        <Modal title={`Record metrics · ${metricsFor.name}`} onClose={() => setMetricsFor(null)}>
          <p className="-mt-2 mb-3 text-xs text-ink-muted">
            Enter the figures for a new period only. They are added to the campaign totals and kept in its history.
          </p>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              metricsMutation.mutate({
                id: metricsFor.id,
                payload: {
                  impressions: Number(metrics.impressions),
                  clicks: Number(metrics.clicks),
                  conversions: Number(metrics.conversions),
                  budgetSpent: Number(metrics.budgetSpent),
                },
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
            <Button type="submit" variant="accent" disabled={metricsMutation.isPending}>
              {metricsMutation.isPending ? "Saving…" : "Save metrics"}
            </Button>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-ink-muted">
              {detail.type ? TYPE_LABEL[detail.type] || detail.type : ""} · {STATUS_LABEL[detail.status] || detail.status} · {detail.startDate} → {detail.endDate}
            </p>
            {detail.description && <p className="text-ink">{detail.description}</p>}
            {kpisLoading && <p className="text-ink-muted">Loading KPIs…</p>}
            <BudgetBar
              spent={detail.spent}
              budget={detail.budget}
              usage={detail.budgetUsage}
              nearLimit={detail.status === "ACTIVE"}
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
            {detail.type === "EMAIL" && (
              <EmailPanel campaign={detail} isAdmin={isAdmin} onMetricsChanged={refresh} />
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Metrics history</p>
              {history.length === 0 ? (
                <p className="text-xs text-ink-subtle">
                  No metrics recorded yet
                  {isAdmin && detail.status === "ACTIVE" && !detail.emailSent ? " — use Metrics to add the first entry." : "."}
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
        </Modal>
      )}
    </div>
  );
}
