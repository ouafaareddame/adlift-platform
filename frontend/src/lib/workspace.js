import { homeForRole } from "@/routes/ProtectedRoute";

/** After a workspace switch, drop cached pages of the previous tenant and open the home of the new role. */
export function applyWorkspaceSwitch(queryClient, session, navigate) {
  queryClient.clear();
  navigate(homeForRole(session.role));
}
