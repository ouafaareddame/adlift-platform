package com.adlift.notification.repository;

import com.adlift.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Filtré par utilisateur et par espace : un compte multi-espaces ne voit que celles de l'espace ouvert. */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByUserIdAndTenantIdOrderByCreatedAtDesc(UUID userId, UUID tenantId, Pageable pageable);

    long countByUserIdAndTenantIdAndIsReadFalse(UUID userId, UUID tenantId);
}
