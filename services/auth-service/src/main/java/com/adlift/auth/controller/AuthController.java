package com.adlift.auth.controller;

import com.adlift.auth.dto.AuthDTOs.*;
import com.adlift.auth.entity.User;
import com.adlift.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
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
                .email(user.getEmail())
                .role(user.getRole())
                .build());
    }
}