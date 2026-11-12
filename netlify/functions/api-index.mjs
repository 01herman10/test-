// GET /api : description du back-end (adresses, paramètres, exemples). Toute autre adresse /api/… inconnue : 404 JSON.
const BASE = "https://douane-afrique.netlify.app";
const CORS = { "Access-Control-Allow-Origin": "*" };

const DESCRIPTION = {
  service: "API Douane Afrique",
  version: "1.2",
  description: "Droits et taxes d'importation de véhicules dans 14 pays : les 8 de l'UEMOA (Afrique de l'Ouest) et les 6 de la CEMAC (Afrique centrale), et demandes de vérification avant achat.",
  adresses: [
    { methode: "GET", chemin: "/api", acces: "public", role: "Cette description." },
    { methode: "GET", chemin: "/api/regles", acces: "public", role: "Pays, types de véhicules, taux et monnaies acceptées." },
    { methode: "GET", chemin: "/api/taux", acces: "public", role: "Francs CFA pour 1 unité de chaque monnaie (euro fixe, autres au taux indicatif du jour)." },
    {
      methode: "GET ou POST", chemin: "/api/estimation", acces: "public", role: "Droits, taxes et limite d'âge d'un véhicule.",
      parametres: {
        pays: "UEMOA : BJ, BF, CI, GW, ML, NE, SN, TG ; CEMAC : CM, CF, CG, GA, GQ, TD (obligatoire)",
        moteur: "gros si la cylindrée dépasse 2 500 cm3 (change le droit d'accises au Cameroun)", type: "voiture, suv, taxi, moto, tricycle, pickup, bus, camion, tracteur (défaut : voiture)",
        etat: "occasion ou neuf (défaut : occasion)", annee: "année de fabrication, ex. 2021", prix: "nombre", fret: "nombre", assurance: "nombre",
        devise: "EUR, XOF, USD, CNY, JPY, KRW, GBP, AED ou RUB (défaut : EUR)",
        budget: "à la place de prix : budget total (prix + fret + assurance + taxes) ; renvoie le prix d'achat maximal",
      },
      exemple: `${BASE}/api/estimation?pays=CI&type=voiture&annee=2021&prix=5000&fret=400&assurance=100&devise=EUR`,
      exempleBudget: `${BASE}/api/estimation?pays=SN&type=voiture&budget=15000&fret=1200&devise=USD`,
    },
    { methode: "POST", chemin: "/api/verification", acces: "public (page /verification/)", role: "Enregistre une demande de vérification (JSON)." },
    { methode: "POST", chemin: "/api/retour", acces: "public (calculateur)", role: "« Le vrai montant était différent ? » : montant réellement payé (JSON, sans donnée personnelle)." },
    { methode: "GET", chemin: "/api/retours", acces: "privé", role: "Retours reçus et écart moyen par pays." },
    { methode: "DELETE", chemin: "/api/retours?id=…", acces: "privé", role: "Supprime un retour." },
    { methode: "POST", chemin: "/api/presence", acces: "public (pages du site)", role: "Signal anonyme de visite, toutes les 30 s." },
    { methode: "GET", chemin: "/api/statistiques?jours=30", acces: "privé", role: "Visites par pays, source et appareil sur les derniers jours." },
    { methode: "GET", chemin: "/api/presence", acces: "privé", role: "Visiteurs en direct et total des dernières 24 h." },
    { methode: "DELETE", chemin: "/api/presence?id=… ou ?tout=oui", acces: "privé", role: "Efface une visite, ou remet les compteurs à zéro." },
    { methode: "GET", chemin: "/api/demandes", acces: "privé (Authorization: Bearer <clé>)", role: "Liste des demandes." },
    { methode: "GET", chemin: "/api/demandes/:id", acces: "privé", role: "Une demande, avec le message et le lien WhatsApp." },
    { methode: "GET", chemin: "/api/demandes/:id/rapport", acces: "privé", role: "Rapport HTML prêt à imprimer en PDF." },
    { methode: "PATCH", chemin: "/api/demandes/:id", acces: "privé", role: "Modifie { statut, notes }." },
    { methode: "DELETE", chemin: "/api/demandes/:id", acces: "privé", role: "Supprime une demande." },
  ],
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  const chemin = new URL(req.url).pathname.replace(/\/+$/, "");
  if (chemin !== "/api") return Response.json({ erreur: "Adresse inconnue : " + chemin + ". Voir /api pour la liste des adresses." }, { status: 404, headers: CORS });
  if (req.method !== "GET") return Response.json({ erreur: "Méthode non autorisée. Utiliser GET." }, { status: 405, headers: { ...CORS, Allow: "GET, OPTIONS" } });
  return Response.json(DESCRIPTION, { headers: { ...CORS, "Cache-Control": "public, max-age=300" } });
};

// /api/* attrape aussi les adresses inconnues ; les fonctions qui déclarent une adresse plus précise passent avant.
export const config = {
  path: ["/api", "/api/*"],
  excludedPath: ["/api/regles", "/api/estimation", "/api/verification", "/api/presence", "/api/demandes", "/api/demandes/*", "/api/taux", "/api/retour", "/api/retours", "/api/statistiques"],
  method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
