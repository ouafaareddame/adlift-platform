package com.adlift.notification.security;

public record TenantPrincipal(String email, String userId, String tenantId, String role) {
}