package com.adlift.gateway.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtService jwtService;

    private static final List<String> PUBLIC_ROUTES = List.of(
            "/api/auth/register",
            "/api/auth/login"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        log.info("Filtre JWT appelé pour : {}", path);

        if (PUBLIC_ROUTES.stream().anyMatch(path::startsWith)) {
            log.info("Route publique, pas de vérification JWT");
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        log.info("Header Authorization reçu : {}", authHeader != null ? "présent" : "absent");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Header Authorization manquant ou mal formé");
            return unauthorized(exchange);
        }

        String token = authHeader.substring(7);
        boolean valid = jwtService.isTokenValid(token);
        log.info("Token valide : {}", valid);

        if (!valid) {
            log.warn("Token invalide, requête bloquée");
            return unauthorized(exchange);
        }

        log.info("Token valide, requête transmise à : {}", path);
        return chain.filter(exchange);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return response.setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}