package com.adlift.auth.controller;

import com.adlift.auth.dto.MemberDTOs.MemberResponse;
import com.adlift.auth.dto.TenantDTOs.*;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')") // s'applique à toute la classe : réservé au Super Admin
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    public ResponseEntity<TenantResponse> create(@Valid @RequestBody CreateTenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tenantService.create(request));
    }

    @GetMapping
    public ResponseEntity<Page<TenantResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(tenantService.list(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TenantResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateTenantRequest request) {
        return ResponseEntity.ok(tenantService.update(id, request));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<MemberResponse>> members(@PathVariable UUID id) {
        return ResponseEntity.ok(tenantService.members(id));
    }

    @PostMapping("/{id}/members/{userId}/reset-password")
    public ResponseEntity<PasswordResetResponse> resetPassword(@PathVariable UUID id, @PathVariable UUID userId) {
        return ResponseEntity.ok(tenantService.resetMemberPassword(id, userId));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<TenantResponse> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(tenantService.setStatus(id, TenantStatus.ACTIVE));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TenantResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(tenantService.setStatus(id, TenantStatus.INACTIVE));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tenantService.delete(id);
        return ResponseEntity.noContent().build();
    }
}