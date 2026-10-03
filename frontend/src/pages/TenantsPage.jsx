import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Copy, FileText, Plus, RefreshCw, Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import ManageTenantDialog from "@/components/tenants/ManageTenantDialog";
import { activateTenant, createTenant, deactivateTenant, fetchTenants } from "@/api/tenants";
import { refreshNotifications } from "@/api/notifications";
import { useFeedback } from "@/context/FeedbackContext";
import { copyText } from "@/lib/clipboard";

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-slate-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

const emptyForm = { name: "", email: "", adminEmail: "", adminPassword: "" };

function apiError(err) {
  const raw = err.response?.data?.message;
  const map = {
    "Un tenant avec cet email existe déjà.": "A client workspace with this contact email already exists.",
    "Un tenant avec ce nom existe déjà.": "A client workspace with this name already exists.",
    "Cet email est déjà utilisé.": "This admin email is already used by another login.",
    "Tenant introuvable.": "Client workspace not found.",
    "L'espace de la plateforme Adlift ne peut pas être modifié.": "The Adlift platform workspace cannot be changed.",
    "Membre non trouvé.": "This login no longer belongs to the workspace.",
  };
  if (raw && map[raw]) return map[raw];
  return raw || "Something went wrong. Please try again.";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (v) => chars[v % chars.length]).join("") + "!";
}

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").toLowerCase();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [managedId, setManagedId] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => fetchTenants({ page: 0, size: 100 }),
  });

  const tenants = (data?.content || []).filter(
    (tenant) =>
      !query ||
      tenant.name?.toLowerCase().includes(query) ||
      tenant.email?.toLowerCase().includes(query) ||
      tenant.adminEmail?.toLowerCase().includes(query)
  );
  const managed = data?.content?.find((tenant) => tenant.id === managedId);

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: (tenant, variables) => {
      setOpen(false);
      setCreated({ name: tenant.name, email: variables.adminEmail, password: variables.adminPassword });
      setCopied(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      refreshNotifications(queryClient);
    },
    onError: (err) => setFormError(apiError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ tenant, active }) => (active ? activateTenant(tenant.id) : deactivateTenant(tenant.id)),
    onSuccess: (_, { tenant, active }) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      refreshNotifications(queryClient);
      notify(active ? `${tenant.name} is active again.` : `${tenant.name} has been deactivated.`);
    },
    onError: (err) => notify(apiError(err), "error"),
  });

  async function toggleStatus(tenant) {
    const active = tenant.status !== "ACTIVE";
    if (!active) {
      const ok = await confirm({
        title: `Deactivate ${tenant.name}?`,
        message: "Its users will no longer be able to sign in. You can reactivate the workspace at any time.",
        confirmLabel: "Deactivate",
      });
      if (!ok) return;
    }
    statusMutation.mutate({ tenant, active });
  }

  function openForm() {
    setForm({ ...emptyForm, adminPassword: generatePassword() });
    setFormError(null);
    setOpen(true);
  }

  async function copyCredentials() {
    const ok = await copyText(`Email: ${created.email}\nTemporary password: ${created.password}`);
    if (ok) setCopied(true);
    else notify("Could not copy automatically. Select the credentials and copy them manually.", "error");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Client workspaces</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Each Adlift client gets an isolated workspace and a first admin login.
          </p>
        </div>
        <Button variant="accent" onClick={openForm}>
          <Plus size={16} />
          New client
        </Button>
      </div>

      {created && (
        <Card className="border border-success/30 bg-success-soft/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm text-ink">
              <p className="font-semibold">{created.name} is ready.</p>
              <p className="mt-1 text-ink-muted">
                Share these credentials with the workspace admin — no email is sent. They will choose their own
                password at first sign-in.
              </p>
              <p className="mt-2 font-mono text-xs">
                {created.email} · {created.password}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-xs" onClick={copyCredentials}>
                <Copy size={14} />
                {copied ? "Copied" : "Copy credentials"}
              </Button>
              <Button variant="ghost" className="text-xs" onClick={() => setCreated(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border border-accent-soft/80 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-accent-soft/60 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Contact email</th>
                <th className="px-4 py-3 font-medium">Workspace admin</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    Loading client workspaces…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-danger">
                    Could not load client workspaces.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-ink-muted">
                    {query ? "No client matches this search." : "No client yet. Create the first workspace."}
                  </td>
                </tr>
              )}
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-ink">{tenant.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{tenant.email}</td>
                  <td className="px-4 py-3 text-ink-muted">{tenant.adminEmail || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        tenant.status === "ACTIVE" ? "bg-success-soft text-success" : "bg-surface-muted text-ink-subtle"
                      }`}
                    >
                      {tenant.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="ghost"
                        className="px-2 py-1.5 text-xs"
                        onClick={() => setManagedId(tenant.id)}
                      >
                        <Settings size={14} />
                        Manage
                      </Button>
                      <Link to={`/reports?tenant=${tenant.id}`}>
                        <Button variant="ghost" className="px-2 py-1.5 text-xs">
                          <FileText size={14} />
                          Report
                        </Button>
                      </Link>
                      <Button
                        variant={tenant.status === "ACTIVE" ? "danger" : "ghost"}
                        className="px-2 py-1.5 text-xs"
                        disabled={statusMutation.isPending}
                        onClick={() => toggleStatus(tenant)}
                      >
                        {tenant.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {managed && (
        <ManageTenantDialog
          key={managed.id}
          tenant={managed}
          describeError={apiError}
          onClose={() => setManagedId(null)}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <Card className="w-full max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">New client workspace</h2>
              <button type="button" className="text-sm text-ink-muted" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                createMutation.mutate(form);
              }}
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                Client name
                <input
                  required
                  className={fieldClass}
                  placeholder="Atlas Media"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                Contact email
                <input
                  required
                  type="email"
                  className={fieldClass}
                  placeholder="contact@atlas.ma"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <div className="mt-2 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-ink">First workspace admin</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  This person manages campaigns and members for the client.
                </p>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                Admin email
                <input
                  required
                  type="email"
                  className={fieldClass}
                  placeholder="manager@adlift.ma"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                Temporary password
                <div className="flex gap-2">
                  <input
                    required
                    minLength={8}
                    className={`${fieldClass} font-mono`}
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Generate password"
                    onClick={() => setForm({ ...form, adminPassword: generatePassword() })}
                  >
                    <RefreshCw size={16} />
                  </Button>
                </div>
              </label>

              {formError && (
                <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              <Button type="submit" variant="accent" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create workspace"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
