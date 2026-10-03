package com.adlift.auth.service;

import java.security.SecureRandom;

/** Mots de passe temporaires lisibles (sans 0/O, 1/l/I) à transmettre de vive voix ou par message. */
final class TemporaryPasswords {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private TemporaryPasswords() {}

    static String generate() {
        StringBuilder sb = new StringBuilder(11);
        for (int i = 0; i < 10; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.append('!').toString();
    }
}
