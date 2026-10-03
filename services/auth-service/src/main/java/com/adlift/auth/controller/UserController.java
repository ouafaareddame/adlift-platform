package com.adlift.auth.controller;

import com.adlift.auth.dto.MemberDTOs.*;
import com.adlift.auth.dto.TenantDTOs.PasswordResetResponse;
import com.adlift.auth.entity.User;
import com.adlift.auth.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class UserController {

    private final MemberService memberService;

    @PostMapping("/invite")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<MemberResponse> invite(
            @Valid @RequestBody InviteMemberRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(memberService.invite(request, currentUser.getTenantId()));
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<MemberResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(memberService.updateRole(id, request, currentUser.getTenantId()));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<Void> deactivate(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        memberService.deactivate(id, currentUser.getTenantId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<Void> activate(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        memberService.activate(id, currentUser.getTenantId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<PasswordResetResponse> resetPassword(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(memberService.resetPassword(id, currentUser.getTenantId()));
    }

    @GetMapping
    @PreAuthorize("hasRole('AGENCY_ADMIN')")
    public ResponseEntity<List<MemberResponse>> list(
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(memberService.list(currentUser.getTenantId()));
    }
}