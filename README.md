# Douane Afrique

Site statique publié sur Netlify (douane-afrique.netlify.app) : estimation des droits et taxes d'importation d'un véhicule dans les 8 pays de l'UEMOA.

| Page | Adresse | Ce qu'elle fait |
|---|---|---|
| Calculateur de douane | `/` | Droits et taxes d'un véhicule : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo |
| Vérification avant achat | `/verification/` | Formulaire « Faire vérifier mon véhicule » (Netlify Forms) ; page de remerciement `/verification/merci/` |
| Vitrine | `/vitrine/` | Bandeau « Avant d'importer, pesez le vrai prix. » et galerie de photos |
| Espace admin | `/admin/` | Modifier l'accroche et les photos de la vitrine, sans toucher au code |

Les taux, les limites d'âge et les prélèvements sont indicatifs et doivent être vérifiés auprès des douanes ou d'un transitaire agréé. Les points à confirmer sont signalés dans le calculateur.

Les outils de création (vidéo IA, documents, tableur…) sont dans un projet séparé : le dépôt `boite-a-outils`.

## Demandes de vérification

Les demandes envoyées par le formulaire `/verification/` sont recueillies par Netlify Forms : **Netlify → projet douane-afrique → Forms → verification**. Pour être prévenu à chaque demande : **Forms → Form notifications → Add notification → Email notification**.

## API

Fonctions Netlify dans `netlify/functions/`. Les règles douanières (taux, limites d'âge, papiers) sont dans un seul fichier, `douane/regles.js`, utilisé à la fois par le calculateur et par l'API : un changement de taux s'applique partout.

| Adresse | Accès | Ce qu'elle fait |
|---|---|---|
| `GET /api/regles` | Public | Les 8 pays, les types de véhicules et les taux |
| `GET` ou `POST /api/estimation` | Public | Droits, taxes et limite d'âge. Paramètres : `pays`, `type`, `etat` (`occasion` ou `neuf`), `annee`, `prix`, `fret`, `assurance`, `devise` (`EUR` ou `XOF`) |
| `POST /api/verification` | Public (utilisé par la page) | Reçoit directement chaque demande et la range, même si le filtre anti-spam de Netlify la classe à tort ; piège anti-robots |
| Formulaire `verification` | Automatique | À chaque demande validée, `demande-recue` calcule l'estimation et range la fiche (stockage Netlify Blobs « demandes ») |
| `GET /api/demandes` | Privé | Liste des demandes, avec le message et le lien WhatsApp prêts |
| `GET /api/demandes/:id/rapport` | Privé | Rapport de vérification à imprimer en PDF |
| `PATCH /api/demandes/:id` | Privé | Changer le statut (`nouvelle`, `contactee`, `payee`, `rapport_envoye`, `abandonnee`) ou les notes |
| `DELETE /api/demandes/:id` | Privé | Supprimer une demande (test, spam) |

Les adresses privées demandent l'en-tête `Authorization: Bearer <clé>`, la clé étant la variable d'environnement Netlify `ADMIN_CLE`. La page **`/suivi/`** les utilise : c'est l'espace de suivi des demandes.

Exemple : `https://douane-afrique.netlify.app/api/estimation?pays=CI&type=voiture&annee=2021&prix=5000&fret=400&assurance=100&devise=EUR`

Tests : `npm test`.

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
