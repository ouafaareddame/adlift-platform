-- Quelques notifications récentes pour que la cloche ne soit pas vide en démo.
-- Variables : atlas, atlas_admin, zitoun, zitoun_admin, casa, casa_admin.
\set ON_ERROR_STOP on

INSERT INTO notifications (id, tenant_id, user_id, type, message, is_read, created_at) VALUES
(gen_random_uuid(), :'atlas', :'atlas_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Escapades d''automne — Meta" est passée de SCHEDULED à ACTIVE.', true, now() - interval '26 days'),
(gen_random_uuid(), :'atlas', :'atlas_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Été au Maroc — Google Ads" est passée de ACTIVE à COMPLETED.', true, now() - interval '30 days'),
(gen_random_uuid(), :'atlas', :'atlas_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Omra & Hajj — Google Ads" est passée de SCHEDULED à ACTIVE.', false, now() - interval '17 days'),
(gen_random_uuid(), :'atlas', :'atlas_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Newsletter clients fidèles" est passée de DRAFT à SCHEDULED.', false, now() - interval '2 hours'),
(gen_random_uuid(), :'zitoun', :'zitoun_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Lancement huile d''argan bio" est passée de SCHEDULED à ACTIVE.', true, now() - interval '38 days'),
(gen_random_uuid(), :'zitoun', :'zitoun_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Influence rentrée — Instagram" est passée de ACTIVE à COMPLETED.', false, now() - interval '28 days'),
(gen_random_uuid(), :'casa', :'casa_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Portes ouvertes Bouskoura" est passée de SCHEDULED à ACTIVE.', false, now() - interval '12 days'),
(gen_random_uuid(), :'casa', :'casa_admin', 'CAMPAIGN_STATUS_CHANGED',
 'La campagne "Résidences Anfa — génération de leads" est passée de SCHEDULED à ACTIVE.', true, now() - interval '22 days');
