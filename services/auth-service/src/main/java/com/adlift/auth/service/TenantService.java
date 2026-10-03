package com.adlift.auth.service;

import com.adlift.auth.dto.MemberDTOs.MemberResponse;
import com.adlift.auth.dto.TenantDTOs.*;
import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.entity.User;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityPublisher activity;

    /**
     * Onboarding d'un client par la direction Adlift : crée l'espace isolé
     * et son premier AGENCY_ADMIN dans la même transaction, pour qu'aucun
     * espace ne reste sans personne capable de s'y connecter.
     */
    @Transactional
    public TenantResponse create(CreateTenantRequest request) {
        if (tenantRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un tenant avec cet email existe déjà.");
        }
        if (tenantRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Un tenant avec ce nom existe déjà.");
        }
        if (userRepository.existsByEmail(request.getAdminEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé.");
        }

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .name(request.getName())
                .email(request.getEmail())
                .status(TenantStatus.ACTIVE)
                .build());

        userRepository.save(User.builder()
                .tenant(tenant)
                .email(request.getAdminEmail())
                .passwordHash(passwordEncoder.encode(request.getAdminPassword()))
                .role(Role.AGENCY_ADMIN)
                .isActive(true)
                .mustChangePassword(true)
                .build());

        activity.notifyPlatformAdmins("TENANT_CREATED", String.format(
                "L'espace client « %s » a été créé (admin : %s).", tenant.getName(), request.getAdminEmail()));
        return toResponse(tenant, request.getAdminEmail());
    }

    public Page<TenantResponse> list(Pageable pageable) {
        return tenantRepository.findClientTenants(Role.SUPER_ADMIN, pageable)
                .map(tenant -> toResponse(tenant, firstAdminEmail(tenant.getId())));
    }

    private String firstAdminEmail(UUID tenantId) {
        return userRepository.findFirstByTenant_IdAndRoleOrderByCreatedAtAsc(tenantId, Role.AGENCY_ADMIN)
                .map(User::getEmail)
                .orElse(null);
    }

    @Transactional
    public TenantResponse update(UUID tenantId, UpdateTenantRequest request) {
        Tenant tenant = getClientTenantOrThrow(tenantId);
        String name = request.getName().trim();
        String email = request.getEmail().trim();
        if (tenantRepository.existsByNameAndIdNot(name, tenantId)) {
            throw new IllegalArgumentException("Un tenant avec ce nom existe déjà.");
        }
        if (tenantRepository.existsByEmailAndIdNot(email, tenantId)) {
            throw new IllegalArgumentException("Un tenant avec cet email existe déjà.");
        }
        tenant.setName(name);
        tenant.setEmail(email);
        return toResponse(tenantRepository.save(tenant), firstAdminEmail(tenantId));
    }

    public List<MemberResponse> members(UUID tenantId) {
        getClientTenantOrThrow(tenantId);
        return userRepository.findByTenantId(tenantId).stream()
                .sorted(Comparator.comparing(User::getCreatedAt))
                .map(u -> MemberResponse.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .role(u.getRole())
                        .isActive(u.isActive())
                        .createdAt(u.getCreatedAt())
                        .build())
                .toList();
    }

    /**
     * Mot de passe oublié côté client : la direction génère un mot de passe
     * temporaire, que la personne devra remplacer à sa prochaine connexion.
     */
    @Transactional
    public PasswordResetResponse resetMemberPassword(UUID tenantId, UUID userId) {
        getClientTenantOrThrow(tenantId);
        User user = userRepository.findById(userId)
                .filter(u -> tenantId.equals(u.getTenantId()))
                .orElseThrow(() -> new NoSuchElementException("Membre non trouvé."));
        String password = TemporaryPasswords.generate();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        userRepository.save(user);
        return PasswordResetResponse.builder().email(user.getEmail()).temporaryPassword(password).build();
    }

    @Transactional
    public TenantResponse setStatus(UUID tenantId, TenantStatus newStatus) {
        Tenant tenant = getClientTenantOrThrow(tenantId);
        if (tenant.getStatus() != newStatus) {
            boolean active = newStatus == TenantStatus.ACTIVE;
            activity.notifyPlatformAdmins(active ? "TENANT_ACTIVATED" : "TENANT_DEACTIVATED", String.format(
                    "L'espace client « %s » a été %s.", tenant.getName(), active ? "réactivé" : "désactivé"));
        }
        tenant.setStatus(newStatus);
        return toResponse(tenantRepository.save(tenant), null);
    }

    @Transactional
    public void delete(UUID tenantId) {
        Tenant tenant = getClientTenantOrThrow(tenantId);

        // Empêche de casser l'intégrité référentielle : un tenant avec des
        // membres actifs ne doit pas pouvoir être supprimé directement.
        if (userRepository.existsByTenant_Id(tenantId)) {
            throw new IllegalStateException(
                    "Impossible de supprimer ce tenant : il possède encore des membres. "
                            + "Désactivez-le plutôt, ou retirez d'abord tous ses membres.");
        }

        tenantRepository.delete(tenant);
    }

    private Tenant getClientTenantOrThrow(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable."));
        if (userRepository.existsByTenant_IdAndRole(tenantId, Role.SUPER_ADMIN)) {
            throw new IllegalStateException("L'espace de la plateforme Adlift ne peut pas être modifié.");
        }
        return tenant;
    }

    private TenantResponse toResponse(Tenant t, String adminEmail) {
        return TenantResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .email(t.getEmail())
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .adminEmail(adminEmail)
                .build();
    }
}
