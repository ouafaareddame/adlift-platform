package com.adlift.auth.service;

import com.adlift.auth.dto.MemberDTOs.*;
import com.adlift.auth.dto.TenantDTOs.PasswordResetResponse;
import com.adlift.auth.entity.Membership;
import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.User;
import com.adlift.auth.exception.BadRequestException;
import com.adlift.auth.repository.MembershipRepository;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Gestion des accès d'un espace par son chef de projet (AGENCY_ADMIN).
 * Les identifiants exposés sont ceux des comptes ; désactiver un membre
 * retire son accès à cet espace uniquement, pas aux autres.
 */
@Service
@RequiredArgsConstructor
public class MemberService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityPublisher activity;

    @Transactional
    public MemberResponse invite(InviteMemberRequest request, UUID tenantId) {
        String email = request.getEmail().trim();
        if (userRepository.existsByEmail(email)) {
            // Donner accès à un compte existant (autre client, autre espace) relève de la direction.
            throw new IllegalArgumentException(
                    "Cet email a déjà un compte : demandez à la direction Adlift de lui ouvrir cet espace.");
        }

        assertAssignableRole(request.getRole());

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant non trouvé."));

        User user = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .mustChangePassword(true)
                .build());
        Membership membership = membershipRepository.save(Membership.builder()
                .user(user)
                .tenant(tenant)
                .role(request.getRole())
                .build());

        activity.notifyTenantAdmins(tenantId, "MEMBER_INVITED", String.format(
                "%s a été ajouté à l'espace avec le rôle %s.", user.getEmail(), membership.getRole()));
        return toResponse(membership);
    }

    @Transactional
    public MemberResponse updateRole(UUID memberId, UpdateRoleRequest request, UUID tenantId) {
        assertAssignableRole(request.getRole());
        Membership member = getMembership(memberId, tenantId);
        if (request.getRole() != Role.AGENCY_ADMIN) {
            assertNotLastActiveAdmin(member, tenantId);
        }
        if (member.getRole() != request.getRole()) {
            activity.notifyTenantAdmins(tenantId, "MEMBER_ROLE_CHANGED", String.format(
                    "Le rôle de %s est passé à %s.", member.getUser().getEmail(), request.getRole()));
        }
        member.setRole(request.getRole());
        return toResponse(membershipRepository.save(member));
    }

    @Transactional
    public void deactivate(UUID memberId, UUID tenantId) {
        Membership member = getMembership(memberId, tenantId);
        assertNotLastActiveAdmin(member, tenantId);
        if (member.isActive()) {
            activity.notifyTenantAdmins(tenantId, "MEMBER_DEACTIVATED", String.format(
                    "Le compte %s a été désactivé.", member.getUser().getEmail()));
        }
        member.setActive(false);
        membershipRepository.save(member);
    }

    @Transactional
    public void activate(UUID memberId, UUID tenantId) {
        Membership member = getMembership(memberId, tenantId);
        if (!member.isActive()) {
            activity.notifyTenantAdmins(tenantId, "MEMBER_ACTIVATED", String.format(
                    "Le compte %s a été réactivé.", member.getUser().getEmail()));
        }
        member.setActive(true);
        membershipRepository.save(member);
    }

    /**
     * Le mot de passe vaut pour tous les espaces du compte : un chef de projet
     * ne peut réinitialiser que les comptes qui n'existent que dans son espace.
     */
    @Transactional
    public PasswordResetResponse resetPassword(UUID memberId, UUID tenantId) {
        Membership member = getMembership(memberId, tenantId);
        if (membershipRepository.existsByUser_IdAndTenant_IdNot(memberId, tenantId)) {
            throw new SecurityException(
                    "Ce compte a accès à d'autres espaces : seule la direction Adlift peut réinitialiser son mot de passe.");
        }
        User user = member.getUser();
        String password = TemporaryPasswords.generate();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        userRepository.save(user);
        return PasswordResetResponse.builder().email(user.getEmail()).temporaryPassword(password).build();
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> list(UUID tenantId) {
        return membershipRepository.findByTenant_IdOrderByCreatedAtAsc(tenantId).stream()
                .map(MemberService::toResponse)
                .toList();
    }

    private void assertAssignableRole(Role role) {
        if (role == Role.SUPER_ADMIN) {
            throw new BadRequestException(
                    "Impossible d'attribuer le rôle SUPER_ADMIN depuis un tenant.");
        }
    }

    private void assertNotLastActiveAdmin(Membership member, UUID tenantId) {
        boolean isActiveAdmin = member.getRole() == Role.AGENCY_ADMIN && member.isActive();
        if (isActiveAdmin && membershipRepository.countByTenant_IdAndRoleAndIsActiveTrue(tenantId, Role.AGENCY_ADMIN) <= 1) {
            throw new IllegalStateException(
                    "Impossible : c'est le dernier administrateur actif de cet espace.");
        }
    }

    private Membership getMembership(UUID memberId, UUID tenantId) {
        return membershipRepository.findByUser_IdAndTenant_Id(memberId, tenantId)
                .orElseThrow(() -> new NoSuchElementException("Membre non trouvé."));
    }

    static MemberResponse toResponse(Membership membership) {
        return MemberResponse.builder()
                .id(membership.getUser().getId())
                .email(membership.getUser().getEmail())
                .role(membership.getRole())
                .isActive(membership.isActive())
                .createdAt(membership.getCreatedAt())
                .build();
    }
}
