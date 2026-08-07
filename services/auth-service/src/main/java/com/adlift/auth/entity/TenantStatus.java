package com.adlift.auth.entity;

/**
 * Statut d'un tenant (agence cliente d'Adlift).
 * Un tenant INACTIVE ne peut plus se connecter ni accéder à la plateforme,
 * mais ses données sont conservées (pas de suppression physique).
 */
public enum TenantStatus {
    ACTIVE,
    INACTIVE
}