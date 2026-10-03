import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { FeedbackProvider } from "@/context/FeedbackContext";
import ProtectedRoute from "@/routes/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import CampaignsPage from "@/pages/CampaignsPage";
import MembersPage from "@/pages/MembersPage";
import TenantsPage from "@/pages/TenantsPage";
import OverviewPage from "@/pages/OverviewPage";
import ReportsPage from "@/pages/ReportsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeedbackProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["AGENCY_ADMIN", "CLIENT"]}>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campaigns"
                  element={
                    <ProtectedRoute allowedRoles={["AGENCY_ADMIN", "CLIENT"]}>
                      <CampaignsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/campagnes" element={<Navigate to="/campaigns" replace />} />
                <Route
                  path="/members"
                  element={
                    <ProtectedRoute allowedRoles={["AGENCY_ADMIN"]}>
                      <MembersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/membres" element={<Navigate to="/members" replace />} />
                <Route
                  path="/tenants"
                  element={
                    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                      <TenantsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview"
                  element={
                    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                      <OverviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </FeedbackProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
