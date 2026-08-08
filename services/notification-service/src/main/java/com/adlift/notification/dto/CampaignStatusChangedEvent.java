package com.adlift.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Structure du message publié par Campaign Service et consommé ici.
 * Doit avoir exactement les mêmes champs des deux côtés pour que
 * la désérialisation JSON fonctionne correctement.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignStatusChangedEvent {
    private UUID campaignId;
    private UUID tenantId;
    private UUID userId;      // celui qui a fait le changement
    private String campaignName;
    private String oldStatus;
    private String newStatus;
}