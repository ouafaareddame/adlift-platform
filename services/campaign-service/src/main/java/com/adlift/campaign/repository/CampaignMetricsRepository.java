package com.adlift.campaign.repository;

import com.adlift.campaign.entity.CampaignMetrics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CampaignMetricsRepository extends JpaRepository<CampaignMetrics, UUID> {

    List<CampaignMetrics> findByCampaignIdOrderByRecordedAtDesc(UUID campaignId);

    List<CampaignMetrics> findByTenantId(UUID tenantId);
}