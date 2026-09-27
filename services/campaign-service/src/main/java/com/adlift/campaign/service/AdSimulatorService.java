package com.adlift.campaign.service;

import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignMetrics;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import com.adlift.campaign.repository.CampaignEmailRepository;
import com.adlift.campaign.repository.CampaignMetricsRepository;
import com.adlift.campaign.repository.CampaignRepository;
import com.adlift.campaign.repository.GroupedMetrics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Simule la diffusion des campagnes ACTIVE (sans API Meta/Google Ads) :
 * chaque tick ajoute des métriques réalistes, plafonnées au budget.
 * Les données simulées sont reconnaissables à recordedBy = SYSTEM_USER_ID.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "ad-simulator.enabled", havingValue = "true")
public class AdSimulatorService {

    public static final UUID SYSTEM_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final CampaignRepository campaignRepository;
    private final CampaignMetricsRepository metricsRepository;
    private final CampaignEmailRepository emailRepository;

    // Évite de répéter "budget atteint" à chaque tick.
    private final Set<UUID> budgetReachedLogged = ConcurrentHashMap.newKeySet();

    /** Bornes par tick : impressions, CTR, taux de conversion (sur les clics), coût unitaire. */
    private record Profile(long minImpressions, long maxImpressions,
                           double minCtr, double maxCtr,
                           double minConversion, double maxConversion,
                           double minUnitCost, double maxUnitCost,
                           boolean costPerImpression) {
    }

    private static final Map<CampaignType, Profile> PROFILES = Map.of(
            CampaignType.ADS, new Profile(100, 500, 0.01, 0.04, 0.02, 0.08, 0.30, 1.50, false),
            CampaignType.SOCIAL, new Profile(150, 600, 0.008, 0.025, 0.01, 0.05, 0.20, 1.00, false),
            CampaignType.EMAIL, new Profile(50, 300, 0.02, 0.06, 0.03, 0.10, 0.01, 0.01, true)
    );

    private record Tick(long impressions, long clicks, long conversions, BigDecimal spent) {
    }

    @Scheduled(fixedRateString = "${ad-simulator.interval-ms:30000}")
    public void simulate() {
        LocalDate today = LocalDate.now();
        // Les campagnes EMAIL réellement envoyées sont alimentées par Brevo, jamais par le simulateur.
        Set<UUID> reallySent = emailRepository.findSentCampaignIds();
        List<Campaign> running = campaignRepository.findByStatus(CampaignStatus.ACTIVE).stream()
                .filter(c -> !today.isBefore(c.getStartDate()) && !today.isAfter(c.getEndDate()))
                .filter(c -> !reallySent.contains(c.getId()))
                .toList();
        if (running.isEmpty()) return;

        Map<UUID, BigDecimal> spentByCampaign = metricsRepository
                .sumByCampaignIds(running.stream().map(Campaign::getId).toList())
                .stream()
                .collect(Collectors.toMap(GroupedMetrics::getGroupId, GroupedMetrics::getBudgetSpent));

        LocalDateTime hourStart = LocalDateTime.now().truncatedTo(ChronoUnit.HOURS);

        for (Campaign campaign : running) {
            try {
                simulateCampaign(campaign, spentByCampaign.getOrDefault(campaign.getId(), BigDecimal.ZERO), hourStart);
            } catch (Exception e) {
                log.error("[Ad Simulator] Campagne {} : échec de la simulation", campaign.getName(), e);
            }
        }
    }

    private void simulateCampaign(Campaign campaign, BigDecimal alreadySpent, LocalDateTime hourStart) {
        BigDecimal budget = campaign.getBudget();
        if (budget == null || budget.signum() <= 0) return;

        BigDecimal remaining = budget.subtract(alreadySpent);
        if (remaining.signum() <= 0) {
            if (budgetReachedLogged.add(campaign.getId())) {
                log.info("[Ad Simulator] Campagne {} : budget atteint", campaign.getName());
            }
            return;
        }

        Tick tick = capToBudget(generate(PROFILES.get(campaign.getType())), remaining);
        if (tick.impressions() == 0 && tick.spent().signum() == 0) return;

        CampaignMetrics row = metricsRepository
                .findFirstByCampaignIdAndRecordedByAndRecordedAtGreaterThanEqual(
                        campaign.getId(), SYSTEM_USER_ID, hourStart)
                .orElseGet(() -> CampaignMetrics.builder()
                        .campaign(campaign)
                        .tenantId(campaign.getTenantId())
                        .impressions(0L)
                        .clicks(0L)
                        .conversions(0L)
                        .budgetSpent(BigDecimal.ZERO)
                        .recordedBy(SYSTEM_USER_ID)
                        .build());

        row.setImpressions(row.getImpressions() + tick.impressions());
        row.setClicks(row.getClicks() + tick.clicks());
        row.setConversions(row.getConversions() + tick.conversions());
        row.setBudgetSpent(row.getBudgetSpent().add(tick.spent()));
        metricsRepository.save(row);

        log.info("[Ad Simulator] Campagne {} : +{} impressions, +{} clics, +{} conversions, +{} MAD",
                campaign.getName(), tick.impressions(), tick.clicks(), tick.conversions(), tick.spent());
    }

    private Tick generate(Profile p) {
        ThreadLocalRandom rnd = ThreadLocalRandom.current();

        long impressions = rnd.nextLong(p.minImpressions(), p.maxImpressions() + 1);
        long clicks = Math.min(impressions, Math.round(impressions * between(rnd, p.minCtr(), p.maxCtr())));
        long conversions = Math.min(clicks,
                Math.round(clicks * between(rnd, p.minConversion(), p.maxConversion())));

        double unitCost = between(rnd, p.minUnitCost(), p.maxUnitCost());
        double cost = (p.costPerImpression() ? impressions : clicks) * unitCost;

        return new Tick(impressions, clicks, conversions, BigDecimal.valueOf(cost).setScale(2, RoundingMode.HALF_UP));
    }

    /** Réduit le tick au reste exact du budget, volumes réduits dans la même proportion. */
    private Tick capToBudget(Tick tick, BigDecimal remaining) {
        if (tick.spent().compareTo(remaining) <= 0) return tick;

        double ratio = remaining.doubleValue() / tick.spent().doubleValue();
        long impressions = (long) Math.floor(tick.impressions() * ratio);
        long clicks = Math.min(impressions, (long) Math.floor(tick.clicks() * ratio));
        long conversions = Math.min(clicks, (long) Math.floor(tick.conversions() * ratio));

        return new Tick(impressions, clicks, conversions, remaining.setScale(2, RoundingMode.HALF_UP));
    }

    private double between(ThreadLocalRandom rnd, double min, double max) {
        return min == max ? min : rnd.nextDouble(min, max);
    }
}
