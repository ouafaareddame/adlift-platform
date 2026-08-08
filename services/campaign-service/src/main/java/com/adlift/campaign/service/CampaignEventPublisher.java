package com.adlift.campaign.service;

import com.adlift.campaign.config.RabbitMQConfig;
import com.adlift.campaign.dto.CampaignStatusChangedEvent;
import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishStatusChanged(Campaign campaign, CampaignStatus oldStatus) {
        CampaignStatusChangedEvent event = CampaignStatusChangedEvent.builder()
                .campaignId(campaign.getId())
                .tenantId(campaign.getTenantId())
                .userId(campaign.getCreatedBy())
                .campaignName(campaign.getName())
                .oldStatus(oldStatus.name())
                .newStatus(campaign.getStatus().name())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ROUTING_KEY,
                event
        );

        log.info("Événement publié : campagne {} → {}", campaign.getId(), campaign.getStatus());
    }
}