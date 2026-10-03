package com.adlift.auth.repository;

import com.adlift.auth.entity.Membership;
import com.adlift.auth.entity.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    @EntityGraph(attributePaths = {"user", "tenant"})
    Optional<Membership> findByUser_IdAndTenant_Id(UUID userId, UUID tenantId);

    @EntityGraph(attributePaths = "tenant")
    List<Membership> findByUser_IdOrderByTenant_NameAsc(UUID userId);

    @EntityGraph(attributePaths = "user")
    List<Membership> findByTenant_IdOrderByCreatedAtAsc(UUID tenantId);

    @EntityGraph(attributePaths = "user")
    Optional<Membership> findFirstByTenant_IdAndRoleOrderByCreatedAtAsc(UUID tenantId, Role role);

    List<Membership> findByRoleAndIsActiveTrue(Role role);

    List<Membership> findByTenant_IdAndRoleAndIsActiveTrue(UUID tenantId, Role role);

    long countByTenant_IdAndRoleAndIsActiveTrue(UUID tenantId, Role role);

    boolean existsByRole(Role role);

    boolean existsByTenant_Id(UUID tenantId);

    boolean existsByTenant_IdAndRole(UUID tenantId, Role role);

    boolean existsByUser_IdAndRole(UUID userId, Role role);

    boolean existsByUser_IdAndTenant_IdNot(UUID userId, UUID tenantId);
}
