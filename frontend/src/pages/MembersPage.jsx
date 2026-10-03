import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { KeyRound, UserPlus, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  deactivateMember,
  activateMember,
  fetchMembers,
  inviteMember,
  isMemberActive,
  resetMemberPassword,
  updateMemberRole,
} from "@/api/members";
import { refreshNotifications } from "@/api/notifications";
import { useFeedback } from "@/context/FeedbackContext";
import { copyText } from "@/lib/clipboard";
import { ROLE_HINTS, roleLabel } from "@/lib/roles";

const ASSIGNABLE_ROLES = ["AGENCY_ADMIN", "CLIENT"];

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

function apiError(err) {
  const raw = err.response?.data?.message;
  const map = {
    "Cet email est déjà utilisé.": "This email is already in use.",
    "Cet email a déjà un compte : demandez à la direction Adlift de lui ouvrir cet espace.":
      "This email already has a login. Ask the Adlift direction to give it access to this workspace.",
    "Ce compte a accès à d'autres espaces : seule la direction Adlift peut réinitialiser son mot de passe.":
      "This login also opens other workspaces, so only the Adlift direction can reset its password.",
    "Membre non trouvé.": "Member not found.",
    "Impossible : c'est le dernier administrateur actif de cet espace.":
      "This is the last active account manager of the workspace. Promote another member first.",
    "Tenant non trouvé.": "Workspace not found.",
    "Impossible d'attribuer le rôle SUPER_ADMIN depuis un tenant.":
      "SUPER_ADMIN cannot be assigned from a workspace.",
    "Accès refusé : ce membre n'appartient pas à votre tenant.":
      "Access denied: this member is not in your workspace.",
    "Accès refusé : rôle insuffisant.": "Access denied: insufficient role.",
  };
  if (raw && map[raw]) return map[raw];
  return raw || "Something went wrong. Please try again.";
}

export default function MembersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [searchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "CLIENT" });
  const [inviteError, setInviteError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const filtered = useMemo(() => {
    const members = data || [];
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (member) =>
        member.email?.toLowerCase().includes(q) || member.role?.toLowerCase().includes(q)
    );
  }, [data, query]);

  const inviteMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: (created, variables) => {
      setInviteOpen(false);
      setNotice({
        text: `Login created for ${created.email} (${roleLabel(created.role)}).`,
        password: variables.password,
      });
      setForm({ email: "", password: "", role: "CLIENT" });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      refreshNotifications(queryClient);
      notify(`Login created for ${created.email}.`);
    },
    onError: (err) => setInviteError(apiError(err)),
  });

  function onMemberChanged(message) {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    refreshNotifications(queryClient);
    notify(message);
  }

  const roleMutation = useMutation({
    mutationFn: ({ member, role }) => updateMemberRole(member.id, role),
    onSuccess: (_, { member, role }) => onMemberChanged(`${member.email} is now ${roleLabel(role)}.`),
    onError: (err) => notify(apiError(err), "error"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (member) => deactivateMember(member.id),
    onSuccess: (_, member) => onMemberChanged(`${member.email} has been deactivated.`),
    onError: (err) => notify(apiError(err), "error"),
  });

  const activateMutation = useMutation({
    mutationFn: (member) => activateMember(member.id),
    onSuccess: (_, member) => onMemberChanged(`${member.email} is active again.`),
    onError: (err) => notify(apiError(err), "error"),
  });

  const resetMutation = useMutation({
    mutationFn: (member) => resetMemberPassword(member.id),
    onSuccess: (result) => {
      setNotice({ text: `Password reset for ${result.email}.`, password: result.temporaryPassword });
      notify(`New temporary password created for ${result.email}.`);
    },
    onError: (err) => notify(apiError(err), "error"),
  });

  async function confirmReset(member) {
    const ok = await confirm({
      title: `Reset the password of ${member.email}?`,
      message:
        "Their current password stops working immediately. You will get a temporary password to share with them; they choose a new one at their next sign-in.",
      confirmLabel: "Reset password",
    });
    if (ok) resetMutation.mutate(member);
  }

  async function confirmDeactivate(member) {
    const ok = await confirm({
      title: `Deactivate ${member.email}?`,
      message:
        "They lose access to this workspace (their other workspaces, if any, are not affected). You can reactivate this access at any time.",
      confirmLabel: "Deactivate",
    });
    if (ok) deactivateMutation.mutate(member);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Members</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Create a login for this workspace. Share the temporary password — no email is sent.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => {
            setInviteError(null);
            setInviteOpen(true);
          }}
        >
          <UserPlus size={16} />
          Create login
        </Button>
      </div>

      <Card className="border border-accent-soft/80">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or role"
          aria-label="Search by email or role"
          className={fieldClass}
        />
      </Card>

      {notice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-success-soft px-3 py-2 text-sm text-success">
          <p>
            {notice.text} Share this temporary password:{" "}
            <span className="font-semibold text-ink">{notice.password}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            className="py-1.5 text-xs text-accent"
            onClick={async () =>
              (await copyText(notice.password))
                ? notify("Password copied.")
                : notify("Could not copy automatically. Select the password and copy it manually.", "error")
            }
          >
            Copy password
          </Button>
        </div>
      )}

      <Card className="overflow-hidden border border-accent-soft/80 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-accent-soft/60 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    Loading members…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-danger">
                    Could not load members.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    No members in this workspace yet.
                  </td>
                </tr>
              )}
              {filtered.map((member) => {
                const active = isMemberActive(member);
                const isSelf = member.id === user?.id;
                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{member.email}</p>
                      {isSelf && <p className="mt-0.5 text-xs text-ink-subtle">You</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`${fieldClass} max-w-[180px] py-1.5`}
                        value={member.role}
                        disabled={isSelf || roleMutation.isPending}
                        onChange={(e) => roleMutation.mutate({ member, role: e.target.value })}
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          active ? "bg-success-soft text-success" : "bg-surface-muted text-ink-subtle"
                        }`}
                      >
                        {active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="text-xs text-ink-subtle">Your account</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="ghost"
                            className="px-2 py-1.5 text-xs"
                            disabled={resetMutation.isPending}
                            onClick={() => confirmReset(member)}
                          >
                            <KeyRound size={14} />
                            Reset password
                          </Button>
                          {active ? (
                            <Button
                              variant="danger"
                              className="px-2 py-1.5 text-xs"
                              disabled={deactivateMutation.isPending}
                              onClick={() => confirmDeactivate(member)}
                            >
                              <UserMinus size={14} />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              className="px-2 py-1.5 text-xs text-accent"
                              disabled={activateMutation.isPending}
                              onClick={() => activateMutation.mutate(member)}
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <Card className="w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Create login</h2>
              <button type="button" className="text-sm text-ink-muted hover:text-ink" onClick={() => setInviteOpen(false)}>
                Close
              </button>
            </div>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setInviteError(null);
                setNotice(null);
                inviteMutation.mutate({
                  email: form.email.trim(),
                  password: form.password,
                  role: form.role,
                });
              }}
            >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Email
              <input
                required
                type="email"
                className={fieldClass}
                placeholder="colleague@agency.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Temporary password
              <input
                required
                type="password"
                minLength={8}
                className={fieldClass}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Role
              <select
                className={fieldClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-ink-muted">{ROLE_HINTS[form.role]}</span>
            </label>
            <p className="text-xs text-ink-subtle">
              No email is sent. Share the email and temporary password with this person — they will choose
              their own password at first sign-in.
            </p>
            {inviteError && (
              <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
                {inviteError}
              </p>
            )}
            <Button type="submit" variant="accent" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Creating login…" : "Create login"}
            </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
