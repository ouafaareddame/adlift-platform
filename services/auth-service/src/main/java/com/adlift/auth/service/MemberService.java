package com.adlift.auth.service;

import com.adlift.auth.dto.MemberDTOs.*;
import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.User;
import com.adlift.auth.exception.BadRequestException;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public MemberResponse invite(InviteMemberRequest request, UUID tenantId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé.");
        }

        assertAssignableRole(request.getRole());

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant non trouvé."));

        User user = userRepository.save(User.builder()
                .tenant(tenant)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .isActive(true)
                .mustChangePassword(true)
                .build());

        return toResponse(user);
    }

    @Transactional
    public MemberResponse updateRole(UUID memberId, UpdateRoleRequest request, UUID tenantId) {
        assertAssignableRole(request.getRole());
        User member = getOwnedMember(memberId, tenantId);
        if (request.getRole() != Role.AGENCY_ADMIN) {
            assertNotLastActiveAdmin(member, tenantId);
        }
        member.setRole(request.getRole());
        return toResponse(userRepository.save(member));
    }

    @Transactional
    public void deactivate(UUID memberId, UUID tenantId) {
        User member = getOwnedMember(memberId, tenantId);
        assertNotLastActiveAdmin(member, tenantId);
        member.setActive(false);
        userRepository.save(member);
    }

    @Transactional
    public void activate(UUID memberId, UUID tenantId) {
        User member = getOwnedMember(memberId, tenantId);
        member.setActive(true);
        userRepository.save(member);
    }

    public List<MemberResponse> list(UUID tenantId) {
        return userRepository.findByTenantId(tenantId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private void assertAssignableRole(Role role) {
        if (role == Role.SUPER_ADMIN) {
            throw new BadRequestException(
                    "Impossible d'attribuer le rôle SUPER_ADMIN depuis un tenant.");
        }
    }

    private void assertNotLastActiveAdmin(User member, UUID tenantId) {
        boolean isActiveAdmin = member.getRole() == Role.AGENCY_ADMIN && member.isActive();
        if (isActiveAdmin && userRepository.countByTenant_IdAndRoleAndIsActiveTrue(tenantId, Role.AGENCY_ADMIN) <= 1) {
            throw new IllegalStateException(
                    "Impossible : c'est le dernier administrateur actif de cet espace.");
        }
    }

    private User getOwnedMember(UUID memberId, UUID tenantId) {
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("Membre non trouvé."));

        if (!member.getTenantId().equals(tenantId)) {
            throw new SecurityException("Accès refusé : ce membre n'appartient pas à votre tenant.");
        }
        return member;
    }

    private MemberResponse toResponse(User user) {
        return MemberResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}