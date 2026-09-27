import axios from "axios";

/*
  Point d'entrée unique pour tous les appels vers le gateway.
  Deux responsabilités :
  1. Injecter automatiquement le token JWT sur chaque requête sortante
     (jamais besoin de le refaire manuellement dans chaque page).
  2. Détecter une réponse 401 (token expiré/invalide) et déconnecter
     proprement l'utilisateur au lieu de le laisser face à des erreurs
     silencieuses partout dans l'app.
*/

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  timeout: 12_000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("adlift_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthCall = url.includes("/api/auth/login");

    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem("adlift_token");
      localStorage.removeItem("adlift_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // The gateway only allows /change-password until the temporary password is replaced.
    if (
      error.response?.status === 403 &&
      error.response?.data?.message === "Changement de mot de passe requis." &&
      window.location.pathname !== "/change-password"
    ) {
      const stored = JSON.parse(localStorage.getItem("adlift_user") || "null");
      if (stored) localStorage.setItem("adlift_user", JSON.stringify({ ...stored, mustChangePassword: true }));
      window.location.href = "/change-password";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
