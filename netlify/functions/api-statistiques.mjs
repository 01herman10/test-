// GET /api/statistiques?jours=30 (privé, clé ADMIN_CLE) : visites par pays, source et appareil
// sur les derniers jours. Sert à choisir les prochains pays à ajouter au calculateur.
import { refuserSiNonAutorise } from "../lib/acces.mjs";
import { magasinStats } from "../lib/statistiques.mjs";
import { resumer, cleJour } from "../../douane/statistiques.js";

const nomsPays = new Intl.DisplayNames(["fr"], { type: "region" });
const nomPays = (c) => { try { return nomsPays.of(c); } catch { return c; } };

export default async (req) => {
  const refus = refuserSiNonAutorise(req);
  if (refus) return refus;
  if (req.method !== "GET") return Response.json({ erreur: "Méthode non autorisée." }, { status: 405, headers: { Allow: "GET" } });
  const n = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("jours"), 10) || 30, 1), 365);
  const st = magasinStats(), maintenant = Date.now();
  const cles = Array.from({ length: n }, (_, i) => cleJour(maintenant - i * 86400000));
  const jours = await Promise.all(cles.map((c) => st.get(c, { type: "json" })));
  return Response.json(
    { jours: n, du: cles[cles.length - 1], au: cles[0], ...resumer(jours, nomPays), parJour: cles.map((c, i) => [c, jours[i]?.visites || 0]).reverse() },
    { headers: { "Cache-Control": "no-store" } }
  );
};

export const config = { path: "/api/statistiques", method: ["GET", "POST", "PUT", "PATCH", "DELETE"] };
