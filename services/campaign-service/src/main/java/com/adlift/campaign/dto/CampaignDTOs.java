package com.adlift.campaign.dto;

import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    }

}