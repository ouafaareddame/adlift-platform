package com.adlift.auth.security;

import com.adlift.auth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    /**
     * Génère un access token JWT signé pour l'utilisateur donné.
     * userId, tenantId et role sont embarqués dans le token : c'est ce qui
     * permet à Campaign Service et Notification Service de savoir qui fait
     * la requête et pour quel tenant, sans jamais rappeler Auth Service.
     */
    public String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("tenantId", user.getTenantId().toString());
        claims.put("role", user.getCurrentRole().name());
        if (user.isMustChangePassword()) {
            // Lu par l'API Gateway : tant qu'il est présent, seul le changement de mot de passe est autorisé.
            claims.put("mustChangePassword", true);
        }

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extractUserId(String token) {
        return (String) getClaims(token).get("userId");
    }

    public String extractTenantId(String token) {
        return (String) getClaims(token).get("tenantId");
    }

    public String extractRole(String token) {
        return (String) getClaims(token).get("role");
    }

    public boolean isTokenValid(String token, User user) {
        try {
            String email = extractEmail(token);
            return email.equals(user.getEmail());
        } catch (ExpiredJwtException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
}