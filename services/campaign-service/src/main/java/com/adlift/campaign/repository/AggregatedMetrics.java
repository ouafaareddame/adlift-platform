package com.adlift.campaign.repository;

import java.math.BigDecimal;

/**
 * Projection typée pour le résultat de la requête d'agrégation des métriques.
 * Évite le piège du cast manuel sur Object[] (qui a causé un ClassCastException) :
 * Spring Data mappe automatiquement chaque colonne du SELECT vers le getter
 * correspondant, à condition que les alias JPQL (AS impressions, AS clicks...)
 * correspondent exactement aux noms de propriété ci-dessous.
 */
public interface AggregatedMetrics {
    Long getImpressions();
    Long getClicks();
    Long getConversions();
    BigDecimal getBudgetSpent();
}