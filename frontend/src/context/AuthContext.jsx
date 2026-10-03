import { createContext, useContext, useState, useCallback, useEffect } from "react";
import apiClient from "@/api/client";

const AuthContext = createContext(null);

/*
  Source de vérité unique pour "qui est connecté et avec quel rôle".
  Toute page qui a besoin de savoir si l'utilisateur peut voir un bouton
  "Créer une campagne" ou pas passe par ce contexte plutôt que de relire
  le token à la main.
*/
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("adlift_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Every auth response carries the token for one workspace plus the list of all workspaces of the account.
  const persistSession = ({ accessToken, user: userInfo, workspaces = [] }) => {
    const session = { ...userInfo, workspaces };
    localStorage.setItem("adlift_token", accessToken);
    localStorage.setItem("adlift_user", JSON.stringify(session));
    localStorage.setItem("adlift_workspace", userInfo.tenantId);
    setUser(session);
    return session;
  };

  const login = useCallback(async (email, password) => {
    const tenantId = localStorage.getItem("adlift_workspace") || undefined;
    const response = await apiClient.post("/api/auth/login", { email, password, tenantId });
    return persistSession(response.data);
  }, []);

  const switchWorkspace = useCallback(async (tenantId) => {
    const response = await apiClient.post("/api/auth/switch", { tenantId });
    return persistSession(response.data);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const response = await apiClient.post("/api/auth/change-password", { currentPassword, newPassword });
    return persistSession(response.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("adlift_token");
    localStorage.removeItem("adlift_user");
    setUser(null);
  }, []);

  // Tokens live 15 minutes so a deactivated account loses access quickly;
  // background tabs throttle timers, hence the extra refresh on focus.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    async function refresh() {
      try {
        const response = await apiClient.post("/api/auth/refresh");
        persistSession(response.data);
      } catch {
        /* 401 interceptor logs the user out */
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    const id = setInterval(refresh, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    switchWorkspace,
    changePassword,
    logout,
    // Pratique pour les vérifications de rôle dans les composants :
    // hasRole("AGENCY_ADMIN") ou hasAnyRole("AGENCY_ADMIN", "CLIENT")
    hasRole: (role) => user?.role === role,
    hasAnyRole: (...roles) => roles.includes(user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return context;
}
