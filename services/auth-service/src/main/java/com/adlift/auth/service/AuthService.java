package com.adlift.auth.service;

import com.adlift.auth.dto.AuthDTOs.*;
import com.adlift.auth.entity.Membership;
import com.adlift.auth.entity.User;
import com.adlift.auth.exception.BadRequestException;
import com.adlift.auth.repository.MembershipRepository;
import com.adlift.auth.repository.UserRepository;
import com.adlift.auth.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Pas d'inscription publique : les espaces clients et leur chef de projet
 * sont créés par la direction Adlift (voir TenantService).
 * Un compte peut accéder à plusieurs espaces ; chaque JWT n'en porte qu'un.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    /**
     * Login : vérifie email + mot de passe via AuthenticationManager
     * (qui utilise UserDetailsService + PasswordEncoder définis dans
     * SecurityConfig), puis ouvre l'espace demandé ou le premier accessible.
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

        List<Membership> usable = usableMemberships(user);
        Membership selected = usable.stream()
                .filter(m -> m.getTenant().getId().equals(request.getTenantId()))
                .findFirst()
                .orElse(usable.get(0));
        return buildAuthResponse(user, selected, usable);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(User currentUser) {
        return switchWorkspace(currentUser, currentUser.getTenantId());
    }

    @Transactional(readOnly = true)
    public AuthResponse switchWorkspace(User currentUser, UUID tenantId) {
        User user = reload(currentUser);
        List<Membership> usable = usableMemberships(user);
        Membership selected = usable.stream()
                .filter(m -> m.getTenant().getId().equals(tenantId))
                .findFirst()
                .orElseThrow(() -> new SecurityException("Accès refusé : vous n'avez pas accès à cet espace."));
        return buildAuthResponse(user, selected, usable);
    }

    @Transactional
    public AuthResponse changePassword(User currentUser, ChangePasswordRequest request) {
        User user = reload(currentUser);
        List<Membership> usable = usableMemberships(user);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mot de passe actuel incorrect.");
        }
        if (request.getNewPassword().equals(request.getCurrentPassword())) {
            throw new BadRequestException("Le nouveau mot de passe doit être différent de l'actuel.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        User saved = userRepository.save(user);
        Membership selected = usable.stream()
                .filter(m -> m.getTenant().getId().equals(currentUser.getTenantId()))
                .findFirst()
                .orElse(usable.get(0));
        return buildAuthResponse(saved, selected, usable);
    }

    private User reload(User currentUser) {
        return userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new NoSuchElementException("Utilisateur non trouvé."));
    }

    /** Accès actifs dans des espaces actifs ; au moins un est nécessaire pour se connecter. */
    private List<Membership> usableMemberships(User user) {
        if (!user.isActive()) {
            throw new DisabledException("Ce compte a été désactivé.");
        }
        List<Membership> all = membershipRepository.findByUser_IdOrderByTenant_NameAsc(user.getId());
        List<Membership> usable = all.stream().filter(Membership::isUsable).toList();
        if (usable.isEmpty()) {
            boolean onlyInactiveWorkspaces = all.stream().anyMatch(Membership::isActive);
            throw new DisabledException(onlyInactiveWorkspaces
                    ? "Cette agence est désactivée."
                    : "Ce compte a été désactivé.");
        }
        return usable;
    }

    private AuthResponse buildAuthResponse(User user, Membership selected, List<Membership> usable) {
        user.useWorkspace(selected);
        return AuthResponse.builder()
                .accessToken(jwtService.generateToken(user))
                .tokenType("Bearer")
                .user(UserInfo.builder()
                        .id(user.getId())
                        .tenantId(selected.getTenant().getId())
                        .tenantName(selected.getTenant().getName())
                        .email(user.getEmail())
                        .role(selected.getRole())
                        .mustChangePassword(user.isMustChangePassword())
                        .build())
                .workspaces(usable.stream()
                        .map(m -> WorkspaceInfo.builder()
                                .tenantId(m.getTenant().getId())
                                .name(m.getTenant().getName())
                                .role(m.getRole())
                                .build())
                        .toList())
                .build();
    }
}
