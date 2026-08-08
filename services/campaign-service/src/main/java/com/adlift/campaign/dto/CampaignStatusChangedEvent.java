package com.adlift.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignStatusChangedEvent {
    private UUID campaignId;
    private UUID tenantId;
    private UUID userId;
    private String campaignName;
    private String oldStatus;
    private String newStatus;
}