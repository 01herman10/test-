# Douane Afrique : calculateur et boîte à outils

Site statique publié sur Netlify (douane-afrique.netlify.app). Tout fonctionne dans le navigateur, sans serveur.

| Page | Adresse | Ce qu'elle fait |
|---|---|---|
| Calculateur de douane | `/` | Droits et taxes d'un véhicule en zone UEMOA |
| Boîte à outils | `/outils/` | Accueil des outils ci-dessous |
| Studio vidéo IA | `/outils/studio.html` | Fond, personnage animé, voix IA et sous-titres réunis dans une vidéo (WebM ou MP4) |
| Voix IA | `/outils/voix.html` | Texte → voix française (WAV) |
| Sous-titres IA | `/outils/sous-titres.html` | Transcription automatique (SRT, VTT) et incrustation dans la vidéo |
| Détourage IA | `/outils/detourage.html` | Retirer le fond d'une photo (personnes, objets, véhicules) |
| Vitrine photos | `/outils/galerie.html` | Diaporama et galerie avec zoom |
| Documents PDF | `/outils/documents.html` | Devis en PDF, fusion de PDF, lecture de PDF |
| Tableur | `/outils/tableur.html` | Ouvrir, modifier et enregistrer des fichiers Excel ou CSV ; modèle de suivi des dossiers |
| Atelier vidéo | `/outils/video.html` | Couper, compresser, convertir en GIF, extraire le son |
| Espace admin | `/admin/` | Ajouter ou retirer des photos de la vitrine |

## Outils de vidéo IA

Les moteurs d'IA tournent dans le navigateur : rien n'est envoyé sur un serveur. Les fichiers des moteurs sont dans `outils/lib/` ; les modèles d'IA sont téléchargés depuis huggingface.co au premier usage, puis gardés en cache par le navigateur :

| Usage | Modèle | Taille | Licence |
|---|---|---|---|
| Voix « Siwis » (femme) | Piper fr_FR-siwis-medium | ≈ 60 Mo | CC-BY 4.0 : citer « voix SIWIS » |
| Voix « Gilles » (homme) | Piper fr_FR-gilles-low | ≈ 60 Mo | CC0 |
| Voix « UPMC » (femme) | Piper fr_FR-upmc-medium | ≈ 75 Mo | CC-BY-SA 4.0 |
| Sous-titres rapides | Whisper base | ≈ 80 Mo | MIT |
| Sous-titres précis | Whisper small | ≈ 250 Mo | MIT |
| Détourage de personnes | MODNet | ≈ 7 Mo | Apache 2.0 |
| Détourage d'objets et véhicules | ORMBG | ≈ 45 Mo | Apache 2.0 |

Ce qui n'est pas possible dans un navigateur : générer des images ou des vidéos entières par IA (décors, personnages réalistes, avatars qui parlent à partir d'une photo). Ces modèles demandent une carte graphique puissante sur un serveur.

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
| transformers.js | 4.3.1 | Apache 2.0 | chargé depuis cdn.jsdelivr.net par `outils/ia.js` ; ses fichiers ONNX Runtime sont dans `outils/lib/transformers/` |
| ONNX Runtime Web | 1.30.0 et 1.31.0-dev | MIT | `outils/lib/onnxruntime/`, `outils/lib/transformers/` |
| piper-tts-web, piper-wasm | 1.0.5, 1.0.0 | MIT (données eSpeak NG : GPL-3.0) | `outils/lib/piper/` |
| Police DejaVu Sans | – | licence libre DejaVu | `outils/lib/polices/` |
| Decap CMS | 3.17.1 | MIT | chargé depuis unpkg.com par `admin/index.html` |
| Remotion | 4.0.537 | Licence Remotion | `video/` (installé par npm) |

Le fichier de licence de chaque outil se trouve dans son dossier.
