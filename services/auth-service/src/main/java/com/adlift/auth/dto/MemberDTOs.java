package com.adlift.auth.dto;

import com.adlift.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class MemberDTOs {

    @Data
    public static class InviteMemberRequest {
        @Email @NotBlank
        private String email;

        @NotBlank
        private String password; // mot de passe temporaire, à changer idéalement au premier login

        @NotNull
        private Role role; // AGENCY_ADMIN ou CLIENT
    }

    @Data
    public static class UpdateRoleRequest {
        @NotNull
        private Role role;
    }

    @Data @Builder
    public static class MemberResponse {
        private UUID id;
        private String email;
        private Role role;
        private boolean isActive;
        private LocalDateTime createdAt;
        // Jamais passwordHash ici
    }
}