package com.adlift.auth.controller;

import com.adlift.auth.dto.AuthDTOs.*;
import com.adlift.auth.entity.User;
import com.adlift.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(authService.refresh(currentUser));
    }

    @PostMapping("/switch")
    public ResponseEntity<AuthResponse> switchWorkspace(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SwitchWorkspaceRequest request
    ) {
        return ResponseEntity.ok(authService.switchWorkspace(currentUser, request.getTenantId()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<AuthResponse> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        return ResponseEntity.ok(authService.changePassword(currentUser, request));
    }

    /**
     * Route de test pour valider que JwtAuthenticationFilter fonctionne.
     * @AuthenticationPrincipal injecte directement l'entité User posée dans
     * le SecurityContext par le filtre — aucun appel base de données ici,
     * l'utilisateur est déjà résolu en amont.
     */
    @GetMapping("/me")
    public ResponseEntity<UserInfo> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserInfo.builder()
                .id(user.getId())
                .tenantId(user.getTenantId())
                .tenantName(user.getCurrentTenant().getName())
                .email(user.getEmail())
                .role(user.getCurrentRole())
                .mustChangePassword(user.isMustChangePassword())
                .build());
    }
}