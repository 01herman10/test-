# Douane Afrique

Site statique publié sur Netlify (douane-afrique.netlify.app) : estimation des droits et taxes d'importation d'un véhicule dans les 8 pays de l'UEMOA.

| Page | Adresse | Ce qu'elle fait |
|---|---|---|
| Calculateur de douane | `/` | Droits et taxes d'un véhicule : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo |
| Vitrine | `/vitrine/` | Bandeau « Avant d'importer, pesez le vrai prix. » et galerie de photos |
| Espace admin | `/admin/` | Modifier l'accroche et les photos de la vitrine, sans toucher au code |

Les taux, les limites d'âge et les prélèvements sont indicatifs et doivent être vérifiés auprès des douanes ou d'un transitaire agréé. Les points à confirmer sont signalés dans le calculateur.

Les outils de création (vidéo IA, documents, tableur…) sont dans un projet séparé : le dépôt `boite-a-outils`.

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
