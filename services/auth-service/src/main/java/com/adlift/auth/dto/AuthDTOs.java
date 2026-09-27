package com.adlift.auth.dto;

import com.adlift.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

public class AuthDTOs {

    // ── Requête de login ──
    @Data
    public static class LoginRequest {
        @Email @NotBlank
        private String email;

        @NotBlank
        private String password;
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
    }

    // ── Infos utilisateur renvoyées (jamais le mot de passe) ──
    @Data @Builder
    public static class UserInfo {
        private UUID id;
        private UUID tenantId;
        private String email;
        private Role role;
        private boolean mustChangePassword;
    }
}