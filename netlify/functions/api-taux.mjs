// GET /api/taux : francs CFA pour 1 unité de chaque monnaie acceptée (taux indicatif du jour).
// L'euro est fixe (655,957 FCFA). Les autres taux viennent de open.er-api.com, gardés 12 heures.
import { DEVISES, ATTRIBUTION_TAUX } from "../../douane/devises.js";
import { lireTaux } from "../lib/taux.mjs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return Response.json({ erreur: "Méthode non autorisée. Utiliser GET." }, { status: 405, headers: { ...CORS, Allow: "GET, OPTIONS" } });
  const taux = await lireTaux();
  const fcfa = Object.fromEntries(Object.entries(DEVISES).map(([code, d]) => [code, d.fixe || taux.fcfa[code]]));
  return Response.json(
    {
      fcfa,
      devises: DEVISES,
      date: taux.date,
      source: taux.source,
      secours: !!taux.secours,
      ancien: !!taux.ancien,
      attribution: ATTRIBUTION_TAUX,
      avertissement: "Taux indicatif. La douane applique son propre taux officiel du jour de la déclaration. L'euro est fixe : 1 € = 655,957 FCFA.",
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } }
  );
};

export const config = { path: "/api/taux", method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] };
