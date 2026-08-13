package com.adlift.campaign.repository;

import com.adlift.campaign.entity.CampaignMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CampaignMetricsRepository extends JpaRepository<CampaignMetrics, UUID> {

    List<CampaignMetrics> findByCampaignIdOrderByRecordedAtDesc(UUID campaignId);

    List<CampaignMetrics> findByTenantId(UUID tenantId);

    // Les alias "AS impressions/clicks/conversions/budgetSpent" sont indispensables :
    // Spring Data les fait correspondre aux getters de AggregatedMetrics
    // (getImpressions(), getClicks(), etc.) pour construire la projection.
    @Query("""
    SELECT
        COALESCE(SUM(m.impressions), 0)   AS impressions,
        COALESCE(SUM(m.clicks), 0)        AS clicks,
        COALESCE(SUM(m.conversions), 0)   AS conversions,
        COALESCE(SUM(m.budgetSpent), 0.0) AS budgetSpent
    FROM CampaignMetrics m
    WHERE m.campaign.id = :campaignId
    """)
    AggregatedMetrics getAggregatedMetrics(@Param("campaignId") UUID campaignId);

    // Même projection que getAggregatedMetrics, mais agrégée sur tout le tenant
    // (toutes campagnes confondues) plutôt qu'une seule campagne — pour /dashboard.
    @Query("""
    SELECT
        COALESCE(SUM(m.impressions), 0)   AS impressions,
        COALESCE(SUM(m.clicks), 0)        AS clicks,
        COALESCE(SUM(m.conversions), 0)   AS conversions,
        COALESCE(SUM(m.budgetSpent), 0.0) AS budgetSpent
    FROM CampaignMetrics m
    WHERE m.tenantId = :tenantId
    """)
    AggregatedMetrics getAggregatedMetricsByTenant(@Param("tenantId") UUID tenantId);
}