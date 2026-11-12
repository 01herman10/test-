# Prochaine mise à jour du site

File d'attente des changements pour la prochaine mise en ligne. Tout est préparé ici, sur la branche
`prochaine-mise-a-jour`, sans coûter de crédits Netlify. Le jour où les crédits reviennent, on publie tout
**en une seule mise en ligne** (15 crédits sur 300).

**Retour des crédits Netlify :** vers le 8 décembre (date exacte : Netlify → équipe → Usage & billing).

## 1. Déjà prêt, en attente de mise en ligne
- [x] **Champ WhatsApp** du formulaire « Faire vérifier mon véhicule » : exemples d'indicatifs des clients
      (+225, +221, +33…), exemple adapté au pays choisi, numéro sans indicatif refusé avec une explication,
      l'exemple n'est plus un lien d'appel sur iPhone.
- [x] **Économie de crédits** : une modification qui ne touche que les tests ou les réglages GitHub ne remet plus le site en ligne.

## 2. À faire (demandé par le propriétaire)
- [x] **Les monnaies fortes**, en plus de l'euro : dollar américain (USD), yuan chinois (CNY), yen japonais (JPY),
      won coréen (KRW), rouble russe (RUB), et à valider : livre sterling (GBP), dirham des Émirats (AED, Dubaï est un
      grand marché de voitures pour l'Afrique). Beaucoup de voitures viennent maintenant de Chine : le prix peut être en yuan
      ou en dollars. Conversion en FCFA au taux du jour, avec la date et la source du taux affichées (l'euro garde sa parité fixe).
      → **Prêt** : les 7 monnaies (GBP et AED compris) dans le calculateur, l'API et les demandes de vérification ;
      taux du jour gardé 12 h, taux de secours si la source ne répond pas. Le « ¥ » seul est signalé (yen ou yuan ?).
- [ ] **24 pays au total** (8 aujourd'hui) : les 6 pays de la CEMAC (Cameroun, Centrafrique, Congo-Brazzaville, Gabon,
      Guinée équatoriale, Tchad), puis 10 autres à choisir ensemble. Pour chaque pays : tarif douanier, TVA, limites d'âge,
      papiers — à rechercher, puis **à faire confirmer par un transitaire** avant de publier.
      → **Les 6 pays de la CEMAC sont prêts** (14 pays au total) : tarif CEMAC, TCI, CCI, OHADA, Union africaine, TVA de chaque pays,
      droit d'accises du Cameroun selon l'âge et la cylindrée, limites d'âge du Gabon et du Congo. Sources et points à confirmer :
      voir le README (« Afrique centrale »). **Avant la mise en ligne : faire relire ces taux par un transitaire de Douala ou de Pointe-Noire.**
      Les 10 autres pays : à choisir ensemble (les statistiques de visiteurs par pays aideront).

## 3. Améliorations proposées par Claude, validées par le propriétaire
- [x] **Partager le bulletin sur WhatsApp** en un clic (chaque partage fait connaître Douane Afrique).
      → **Prêt** : bulletin en texte + lien qui rouvre le calcul avec les mêmes chiffres, et bouton « Copier le lien ».
      La version en image avec le logo pourra venir ensuite.
- [x] **Le calcul à l'envers** : « J'ai X FCFA tout compris, quel prix d'annonce maximum ? », par pays et type de véhicule.
      → **Prêt** : « Ce que je connais : Le prix / Mon budget », dans toutes les monnaies, aussi dans l'API (`budget=`).
- [ ] **Des pages par pays et par modèle** (ex. « Frais de douane Toyota Corolla en Côte d'Ivoire ») pour être trouvé sur Google.
- [ ] **Comparer les ports** pour les pays sans accès à la mer (Mali, Burkina Faso, Niger…) : même voiture via Abidjan, Dakar, Lomé, Cotonou.
- [x] **Choisir les prochains pays d'après les visiteurs** : l'espace de suivi indique déjà de quels pays ils viennent.
      → **Prêt** : dans `/suivi/`, visiteurs par pays sur 30 jours avec « couvert / pas encore couvert ». Les compteurs démarrent à la mise en ligne.
- [x] **Bouton « Le vrai montant était différent ? »** : le client indique le montant réellement payé (avec son reçu) pour corriger les taux peu à peu.
      → **Prêt** : sous le bulletin, sans nom ni numéro ; les retours et l'écart moyen par pays s'affichent dans `/suivi/`.
      (Le reçu en photo n'est pas demandé pour l'instant : moins de données personnelles à garder.)
- [ ] **Transitaires partenaires** par port : une page de transitaires recommandés, source de revenus (ils paient pour recevoir des clients).
      Commence par des rencontres avec des transitaires, avant le site.
- [x] **L'appli installable sur le téléphone** (icône sur l'écran d'accueil), légère, qui marche même avec une connexion faible.
      → **Prêt** : bouton « Installer l'appli » (Android, ordinateur ; sur iPhone : Partager → « Sur l'écran d'accueil ») ;
      le calculateur s'ouvre et calcule même sans Internet.

## 4. Plus tard (à revoir le jour J)
- [ ] **D'autres marchandises que les véhicules** (pièces détachées, électroménager, téléphones…).

## 5. Vérifié avant la mise en ligne
- Tests sur une copie locale du site (`scripts/serveur-local.mjs`) : règles 33/33, API 109/109, pages dans un vrai navigateur 115/115.
- Le jour de la mise en ligne : relancer les deux campagnes sur le vrai site.

## 6. Rappels
- Les taux et limites d'âge des 8 pays de l'UEMOA sont toujours « à confirmer » par un transitaire.
- Quand l'adresse e-mail de Douane Afrique existera : la mettre sur le site et dans les notifications des demandes.
