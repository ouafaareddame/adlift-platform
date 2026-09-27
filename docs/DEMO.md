# Démo Adlift — guide de soutenance

Durée visée : **12 minutes** de démo + questions.
Fil rouge : *une agence (Adlift) pilote les campagnes de plusieurs clients depuis un seul cockpit, chaque client isolé dans son espace.*

---

## 1. Comptes de démo

Créés par `scripts/demo/reset-demo.ps1`. Mot de passe des comptes clients : **`Demo@2026`**.

| Rôle | Compte | Mot de passe | Ce qu'on montre |
|---|---|---|---|
| Direction Adlift (SUPER_ADMIN) | `direction@adlift.ma` | `Adlift@2026` | Vue d'ensemble, espaces clients, rapports |
| Admin agence — Atlas Voyages | `karim@atlasvoyages.ma` | `Demo@2026` | Dashboard, campagnes, email réel, membres |
| Admin agence — Atlas Voyages | `salma@atlasvoyages.ma` | `Demo@2026` | (second admin, garde-fou « dernier admin ») |
| Client — Atlas Voyages | `direction@atlasvoyages.ma` | `Demo@2026` | Accès en lecture, rapports |
| Admin — Dar Zitoun Cosmétiques | `nadia@darzitoun.ma` | `Demo@2026` | Campagne en dépassement de budget |
| Admin — Casa Immo Conseil | `youssef@casaimmo.ma` | `Demo@2026` | Leads immobiliers |
| Admin — Riad Menara (désactivé) | `hicham@riadmenara.ma` | `Demo@2026` | Connexion refusée : espace désactivé |

**Ce que contient le jeu de données** (dates relatives au jour du reset) :

- 4 espaces clients, dont 1 désactivé (Riad Menara) ;
- 13 campagnes couvrant tous les statuts (Draft, Scheduled, Active, Completed, Archived) et les 3 canaux ;
- un historique quotidien de métriques (≈ 2,4 M impressions pour Atlas) ;
- des alertes budget : « Lancement huile d'argan bio » (Dar Zitoun) à **104 %**, « Escapades d'automne » (Atlas) à **82 %**, « Portes ouvertes Bouskoura » (Casa Immo) à **84 %** ;
- la campagne **« Newsletter clients fidèles »** (Atlas, Scheduled) avec un email déjà rédigé, prêt à être envoyé en direct.

---

## 2. Checklist

### La veille

- [ ] `docker compose up -d --build` puis ouvrir http://localhost:5173 : la page de connexion s'affiche.
- [ ] `.env` contient `BREVO_API_KEY` et `BREVO_SENDER_EMAIL`.
- [ ] Brevo → [Authorised IPs](https://app.brevo.com/security/authorised_ips) : blocage **désactivé** (l'IP de l'ENSIAS sera différente).
- [ ] Faire une répétition complète du scénario ci-dessous, chronomètre en main.
- [ ] Enregistrer une **vidéo de secours** de l'envoi d'email (au cas où Internet tombe).

### Le jour J, 1 h avant

- [ ] Connexion Internet vérifiée (prévoir le partage de connexion du téléphone).
- [ ] Démarrer Docker Desktop, puis `docker compose up -d`. Attendre environ 1 minute.
- [ ] Réinitialiser les données :
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\demo\reset-demo.ps1
  ```
  Le script affiche « Données de démo prêtes ». Le simulateur fait ensuite évoluer les campagnes actives toutes les 30 s.
  À lancer **au plus 2 h avant** : au-delà, les campagnes à 82–84 % finissent par atteindre leur budget.
- [ ] Ouvrir deux fenêtres : une normale, une **navigation privée** (pour la première connexion forcée).
- [ ] Ouvrir Gmail sur le téléphone (compte `oufaa.reddame@gmail.com`).
- [ ] Zoom du navigateur à 110–125 % pour la lisibilité au projecteur. Couper les notifications Windows.

### Si quelque chose casse pendant la démo

| Symptôme | Réaction |
|---|---|
| Pages vides, erreurs 500 après un redémarrage | `docker restart api-gateway`, attendre 15 s |
| « Brevo refuse l'adresse IP du serveur » | Brevo → Authorised IPs → désactiver le blocage, puis « Send now » à nouveau (l'email n'est pas marqué envoyé en cas d'échec) |
| Pas d'Internet | Montrer la vidéo de secours ; le reste de la démo fonctionne hors ligne |
| Statistiques email à 0 | Normal pendant 1 à 2 minutes : Brevo met un peu de temps. Continuer et revenir sur « Refresh stats » plus tard |
| Données incohérentes | Relancer `reset-demo.ps1` (≈ 10 s) |

---

## 3. Scénario (≈ 12 min)

### Acte 1 — La direction pilote tous les clients (3 min)

Fenêtre normale → `direction@adlift.ma`.

1. **Overview** : « La direction voit d'un coup d'œil l'activité de tous les clients : 3 clients actifs, 5 campagnes en cours, 111 000 MAD dépensés sur 200 000 planifiés. »
2. Montrer la colonne **Alerts** : Dar Zitoun a dépassé un budget, Atlas et Casa Immo ont une campagne au-dessus de 80 %. « Seules les campagnes actives déclenchent une alerte à 80 % : une campagne terminée à 97 % est une campagne bien gérée. »
3. Riad Menara est **Inactive** : contrat terminé, l'espace est conservé mais plus personne ne peut s'y connecter.
4. **Clients → New client** : créer « Maison Kenza Déco », `contact@kenzadeco.ma`, admin `amine@kenzadeco.ma`. Le mot de passe temporaire est généré ; cliquer sur **Copy credentials**.
   > « Il n'y a pas d'inscription publique : seule la direction ouvre un espace client. »
5. **Report** sur Atlas Voyages : choisir « This month », montrer les totaux, puis **Export CSV** et **Print / PDF**.

### Acte 2 — Première connexion sécurisée (1 min)

Fenêtre privée → `amine@kenzadeco.ma` + mot de passe copié.

6. L'application impose **« Choose your own password »**. Essayer d'aller sur `/dashboard` dans la barre d'adresse : redirection vers le changement de mot de passe.
7. Saisir un nouveau mot de passe → arrivée sur un dashboard vide (« No campaigns yet »). Fermer la fenêtre privée.

### Acte 3 — Le quotidien de l'agence (4 min)

Fenêtre normale → Log out → `karim@atlasvoyages.ma`.

8. **Dashboard** : impressions, dépense, CTR, entonnoir (2,26 % des impressions deviennent des clics, 4,3 % des clics des conversions), répartition des campagnes, alerte « Escapades d'automne — 82 % ».
9. **Campaigns** : barres de budget par campagne, statuts. Ouvrir **« Escapades d'automne — Meta »** : KPIs et historique des métriques.
   > « Sans accès aux API Meta et Google Ads, un simulateur alimente les campagnes actives toutes les 30 secondes, avec des ratios réalistes par canal et un plafond strict au budget. »
   Fermer et rouvrir le détail : les chiffres ont augmenté.
10. **Members** : Salma (admin) et le compte client `direction@atlasvoyages.ma`. L'admin invite, change les rôles et désactive les comptes de son espace uniquement ; l'application empêche de désactiver le dernier admin actif.
11. **Cloche** : notifications de changement de statut, envoyées par RabbitMQ depuis campaign-service vers notification-service. Le passage en Active de l'acte 4 en crée une nouvelle en direct.

### Acte 4 — Un vrai email envoyé depuis l'application (3 min)

12. Campagne **« Newsletter clients fidèles »** (Scheduled) → **Move to active**.
13. Ouvrir son détail → section **Email delivery** : objet, message et destinataires sont déjà prêts. (Ajouter l'adresse d'un membre du jury s'il le souhaite, puis **Save changes**.)
14. **Send now** → confirmer. Montrer l'email reçu sur le téléphone. L'ouvrir et cliquer sur le lien.
15. Attendre environ 1 minute (enchaîner sur l'acte 5), puis **Refresh stats** : délivrés, ouvertures et clics réels remontent dans la campagne, le dashboard et les rapports.
    > « Les chiffres viennent de Brevo, pas du simulateur : une campagne réellement envoyée n'est plus simulée et n'accepte plus de saisie manuelle. »

### Acte 5 — Le client et l'isolation (1 min)

16. Log out → `direction@atlasvoyages.ma` (rôle CLIENT) : il consulte le dashboard, les campagnes et les rapports, mais n'a ni création, ni saisie de métriques, ni membres, ni envoi d'email.
17. Log out → `hicham@riadmenara.ma` : connexion refusée avec « This workspace has been deactivated. Contact Adlift. »

Conclusion : « Une plateforme, trois rôles, des espaces clients isolés, des budgets suivis en temps réel et un vrai canal email. »

---

## 4. Questions probables du jury

**Comment l'isolation multi-tenant est-elle garantie ?**
Le `tenantId` est porté par le JWT signé. Chaque service le relit et filtre toutes ses requêtes avec. Une campagne d'un autre tenant renvoie 403, même si l'on connaît son identifiant.

**Pourquoi des microservices ?**
Auth, campagnes et notifications évoluent et se chargent différemment. Chacun a sa propre base PostgreSQL. RabbitMQ découple les notifications : si notification-service tombe, les campagnes continuent de fonctionner.

**Pourquoi un JWT de 15 minutes ?**
Un compte désactivé perd son accès en 15 minutes au plus. Le frontend rafraîchit le jeton en arrière-plan, et le rafraîchissement vérifie à nouveau que le compte est actif.

**Les chiffres sont-ils réels ?**
Pour l'email, oui (Brevo). Pour les pubs, ils sont simulés : les API Meta et Google Ads exigent des comptes business validés, hors de portée du PFA. Le simulateur écrit dans le même modèle de données, donc brancher les vraies API ne changerait ni le dashboard ni les rapports.

**Et si quelqu'un contourne l'interface ?**
Les droits sont vérifiés côté serveur, pas seulement masqués dans l'interface. Par exemple, un CLIENT qui appelle directement l'API de saisie de métriques reçoit 403. Tant que le mot de passe temporaire n'a pas été changé, le JWT porte un marqueur et l'API Gateway refuse toute route autre que le changement de mot de passe.

**Limites connues et perspectives**
- Les ouvertures d'email sont surestimées par le préchargement des images (Gmail, Apple Mail).
- Perspectives : intégration des API Meta et Google Ads, import de contacts, éditeur d'email, webhooks Brevo.
