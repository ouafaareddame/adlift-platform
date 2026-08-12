package com.adlift.auth.service;

import com.adlift.auth.dto.MemberDTOs.*;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.User;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant non trouvé."));

        User user = userRepository.save(User.builder()
                .tenant(tenant)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .isActive(true)
                .build());

        return toResponse(user);
    }

    @Transactional
    public MemberResponse updateRole(UUID memberId, UpdateRoleRequest request, UUID tenantId) {
        User member = getOwnedMember(memberId, tenantId);
        member.setRole(request.getRole());
        return toResponse(userRepository.save(member));
    }

    @Transactional
    public void deactivate(UUID memberId, UUID tenantId) {
        User member = getOwnedMember(memberId, tenantId);
        member.setActive(false);
        userRepository.save(member);
    }

    public List<MemberResponse> list(UUID tenantId) {
        return userRepository.findByTenantId(tenantId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private User getOwnedMember(UUID memberId, UUID tenantId) {
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Membre non trouvé."));

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