package com.adlift.auth.dto;

import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.TenantStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class TenantDTOs {

    /** Onboarding d'un client Adlift : l'espace et son premier AGENCY_ADMIN. */
    @Data
    public static class CreateTenantRequest {
        @NotBlank
        private String name;

        @Email @NotBlank
        private String email;

        @Email @NotBlank
        private String adminEmail;

        @NotBlank @Size(min = 8, message = "doit contenir au moins 8 caractères")
        private String adminPassword;
    }

    @Data
    public static class UpdateTenantRequest {
        @NotBlank
        private String name;

        @Email @NotBlank
        private String email;
    }

    /** Donne accès à l'espace : à un compte existant, ou à un nouveau compte créé pour l'occasion. */
    @Data
    public static class AddMemberRequest {
        @Email @NotBlank
        private String email;

        @NotNull
        private Role role;
    }

    /** temporaryPassword n'est renseigné que si un compte a été créé. */
    @Data @Builder
    public static class MemberAccessResponse {
        private String email;
        private boolean newAccount;
        private String temporaryPassword;
    }

    /** Renvoyé une seule fois : le mot de passe n'est stocké que sous forme de hash. */
    @Data @Builder
    public static class PasswordResetResponse {
        private String email;
        private String temporaryPassword;
    }

    @Data @Builder
    public static class TenantResponse {
        private UUID id;
        private String name;
        private String email;
        private TenantStatus status;
        private LocalDateTime createdAt;
        private String adminEmail;
        /** À la création : false si le chef de projet avait déjà un compte (son mot de passe ne change pas). */
        private Boolean adminNewAccount;
    }
}
