import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fetchTenantMembers, resetTenantMemberPassword, updateTenant } from "@/api/tenants";
import { isMemberActive } from "@/api/members";
import { useFeedback } from "@/context/FeedbackContext";
import { copyText } from "@/lib/clipboard";

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

function roleLabel(role) {
  if (role === "AGENCY_ADMIN") return "Agency admin";
  if (role === "CLIENT") return "Client";
  return role;
}

export default function ManageTenantDialog({ tenant, onClose, describeError }) {
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [details, setDetails] = useState({ name: tenant.name, email: tenant.email });
  const [detailsError, setDetailsError] = useState(null);
  const [reset, setReset] = useState(null);
  const [copied, setCopied] = useState(false);

  const members = useQuery({
    queryKey: ["tenant-members", tenant.id],
    queryFn: () => fetchTenantMembers(tenant.id),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateTenant(tenant.id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      notify(`${updated.name} has been updated.`);
    },
    onError: (err) => setDetailsError(describeError(err)),
  });

  const resetMutation = useMutation({
    mutationFn: (member) => resetTenantMemberPassword(tenant.id, member.id),
    onSuccess: (result) => {
      setReset(result);
      setCopied(false);
      notify(`New temporary password created for ${result.email}.`);
    },
    onError: (err) => notify(describeError(err), "error"),
  });

  const unchanged = details.name.trim() === tenant.name && details.email.trim() === tenant.email;

  async function confirmReset(member) {
    const ok = await confirm({
      title: `Reset the password of ${member.email}?`,
      message:
        "Their current password stops working immediately. You will get a temporary password to share with them; they choose a new one at their next sign-in.",
      confirmLabel: "Reset password",
    });
    if (ok) resetMutation.mutate(member);
  }

  async function copyReset() {
    const ok = await copyText(`Email: ${reset.email}\nTemporary password: ${reset.temporaryPassword}`);
    if (ok) setCopied(true);
    else notify("Could not copy automatically. Select the password and copy it manually.", "error");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Manage {tenant.name}</h2>
          <button type="button" className="text-sm text-ink-muted hover:text-ink" onClick={onClose}>
            Close
          </button>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setDetailsError(null);
            updateMutation.mutate({ name: details.name.trim(), email: details.email.trim() });
          }}
        >
          <p className="text-sm font-semibold text-ink">Workspace details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Client name
              <input
                required
                className={fieldClass}
                value={details.name}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Contact email
              <input
                required
                type="email"
                className={fieldClass}
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
              />
            </label>
          </div>
          {detailsError && (
            <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
              {detailsError}
            </p>
          )}
          <div>
            <Button type="submit" variant="accent" disabled={unchanged || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-ink">Logins</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Passwords are stored encrypted, so nobody can read them — not even Adlift. If someone forgot theirs,
            give them a temporary one.
          </p>

          {reset && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-success-soft px-3 py-2 text-sm">
              <p className="text-ink">
                Share with {reset.email}:{" "}
                <span className="font-mono font-semibold">{reset.temporaryPassword}</span>
              </p>
              <Button type="button" variant="ghost" className="py-1.5 text-xs" onClick={copyReset}>
                <Copy size={14} />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}

          <ul className="mt-3 divide-y divide-slate-100 rounded-[var(--radius-control)] border border-slate-100">
            {members.isLoading && <li className="px-3 py-3 text-sm text-ink-muted">Loading logins…</li>}
            {members.isError && <li className="px-3 py-3 text-sm text-danger">Could not load the logins.</li>}
            {members.data?.map((member) => {
              const active = isMemberActive(member);
              return (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{member.email}</p>
                    <p className="text-xs text-ink-muted">
                      {roleLabel(member.role)} · {active ? "Active" : "Deactivated"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1.5 text-xs"
                    disabled={resetMutation.isPending}
                    onClick={() => confirmReset(member)}
                  >
                    <KeyRound size={14} />
                    Reset password
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </div>
  );
}
