package com.adlift.auth.repository;

import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    Optional<Tenant> findByEmail(String email);

    Optional<Tenant> findByName(String name);

    boolean existsByEmail(String email);

    boolean existsByName(String name);

    boolean existsByEmailAndIdNot(String email, UUID id);

    boolean existsByNameAndIdNot(String name, UUID id);

    /** Espaces clients uniquement : exclut l'espace plateforme qui héberge la direction. */
    @Query("""
    SELECT t FROM Tenant t
    WHERE t.id NOT IN (SELECT m.tenant.id FROM Membership m WHERE m.role = :platformRole)
    """)
    Page<Tenant> findClientTenants(@Param("platformRole") Role platformRole, Pageable pageable);
}
