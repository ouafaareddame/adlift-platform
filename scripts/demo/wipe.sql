-- Exécuté sur chaque base avec la variable "db" (auth, campaign, notification).
-- Garde uniquement la direction Adlift (SUPER_ADMIN) et son tenant plateforme.
\if :{?db}
\else
  \echo 'Variable db manquante'
  \quit
\endif

SELECT :'db' = 'auth' AS is_auth, :'db' = 'campaign' AS is_campaign, :'db' = 'notification' AS is_notification \gset

\if :is_auth
  DELETE FROM memberships WHERE role <> 'SUPER_ADMIN';
  DELETE FROM users WHERE id NOT IN (SELECT user_id FROM memberships);
  DELETE FROM tenants WHERE id NOT IN (SELECT tenant_id FROM memberships);
\endif

\if :is_campaign
  TRUNCATE campaign_emails, campaign_metrics, campaigns;
\endif

\if :is_notification
  TRUNCATE notifications;
\endif
