package com.adlift.campaign.controller;

import com.adlift.campaign.dto.CampaignDTOs.*;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import com.adlift.campaign.security.TenantPrincipal;
import com.adlift.campaign.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @PostMapping
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<CampaignResponse> create(
            @Valid @RequestBody CreateCampaignRequest request,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        UUID userId = UUID.fromString(principal.userId());
        return ResponseEntity.ok(campaignService.create(request, tenantId, userId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'CLIENT')")
    public ResponseEntity<Page<CampaignResponse>> list(
            @AuthenticationPrincipal TenantPrincipal principal,
            Pageable pageable
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        return ResponseEntity.ok(campaignService.list(tenantId, pageable));
    }

    @GetMapping("/{id}/kpis")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'CLIENT')")
    public ResponseEntity<KpiResponse> getKpis(
            @PathVariable UUID id,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        return ResponseEntity.ok(campaignService.getKpis(id, tenantId));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'CLIENT')")
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        return ResponseEntity.ok(campaignService.getDashboard(tenantId));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'CLIENT')")
    public ResponseEntity<Page<CampaignResponse>> search(
            @RequestParam(required = false) CampaignStatus status,
            @RequestParam(required = false) CampaignType type,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal TenantPrincipal principal,
            Pageable pageable
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        return ResponseEntity.ok(campaignService.search(
                tenantId, status, type, keyword, startDate, endDate, pageable));
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<String> exportCsv(
            @RequestParam(required = false) CampaignStatus status,
            @RequestParam(required = false) CampaignType type,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        String csv = campaignService.exportToCsv(tenantId, status, type);

        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=campaigns.csv")
                .body(csv);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<CampaignResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCampaignRequest request,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        return ResponseEntity.ok(campaignService.update(id, request, tenantId));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<CampaignResponse> changeStatus(
            @PathVariable UUID id,
            @RequestParam CampaignStatus newStatus,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        return ResponseEntity.ok(campaignService.changeStatus(id, newStatus, tenantId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        campaignService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/metrics")
    @PreAuthorize("hasAnyRole('AGENCY_ADMIN', 'CLIENT')")
    public ResponseEntity<MetricsResponse> recordMetrics(
            @PathVariable UUID id,
            @Valid @RequestBody RecordMetricsRequest request,
            @AuthenticationPrincipal TenantPrincipal principal
    ) {
        UUID tenantId = UUID.fromString(principal.tenantId());
        UUID userId = UUID.fromString(principal.userId());
        return ResponseEntity.ok(campaignService.recordMetrics(id, request, tenantId, userId));
    }
}