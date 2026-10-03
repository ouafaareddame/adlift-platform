package com.adlift.auth.service;

import com.adlift.auth.dto.MemberDTOs.MemberResponse;
import com.adlift.auth.dto.TenantDTOs.*;
import com.adlift.auth.entity.Membership;
import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.entity.User;
import com.adlift.auth.exception.BadRequestException;
import com.adlift.auth.repository.MembershipRepository;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityPublisher activity;

    /**
     * Onboarding d'un client par la direction Adlift : crée l'espace isolé
     * et l'accès de son chef de projet dans la même transaction, pour qu'aucun
     * espace ne reste sans personne capable de s'y connecter. Un chef de projet
     * qui a déjà un compte garde son mot de passe et voit simplement un espace de plus.
     */
    @Transactional
    public TenantResponse create(CreateTenantRequest request) {
        if (tenantRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Un tenant avec cet email existe déjà.");
        }
        if (tenantRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Un tenant avec ce nom existe déjà.");
        }
        String adminEmail = request.getAdminEmail().trim();
        Optional<User> existing = userRepository.findByEmail(adminEmail);
        existing.ifPresent(this::assertNotPlatformAccount);

        Tenant tenant = tenantRepository.save(Tenant.builder()
                .name(request.getName())
                .email(request.getEmail())
                .status(TenantStatus.ACTIVE)
                .build());

        User admin = existing.orElseGet(() -> userRepository.save(User.builder()
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(request.getAdminPassword()))
                .isActive(true)
                .mustChangePassword(true)
                .build()));
        membershipRepository.save(Membership.builder().user(admin).tenant(tenant).role(Role.AGENCY_ADMIN).build());

        activity.notifyPlatformAdmins("TENANT_CREATED", String.format(
                "L'espace client « %s » a été créé (admin : %s).", tenant.getName(), adminEmail));
        TenantResponse response = toResponse(tenant, adminEmail);
        response.setAdminNewAccount(existing.isEmpty());
        return response;
    }

    @Transactional(readOnly = true)
    public Page<TenantResponse> list(Pageable pageable) {
        return tenantRepository.findClientTenants(Role.SUPER_ADMIN, pageable)
                .map(tenant -> toResponse(tenant, firstAdminEmail(tenant.getId())));
    }

    private String firstAdminEmail(UUID tenantId) {
        return membershipRepository.findFirstByTenant_IdAndRoleOrderByCreatedAtAsc(tenantId, Role.AGENCY_ADMIN)
                .map(m -> m.getUser().getEmail())
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

    @Transactional(readOnly = true)
    public List<MemberResponse> members(UUID tenantId) {
        getClientTenantOrThrow(tenantId);
        return membershipRepository.findByTenant_IdOrderByCreatedAtAsc(tenantId).stream()
                .map(MemberService::toResponse)
                .toList();
    }

    /**
     * Affectation par la direction : un chef de projet existant reçoit un espace de plus,
     * sinon un compte est créé avec un mot de passe temporaire.
     */
    @Transactional
    public MemberAccessResponse addMember(UUID tenantId, AddMemberRequest request) {
        Tenant tenant = getClientTenantOrThrow(tenantId);
        if (request.getRole() == Role.SUPER_ADMIN) {
            throw new BadRequestException("Impossible d'attribuer le rôle SUPER_ADMIN depuis un tenant.");
        }
        String email = request.getEmail().trim();
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            assertNotPlatformAccount(existing.get());
            if (membershipRepository.findByUser_IdAndTenant_Id(existing.get().getId(), tenantId).isPresent()) {
                throw new IllegalArgumentException("Ce compte a déjà accès à cet espace.");
            }
        }

        String password = existing.isPresent() ? null : TemporaryPasswords.generate();
        User user = existing.orElseGet(() -> userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .isActive(true)
                .mustChangePassword(true)
                .build()));
        membershipRepository.save(Membership.builder().user(user).tenant(tenant).role(request.getRole()).build());

        activity.notifyTenantAdmins(tenantId, "MEMBER_INVITED", String.format(
                "%s a été ajouté à l'espace avec le rôle %s.", email, request.getRole()));
        return MemberAccessResponse.builder()
                .email(email)
                .newAccount(existing.isEmpty())
                .temporaryPassword(password)
                .build();
    }

    /**
     * Mot de passe oublié côté client : la direction génère un mot de passe
     * temporaire, que la personne devra remplacer à sa prochaine connexion.
     */
    @Transactional
    public PasswordResetResponse resetMemberPassword(UUID tenantId, UUID userId) {
        getClientTenantOrThrow(tenantId);
        User user = membershipRepository.findByUser_IdAndTenant_Id(userId, tenantId)
                .map(Membership::getUser)
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
        if (membershipRepository.existsByTenant_Id(tenantId)) {
            throw new IllegalStateException(
                    "Impossible de supprimer ce tenant : il possède encore des membres. "
                            + "Désactivez-le plutôt, ou retirez d'abord tous ses membres.");
        }

        tenantRepository.delete(tenant);
    }

    private Tenant getClientTenantOrThrow(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant introuvable."));
        if (membershipRepository.existsByTenant_IdAndRole(tenantId, Role.SUPER_ADMIN)) {
            throw new IllegalStateException("L'espace de la plateforme Adlift ne peut pas être modifié.");
        }
        return tenant;
    }

    /** Les comptes de la direction restent hors des espaces clients. */
    private void assertNotPlatformAccount(User user) {
        if (membershipRepository.existsByUser_IdAndRole(user.getId(), Role.SUPER_ADMIN)) {
            throw new IllegalArgumentException("Cet email est déjà utilisé.");
        }
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
