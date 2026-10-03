package com.adlift.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Compte d'une personne. Email unique globalement (le login se fait par email seul) ;
 * ses espaces et ses rôles sont dans Membership.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // Le default SQL permet à ddl-auto d'ajouter la colonne sur une table déjà remplie.
    @Column(name = "must_change_password", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean mustChangePassword = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Espace sélectionné pour la requête en cours (lu dans le JWT), jamais persisté.
    @Transient
    @Setter(AccessLevel.NONE)
    private Tenant currentTenant;

    @Transient
    @Setter(AccessLevel.NONE)
    private Role currentRole;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void useWorkspace(Membership membership) {
        this.currentTenant = membership.getTenant();
        this.currentRole = membership.getRole();
    }

    public UUID getTenantId() {
        return currentTenant != null ? currentTenant.getId() : null;
    }

    // ── Implémentation UserDetails (Spring Security) ──

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return currentRole == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + currentRole.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return isActive; }
}