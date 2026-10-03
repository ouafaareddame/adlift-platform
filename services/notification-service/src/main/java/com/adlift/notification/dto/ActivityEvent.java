package com.adlift.notification.dto;

import java.util.List;
import java.util.UUID;

/** Action d'administration publiée par auth-service. */
public record ActivityEvent(String type, String message, List<Recipient> recipients) {

    public record Recipient(UUID userId, UUID tenantId) {
    }
}
