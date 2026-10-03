package com.adlift.auth.dto;

import com.adlift.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

public class AuthDTOs {

    // ── Requête de login ──
    @Data
    public static class LoginRequest {
        @Email @NotBlank
        private String email;

        @NotBlank
        private String password;

        /** Espace à ouvrir s'il est accessible (le dernier utilisé) ; sinon le premier par ordre alphabétique. */
        private UUID tenantId;
    }

    @Data
    public static class SwitchWorkspaceRequest {
        @NotNull
        private UUID tenantId;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;

        @NotBlank @Size(min = 8, message = "doit contenir au moins 8 caractères")
        private String newPassword;
    }

    // ── Réponse après login ──
    @Data @Builder
    public static class AuthResponse {
        private String accessToken;
        private String tokenType;
        private UserInfo user;
        private List<WorkspaceInfo> workspaces;
    }

    // ── Infos utilisateur renvoyées (jamais le mot de passe) ──
    @Data @Builder
    public static class UserInfo {
        private UUID id;
        private UUID tenantId;
        private String tenantName;
        private String email;
        private Role role;
        private boolean mustChangePassword;
    }

    @Data @Builder
    public static class WorkspaceInfo {
        private UUID tenantId;
        private String name;
        private Role role;
    }
}
