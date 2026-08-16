package com.adlift.campaign.repository;

import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.UUID;

public class CampaignSpecifications {

    public static Specification<Campaign> hasTenantId(UUID tenantId) {
        return (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
    }

    public static Specification<Campaign> hasStatus(CampaignStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Campaign> hasType(CampaignType type) {
        return (root, query, cb) ->
                type == null ? null : cb.equal(root.get("type"), type);
    }

    public static Specification<Campaign> nameContains(String keyword) {
        return (root, query, cb) ->
                (keyword == null || keyword.isBlank()) ? null :
                        cb.like(cb.lower(root.get("name")), "%" + keyword.toLowerCase() + "%");
    }

    public static Specification<Campaign> startDateBetween(LocalDate start, LocalDate end) {
        return (root, query, cb) -> {
            if (start == null && end == null) return null;
            if (start != null && end != null) return cb.between(root.get("startDate"), start, end);
            if (start != null) return cb.greaterThanOrEqualTo(root.get("startDate"), start);
            return cb.lessThanOrEqualTo(root.get("startDate"), end);
        };
    }
}