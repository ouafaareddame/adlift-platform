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

  const persistSession = (accessToken, userInfo) => {
    localStorage.setItem("adlift_token", accessToken);
    localStorage.setItem("adlift_user", JSON.stringify(userInfo));
    setUser(userInfo);
    return userInfo;
  };

  const login = useCallback(async (email, password) => {
    const response = await apiClient.post("/api/auth/login", { email, password });
    const { accessToken, user: userInfo } = response.data;
    return persistSession(accessToken, userInfo);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const response = await apiClient.post("/api/auth/change-password", { currentPassword, newPassword });
    const { accessToken, user: userInfo } = response.data;
    return persistSession(accessToken, userInfo);
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
        const { accessToken, user: userInfo } = response.data;
        persistSession(accessToken, userInfo);
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
