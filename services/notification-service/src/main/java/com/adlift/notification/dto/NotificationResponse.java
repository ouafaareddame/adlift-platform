package com.adlift.notification.dto;

import com.adlift.notification.entity.NotificationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record NotificationResponse(
        UUID id,
        NotificationType type,
        String message,
        boolean isRead,
        LocalDateTime createdAt
) {
}