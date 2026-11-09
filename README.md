# Douane Afrique : calculateur et boîte à outils

Site statique publié sur Netlify (douane-afrique.netlify.app). Tout fonctionne dans le navigateur, sans serveur.

| Page | Adresse | Ce qu'elle fait |
|---|---|---|
| Calculateur de douane | `/` | Droits et taxes d'un véhicule en zone UEMOA |
| Boîte à outils | `/outils/` | Accueil des outils ci-dessous |
| Vitrine photos | `/outils/galerie.html` | Diaporama et galerie avec zoom |
| Documents PDF | `/outils/documents.html` | Devis en PDF, fusion de PDF, lecture de PDF |
| Tableur | `/outils/tableur.html` | Ouvrir, modifier et enregistrer des fichiers Excel ou CSV ; modèle de suivi des dossiers |
| Atelier vidéo | `/outils/video.html` | Couper, compresser, convertir en GIF, extraire le son |
| Espace admin | `/admin/` | Ajouter ou retirer des photos de la vitrine |

## Espace admin (photos de la vitrine)

L'espace admin enregistre les photos dans le dossier `photos/` et leur liste dans `photos/photos.json`, directement dans ce dépôt GitHub. Netlify republie alors le site tout seul.

Pour pouvoir s'y connecter avec GitHub, il faut le régler une fois :

1. Sur GitHub : **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL : `https://douane-afrique.netlify.app`
   - Authorization callback URL : `https://api.netlify.com/auth/done`
   - Notez le **Client ID**, puis générez un **Client secret**.
2. Sur Netlify : **Project configuration → Access & security → OAuth → Install a provider → GitHub**, puis collez le Client ID et le Client secret.
3. Ouvrez `https://douane-afrique.netlify.app/admin/` et cliquez sur **Se connecter avec GitHub**.

## Vidéos de véhicules en série (Remotion)

Le dossier `video/` crée une vidéo verticale (format TikTok, Reels ou statut WhatsApp) de présentation d'un véhicule.

- **Depuis GitHub, sans rien installer** : onglet **Actions → Créer une vidéo de véhicule → Run workflow**. Remplissez le véhicule, le prix et le lieu, puis téléchargez la vidéo dans la section **Artifacts** du résultat.
- **Sur un ordinateur** : `cd video && npm install && npm run studio` pour modifier le modèle en direct.

Remotion est gratuit pour les particuliers et les petites entreprises ; une entreprise plus grande a besoin d'une licence payante (voir remotion.dev/license).

## Vérification automatique

À chaque envoi sur GitHub, l'action **Vérification du site** contrôle que tous les liens, images et scripts des pages existent (`scripts/verifier-liens.mjs`).

## Logiciels libres inclus

| Outil | Version | Licence | Emplacement |
|---|---|---|---|
| Swiper | 14.3.0 | MIT | `outils/lib/swiper/` |
| PhotoSwipe | 5.4.4 | MIT | `outils/lib/photoswipe/` |
| jsPDF | 4.2.1 | MIT | `outils/lib/jspdf/` |
| pdf-lib | 1.17.1 | MIT | `outils/lib/pdf-lib/` |
| PDF.js | 6.4.299 | Apache 2.0 | `outils/lib/pdfjs/` |
| SheetJS (édition communautaire) | 0.20.3 | Apache 2.0 | `outils/lib/sheetjs/` |
| ffmpeg.wasm | 0.12.15 | MIT | `outils/lib/ffmpeg/` (le moteur FFmpeg, GPL, est chargé depuis cdn.jsdelivr.net) |
| Decap CMS | 3.17.1 | MIT | chargé depuis unpkg.com par `admin/index.html` |
| Remotion | 4.0.537 | Licence Remotion | `video/` (installé par npm) |

Le fichier de licence de chaque outil se trouve dans son dossier.
