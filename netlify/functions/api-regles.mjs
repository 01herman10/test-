// GET /api/regles : pays, types de véhicules et taux utilisés par le calculateur.
import { EUR, PAYS, TYPES, TAUX } from "../../douane/regles.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  return Response.json(
    { euroEnFcfa: EUR, tauxCommuns: TAUX, pays: PAYS, types: TYPES },
    { headers: { ...CORS, "Cache-Control": "public, max-age=300" } }
  );
};

export const config = { path: "/api/regles", method: ["GET", "OPTIONS"] };
