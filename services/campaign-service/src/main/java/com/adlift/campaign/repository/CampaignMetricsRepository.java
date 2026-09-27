package com.adlift.campaign.repository;

import com.adlift.campaign.entity.CampaignMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampaignMetricsRepository extends JpaRepository<CampaignMetrics, UUID> {

    List<CampaignMetrics> findByCampaignIdOrderByRecordedAtDesc(UUID campaignId);

    List<CampaignMetrics> findByTenantId(UUID tenantId);

    Optional<CampaignMetrics> findFirstByCampaignIdAndRecordedByAndRecordedAtGreaterThanEqual(
            UUID campaignId, UUID recordedBy, LocalDateTime from);

    Optional<CampaignMetrics> findFirstByCampaignIdAndRecordedBy(UUID campaignId, UUID recordedBy);

    @Transactional
    @Modifying
    @Query("DELETE FROM CampaignMetrics m WHERE m.campaign.id = :campaignId AND m.recordedBy = :recordedBy")
    int deleteByCampaignIdAndRecordedBy(@Param("campaignId") UUID campaignId,
                                        @Param("recordedBy") UUID recordedBy);

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

    @Query("""
    SELECT
        m.campaign.id                     AS groupId,
        COALESCE(SUM(m.impressions), 0)   AS impressions,
        COALESCE(SUM(m.clicks), 0)        AS clicks,
        COALESCE(SUM(m.conversions), 0)   AS conversions,
        COALESCE(SUM(m.budgetSpent), 0.0) AS budgetSpent
    FROM CampaignMetrics m
    WHERE m.campaign.id IN :campaignIds
    GROUP BY m.campaign.id
    """)
    List<GroupedMetrics> sumByCampaignIds(@Param("campaignIds") Collection<UUID> campaignIds);

    @Query("""
    SELECT
        m.campaign.id                     AS groupId,
        COALESCE(SUM(m.impressions), 0)   AS impressions,
        COALESCE(SUM(m.clicks), 0)        AS clicks,
        COALESCE(SUM(m.conversions), 0)   AS conversions,
        COALESCE(SUM(m.budgetSpent), 0.0) AS budgetSpent
    FROM CampaignMetrics m
    GROUP BY m.campaign.id
    """)
    List<GroupedMetrics> sumByCampaign();

    // Borne haute exclusive : "to" est le lendemain du dernier jour de la période.
    @Query("""
    SELECT
        m.campaign.id                     AS groupId,
        COALESCE(SUM(m.impressions), 0)   AS impressions,
        COALESCE(SUM(m.clicks), 0)        AS clicks,
        COALESCE(SUM(m.conversions), 0)   AS conversions,
        COALESCE(SUM(m.budgetSpent), 0.0) AS budgetSpent
    FROM CampaignMetrics m
    WHERE m.tenantId = :tenantId
      AND m.recordedAt >= :from AND m.recordedAt < :to
    GROUP BY m.campaign.id
    """)
    List<GroupedMetrics> sumByCampaignInPeriod(@Param("tenantId") UUID tenantId,
                                               @Param("from") LocalDateTime from,
                                               @Param("to") LocalDateTime to);
}
