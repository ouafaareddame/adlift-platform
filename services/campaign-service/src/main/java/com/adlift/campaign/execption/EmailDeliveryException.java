package com.adlift.campaign.execption;

/** Le fournisseur d'emails (Brevo) a refusé ou n'a pas pu traiter la demande. */
public class EmailDeliveryException extends RuntimeException {

    public EmailDeliveryException(String message) {
        super(message);
    }
}
