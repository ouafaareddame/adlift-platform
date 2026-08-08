package com.adlift.campaign.service;

import com.adlift.campaign.dto.CampaignDTOs.*;
import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignMetrics;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.repository.CampaignMetricsRepository;
import com.adlift.campaign.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignMetricsRepository metricsRepository;
    private final CampaignEventPublisher eventPublisher;

    // ── Transitions de statut autorisées (BF06 du cahier des charges) ──
    private static final Map<CampaignStatus, List<CampaignStatus>> ALLOWED_TRANSITIONS = Map.of(
            CampaignStatus.DRAFT, List.of(CampaignStatus.SCHEDULED),
            CampaignStatus.SCHEDULED, List.of(CampaignStatus.ACTIVE),
            CampaignStatus.ACTIVE, List.of(CampaignStatus.COMPLETED),
            CampaignStatus.COMPLETED, List.of(CampaignStatus.ARCHIVED),
            CampaignStatus.ARCHIVED, List.of()
    );

    @Transactional
    public CampaignResponse create(CreateCampaignRequest request, UUID tenantId, UUID userId) {
        Campaign campaign = campaignRepository.save(Campaign.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .status(CampaignStatus.DRAFT)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .budget(request.getBudget())
                .createdBy(userId)
                .build());

        return toResponse(campaign);
    }

    @Transactional
    public CampaignResponse update(UUID campaignId, UpdateCampaignRequest request, UUID tenantId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);

        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new IllegalStateException("Seule une campagne en DRAFT peut être modifiée.");
        }

        campaign.setName(request.getName());
        campaign.setDescription(request.getDescription());
        campaign.setType(request.getType());
        campaign.setStartDate(request.getStartDate());
        campaign.setEndDate(request.getEndDate());
        campaign.setBudget(request.getBudget());

        return toResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public CampaignResponse changeStatus(UUID campaignId, CampaignStatus newStatus, UUID tenantId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);
        CampaignStatus current = campaign.getStatus();

        if (!ALLOWED_TRANSITIONS.get(current).contains(newStatus)) {
            throw new IllegalStateException(
                    "Transition invalide : " + current + " → " + newStatus);
        }

        campaign.setStatus(newStatus);
        Campaign saved = campaignRepository.save(campaign);

        eventPublisher.publishStatusChanged(saved, current);

        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID campaignId, UUID tenantId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);

        if (campaign.getStatus() != CampaignStatus.DRAFT
                && campaign.getStatus() != CampaignStatus.ARCHIVED) {
            throw new IllegalStateException(
                    "Seule une campagne en DRAFT ou ARCHIVED peut être supprimée.");
        }

        campaignRepository.delete(campaign);
    }

    public Page<CampaignResponse> list(UUID tenantId, Pageable pageable) {
        return campaignRepository.findByTenantId(tenantId, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public MetricsResponse recordMetrics(UUID campaignId, RecordMetricsRequest request,
                                         UUID tenantId, UUID userId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);

        if (campaign.getStatus() != CampaignStatus.ACTIVE) {
            throw new IllegalStateException("Les métriques ne peuvent être saisies que sur une campagne ACTIVE.");
        }

        CampaignMetrics metrics = metricsRepository.save(CampaignMetrics.builder()
                .campaign(campaign)
                .tenantId(tenantId)
                .impressions(request.getImpressions())
                .clicks(request.getClicks())
                .conversions(request.getConversions())
                .budgetSpent(request.getBudgetSpent())
                .recordedBy(userId)
                .build());

        return toMetricsResponse(metrics);
    }

    // ── Helpers ──

    private Campaign getOwnedCampaign(UUID campaignId, UUID tenantId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campagne non trouvée."));

        if (!campaign.getTenantId().equals(tenantId)) {
            throw new SecurityException("Accès refusé : cette campagne n'appartient pas à votre tenant.");
        }
        return campaign;
    }

    private CampaignResponse toResponse(Campaign c) {
        return CampaignResponse.builder()
                .id(c.getId()).name(c.getName()).description(c.getDescription())
                .type(c.getType()).status(c.getStatus())
                .startDate(c.getStartDate()).endDate(c.getEndDate())
                .budget(c.getBudget()).createdAt(c.getCreatedAt())
                .build();
    }

    private MetricsResponse toMetricsResponse(CampaignMetrics m) {
        double ctr = m.getImpressions() > 0
                ? (m.getClicks() * 100.0) / m.getImpressions() : 0.0;
        double cpc = m.getConversions() > 0
                ? m.getBudgetSpent().doubleValue() / m.getConversions() : 0.0;

        return MetricsResponse.builder()
                .id(m.getId()).impressions(m.getImpressions()).clicks(m.getClicks())
                .conversions(m.getConversions()).budgetSpent(m.getBudgetSpent())
                .ctr(ctr).cpc(cpc).recordedAt(m.getRecordedAt())
                .build();
    }
}