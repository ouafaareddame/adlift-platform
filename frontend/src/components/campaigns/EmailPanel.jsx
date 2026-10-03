import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/context/FeedbackContext";
import { formatCount } from "@/lib/format";
import {
  fetchCampaignEmail,
  saveCampaignEmail,
  sendCampaignEmail,
  syncCampaignEmail,
} from "@/api/campaigns";

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

const MAX_RECIPIENTS = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apiError(err) {
  const raw = err.response?.data?.message;
  const map = {
    "L'email ne peut être envoyé que lorsque la campagne est ACTIVE.":
      "The email can only be sent while the campaign is Active.",
    "Rédigez l'email avant de l'envoyer.": "Save the email before sending it.",
    "Cet email a déjà été envoyé.": "This email has already been sent.",
    "Cet email a déjà été envoyé : il ne peut plus être modifié.": "This email was already sent and can no longer be edited.",
    "Cette campagne est terminée : son email ne peut plus être modifié.":
      "This campaign is finished; its email can no longer be edited.",
    "L'envoi d'email n'est pas configuré : renseignez BREVO_API_KEY et BREVO_SENDER_EMAIL.":
      "Email sending is not configured on the server (BREVO_API_KEY and BREVO_SENDER_EMAIL).",
    "Clé API Brevo invalide.": "The Brevo API key is invalid.",
  };
  if (raw && map[raw]) return map[raw];
  if (raw?.startsWith("Brevo")) return `Email provider error — ${raw}`;
  return raw || "Something went wrong. Please try again.";
}

function parseRecipients(text) {
  return [...new Set(text.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function EmailForm({ campaign, email, onSaved }) {
  const [subject, setSubject] = useState(email.subject || "");
  const [content, setContent] = useState(email.content || "");
  const [recipientsText, setRecipientsText] = useState((email.recipients || []).join("\n"));
  const [error, setError] = useState(null);
  const { confirm, notify } = useFeedback();

  const recipients = parseRecipients(recipientsText);
  const invalid = recipients.filter((r) => !EMAIL_PATTERN.test(r));
  const saved = Boolean(email.subject);
  const dirty =
    subject !== (email.subject || "") ||
    content !== (email.content || "") ||
    recipients.join("\n") !== (email.recipients || []).join("\n");

  const saveMutation = useMutation({
    mutationFn: () => saveCampaignEmail(campaign.id, { subject: subject.trim(), content, recipients }),
    onSuccess: (data) => {
      setError(null);
      setRecipientsText(data.recipients.join("\n"));
      onSaved(data);
      notify("Email saved.");
    },
    onError: (err) => setError(apiError(err)),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendCampaignEmail(campaign.id),
    onSuccess: (data) => {
      setError(null);
      onSaved(data, true);
      const failed = data.failedCount > 0 ? ` (${data.failedCount} failed)` : "";
      notify(`Email sent to ${data.sentCount} recipient${data.sentCount > 1 ? "s" : ""}${failed}.`);
    },
    onError: (err) => setError(apiError(err)),
  });

  function submit(event) {
    event.preventDefault();
    if (invalid.length > 0) {
      setError(`Invalid address: ${invalid[0]}`);
      return;
    }
    if (recipients.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    if (recipients.length > MAX_RECIPIENTS) {
      setError(`${MAX_RECIPIENTS} recipients maximum.`);
      return;
    }
    saveMutation.mutate();
  }

  async function send() {
    const count = email.recipients.length;
    const ok = await confirm({
      title: `Send “${email.subject}”?`,
      message: `The email goes out now to ${count} recipient${count > 1 ? "s" : ""}. It cannot be edited or sent again afterwards.`,
      confirmLabel: "Send now",
      tone: "default",
    });
    if (ok) sendMutation.mutate();
  }

  const canSend = saved && !dirty && campaign.status === "ACTIVE" && email.providerReady;

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="email-subject">
          Subject
        </label>
        <input
          id="email-subject"
          className={fieldClass}
          value={subject}
          maxLength={200}
          required
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="email-content">
          Message
        </label>
        <textarea
          id="email-content"
          className={`${fieldClass} min-h-28`}
          value={content}
          required
          placeholder="Plain text. Links such as https://adlift.ma become clickable and are tracked."
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="email-recipients">
          Recipients · {recipients.length}/{MAX_RECIPIENTS}
        </label>
        <textarea
          id="email-recipients"
          className={`${fieldClass} min-h-20 font-mono text-xs`}
          value={recipientsText}
          placeholder={"one address per line\nclient@example.com"}
          onChange={(e) => setRecipientsText(e.target.value)}
        />
      </div>

      {!email.providerReady && (
        <p className="rounded-[var(--radius-control)] bg-warning-soft px-3 py-2 text-xs text-warning">
          Email sending is not configured on the server. Add BREVO_API_KEY and BREVO_SENDER_EMAIL to .env.
        </p>
      )}
      {email.providerReady && campaign.status !== "ACTIVE" && (
        <p className="text-xs text-ink-subtle">You can prepare the email now; sending unlocks once the campaign is Active.</p>
      )}
      {error && <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" variant="ghost" disabled={saveMutation.isPending || !dirty}>
          {saveMutation.isPending ? "Saving…" : saved ? "Save changes" : "Save draft"}
        </Button>
        <Button type="button" variant="accent" disabled={!canSend || sendMutation.isPending} onClick={send}>
          <Send size={14} />
          {sendMutation.isPending ? "Sending…" : "Send now"}
        </Button>
      </div>
    </form>
  );
}

function EmailStats({ campaign, email, onSynced }) {
  const [error, setError] = useState(null);
  const syncMutation = useMutation({
    mutationFn: () => syncCampaignEmail(campaign.id),
    onSuccess: (data) => {
      setError(null);
      onSynced(data, true);
    },
    onError: (err) => setError(apiError(err)),
  });

  return (
    <div className="space-y-3">
      <p className="text-ink">
        <span className="font-medium">“{email.subject}”</span>
        <span className="text-ink-muted">
          {" "}
          · sent {formatDateTime(email.sentAt)} to {email.sentCount} recipient(s)
          {email.failedCount > 0 ? `, ${email.failedCount} failed` : ""}
        </span>
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Delivered", value: formatCount(email.delivered) },
          { label: "Unique opens", value: formatCount(email.opens) },
          { label: "Unique clicks", value: formatCount(email.clicks) },
        ].map((item) => (
          <div key={item.label} className="rounded-[var(--radius-control)] bg-accent-soft p-3">
            <p className="text-xs text-ink-muted">{item.label}</p>
            <p className="mt-1 font-semibold text-ink">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-subtle">
          Real figures from Brevo, refreshed every 5 minutes · last update {formatDateTime(email.lastSyncedAt)}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="px-2 py-1.5 text-xs"
          disabled={syncMutation.isPending || !email.providerReady}
          onClick={() => syncMutation.mutate()}
        >
          <RefreshCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} />
          Refresh stats
        </Button>
      </div>
      {error && <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function EmailPanel({ campaign, isAdmin, onMetricsChanged }) {
  const queryClient = useQueryClient();
  const queryKey = ["campaign-email", campaign.id];
  const { data: email, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchCampaignEmail(campaign.id),
  });

  function handleUpdate(data, metricsChanged = false) {
    queryClient.setQueryData(queryKey, data);
    if (metricsChanged) onMetricsChanged();
  }

  const editable = isAdmin && campaign.status !== "COMPLETED" && campaign.status !== "ARCHIVED";

  return (
    <div className="rounded-[var(--radius-control)] border border-slate-100 p-3">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <Mail size={14} />
        Email delivery
      </p>
      {isLoading && <p className="text-xs text-ink-muted">Loading…</p>}
      {isError && <p className="text-xs text-danger">Could not load the email for this campaign.</p>}
      {email && email.sentAt && <EmailStats campaign={campaign} email={email} onSynced={handleUpdate} />}
      {email && !email.sentAt && editable && (
        <EmailForm key={email.subject || "new"} campaign={campaign} email={email} onSaved={handleUpdate} />
      )}
      {email && !email.sentAt && !editable && (
        <p className="text-xs text-ink-subtle">
          {email.subject ? `Draft ready: “${email.subject}” — not sent yet.` : "No email has been prepared for this campaign."}
        </p>
      )}
    </div>
  );
}
