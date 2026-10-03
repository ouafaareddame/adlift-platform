package com.adlift.notification.controller;

import com.adlift.notification.dto.NotificationResponse;
import com.adlift.notification.entity.Notification;
import com.adlift.notification.repository.NotificationRepository;
import com.adlift.notification.security.TenantPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> list(
            @AuthenticationPrincipal TenantPrincipal principal,
            Pageable pageable
    ) {
        UUID userId = UUID.fromString(principal.userId());
        Page<Notification> notifications = notificationRepository.findByUserIdAndTenantIdOrderByCreatedAtDesc(
                userId, UUID.fromString(principal.tenantId()), pageable);
        return ResponseEntity.ok(notifications.map(this::toResponse));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> unreadCount(@AuthenticationPrincipal TenantPrincipal principal) {
        UUID userId = UUID.fromString(principal.userId());
        return ResponseEntity.ok(notificationRepository.countByUserIdAndTenantIdAndIsReadFalse(
                userId, UUID.fromString(principal.tenantId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID userId = UUID.fromString(principal.userId());

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Notification introuvable."));

        // Empêche un utilisateur de marquer comme lue la notification de quelqu'un d'autre,
        // simplement en devinant/énumérant des UUID.
        if (!notification.getUserId().equals(userId)) {
            throw new AccessDeniedException("Cette notification ne vous appartient pas.");
        }

        notification.markAsRead();
        notificationRepository.save(notification);
        return ResponseEntity.noContent().build();
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .message(notification.getMessage())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}