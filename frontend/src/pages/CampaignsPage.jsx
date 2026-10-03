import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useFeedback } from "@/context/FeedbackContext";
import { refreshNotifications } from "@/api/notifications";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CampaignFilters } from "@/components/campaigns/CampaignFilters";
import { CampaignsTable } from "@/components/campaigns/CampaignsTable";
import { CampaignFormDialog } from "@/components/campaigns/CampaignFormDialog";
import { CampaignMetricsDialog } from "@/components/campaigns/CampaignMetricsDialog";
import { CampaignDetailDialog } from "@/components/campaigns/CampaignDetailDialog";
import {
  NEXT_ACTION,
  STATUS_LABEL,
  apiError,
  emptyForm,
} from "@/lib/campaigns";
import {
  changeCampaignStatus,
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  recordCampaignMetrics,
  updateCampaign,
} from "@/api/campaigns";

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

      <CampaignFilters
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        status={status}
        type={type}
        startDate={startDate}
        endDate={endDate}
        onFilter={patchFilters}
      />

      {error && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <CampaignsTable
        campaigns={campaigns}
        isLoading={isLoading}
        isError={isError}
        isAdmin={isAdmin}
        page={page}
        totalPages={totalPages}
        statusPending={statusMutation.isPending}
        deletePending={deleteMutation.isPending}
        onOpen={setDetail}
        onEdit={openEdit}
        onAdvance={advanceStatus}
        onMetrics={(campaign) => {
          setMetricsFor(campaign);
          setMetrics({ impressions: "", clicks: "", conversions: "", budgetSpent: "" });
          setError(null);
        }}
        onDelete={confirmDelete}
        onPage={(nextPage) => patchFilters({ page: String(nextPage) }, false)}
      />

      {formOpen && (
        <CampaignFormDialog
          editing={editing}
          form={form}
          setForm={setForm}
          pending={saveMutation.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={(payload) => {
            setError(null);
            saveMutation.mutate(payload);
          }}
        />
      )}

      {metricsFor && (
        <CampaignMetricsDialog
          campaign={metricsFor}
          metrics={metrics}
          setMetrics={setMetrics}
          error={error}
          pending={metricsMutation.isPending}
          onClose={() => setMetricsFor(null)}
          onSubmit={(payload) => {
            setError(null);
            metricsMutation.mutate({ id: metricsFor.id, payload });
          }}
        />
      )}

      {detail && (
        <CampaignDetailDialog
          campaign={detail}
          isAdmin={isAdmin}
          onClose={() => setDetail(null)}
          onMetricsChanged={refresh}
        />
      )}
    </div>
  );
}
