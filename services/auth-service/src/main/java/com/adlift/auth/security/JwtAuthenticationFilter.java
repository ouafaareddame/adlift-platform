package com.adlift.auth.security;

import com.adlift.auth.entity.Membership;
import com.adlift.auth.entity.User;
import com.adlift.auth.repository.MembershipRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final MembershipRepository membershipRepository;

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
                User user = (User) userDetailsService.loadUserByUsername(email);

                // Le rôle et l'espace viennent de l'accès en base, pas du token :
                // un accès retiré ou un espace désactivé coupe la session immédiatement.
                Optional<Membership> membership = Optional.ofNullable(jwtService.extractTenantId(token))
                        .flatMap(tenantId -> membershipRepository.findByUser_IdAndTenant_Id(
                                user.getId(), UUID.fromString(tenantId)));

                if (!user.isEnabled() || membership.isEmpty() || !membership.get().isUsable()) {
                    log.warn("[JWT Filter] Compte, accès ou espace inactif : {}", email);
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }

                if (jwtService.isTokenValid(token, user)) {
                    user.useWorkspace(membership.get());
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
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
