package com.adlift.campaign.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Contenu et suivi de l'envoi réel (Brevo) d'une campagne EMAIL.
 * Table séparée pour ne pas alourdir Campaign, qui sert aussi aux ADS et SOCIAL.
 */
@Entity
@Table(name = "campaign_emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false, unique = true)
    private Campaign campaign;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Adresses séparées par des retours à la ligne. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String recipients;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "sent_count", nullable = false)
    @Builder.Default
    private int sentCount = 0;

    @Column(name = "failed_count", nullable = false)
    @Builder.Default
    private int failedCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private long delivered = 0;

    @Column(nullable = false)
    @Builder.Default
    private long opens = 0;

    @Column(nullable = false)
    @Builder.Default
    private long clicks = 0;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
