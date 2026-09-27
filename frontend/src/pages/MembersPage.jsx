import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { UserPlus, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  deactivateMember,
  activateMember,
  fetchMembers,
  inviteMember,
  isMemberActive,
  updateMemberRole,
} from "@/api/members";

const ASSIGNABLE_ROLES = ["AGENCY_ADMIN", "CLIENT"];

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

function apiError(err) {
  const raw = err.response?.data?.message;
  const map = {
    "Cet email est déjà utilisé.": "This email is already in use.",
    "Membre non trouvé.": "Member not found.",
    "Impossible : c'est le dernier administrateur actif de cet espace.":
      "This is the last active admin of the workspace. Promote another member first.",
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

function roleLabel(role) {
  if (role === "AGENCY_ADMIN") return "Agency admin";
  if (role === "CLIENT") return "Client";
  return role;
}

export default function MembersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "CLIENT" });
  const [error, setError] = useState(null);
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
        email: created.email,
        role: roleLabel(created.role),
        password: variables.password,
      });
      setForm({ email: "", password: "", role: "CLIENT" });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => updateMemberRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
    onError: (err) => setError(apiError(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
    onError: (err) => setError(apiError(err)),
  });

  const activateMutation = useMutation({
    mutationFn: activateMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
    onError: (err) => setError(apiError(err)),
  });

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
            setError(null);
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

      {error && (
        <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}
      {notice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-success-soft px-3 py-2 text-sm text-success">
          <p>
            Login created for {notice.email} ({notice.role}). Share this temporary password:{" "}
            <span className="font-semibold text-ink">{notice.password}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            className="py-1.5 text-xs text-accent"
            onClick={() => navigator.clipboard.writeText(notice.password)}
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
                        onChange={(e) => {
                          setError(null);
                          roleMutation.mutate({ id: member.id, role: e.target.value });
                        }}
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
                      ) : active ? (
                        <Button
                          variant="danger"
                          className="px-2 py-1.5 text-xs"
                          onClick={() => {
                            if (window.confirm(`Deactivate ${member.email}? They will no longer be able to sign in.`)) {
                              setError(null);
                              deactivateMutation.mutate(member.id);
                            }
                          }}
                        >
                          <UserMinus size={14} />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="px-2 py-1.5 text-xs text-accent"
                          onClick={() => {
                            setError(null);
                            activateMutation.mutate(member.id);
                          }}
                        >
                          Reactivate
                        </Button>
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
                setError(null);
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
            </label>
            <p className="text-xs text-ink-subtle">
              No email is sent. Share the email and temporary password with this person — they will choose
              their own password at first sign-in.
            </p>
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
