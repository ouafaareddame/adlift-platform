package com.adlift.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Accès d'un compte à un espace, avec le rôle qu'il y tient.
 * Un chef de projet Adlift peut ainsi suivre plusieurs clients avec un seul compte ;
 * le JWT ne porte jamais qu'un espace à la fois (celui sélectionné).
 */
@Entity
@Table(name = "memberships", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "tenant_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    /** Utilisable pour se connecter : accès actif dans un espace actif. */
    public boolean isUsable() {
        return isActive && tenant != null && tenant.getStatus() == TenantStatus.ACTIVE;
    }
}
