package com.adlift.auth.security;

import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.entity.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        log.debug("[JWT Filter] Requête : {} | Header présent : {}", request.getRequestURI(), authHeader != null);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            String email = jwtService.extractEmail(token);
            log.debug("[JWT Filter] Email extrait du token : {}", email);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                log.debug("[JWT Filter] UserDetails chargé : {}", userDetails.getUsername());

                User user = (User) userDetails;
                boolean tenantActive = user.getTenant() != null
                        && user.getTenant().getStatus() == TenantStatus.ACTIVE;

                if (!user.isEnabled() || !tenantActive) {
                    log.warn("[JWT Filter] Compte ou tenant inactif : {}", email);
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }

                if (jwtService.isTokenValid(token, user)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("[JWT Filter] Authentification réussie pour : {}", email);
                } else {
                    log.warn("[JWT Filter] Token invalide pour : {}", email);
                }
            }
        } catch (Exception e) {
            log.error("[JWT Filter] Exception pendant l'authentification : ", e);
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}