-- Campagnes et historique de métriques de la démo.
-- Les dates sont relatives à CURRENT_DATE : le jeu reste cohérent quel que soit le jour de la démo.
-- Variables : atlas, atlas_admin, zitoun, zitoun_admin, casa, casa_admin, riad, riad_admin.
\set ON_ERROR_STOP on

CREATE FUNCTION pg_temp.seed_campaign(
    p_tenant uuid, p_creator uuid, p_name text, p_desc text, p_type text, p_status text,
    p_start date, p_end date, p_budget numeric, p_spend numeric,
    p_cpc numeric, p_ctr numeric, p_cr numeric
) RETURNS uuid AS $$
DECLARE
    v_id   uuid := gen_random_uuid();
    v_last date := LEAST(p_end, CURRENT_DATE - 1);
BEGIN
    INSERT INTO campaigns (id, tenant_id, name, description, type, status,
                           start_date, end_date, budget, created_by, created_at)
    VALUES (v_id, p_tenant, p_name, p_desc, p_type, p_status,
            p_start, p_end, p_budget, p_creator,
            LEAST(p_start - 10, CURRENT_DATE - 1)::timestamp + time '10:30');

    IF p_spend <= 0 OR v_last < p_start THEN
        RETURN v_id;
    END IF;

    -- Une saisie par jour ; la dépense totale est répartie avec un poids aléatoire par jour.
    -- clics = dépense / CPC, impressions = clics / CTR, conversions = clics × taux de conversion.
    INSERT INTO campaign_metrics (id, campaign_id, tenant_id, impressions, clicks, conversions,
                                  budget_spent, recorded_at, recorded_by)
    SELECT gen_random_uuid(), v_id, p_tenant,
           GREATEST(clk, round(clk / (p_ctr * (0.85 + random() * 0.3))))::bigint,
           clk,
           LEAST(clk, round(clk * p_cr * (0.7 + random() * 0.6)))::bigint,
           spend,
           d + time '18:00' + random() * interval '3 hours',
           p_creator
    FROM (
        SELECT d, spend, GREATEST(1, round(spend / (p_cpc * (0.85 + random() * 0.3))))::bigint AS clk
        FROM (
            SELECT d, round(p_spend * w / sum(w) OVER (), 2) AS spend
            FROM (
                SELECT day::date AS d, (0.6 + random())::numeric AS w
                FROM generate_series(p_start, v_last, interval '1 day') AS day
            ) weights
        ) spread
    ) daily;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

\o /dev/null

-- ── Atlas Voyages : agence de voyages, 3 canaux ──
SELECT pg_temp.seed_campaign(:'atlas', :'atlas_admin', 'Été au Maroc — Google Ads',
    'Campagne search sur les séjours d''été Agadir, Essaouira et Saïdia.',
    'ADS', 'COMPLETED', CURRENT_DATE - 100, CURRENT_DATE - 30, 25000, 24310, 1.10, 0.034, 0.055);
SELECT pg_temp.seed_campaign(:'atlas', :'atlas_admin', 'Escapades d''automne — Meta',
    'Carrousels Facebook et Instagram : week-ends Marrakech et Chefchaouen.',
    'SOCIAL', 'ACTIVE', CURRENT_DATE - 26, CURRENT_DATE + 34, 18000, 14820, 0.62, 0.017, 0.028);
SELECT pg_temp.seed_campaign(:'atlas', :'atlas_admin', 'Omra & Hajj — Google Ads',
    'Génération de demandes de devis pour les forfaits Omra.',
    'ADS', 'ACTIVE', CURRENT_DATE - 17, CURRENT_DATE + 48, 30000, 8940, 1.35, 0.029, 0.061);
SELECT pg_temp.seed_campaign(:'atlas', :'atlas_admin', 'Newsletter clients fidèles',
    'Email aux anciens clients : offres d''automne en avant-première.',
    'EMAIL', 'SCHEDULED', CURRENT_DATE, CURRENT_DATE + 30, 500, 0, 0, 0, 0)
    AS atlas_newsletter \gset
SELECT pg_temp.seed_campaign(:'atlas', :'atlas_admin', 'Black Friday voyages',
    'Préparation : ventes flash sur les vols et hôtels partenaires.',
    'ADS', 'DRAFT', CURRENT_DATE + 55, CURRENT_DATE + 62, 12000, 0, 0, 0, 0);

-- ── Dar Zitoun : cosmétiques naturels, une campagne en dépassement ──
SELECT pg_temp.seed_campaign(:'zitoun', :'zitoun_admin', 'Lancement huile d''argan bio',
    'Lancement produit sur Instagram et TikTok avec micro-influenceuses.',
    'SOCIAL', 'ACTIVE', CURRENT_DATE - 38, CURRENT_DATE + 22, 15000, 15640, 0.48, 0.021, 0.034);
SELECT pg_temp.seed_campaign(:'zitoun', :'zitoun_admin', 'Influence rentrée — Instagram',
    'Partenariats influenceuses beauté, codes promo dédiés.',
    'SOCIAL', 'COMPLETED', CURRENT_DATE - 88, CURRENT_DATE - 28, 10000, 9180, 0.55, 0.019, 0.031);
SELECT pg_temp.seed_campaign(:'zitoun', :'zitoun_admin', 'Programme fidélité — Email',
    'Relance des clientes inscrites au programme fidélité.',
    'EMAIL', 'COMPLETED', CURRENT_DATE - 75, CURRENT_DATE - 45, 800, 118, 0.19, 0.14, 0.12);
SELECT pg_temp.seed_campaign(:'zitoun', :'zitoun_admin', 'Coffrets Ramadan',
    'Campagne shopping sur les coffrets cadeaux.',
    'ADS', 'SCHEDULED', CURRENT_DATE + 20, CURRENT_DATE + 50, 20000, 0, 0, 0, 0);

-- ── Casa Immo Conseil : promotion immobilière ──
SELECT pg_temp.seed_campaign(:'casa', :'casa_admin', 'Résidences Anfa — génération de leads',
    'Formulaires de contact pour le programme Anfa, ciblage Casablanca-Rabat.',
    'ADS', 'ACTIVE', CURRENT_DATE - 22, CURRENT_DATE + 70, 40000, 11260, 1.45, 0.024, 0.048);
SELECT pg_temp.seed_campaign(:'casa', :'casa_admin', 'Portes ouvertes Bouskoura',
    'Événement du week-end : visites des villas témoins.',
    'SOCIAL', 'ACTIVE', CURRENT_DATE - 12, CURRENT_DATE + 18, 8000, 6690, 0.70, 0.016, 0.037);
SELECT pg_temp.seed_campaign(:'casa', :'casa_admin', 'Salon SMAP Immo',
    'Présence au salon SMAP : prise de rendez-vous.',
    'ADS', 'ARCHIVED', CURRENT_DATE - 140, CURRENT_DATE - 110, 12000, 11750, 1.20, 0.027, 0.052);

-- ── Riad Menara : client désactivé (contrat terminé) ──
SELECT pg_temp.seed_campaign(:'riad', :'riad_admin', 'Saison hiver — Booking & Meta',
    'Réservations directes pour la saison d''hiver.',
    'SOCIAL', 'COMPLETED', CURRENT_DATE - 160, CURRENT_DATE - 100, 9000, 8420, 0.58, 0.018, 0.041);

-- Email prêt à envoyer en direct pendant la démo.
INSERT INTO campaign_emails (id, campaign_id, tenant_id, subject, content, recipients,
                             sent_count, failed_count, delivered, opens, clicks, updated_at)
VALUES (gen_random_uuid(), :'atlas_newsletter', :'atlas',
        'Atlas Voyages — vos escapades d''automne',
        E'Bonjour,\n\nPour vous remercier de votre fidélité, profitez de -15 % sur nos week-ends à Marrakech et Chefchaouen jusqu''à la fin du mois.\n\nDécouvrez les destinations : https://www.visitmorocco.com\n\nÀ très bientôt,\nL''équipe Atlas Voyages',
        :'demo_recipient', 0, 0, 0, 0, 0, now());

\o

SELECT c.name, c.status, c.budget, COALESCE(sum(m.budget_spent), 0) AS spent,
       round(100 * COALESCE(sum(m.budget_spent), 0) / NULLIF(c.budget, 0), 1) AS pct
FROM campaigns c LEFT JOIN campaign_metrics m ON m.campaign_id = c.id
GROUP BY c.id ORDER BY c.tenant_id, c.start_date;
