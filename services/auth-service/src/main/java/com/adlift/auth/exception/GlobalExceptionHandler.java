package com.adlift.auth.exception;

import lombok.Builder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

/**
 * Centralise la transformation des exceptions métier/sécurité en réponses HTTP propres.
 * Sans cette classe, toute exception non prévue remonte comme un 500 générique
 * (voire un 403 trompeur si /error n'est pas autorisé côté SecurityConfig).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Ex : email déjà utilisé au register -> conflit métier, pas une erreur serveur
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT) // 409
                .body(ErrorResponse.of(HttpStatus.CONFLICT, ex.getMessage()));
    }

    // Levée par AuthenticationManager quand l'email existe mais le mot de passe est faux
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED) // 401
                // Message volontairement générique : ne jamais révéler si c'est
                // l'email ou le mot de passe qui est incorrect.
                .body(ErrorResponse.of(HttpStatus.UNAUTHORIZED, "Email ou mot de passe incorrect."));
    }

    // Filet de sécurité : toute autre exception imprévue -> 500 générique,
    // sans jamais exposer la stack trace ou le message technique au client.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur inattendue est survenue."));
    }

    @Builder
    public record ErrorResponse(LocalDateTime timestamp, int status, String error, String message) {
        public static ErrorResponse of(HttpStatus status, String message) {
            return ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(status.value())
                    .error(status.getReasonPhrase())
                    .message(message)
                    .build();
        }
    }
}