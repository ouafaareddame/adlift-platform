package com.adlift.auth.service;

import com.adlift.auth.dto.AuthDTOs.*;
import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.entity.User;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import com.adlift.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    /**
     * Inscription : crée un nouveau tenant + son premier utilisateur
     * (toujours AGENCY_ADMIN, c'est le responsable du compte).
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé.");
        }
        if (tenantRepository.existsByName(request.getTenantName())) {
            throw new IllegalArgumentException("Ce nom de tenant est déjà utilisé.");
        }

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .name(request.getTenantName())
                .email(request.getEmail())
                .status(TenantStatus.ACTIVE)
                .build());

        User user = userRepository.save(User.builder()
                .tenant(tenant)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.AGENCY_ADMIN)
                .build());

        return buildAuthResponse(user);
    }

    /**
     * Login : vérifie email + mot de passe via AuthenticationManager
     * (qui utilise UserDetailsService + PasswordEncoder définis dans
     * SecurityConfig), puis génère un nouveau JWT.
     */
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur non trouvé."));

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(UserInfo.builder()
                        .id(user.getId())
                        .tenantId(user.getTenantId())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .build())
                .build();
    }
}