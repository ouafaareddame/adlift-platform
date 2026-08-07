package com.adlift.auth.repository;

import com.adlift.auth.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    Optional<Tenant> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByName(String name);
}