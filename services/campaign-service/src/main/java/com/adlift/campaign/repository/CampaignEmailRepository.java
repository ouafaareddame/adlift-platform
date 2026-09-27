package com.adlift.campaign.repository;

import com.adlift.campaign.entity.CampaignEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface CampaignEmailRepository extends JpaRepository<CampaignEmail, UUID> {

    Optional<CampaignEmail> findByCampaignId(UUID campaignId);

    boolean existsByCampaignIdAndSentAtIsNotNull(UUID campaignId);

    List<CampaignEmail> findBySentAtIsNotNull();

    @Query("SELECT e.campaign.id FROM CampaignEmail e WHERE e.sentAt IS NOT NULL")
    Set<UUID> findSentCampaignIds();

    void deleteByCampaignId(UUID campaignId);
}
