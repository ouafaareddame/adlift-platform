import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@/routes/ProtectedRoute";

const auth = { isAuthenticated: false, user: null };

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => auth,
}));

function renderAt(path, allowedRoles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/change-password" element={<p>change password page</p>} />
        <Route path="/overview" element={<p>overview page</p>} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <p>campaigns page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("sends an anonymous visitor to login", () => {
    auth.isAuthenticated = false;
    auth.user = null;
    renderAt("/campaigns");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("sends a user who still has a temporary password to change-password", () => {
    auth.isAuthenticated = true;
    auth.user = { role: "AGENCY_ADMIN", mustChangePassword: true };
    renderAt("/campaigns", ["AGENCY_ADMIN", "CLIENT"]);
    expect(screen.getByText("change password page")).toBeInTheDocument();
  });

  it("keeps a client off a members-only route", () => {
    auth.isAuthenticated = true;
    auth.user = { role: "CLIENT", mustChangePassword: false };
    renderAt("/campaigns", ["AGENCY_ADMIN"]);
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("renders the page when the role is allowed", () => {
    auth.isAuthenticated = true;
    auth.user = { role: "CLIENT", mustChangePassword: false };
    renderAt("/campaigns", ["AGENCY_ADMIN", "CLIENT"]);
    expect(screen.getByText("campaigns page")).toBeInTheDocument();
  });
});
