package com.adlift.campaign.service;

import com.adlift.campaign.dto.CampaignDTOs.*;
import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignMetrics;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import com.adlift.campaign.repository.AggregatedMetrics;
import com.adlift.campaign.repository.CampaignEmailRepository;
import com.adlift.campaign.repository.CampaignMetricsRepository;
import com.adlift.campaign.repository.CampaignRepository;
import com.adlift.campaign.repository.CampaignSpecifications;
import com.adlift.campaign.repository.GroupedMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignMetricsRepository metricsRepository;
    private final CampaignEmailRepository emailRepository;
    private final CampaignEventPublisher eventPublisher;

    // ── Transitions de statut autorisées (BF06 du cahier des charges) ──
    private static final Map<CampaignStatus, List<CampaignStatus>> ALLOWED_TRANSITIONS = Map.of(
            CampaignStatus.DRAFT, List.of(CampaignStatus.SCHEDULED),
            CampaignStatus.SCHEDULED, List.of(CampaignStatus.ACTIVE),
            CampaignStatus.ACTIVE, List.of(CampaignStatus.COMPLETED),
            CampaignStatus.COMPLETED, List.of(CampaignStatus.ARCHIVED),
            CampaignStatus.ARCHIVED, List.of()
    );

    // Seuils d'alerte budget, en % du budget consommé.
    private static final double NEAR_BUDGET_THRESHOLD = 80.0;
    private static final double OVER_BUDGET_THRESHOLD = 100.0;
    private static final int MAX_BUDGET_ALERTS = 5;

    /** Seule une campagne ACTIVE peut encore dépenser : le seuil de 80 % ne concerne qu'elle. */
    private static boolean nearLimitAlert(Campaign c, Double usage) {
        return usage != null && c.getStatus() == CampaignStatus.ACTIVE
                && usage >= NEAR_BUDGET_THRESHOLD && usage < OVER_BUDGET_THRESHOLD;
    }

    private static boolean overBudgetAlert(Campaign c, Double usage) {
        return usage != null && c.getStatus() != CampaignStatus.ARCHIVED && usage >= OVER_BUDGET_THRESHOLD;
    }

    @Transactional
    public CampaignResponse create(CreateCampaignRequest request, UUID tenantId, UUID userId) {
        validateDateRange(request.getStartDate(), request.getEndDate());

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

        return toResponse(campaign, BigDecimal.ZERO, false);
    }

    @Transactional
    public CampaignResponse update(UUID campaignId, UpdateCampaignRequest request, UUID tenantId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);

        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new IllegalStateException("Seule une campagne en DRAFT peut être modifiée.");
        }

        validateDateRange(request.getStartDate(), request.getEndDate());

        campaign.setName(request.getName());
        campaign.setDescription(request.getDescription());
        campaign.setType(request.getType());
        campaign.setStartDate(request.getStartDate());
        campaign.setEndDate(request.getEndDate());
        campaign.setBudget(request.getBudget());

        return toResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public CampaignResponse changeStatus(UUID campaignId, CampaignStatus newStatus, UUID tenantId, UUID actorId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);
        CampaignStatus current = campaign.getStatus();

        if (!ALLOWED_TRANSITIONS.get(current).contains(newStatus)) {
            throw new IllegalStateException(
                    "Transition invalide : " + current + " → " + newStatus);
        }

        campaign.setStatus(newStatus);
        Campaign saved = campaignRepository.save(campaign);

        eventPublisher.publishStatusChanged(saved, current, actorId);

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

        emailRepository.deleteByCampaignId(campaignId);
        campaignRepository.delete(campaign);
    }

    public Page<CampaignResponse> list(UUID tenantId, Pageable pageable) {
        return toResponses(campaignRepository.findByTenantId(tenantId, pageable));
    }

    public CampaignResponse getById(UUID campaignId, UUID tenantId) {
        return toResponse(getOwnedCampaign(campaignId, tenantId));
    }

    @Transactional
    public MetricsResponse recordMetrics(UUID campaignId, RecordMetricsRequest request,
                                         UUID tenantId, UUID userId) {
        Campaign campaign = getOwnedCampaign(campaignId, tenantId);

        if (campaign.getStatus() != CampaignStatus.ACTIVE) {
            throw new IllegalStateException("Les métriques ne peuvent être saisies que sur une campagne ACTIVE.");
        }
        if (emailRepository.existsByCampaignIdAndSentAtIsNotNull(campaignId)) {
            throw new IllegalStateException(
                    "Cet email a été envoyé via Brevo : ses statistiques sont mises à jour automatiquement.");
        }
        if (request.getClicks() > request.getImpressions()) {
            throw new IllegalArgumentException("Les clics ne peuvent pas dépasser les impressions.");
        }
        if (request.getConversions() > request.getClicks()) {
            throw new IllegalArgumentException("Les conversions ne peuvent pas dépasser les clics.");
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

    public List<MetricsResponse> getMetricsHistory(UUID campaignId, UUID tenantId) {
        getOwnedCampaign(campaignId, tenantId);
        return metricsRepository.findByCampaignIdOrderByRecordedAtDesc(campaignId).stream()
                .map(this::toMetricsResponse)
                .toList();
    }

    public KpiResponse getKpis(UUID campaignId, UUID tenantId) {
        getOwnedCampaign(campaignId, tenantId);

        AggregatedMetrics result = metricsRepository.getAggregatedMetrics(campaignId);
        Long impressions = result.getImpressions();
        Long clicks = result.getClicks();
        Long conversions = result.getConversions();
        BigDecimal budgetSpent = result.getBudgetSpent();

        return KpiResponse.builder()
                .campaignId(campaignId)
                .totalImpressions(impressions)
                .totalClicks(clicks)
                .totalConversions(conversions)
                .totalBudgetSpent(budgetSpent)
                .averageCtr(ratio(clicks, impressions))
                .averageCpc(clicks > 0 ? budgetSpent.doubleValue() / clicks : 0.0)
                .build();
    }

    public Page<CampaignResponse> search(
            UUID tenantId,
            CampaignStatus status,
            CampaignType type,
            String keyword,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable
    ) {
        Specification<Campaign> spec = Specification
                .where(CampaignSpecifications.hasTenantId(tenantId))
                .and(CampaignSpecifications.hasStatus(status))
                .and(CampaignSpecifications.hasType(type))
                .and(CampaignSpecifications.nameContains(keyword))
                .and(CampaignSpecifications.startDateBetween(startDate, endDate));

        return toResponses(campaignRepository.findAll(spec, pageable));
    }

    public String exportToCsv(UUID tenantId, CampaignStatus status, CampaignType type) {
        Specification<Campaign> spec = Specification
                .where(CampaignSpecifications.hasTenantId(tenantId))
                .and(CampaignSpecifications.hasStatus(status))
                .and(CampaignSpecifications.hasType(type));

        List<Campaign> campaigns = campaignRepository.findAll(spec);
        Map<UUID, GroupedMetrics> metrics = metricsByCampaign(ids(campaigns));

        StringBuilder csv = new StringBuilder();
        csv.append("Nom,Type,Statut,Date début,Date fin,Budget,Dépensé\n");

        for (Campaign c : campaigns) {
            csv.append(escapeCsv(c.getName())).append(",")
                    .append(c.getType()).append(",")
                    .append(c.getStatus()).append(",")
                    .append(c.getStartDate()).append(",")
                    .append(c.getEndDate()).append(",")
                    .append(c.getBudget()).append(",")
                    .append(spentOf(metrics, c.getId())).append("\n");
        }

        return csv.toString();
    }

    public DashboardResponse getDashboard(UUID tenantId) {
        long total = campaignRepository.countByTenantId(tenantId);
        long active = campaignRepository.countByTenantIdAndStatus(tenantId, CampaignStatus.ACTIVE);

        AggregatedMetrics result = metricsRepository.getAggregatedMetricsByTenant(tenantId);

        List<Campaign> campaigns = campaignRepository.findAllByTenantId(tenantId);
        Map<UUID, GroupedMetrics> metrics = metricsByCampaign(ids(campaigns));

        BigDecimal totalBudget = BigDecimal.ZERO;
        List<BudgetAlert> alerts = new ArrayList<>();
        for (Campaign c : campaigns) {
            totalBudget = totalBudget.add(nonNull(c.getBudget()));
            BigDecimal spent = spentOf(metrics, c.getId());
            Double usage = budgetUsage(c.getBudget(), spent);
            if (nearLimitAlert(c, usage) || overBudgetAlert(c, usage)) {
                alerts.add(BudgetAlert.builder()
                        .campaignId(c.getId())
                        .name(c.getName())
                        .status(c.getStatus())
                        .budget(c.getBudget())
                        .spent(spent)
                        .budgetUsage(usage)
                        .overBudget(usage >= OVER_BUDGET_THRESHOLD)
                        .build());
            }
        }
        alerts.sort(Comparator.comparing(BudgetAlert::getBudgetUsage).reversed());
        long over = alerts.stream().filter(BudgetAlert::isOverBudget).count();

        return DashboardResponse.builder()
                .totalCampaigns(total)
                .activeCampaigns(active)
                .totalImpressions(result.getImpressions())
                .totalClicks(result.getClicks())
                .totalConversions(result.getConversions())
                .totalBudgetSpent(result.getBudgetSpent())
                .totalBudget(totalBudget)
                .nearBudgetCount(alerts.size() - over)
                .overBudgetCount(over)
                .budgetAlerts(alerts.stream().limit(MAX_BUDGET_ALERTS).toList())
                .build();
    }

    /** Vue direction : chiffres de chaque espace client, sans accès au détail des campagnes. */
    public OverviewResponse getOverview() {
        Map<UUID, GroupedMetrics> metrics = metricsRepository.sumByCampaign().stream()
                .collect(Collectors.toMap(GroupedMetrics::getGroupId, Function.identity()));

        Map<UUID, TenantOverview> byTenant = new LinkedHashMap<>();
        TenantOverview totals = emptyOverview(null);

        for (Campaign c : campaignRepository.findAll()) {
            TenantOverview row = byTenant.computeIfAbsent(c.getTenantId(), this::emptyOverview);
            GroupedMetrics m = metrics.get(c.getId());
            BigDecimal spent = m != null ? nonNull(m.getBudgetSpent()) : BigDecimal.ZERO;
            Double usage = budgetUsage(c.getBudget(), spent);

            for (TenantOverview target : List.of(row, totals)) {
                target.setCampaigns(target.getCampaigns() + 1);
                if (c.getStatus() == CampaignStatus.ACTIVE) {
                    target.setActiveCampaigns(target.getActiveCampaigns() + 1);
                }
                target.setBudget(target.getBudget().add(nonNull(c.getBudget())));
                target.setSpent(target.getSpent().add(spent));
                if (m != null) {
                    target.setImpressions(target.getImpressions() + m.getImpressions());
                    target.setClicks(target.getClicks() + m.getClicks());
                    target.setConversions(target.getConversions() + m.getConversions());
                }
                if (overBudgetAlert(c, usage)) {
                    target.setOverBudgetCount(target.getOverBudgetCount() + 1);
                } else if (nearLimitAlert(c, usage)) {
                    target.setNearBudgetCount(target.getNearBudgetCount() + 1);
                }
            }
        }

        return OverviewResponse.builder()
                .tenants(new ArrayList<>(byTenant.values()))
                .totals(totals)
                .build();
    }

    /**
     * Rapport d'un espace sur une période : seules les métriques saisies dans
     * la période sont comptées. Une campagne apparaît si elle a des métriques
     * dans la période ou si ses dates chevauchent la période.
     */
    public ReportResponse getReport(UUID tenantId, LocalDate startDate, LocalDate endDate) {
        validateDateRange(startDate, endDate);

        Map<UUID, GroupedMetrics> metrics = metricsRepository.sumByCampaignInPeriod(
                        tenantId, startDate.atStartOfDay(), endDate.plusDays(1).atStartOfDay())
                .stream()
                .collect(Collectors.toMap(GroupedMetrics::getGroupId, Function.identity()));

        List<ReportRow> rows = new ArrayList<>();
        for (Campaign c : campaignRepository.findAllByTenantId(tenantId)) {
            GroupedMetrics m = metrics.get(c.getId());
            boolean overlaps = !c.getStartDate().isAfter(endDate) && !c.getEndDate().isBefore(startDate);
            if (m == null && !overlaps) continue;

            rows.add(reportRow(c.getId(), c.getName(), c.getType(), c.getStatus(),
                    c.getStartDate(), c.getEndDate(), nonNull(c.getBudget()),
                    m != null ? m.getImpressions() : 0,
                    m != null ? m.getClicks() : 0,
                    m != null ? m.getConversions() : 0,
                    m != null ? nonNull(m.getBudgetSpent()) : BigDecimal.ZERO));
        }
        rows.sort(Comparator.comparing(ReportRow::getSpent).reversed()
                .thenComparing(ReportRow::getName, String.CASE_INSENSITIVE_ORDER));

        ReportRow totals = reportRow(null, "Total", null, null, startDate, endDate,
                rows.stream().map(ReportRow::getBudget).reduce(BigDecimal.ZERO, BigDecimal::add),
                rows.stream().mapToLong(ReportRow::getImpressions).sum(),
                rows.stream().mapToLong(ReportRow::getClicks).sum(),
                rows.stream().mapToLong(ReportRow::getConversions).sum(),
                rows.stream().map(ReportRow::getSpent).reduce(BigDecimal.ZERO, BigDecimal::add));

        return ReportResponse.builder()
                .tenantId(tenantId)
                .startDate(startDate)
                .endDate(endDate)
                .rows(rows)
                .totals(totals)
                .build();
    }

    public String exportReportToCsv(UUID tenantId, LocalDate startDate, LocalDate endDate) {
        ReportResponse report = getReport(tenantId, startDate, endDate);

        // BOM UTF-8 : sans lui, Excel affiche mal les accents.
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("Période,").append(startDate).append(" → ").append(endDate).append("\n");
        csv.append("Campagne,Type,Statut,Début,Fin,Budget (MAD),Impressions,Clics,Conversions,"
                + "Dépensé (MAD),CTR (%),CPC (MAD),Taux de conversion (%)\n");

        List<ReportRow> lines = new ArrayList<>(report.getRows());
        lines.add(report.getTotals());
        for (ReportRow r : lines) {
            csv.append(escapeCsv(r.getName())).append(",")
                    .append(r.getType() != null ? r.getType() : "").append(",")
                    .append(r.getStatus() != null ? r.getStatus() : "").append(",")
                    .append(r.getCampaignId() != null ? r.getStartDate() : "").append(",")
                    .append(r.getCampaignId() != null ? r.getEndDate() : "").append(",")
                    .append(money(r.getBudget())).append(",")
                    .append(r.getImpressions()).append(",")
                    .append(r.getClicks()).append(",")
                    .append(r.getConversions()).append(",")
                    .append(money(r.getSpent())).append(",")
                    .append(decimal(r.getCtr())).append(",")
                    .append(decimal(r.getCpc())).append(",")
                    .append(decimal(r.getConversionRate())).append("\n");
        }
        return csv.toString();
    }

    // ── Helpers ──

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException(
                    "La date de fin doit être postérieure ou égale à la date de début.");
        }
    }

    private Campaign getOwnedCampaign(UUID campaignId, UUID tenantId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Campagne non trouvée."));

        if (!campaign.getTenantId().equals(tenantId)) {
            throw new SecurityException("Accès refusé : cette campagne n'appartient pas à votre tenant.");
        }
        return campaign;
    }

    private Map<UUID, GroupedMetrics> metricsByCampaign(Collection<UUID> campaignIds) {
        if (campaignIds.isEmpty()) return new HashMap<>();
        return metricsRepository.sumByCampaignIds(campaignIds).stream()
                .collect(Collectors.toMap(GroupedMetrics::getGroupId, Function.identity()));
    }

    private List<UUID> ids(Collection<Campaign> campaigns) {
        return campaigns.stream().map(Campaign::getId).toList();
    }

    private BigDecimal spentOf(Map<UUID, GroupedMetrics> metrics, UUID campaignId) {
        GroupedMetrics m = metrics.get(campaignId);
        return m != null ? nonNull(m.getBudgetSpent()) : BigDecimal.ZERO;
    }

    private Double budgetUsage(BigDecimal budget, BigDecimal spent) {
        if (budget == null || budget.signum() <= 0) return null;
        return spent.multiply(BigDecimal.valueOf(100))
                .divide(budget, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private double ratio(long part, long whole) {
        return whole > 0 ? (part * 100.0) / whole : 0.0;
    }

    private TenantOverview emptyOverview(UUID tenantId) {
        return TenantOverview.builder()
                .tenantId(tenantId)
                .budget(BigDecimal.ZERO)
                .spent(BigDecimal.ZERO)
                .build();
    }

    private ReportRow reportRow(UUID id, String name, CampaignType type, CampaignStatus status,
                                LocalDate start, LocalDate end, BigDecimal budget,
                                long impressions, long clicks, long conversions, BigDecimal spent) {
        return ReportRow.builder()
                .campaignId(id).name(name).type(type).status(status)
                .startDate(start).endDate(end).budget(budget)
                .impressions(impressions).clicks(clicks).conversions(conversions)
                .spent(spent)
                .ctr(ratio(clicks, impressions))
                .cpc(clicks > 0 ? spent.doubleValue() / clicks : 0.0)
                .conversionRate(ratio(conversions, clicks))
                .build();
    }

    private String money(BigDecimal value) {
        return nonNull(value).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String decimal(Double value) {
        return value != null ? String.format(Locale.ROOT, "%.2f", value) : "";
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private Page<CampaignResponse> toResponses(Page<Campaign> page) {
        Map<UUID, GroupedMetrics> metrics = metricsByCampaign(ids(page.getContent()));
        Set<UUID> emailsSent = emailRepository.findSentCampaignIds();
        return page.map(c -> toResponse(c, spentOf(metrics, c.getId()), emailsSent.contains(c.getId())));
    }

    private CampaignResponse toResponse(Campaign c) {
        return toResponse(c, nonNull(metricsRepository.getAggregatedMetrics(c.getId()).getBudgetSpent()),
                emailRepository.existsByCampaignIdAndSentAtIsNotNull(c.getId()));
    }

    private CampaignResponse toResponse(Campaign c, BigDecimal spent, boolean emailSent) {
        return CampaignResponse.builder()
                .id(c.getId()).name(c.getName()).description(c.getDescription())
                .type(c.getType()).status(c.getStatus())
                .startDate(c.getStartDate()).endDate(c.getEndDate())
                .budget(c.getBudget())
                .spent(spent)
                .budgetUsage(budgetUsage(c.getBudget(), spent))
                .emailSent(emailSent)
                .createdAt(c.getCreatedAt())
                .build();
    }

    private MetricsResponse toMetricsResponse(CampaignMetrics m) {
        double ctr = m.getImpressions() > 0
                ? (m.getClicks() * 100.0) / m.getImpressions() : 0.0;
        double cpc = m.getClicks() > 0
                ? m.getBudgetSpent().doubleValue() / m.getClicks() : 0.0;

        return MetricsResponse.builder()
                .id(m.getId()).impressions(m.getImpressions()).clicks(m.getClicks())
                .conversions(m.getConversions()).budgetSpent(m.getBudgetSpent())
                .ctr(ctr).cpc(cpc).recordedAt(m.getRecordedAt())
                .build();
    }

}
