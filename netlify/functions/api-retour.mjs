// POST /api/retour (public) : « Le vrai montant était différent ? ». Range le retour dans le stockage « retours ».
// Aucune donnée personnelle demandée. Piège anti-robots : le champ caché « bot-field ».
import { getStore } from "@netlify/blobs";
import { traiterRetour } from "../../douane/retours.js";
import { lireTaux } from "../lib/taux.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ erreur: "Méthode non autorisée. Utiliser POST." }, { status: 405, headers: { Allow: "POST" } });
  const brut = await req.text();
  if (brut.length > 5000) return Response.json({ erreur: "Message trop long." }, { status: 413 });
  let data;
  try {
    data = JSON.parse(brut);
  } catch {
    return Response.json({ erreur: "Format invalide." }, { status: 400 });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return Response.json({ erreur: "Format invalide." }, { status: 400 });
  if (data["bot-field"]) return new Response(null, { status: 204 });
  let fiche;
  try {
    const devise = String(data.devise || "EUR").toUpperCase();
    const taux = devise === "EUR" || devise === "XOF" ? null : await lireTaux();
    fiche = traiterRetour(data, { id: crypto.randomUUID(), taux });
  } catch (e) {
    return Response.json({ erreur: e.message }, { status: 400 });
  }
  await getStore({ name: "retours", consistency: "strong" }).setJSON(fiche.id, fiche);
  return Response.json({ enregistre: true, id: fiche.id, ecartPourcent: fiche.ecartPourcent }, { status: 201 });
};

export const config = { path: "/api/retour", method: ["GET", "POST", "PUT", "PATCH", "DELETE"] };
