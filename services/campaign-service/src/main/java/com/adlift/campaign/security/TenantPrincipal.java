package com.adlift.campaign.security;

public record TenantPrincipal(String email, String userId, String tenantId, String role) {
}