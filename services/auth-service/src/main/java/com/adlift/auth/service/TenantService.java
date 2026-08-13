package com.adlift.auth.service;

import com.adlift.auth.dto.TenantDTOs.*;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    @Transactional
    public TenantResponse create(CreateTenantRequest request) {
        if (tenantRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un tenant avec cet email existe déjà.");
        }
        if (tenantRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Un tenant avec ce nom existe déjà.");
        }

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .name(request.getName())
                .email(request.getEmail())
                .status(TenantStatus.ACTIVE)
                .build());

        return toResponse(tenant);
    }

    public Page<TenantResponse> list(Pageable pageable) {
        return tenantRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public TenantResponse setStatus(UUID tenantId, TenantStatus newStatus) {
        Tenant tenant = getTenantOrThrow(tenantId);
        tenant.setStatus(newStatus);
        return toResponse(tenantRepository.save(tenant));
    }

    @Transactional
    public void delete(UUID tenantId) {
        Tenant tenant = getTenantOrThrow(tenantId);

        // Empêche de casser l'intégrité référentielle : un tenant avec des
        // membres actifs ne doit pas pouvoir être supprimé directement.
        if (userRepository.existsByTenant_Id(tenantId)) {
            throw new IllegalStateException(
                    "Impossible de supprimer ce tenant : il possède encore des membres. "
                            + "Désactivez-le plutôt, ou retirez d'abord tous ses membres.");
        }

        tenantRepository.delete(tenant);
    }

    private Tenant getTenantOrThrow(UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable."));
    }

    private TenantResponse toResponse(Tenant t) {
        return TenantResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .email(t.getEmail())
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .build();
    }
}