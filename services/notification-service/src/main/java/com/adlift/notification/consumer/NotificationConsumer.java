package com.adlift.notification.consumer;

import com.adlift.notification.config.RabbitMQConfig;
import com.adlift.notification.dto.ActivityEvent;
import com.adlift.notification.dto.CampaignStatusChangedEvent;
import com.adlift.notification.entity.Notification;
import com.adlift.notification.entity.NotificationType;
import com.adlift.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void handleCampaignStatusChanged(CampaignStatusChangedEvent event) {
        log.info("Événement reçu : campagne {} passée de {} à {}",
                event.getCampaignName(), event.getOldStatus(), event.getNewStatus());

        String message = String.format(
                "La campagne \"%s\" est passée de %s à %s.",
                event.getCampaignName(), event.getOldStatus(), event.getNewStatus()
        );

        Notification notification = Notification.builder()
                .tenantId(event.getTenantId())
                .userId(event.getUserId())
                .type(NotificationType.CAMPAIGN_STATUS_CHANGED)
                .message(message)
                .build();

        notificationRepository.save(notification);

        log.info("Notification créée pour l'utilisateur {}", event.getUserId());
    }

    @RabbitListener(queues = RabbitMQConfig.ACTIVITY_QUEUE)
    public void handleActivity(ActivityEvent event) {
        NotificationType type;
        try {
            type = NotificationType.valueOf(event.type());
        } catch (IllegalArgumentException | NullPointerException e) {
            log.warn("Type d'activité inconnu ignoré : {}", event.type());
            return;
        }
        if (event.recipients() == null) return;

        List<Notification> notifications = event.recipients().stream()
                .map(r -> Notification.builder()
                        .tenantId(r.tenantId())
                        .userId(r.userId())
                        .type(type)
                        .message(event.message())
                        .build())
                .toList();
        notificationRepository.saveAll(notifications);

        log.info("Activité {} : {} notification(s) créée(s)", type, notifications.size());
    }
}