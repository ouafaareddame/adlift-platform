package com.adlift.campaign.dto;

import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class CampaignDTOs {

    @Data
    public static class CreateCampaignRequest {
        @NotBlank
        private String name;

        private String description;

        @NotNull
        private CampaignType type;

        @NotNull
        private LocalDate startDate;

        @NotNull
        private LocalDate endDate;

        @NotNull @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal budget;
    }

    @Data
    public static class UpdateCampaignRequest {
        @NotBlank
        private String name;

        private String description;

        @NotNull
        private CampaignType type;

        @NotNull
        private LocalDate startDate;

        @NotNull
        private LocalDate endDate;

        @NotNull @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal budget;
    }

    @Data
    public static class RecordMetricsRequest {
        @NotNull @Min(0)
        private Long impressions;

        @NotNull @Min(0)
        private Long clicks;

        @NotNull @Min(0)
        private Long conversions;

        @NotNull @DecimalMin(value = "0.0")
        private BigDecimal budgetSpent;
    }

    @Data @Builder
    public static class CampaignResponse {
        private UUID id;
        private String name;
        private String description;
        private CampaignType type;
        private CampaignStatus status;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal budget;
        private BigDecimal spent;
        /** Pourcentage du budget consommé, null si le budget est 0. */
        private Double budgetUsage;
        /** Campagne EMAIL réellement envoyée : ses métriques viennent de Brevo. */
        private boolean emailSent;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class MetricsResponse {
        private UUID id;
        private Long impressions;
        private Long clicks;
        private Long conversions;
        private BigDecimal budgetSpent;
        private Double ctr;
        private Double cpc;
        private LocalDateTime recordedAt;
    }

    @Data @Builder
    public static class KpiResponse {
        private UUID campaignId;
        private Long totalImpressions;
        private Long totalClicks;
        private Long totalConversions;
        private BigDecimal totalBudgetSpent;
        private Double averageCtr;
        private Double averageCpc;
    }

    @Data @Builder
    public static class DashboardResponse {
        private Long totalCampaigns;
        private Long activeCampaigns;
        private Long totalImpressions;
        private Long totalClicks;
        private Long totalConversions;
        private BigDecimal totalBudgetSpent;
        private BigDecimal totalBudget;
        private Long nearBudgetCount;
        private Long overBudgetCount;
        private List<BudgetAlert> budgetAlerts;
    }

    @Data @Builder
    public static class BudgetAlert {
        private UUID campaignId;
        private String name;
        private CampaignStatus status;
        private BigDecimal budget;
        private BigDecimal spent;
        private Double budgetUsage;
        private boolean overBudget;
    }

    // ── Vue direction (SUPER_ADMIN) : un résumé par espace client ──
    @Data @Builder
    public static class TenantOverview {
        private UUID tenantId;
        private long campaigns;
        private long activeCampaigns;
        private BigDecimal budget;
        private BigDecimal spent;
        private long impressions;
        private long clicks;
        private long conversions;
        private long nearBudgetCount;
        private long overBudgetCount;
    }

    @Data @Builder
    public static class OverviewResponse {
        private List<TenantOverview> tenants;
        private TenantOverview totals;
    }

    // ── Rapport par période ──
    @Data @Builder
    public static class ReportRow {
        private UUID campaignId;
        private String name;
        private CampaignType type;
        private CampaignStatus status;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal budget;
        private long impressions;
        private long clicks;
        private long conversions;
        private BigDecimal spent;
        private Double ctr;
        private Double cpc;
        private Double conversionRate;
    }

    @Data @Builder
    public static class ReportResponse {
        private UUID tenantId;
        private LocalDate startDate;
        private LocalDate endDate;
        private List<ReportRow> rows;
        private ReportRow totals;
    }

}