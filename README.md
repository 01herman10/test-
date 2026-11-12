# Douane Afrique

Site statique publié sur Netlify (douane-afrique.netlify.app) : estimation des droits et taxes d'importation d'un véhicule dans 14 pays : les 8 de l'UEMOA (Afrique de l'Ouest) et les 6 de la CEMAC (Afrique centrale).

| Page | Adresse | Ce qu'elle fait |
|---|---|---|
| Calculateur de douane | `/` | Droits et taxes d'un véhicule : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo (UEMOA) ; Cameroun, Centrafrique, Congo-Brazzaville, Gabon, Guinée équatoriale, Tchad (CEMAC). Prix en euros, francs CFA, dollars, yuans, yens, wons, livres, dirhams ou roubles ; « Mon budget » (prix d'achat maximum) ; partage WhatsApp et lien qui rouvre le calcul ; bouton « Le vrai montant était différent ? » ; appli installable qui marche hors ligne |
| Vérification avant achat | `/verification/` | Formulaire « Faire vérifier mon véhicule » (Netlify Forms) ; page de remerciement `/verification/merci/` |
| Vitrine | `/vitrine/` | Bandeau « Avant d'importer, pesez le vrai prix. » et galerie de photos |
| Espace de suivi | `/suivi/` | Privé : demandes, visiteurs en direct, visiteurs par pays sur 30 jours, retours « montant différent » |
| Espace admin | `/admin/` | Modifier l'accroche et les photos de la vitrine, sans toucher au code |

L'euro et le franc CFA sont liés par un taux fixe (1 € = 655,957 FCFA, même valeur pour le franc CFA d'Afrique de l'Ouest et d'Afrique centrale). Les autres monnaies sont converties au taux indicatif du jour (ExchangeRate-API, gratuit, attribution affichée), gardé 12 heures ; si la source ne répond pas, des taux de secours datés sont utilisés (`douane/devises.js`).

### Afrique centrale (CEMAC) : d'où viennent les taux

| Élément | Valeur retenue | Source |
|---|---|---|
| Droit de douane | Voitures, SUV, taxis, motos, tricycles 30 % ; pick-up et camions 20 % (10 % au-delà de 20 t) ; bus 10 % (30 % à plusieurs essieux moteurs) ; tracteurs 10 % | Tarif des douanes CEMAC (édition 2009, publié par les douanes gabonaises). Un nouveau tarif CEEAC-CEMAC s'applique au Cameroun depuis le 1er janvier 2026 (véhicules de tourisme annoncés « entre 5 et 20 % ») : **à confirmer** |
| TCI · CCI · OHADA + Union africaine | 1 % · 0,4 % · 0,05 % + 0,2 % de la valeur CIF | Douanes gabonaises, « La fiscalité douanière » ; règlement CEMAC sur la TCI |
| TVA | Cameroun 19,25 % · Congo 18,9 % · Gabon 18 % · Tchad 18 % · Centrafrique 19 % · Guinée équatoriale 15 %, sur la valeur CIF plus tous les droits | Gabon : douanes gabonaises ; Cameroun : 17,5 % + centimes additionnels ; les autres : **à confirmer** |
| Droit d'accises (Cameroun) | Tourisme ≤ 2 500 cm³ : 0 % jusqu'à 12 ans, 12,5 % jusqu'à 20 ans, 25 % au-delà ; > 2 500 cm³ : 12,5 % jusqu'à 15 ans, 25 % au-delà ; utilitaires et bus : 0 % jusqu'à 15 ans, 12,5 % jusqu'à 20 ans, 25 % au-delà | Projet de loi de finances 2026 du Cameroun, article 10 |
| Âge maximum | Gabon 10 ans (décret de janvier 2024) ; Congo 7 ans (tourisme, transport de personnes) et 10 ans (marchandises), décret n° 2011-489 ; Cameroun aucun (accises) ; Tchad, Centrafrique, Guinée équatoriale : pas de limite connue | **À confirmer**, surtout l'application réelle au Congo et au Tchad |

Les taux, les limites d'âge et les prélèvements sont indicatifs et doivent être vérifiés auprès des douanes ou d'un transitaire agréé. Les points à confirmer sont signalés dans le calculateur.

Les outils de création (vidéo IA, documents, tableur…) sont dans un projet séparé : le dépôt `boite-a-outils`.

## Demandes de vérification

Les demandes envoyées par le formulaire `/verification/` sont recueillies par Netlify Forms : **Netlify → projet douane-afrique → Forms → verification**. Pour être prévenu à chaque demande : **Forms → Form notifications → Add notification → Email notification**.

## API

Fonctions Netlify dans `netlify/functions/`. Les règles douanières (taux, limites d'âge, papiers) sont dans un seul fichier, `douane/regles.js`, utilisé à la fois par le calculateur et par l'API : un changement de taux s'applique partout.

| Adresse | Accès | Ce qu'elle fait |
|---|---|---|
| `GET /api` | Public | Description du back-end : toutes les adresses, paramètres et exemples |
| `GET /api/regles` | Public | Les 14 pays, les deux zones (droits et prélèvements), les types de véhicules, les taux et les monnaies |
| `GET /api/taux` | Public | Francs CFA pour 1 unité de chaque monnaie (euro fixe, autres au taux du jour), date et source |
| `GET` ou `POST /api/estimation` | Public | Droits, taxes et limite d'âge. Paramètres : `pays`, `type`, `etat` (`occasion` ou `neuf`), `annee`, `prix`, `fret`, `assurance`, `devise` (`EUR`, `XOF`, `USD`, `CNY`, `JPY`, `KRW`, `GBP`, `AED`, `RUB`). Avec `budget` à la place de `prix` : prix d'achat maximum pour ce budget tout compris |
| `POST /api/retour` | Public (calculateur) | « Le vrai montant était différent ? » : montant réellement payé, sans donnée personnelle ; l'estimation est recalculée côté serveur ; piège anti-robots |
| `GET /api/retours` · `DELETE /api/retours?id=…` | Privé | Retours reçus, écart moyen par pays ; supprimer un retour |
| `GET /api/statistiques?jours=30` | Privé | Visites par pays, source et appareil (simples compteurs par jour, sans donnée personnelle) ; les pays pas encore couverts sont signalés |
| `POST /api/verification` | Public (utilisé par la page) | Reçoit directement chaque demande et la range, même si le filtre anti-spam de Netlify la classe à tort ; piège anti-robots |
| Formulaire `verification` | Automatique | À chaque demande validée, `demande-recue` calcule l'estimation et range la fiche (stockage Netlify Blobs « demandes ») |
| `POST /api/presence` | Public (pages du site) | Signal anonyme de visite toutes les 30 s (`presence.js`) : pas de cookie, identifiant aléatoire limité à l'onglet ; robots et tests automatiques non comptés |
| `GET /api/presence` | Privé | Visiteurs en direct (page, pays, appareil, source) et total des dernières 24 h ; affiché en haut de `/suivi/` |
| `DELETE /api/presence?id=…` ou `?tout=oui` | Privé | Efface une visite (utilisé par les tests) ou remet les compteurs à zéro |
| `GET /api/demandes` | Privé | Liste des demandes, avec le message et le lien WhatsApp prêts |
| `GET /api/demandes/:id/rapport` | Privé | Rapport de vérification à imprimer en PDF |
| `PATCH /api/demandes/:id` | Privé | Changer le statut (`nouvelle`, `contactee`, `payee`, `rapport_envoye`, `abandonnee`) ou les notes |
| `DELETE /api/demandes/:id` | Privé | Supprimer une demande (test, spam) |

Les adresses privées demandent l'en-tête `Authorization: Bearer <clé>`, la clé étant la variable d'environnement Netlify `ADMIN_CLE`. La page **`/suivi/`** les utilise : c'est l'espace de suivi des demandes.

Exemple : `https://douane-afrique.netlify.app/api/estimation?pays=CI&type=voiture&annee=2021&prix=5000&fret=400&assurance=100&devise=EUR`

Tests : `npm test` (règles, monnaies, budget, partage, demandes, retours, statistiques) ; campagnes complètes sur le site en ligne : `ADMIN_CLE=… node scripts/tester-api.mjs` (API) et `ADMIN_CLE=… node scripts/tester-app.mjs` (pages dans un vrai navigateur, Playwright requis). Les deux effacent leurs données de test, même en cas d'arrêt.

Sans mettre en ligne (donc sans crédits Netlify) : `ADMIN_CLE=essai node scripts/serveur-local.mjs` lance une copie locale du site avec ses fonctions et un stockage temporaire, puis `ADMIN_CLE=essai node scripts/tester-api.mjs http://localhost:8888` et `ADMIN_CLE=essai BASE=http://localhost:8888 node scripts/tester-app.mjs`.

## Espace admin (vitrine)

L'espace admin enregistre les photos dans le dossier `photos/` et l'accroche, le texte et la liste des photos dans `photos/photos.json`, directement dans ce dépôt GitHub. Netlify republie alors le site tout seul.

La connexion se fait avec GitHub, grâce à l'application OAuth « Douane Afrique admin » installée dans Netlify (**Project configuration → Sécurité → OAuth**).

## Vérification automatique

À chaque envoi sur GitHub, l'action **Vérification du site** contrôle que tous les liens, images et scripts des pages existent (`scripts/verifier-liens.mjs`).

## Logiciels libres inclus

| Outil | Version | Licence | Emplacement |
|---|---|---|---|
| Swiper | 14.3.0 | MIT | `vitrine/lib/swiper/` |
| PhotoSwipe | 5.4.4 | MIT | `vitrine/lib/photoswipe/` |
| Decap CMS | 3.17.1 | MIT | chargé depuis unpkg.com par `admin/index.html` |
