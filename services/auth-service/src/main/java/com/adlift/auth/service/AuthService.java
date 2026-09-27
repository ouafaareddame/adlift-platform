package com.adlift.auth.service;

import com.adlift.auth.dto.AuthDTOs.*;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.entity.User;
import com.adlift.auth.exception.BadRequestException;
import com.adlift.auth.repository.UserRepository;
import com.adlift.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/**
 * Pas d'inscription publique : les espaces clients et leur premier
 * AGENCY_ADMIN sont créés par la direction Adlift (voir TenantService).
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    /**
     * Login : vérifie email + mot de passe via AuthenticationManager
     * (qui utilise UserDetailsService + PasswordEncoder définis dans
     * SecurityConfig), puis génère un nouveau JWT.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = authentication.getPrincipal() instanceof User principal
                ? principal
                : userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new NoSuchElementException("Utilisateur non trouvé."));

        assertCanSignIn(user);
        return buildAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new NoSuchElementException("Utilisateur non trouvé."));
        assertCanSignIn(user);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse changePassword(User currentUser, ChangePasswordRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new NoSuchElementException("Utilisateur non trouvé."));
        assertCanSignIn(user);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mot de passe actuel incorrect.");
        }
        if (request.getNewPassword().equals(request.getCurrentPassword())) {
            throw new BadRequestException("Le nouveau mot de passe doit être différent de l'actuel.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        return buildAuthResponse(userRepository.save(user));
    }

    private void assertCanSignIn(User user) {
        if (!user.isActive()) {
            throw new DisabledException("Ce compte a été désactivé.");
        }
        if (user.getTenant() == null || user.getTenant().getStatus() != TenantStatus.ACTIVE) {
            throw new DisabledException("Cette agence est désactivée.");
        }
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
                        .mustChangePassword(user.isMustChangePassword())
                        .build())
                .build();
    }
}
