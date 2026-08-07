package com.adlift.auth.security;

import com.adlift.auth.entity.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * S'exécute une fois par requête, avant les filtres d'autorisation.
 * Lit le header "Authorization: Bearer <token>", vérifie le JWT,
 * et peuple le SecurityContext si tout est valide.
 * Si le header est absent/invalide, on laisse simplement la requête continuer
 * sans authentification — c'est ensuite .anyRequest().authenticated() dans
 * SecurityConfig qui décide de bloquer (401/403) ou non selon la route.
 *
 * PAS de @Component ici volontairement : ce filtre est instancié manuellement
 * dans SecurityConfig.securityFilterChain() pour éviter une dépendance circulaire
 * avec le bean UserDetailsService, qui est lui-même défini dans SecurityConfig.
 */
@RequiredArgsConstructor
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

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            String email = jwtService.extractEmail(token);

            // Ne rien faire si déjà authentifié sur cette requête (évite le travail redondant)
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                if (jwtService.isTokenValid(token, (User) userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Token expiré, signature invalide, malformé... -> on n'authentifie pas.
            // La route protégée renverra 401/403 plus loin dans la chaîne, proprement.
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}