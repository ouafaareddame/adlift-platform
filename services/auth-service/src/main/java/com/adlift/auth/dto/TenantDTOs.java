package com.adlift.auth.dto;

import com.adlift.auth.entity.TenantStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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

    @Data @Builder
    public static class TenantResponse {
        private UUID id;
        private String name;
        private String email;
        private TenantStatus status;
        private LocalDateTime createdAt;
        private String adminEmail;
    }
}
