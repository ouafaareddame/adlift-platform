package com.adlift.auth.repository;

import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u JOIN FETCH u.tenant WHERE u.email = :email")
    Optional<User> findByEmail(@Param("email") String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    boolean existsByTenant_IdAndRole(UUID tenantId, Role role);

    long countByTenant_IdAndRoleAndIsActiveTrue(UUID tenantId, Role role);

    List<User> findByRoleAndIsActiveTrue(Role role);

    List<User> findByTenant_IdAndRoleAndIsActiveTrue(UUID tenantId, Role role);

    Optional<User> findFirstByTenant_IdAndRoleOrderByCreatedAtAsc(UUID tenantId, Role role);

    @Query("SELECT u FROM User u WHERE u.tenant.id = :tenantId")
    List<User> findByTenantId(@Param("tenantId") UUID tenantId);

    boolean existsByTenant_Id(UUID tenantId);
}
