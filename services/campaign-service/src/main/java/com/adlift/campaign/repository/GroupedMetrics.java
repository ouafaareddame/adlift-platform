package com.adlift.campaign.repository;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Même projection que AggregatedMetrics, avec la clé de regroupement
 * (id de campagne ou id de tenant selon la requête, alias "groupId").
 */
public interface GroupedMetrics extends AggregatedMetrics {
    UUID getGroupId();
}
