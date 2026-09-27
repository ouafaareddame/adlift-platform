package com.adlift.campaign.service;

import com.adlift.campaign.execption.EmailDeliveryException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Appels HTTP à l'API transactionnelle de Brevo.
 * Chaque email porte un tag propre à la campagne : Brevo agrège ensuite
 * les statistiques (délivrés, ouvertures, clics) par tag.
 */
@Component
@Slf4j
public class BrevoClient {

    public record Stats(long requests, long delivered, long uniqueOpens, long uniqueClicks) {
    }

    private final RestClient restClient;
    private final String apiKey;
    private final String senderEmail;
    private final String senderName;

    public BrevoClient(@Value("${email.brevo.base-url}") String baseUrl,
                       @Value("${email.brevo.api-key:}") String apiKey,
                       @Value("${email.sender.email:}") String senderEmail,
                       @Value("${email.sender.name:Adlift}") String senderName) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.senderEmail = senderEmail;
        this.senderName = senderName;
    }

    public boolean isConfigured() {
        return !apiKey.isBlank() && !senderEmail.isBlank();
    }

    public void send(String to, String subject, String html, String tag) {
        Map<String, Object> body = Map.of(
                "sender", Map.of("email", senderEmail, "name", senderName),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", html,
                "tags", List.of(tag)
        );
        try {
            restClient.post()
                    .uri("/smtp/email")
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            throw new EmailDeliveryException(describe(e));
        } catch (RestClientException e) {
            throw new EmailDeliveryException("Brevo injoignable : " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public Stats aggregatedStats(String tag, LocalDate from, LocalDate to) {
        try {
            Map<String, Object> report = restClient.get()
                    .uri(uri -> uri.path("/smtp/statistics/aggregatedReport")
                            .queryParam("startDate", from)
                            .queryParam("endDate", to)
                            .queryParam("tag", tag)
                            .build())
                    .header("api-key", apiKey)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(Map.class);
            if (report == null) return new Stats(0, 0, 0, 0);
            return new Stats(number(report, "requests"), number(report, "delivered"),
                    number(report, "uniqueOpens"), number(report, "uniqueClicks"));
        } catch (RestClientResponseException e) {
            throw new EmailDeliveryException(describe(e));
        } catch (RestClientException e) {
            throw new EmailDeliveryException("Brevo injoignable : " + e.getMessage());
        }
    }

    private static long number(Map<String, Object> map, String key) {
        return map.get(key) instanceof Number n ? n.longValue() : 0L;
    }

    private static String describe(RestClientResponseException e) {
        int status = e.getStatusCode().value();
        String body = e.getResponseBodyAsString();
        log.warn("Brevo a répondu {} : {}", status, body);
        if (status == 401) {
            if (body.contains("IP")) {
                return "Brevo refuse l'adresse IP du serveur : autorisez-la dans Brevo (Security → Authorised IPs).";
            }
            return "Clé API Brevo invalide.";
        }
        return "Brevo a refusé la demande (" + status + ") : " + body;
    }
}
