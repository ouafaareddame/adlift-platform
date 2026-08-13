package com.adlift.auth.dto;

import com.adlift.auth.entity.TenantStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class TenantDTOs {

    @Data
    public static class CreateTenantRequest {
        @NotBlank
        private String name;

        @Email @NotBlank
        private String email;
    }

    @Data @Builder
    public static class TenantResponse {
        private UUID id;
        private String name;
        private String email;
        private TenantStatus status;
        private LocalDateTime createdAt;
    }
}