package com.adlift.auth.exception;

/** Requête incorrecte (400), à distinguer des conflits IllegalArgumentException (409). */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
