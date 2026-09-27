package com.adlift.campaign.repository;

import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID>, JpaSpecificationExecutor<Campaign> {

    // Isolation multi-tenant : toujours filtrer par tenantId
    Page<Campaign> findByTenantId(UUID tenantId, Pageable pageable);

    List<Campaign> findAllByTenantId(UUID tenantId);

    // Jobs système uniquement (simulateur) : volontairement tous tenants confondus.
    List<Campaign> findByStatus(CampaignStatus status);

    Page<Campaign> findByTenantIdAndStatus(UUID tenantId, CampaignStatus status, Pageable pageable);

    Page<Campaign> findByTenantIdAndType(UUID tenantId, CampaignType type, Pageable pageable);

    Page<Campaign> findByTenantIdAndNameContainingIgnoreCase(UUID tenantId, String name, Pageable pageable);

    Page<Campaign> findByTenantIdAndStartDateBetween(
            UUID tenantId, LocalDate start, LocalDate end, Pageable pageable);

    // Utilisé pour vérifier qu'un utilisateur ne modifie que les campagnes de son tenant
    boolean existsByIdAndTenantId(UUID id, UUID tenantId);

    long countByTenantId(UUID tenantId);

    long countByTenantIdAndStatus(UUID tenantId, CampaignStatus status);

}