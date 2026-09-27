package com.adlift.campaign.service;

import com.adlift.campaign.config.RabbitMQConfig;
import com.adlift.campaign.dto.CampaignStatusChangedEvent;
import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishStatusChanged(Campaign campaign, CampaignStatus oldStatus, UUID actorId) {
        publishForUser(campaign, oldStatus, campaign.getCreatedBy());
        if (actorId != null && !actorId.equals(campaign.getCreatedBy())) {
            publishForUser(campaign, oldStatus, actorId);
        }
    }

    private void publishForUser(Campaign campaign, CampaignStatus oldStatus, UUID userId) {
        if (userId == null) return;
        CampaignStatusChangedEvent event = CampaignStatusChangedEvent.builder()
                .campaignId(campaign.getId())
                .tenantId(campaign.getTenantId())
                .userId(userId)
                .campaignName(campaign.getName())
                .oldStatus(oldStatus.name())
                .newStatus(campaign.getStatus().name())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ROUTING_KEY,
                event
        );
    }
}