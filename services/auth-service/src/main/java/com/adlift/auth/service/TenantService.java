package com.adlift.auth.service;

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

import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

        return toResponse(tenant, request.getAdminEmail());
    }

    public Page<TenantResponse> list(Pageable pageable) {
        return tenantRepository.findClientTenants(Role.SUPER_ADMIN, pageable)
                .map(tenant -> toResponse(tenant, userRepository
                        .findFirstByTenant_IdAndRoleOrderByCreatedAtAsc(tenant.getId(), Role.AGENCY_ADMIN)
                        .map(User::getEmail)
                        .orElse(null)));
    }

    @Transactional
    public TenantResponse setStatus(UUID tenantId, TenantStatus newStatus) {
        Tenant tenant = getClientTenantOrThrow(tenantId);
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
