package com.adlift.campaign.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

public class EmailDTOs {

    @Data
    public static class SaveEmailRequest {
        @NotBlank @Size(max = 200, message = "200 caractères maximum")
        private String subject;

        @NotBlank @Size(max = 20000, message = "20 000 caractères maximum")
        private String content;

        @NotEmpty(message = "au moins un destinataire")
        @Size(max = 50, message = "50 destinataires maximum")
        private List<@NotBlank @Email(message = "adresse email invalide") String> recipients;
    }

    @Data @Builder
    public static class EmailResponse {
        private String subject;
        private String content;
        private List<String> recipients;
        private LocalDateTime sentAt;
        private int sentCount;
        private int failedCount;
        private long delivered;
        private long opens;
        private long clicks;
        private LocalDateTime lastSyncedAt;
        /** false si BREVO_API_KEY ou l'expéditeur ne sont pas configurés. */
        private boolean providerReady;
    }
}
