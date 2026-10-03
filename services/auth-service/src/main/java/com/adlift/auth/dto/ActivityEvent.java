package com.adlift.auth.dto;

import java.util.List;
import java.util.UUID;

/** Action d'administration à notifier ; consommé par notification-service. */
public record ActivityEvent(String type, String message, List<Recipient> recipients) {

    public record Recipient(UUID userId, UUID tenantId) {
    }
}
