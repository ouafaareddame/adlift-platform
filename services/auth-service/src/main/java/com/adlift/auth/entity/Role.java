package com.adlift.auth.entity;

/**
 * Rôle applicatif d'un utilisateur.
 * - SUPER_ADMIN : gère l'ensemble des tenants (plateforme Adlift).
 * - AGENCY_ADMIN : gère un tenant (membres, campagnes) — hérite des droits CLIENT.
 * - CLIENT : consulte les métriques/dashboards de son tenant.
 */
public enum Role {
    SUPER_ADMIN,
    AGENCY_ADMIN,
    CLIENT
}