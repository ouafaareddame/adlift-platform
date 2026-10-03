import { describe, expect, it, vi } from "vitest";
import { apiError, campaignPermissions } from "./campaigns";
import { homeForRole } from "@/routes/ProtectedRoute";
import { applyWorkspaceSwitch } from "@/lib/workspace";

describe("campaignPermissions", () => {
  const draft = { status: "DRAFT", emailSent: false };
  const active = { status: "ACTIVE", emailSent: false };
  const sent = { status: "ACTIVE", emailSent: true };
  const archived = { status: "ARCHIVED", emailSent: false };

  it("gives write actions only to an account manager", () => {
    expect(campaignPermissions(draft, true)).toMatchObject({
      canEdit: true,
      canDelete: true,
      canAdvance: true,
      canMetrics: false,
    });
    expect(campaignPermissions(active, true)).toMatchObject({
      canEdit: false,
      canMetrics: true,
      canAdvance: true,
    });
    expect(campaignPermissions(sent, true).canMetrics).toBe(false);
    expect(campaignPermissions(archived, true).canDelete).toBe(true);
  });

  it("hides every write action for a client", () => {
    expect(campaignPermissions(draft, false)).toEqual({
      canEdit: false,
      canDelete: false,
      canMetrics: false,
      canAdvance: false,
    });
    expect(campaignPermissions(active, false).canMetrics).toBe(false);
  });
});

describe("homeForRole", () => {
  it("sends the direction to overview and everyone else to the dashboard", () => {
    expect(homeForRole("SUPER_ADMIN")).toBe("/overview");
    expect(homeForRole("AGENCY_ADMIN")).toBe("/dashboard");
    expect(homeForRole("CLIENT")).toBe("/dashboard");
  });
});

describe("applyWorkspaceSwitch", () => {
  it("clears the query cache and opens the home of the new role", () => {
    const queryClient = { clear: vi.fn() };
    const navigate = vi.fn();
    applyWorkspaceSwitch(queryClient, { role: "AGENCY_ADMIN" }, navigate);
    expect(queryClient.clear).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/dashboard");
    applyWorkspaceSwitch(queryClient, { role: "SUPER_ADMIN" }, navigate);
    expect(navigate).toHaveBeenLastCalledWith("/overview");
  });
});

describe("apiError", () => {
  it("translates known API messages", () => {
    expect(apiError({ response: { data: { message: "Campagne non trouvée." } } })).toBe("Campaign not found.");
    expect(apiError({ response: { data: { message: "Transition invalide : ACTIVE → DRAFT" } } })).toBe(
      "This status change is not allowed."
    );
  });
});
