// GET /api : description du back-end (adresses, paramètres, exemples). Toute autre adresse /api/… inconnue : 404 JSON.
const BASE = "https://douane-afrique.netlify.app";
const CORS = { "Access-Control-Allow-Origin": "*" };

const DESCRIPTION = {
  service: "API Douane Afrique",
  version: "1.1",
  description: "Droits et taxes d'importation de véhicules dans les 8 pays de l'UEMOA, et demandes de vérification avant achat.",
  adresses: [
    { methode: "GET", chemin: "/api", acces: "public", role: "Cette description." },
    { methode: "GET", chemin: "/api/regles", acces: "public", role: "Pays, types de véhicules et taux." },
    {
      methode: "GET ou POST", chemin: "/api/estimation", acces: "public", role: "Droits, taxes et limite d'âge d'un véhicule.",
      parametres: {
        pays: "BJ, BF, CI, GW, ML, NE, SN ou TG (obligatoire)", type: "voiture, suv, taxi, moto, tricycle, pickup, bus, camion, tracteur (défaut : voiture)",
        etat: "occasion ou neuf (défaut : occasion)", annee: "année de fabrication, ex. 2021", prix: "nombre", fret: "nombre", assurance: "nombre", devise: "EUR ou XOF (défaut : EUR)",
      },
      exemple: `${BASE}/api/estimation?pays=CI&type=voiture&annee=2021&prix=5000&fret=400&assurance=100&devise=EUR`,
    },
    { methode: "POST", chemin: "/api/verification", acces: "public (page /verification/)", role: "Enregistre une demande de vérification (JSON)." },
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
  excludedPath: ["/api/regles", "/api/estimation", "/api/verification", "/api/demandes", "/api/demandes/*"],
  method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
