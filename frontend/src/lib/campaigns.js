export const TYPES = ["EMAIL", "SOCIAL", "ADS"];
export const STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED", "ARCHIVED"];

export const STATUS_LABEL = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const TYPE_LABEL = {
  EMAIL: "Email",
  SOCIAL: "Social",
  ADS: "Ads",
};

export const NEXT_STATUS = {
  DRAFT: "SCHEDULED",
  SCHEDULED: "ACTIVE",
  ACTIVE: "COMPLETED",
  COMPLETED: "ARCHIVED",
};

export const NEXT_ACTION = {
  DRAFT: "Move to scheduled",
  SCHEDULED: "Move to active",
  ACTIVE: "Mark completed",
  COMPLETED: "Archive",
};

export const STATUS_STYLES = {
  DRAFT: "bg-surface-muted text-ink-muted",
  SCHEDULED: "bg-accent-soft text-accent",
  ACTIVE: "bg-success-soft text-success",
  COMPLETED: "bg-warning-soft text-warning",
  ARCHIVED: "bg-surface-muted text-ink-subtle",
};

export const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function emptyForm() {
  return {
    name: "",
    description: "",
    type: "ADS",
    startDate: "",
    endDate: "",
    budget: "",
  };
}

export function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type,
    startDate: form.startDate,
    endDate: form.endDate,
    budget: Number(form.budget),
  };
}

export function campaignPermissions(campaign, isAdmin) {
  return {
    canEdit: Boolean(isAdmin && campaign.status === "DRAFT"),
    canDelete: Boolean(isAdmin && (campaign.status === "DRAFT" || campaign.status === "ARCHIVED")),
    canMetrics: Boolean(isAdmin && campaign.status === "ACTIVE" && !campaign.emailSent),
    canAdvance: Boolean(isAdmin && NEXT_STATUS[campaign.status]),
  };
}

export function apiError(err) {
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
