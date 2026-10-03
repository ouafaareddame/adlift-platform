package com.adlift.auth.service;

import com.adlift.auth.config.RabbitMQConfig;
import com.adlift.auth.dto.ActivityEvent;
import com.adlift.auth.dto.ActivityEvent.Recipient;
import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.User;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ActivityPublisher {

    private final ApplicationEventPublisher events;
    private final RabbitTemplate rabbitTemplate;
    private final UserRepository userRepository;

    /** Prévient la direction Adlift (tous les SUPER_ADMIN actifs). */
    public void notifyPlatformAdmins(String type, String message) {
        publish(type, message, userRepository.findByRoleAndIsActiveTrue(Role.SUPER_ADMIN));
    }

    /** Prévient les administrateurs actifs d'un espace client. */
    public void notifyTenantAdmins(UUID tenantId, String type, String message) {
        publish(type, message, userRepository.findByTenant_IdAndRoleAndIsActiveTrue(tenantId, Role.AGENCY_ADMIN));
    }

    private void publish(String type, String message, List<User> users) {
        if (users.isEmpty()) return;
        List<Recipient> recipients = users.stream()
                .map(u -> new Recipient(u.getId(), u.getTenantId()))
                .toList();
        events.publishEvent(new ActivityEvent(type, message, recipients));
    }

    /**
     * Envoi après le commit : une action annulée ne produit pas de notification,
     * et une panne de RabbitMQ ne fait pas échouer l'action elle-même.
     */
    @TransactionalEventListener(fallbackExecution = true)
    public void send(ActivityEvent event) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.ACTIVITY_ROUTING_PREFIX + event.type().toLowerCase(Locale.ROOT),
                    event);
        } catch (AmqpException e) {
            log.warn("Notification {} non envoyée : {}", event.type(), e.getMessage());
        }
    }
}
