package com.adlift.campaign.service;

import com.adlift.campaign.dto.EmailDTOs.EmailResponse;
import com.adlift.campaign.dto.EmailDTOs.SaveEmailRequest;
import com.adlift.campaign.entity.Campaign;
import com.adlift.campaign.entity.CampaignEmail;
import com.adlift.campaign.entity.CampaignMetrics;
import com.adlift.campaign.entity.CampaignStatus;
import com.adlift.campaign.entity.CampaignType;
import com.adlift.campaign.execption.EmailDeliveryException;
import com.adlift.campaign.repository.CampaignEmailRepository;
import com.adlift.campaign.repository.CampaignMetricsRepository;
import com.adlift.campaign.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Envoi réel des campagnes EMAIL via Brevo, puis report des statistiques Brevo
 * (ouvertures, clics) dans CampaignMetrics pour que dashboard, alertes et
 * rapports les prennent en compte sans traitement particulier.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailCampaignService {

    /** recordedBy de la ligne de métriques alimentée par Brevo (une seule ligne par campagne). */
    public static final UUID EMAIL_SYNC_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private static final Pattern URL = Pattern.compile("https?://[^\\s<]+");

    private final CampaignRepository campaignRepository;
    private final CampaignEmailRepository emailRepository;
    private final CampaignMetricsRepository metricsRepository;
    private final BrevoClient brevo;

    @Value("${email.cost-per-email:0.01}")
    private BigDecimal costPerEmail;

    public EmailResponse get(UUID campaignId, UUID tenantId) {
        getEmailCampaign(campaignId, tenantId);
        return emailRepository.findByCampaignId(campaignId)
                .map(this::toResponse)
                .orElseGet(() -> EmailResponse.builder()
                        .recipients(List.of())
                        .providerReady(brevo.isConfigured())
                        .build());
    }

    @Transactional
    public EmailResponse save(UUID campaignId, SaveEmailRequest request, UUID tenantId) {
        Campaign campaign = getEmailCampaign(campaignId, tenantId);
        if (campaign.getStatus() == CampaignStatus.COMPLETED || campaign.getStatus() == CampaignStatus.ARCHIVED) {
            throw new IllegalStateException("Cette campagne est terminée : son email ne peut plus être modifié.");
        }

        CampaignEmail email = emailRepository.findByCampaignId(campaignId)
                .orElseGet(() -> CampaignEmail.builder().campaign(campaign).tenantId(tenantId).build());
        if (email.getSentAt() != null) {
            throw new IllegalStateException("Cet email a déjà été envoyé : il ne peut plus être modifié.");
        }

        LinkedHashSet<String> recipients = new LinkedHashSet<>();
        request.getRecipients().forEach(r -> recipients.add(r.trim().toLowerCase()));

        email.setSubject(request.getSubject().trim());
        email.setContent(request.getContent());
        email.setRecipients(String.join("\n", recipients));
        return toResponse(emailRepository.save(email));
    }

    /** Pas de @Transactional : les appels HTTP à Brevo ne doivent pas tenir une transaction ouverte. */
    public EmailResponse send(UUID campaignId, UUID tenantId) {
        Campaign campaign = getEmailCampaign(campaignId, tenantId);
        if (campaign.getStatus() != CampaignStatus.ACTIVE) {
            throw new IllegalStateException("L'email ne peut être envoyé que lorsque la campagne est ACTIVE.");
        }
        CampaignEmail email = emailRepository.findByCampaignId(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Rédigez l'email avant de l'envoyer."));
        if (email.getSentAt() != null) {
            throw new IllegalStateException("Cet email a déjà été envoyé.");
        }
        if (!brevo.isConfigured()) {
            throw new IllegalStateException(
                    "L'envoi d'email n'est pas configuré : renseignez BREVO_API_KEY et BREVO_SENDER_EMAIL.");
        }

        String html = render(campaign, email.getContent());
        int sent = 0;
        int failed = 0;
        String lastError = null;
        for (String recipient : recipientList(email)) {
            try {
                brevo.send(recipient, email.getSubject(), html, tag(campaignId));
                sent++;
            } catch (EmailDeliveryException e) {
                failed++;
                lastError = e.getMessage();
                log.warn("[Email] Campagne {} : échec pour {} : {}", campaign.getName(), recipient, e.getMessage());
            }
        }
        if (sent == 0) {
            throw new EmailDeliveryException(lastError);
        }

        email.setSentAt(LocalDateTime.now());
        email.setSentCount(sent);
        email.setFailedCount(failed);
        CampaignEmail saved = emailRepository.save(email);

        // sentAt est enregistré avant : le simulateur ignore désormais la campagne et ne recrée pas de ligne.
        // Les chiffres simulés sont retirés pour que la campagne ne montre que des chiffres réels.
        int removed = metricsRepository.deleteByCampaignIdAndRecordedBy(campaignId, AdSimulatorService.SYSTEM_USER_ID);
        writeMetrics(campaign, saved);

        log.info("[Email] Campagne {} : {} envoyé(s), {} échec(s), {} ligne(s) simulée(s) retirée(s)",
                campaign.getName(), sent, failed, removed);
        return toResponse(saved);
    }

    public EmailResponse sync(UUID campaignId, UUID tenantId) {
        Campaign campaign = getEmailCampaign(campaignId, tenantId);
        CampaignEmail email = emailRepository.findByCampaignId(campaignId)
                .filter(e -> e.getSentAt() != null)
                .orElseThrow(() -> new IllegalStateException("Cet email n'a pas encore été envoyé."));
        if (!brevo.isConfigured()) {
            throw new IllegalStateException(
                    "L'envoi d'email n'est pas configuré : renseignez BREVO_API_KEY et BREVO_SENDER_EMAIL.");
        }
        return toResponse(syncOne(campaign, email));
    }

    @Scheduled(initialDelayString = "${email.sync-interval-ms:300000}",
            fixedDelayString = "${email.sync-interval-ms:300000}")
    public void syncAll() {
        if (!brevo.isConfigured()) return;
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        for (CampaignEmail email : emailRepository.findBySentAtIsNotNull()) {
            if (email.getSentAt().isBefore(cutoff)) continue;
            try {
                campaignRepository.findById(email.getCampaign().getId())
                        .ifPresent(campaign -> syncOne(campaign, email));
            } catch (Exception e) {
                log.warn("[Email] Synchronisation Brevo échouée pour la campagne {} : {}",
                        email.getCampaign().getId(), e.getMessage());
            }
        }
    }

    private CampaignEmail syncOne(Campaign campaign, CampaignEmail email) {
        // Un jour de marge : Brevo date les événements dans le fuseau du compte.
        BrevoClient.Stats stats = brevo.aggregatedStats(
                tag(campaign.getId()), email.getSentAt().toLocalDate().minusDays(1), LocalDate.now());

        email.setDelivered(stats.delivered());
        email.setOpens(stats.uniqueOpens());
        email.setClicks(stats.uniqueClicks());
        email.setLastSyncedAt(LocalDateTime.now());
        CampaignEmail saved = emailRepository.save(email);
        writeMetrics(campaign, saved);
        return saved;
    }

    /** Ouvertures → impressions, clics → clics, coût = emails envoyés × coût unitaire (plafonné au budget). */
    private void writeMetrics(Campaign campaign, CampaignEmail email) {
        CampaignMetrics row = metricsRepository
                .findFirstByCampaignIdAndRecordedBy(campaign.getId(), EMAIL_SYNC_USER_ID)
                .orElseGet(() -> CampaignMetrics.builder()
                        .campaign(campaign)
                        .tenantId(campaign.getTenantId())
                        .recordedBy(EMAIL_SYNC_USER_ID)
                        .build());

        BigDecimal cost = costPerEmail.multiply(BigDecimal.valueOf(email.getSentCount()));
        if (campaign.getBudget() != null && cost.compareTo(campaign.getBudget()) > 0) {
            cost = campaign.getBudget();
        }

        // Les clients mail qui bloquent les images comptent des clics sans ouverture.
        row.setImpressions(Math.max(email.getOpens(), email.getClicks()));
        row.setClicks(email.getClicks());
        row.setConversions(0L);
        row.setBudgetSpent(cost);
        metricsRepository.save(row);
    }

    private Campaign getEmailCampaign(UUID campaignId, UUID tenantId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new NoSuchElementException("Campagne non trouvée."));
        if (!campaign.getTenantId().equals(tenantId)) {
            throw new SecurityException("Accès refusé : cette campagne n'appartient pas à votre tenant.");
        }
        if (campaign.getType() != CampaignType.EMAIL) {
            throw new IllegalArgumentException("Seules les campagnes de type EMAIL peuvent envoyer des emails.");
        }
        return campaign;
    }

    private static String tag(UUID campaignId) {
        return "adlift-" + campaignId;
    }

    private static List<String> recipientList(CampaignEmail email) {
        return Arrays.stream(email.getRecipients().split("\n")).filter(s -> !s.isBlank()).toList();
    }

    /** Texte saisi → HTML échappé ; les URL deviennent des liens pour que Brevo suive les clics. */
    private static String render(Campaign campaign, String content) {
        Matcher matcher = URL.matcher(HtmlUtils.htmlEscape(content));
        StringBuilder body = new StringBuilder();
        while (matcher.find()) {
            String url = matcher.group();
            matcher.appendReplacement(body, Matcher.quoteReplacement(
                    "<a href=\"" + url + "\" style=\"color:#1d5b8f\">" + url + "</a>"));
        }
        matcher.appendTail(body);

        return """
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
                  <div style="font-size:15px;line-height:1.6">%s</div>
                  <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px">
                  <p style="font-size:12px;color:#64748b;margin:0">
                    Vous recevez cet email dans le cadre de la campagne « %s ».
                    Pour ne plus recevoir nos emails, répondez simplement STOP.
                  </p>
                </div>
                """.formatted(body.toString().replace("\n", "<br>"), HtmlUtils.htmlEscape(campaign.getName()));
    }

    private EmailResponse toResponse(CampaignEmail email) {
        return EmailResponse.builder()
                .subject(email.getSubject())
                .content(email.getContent())
                .recipients(recipientList(email))
                .sentAt(email.getSentAt())
                .sentCount(email.getSentCount())
                .failedCount(email.getFailedCount())
                .delivered(email.getDelivered())
                .opens(email.getOpens())
                .clicks(email.getClicks())
                .lastSyncedAt(email.getLastSyncedAt())
                .providerReady(brevo.isConfigured())
                .build();
    }
}
