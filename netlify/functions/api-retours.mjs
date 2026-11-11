// API privée des retours « Le vrai montant était différent ? » (clé ADMIN_CLE).
//   GET    /api/retours          liste (les plus récents d'abord) et écart moyen par pays
//   DELETE /api/retours?id=…     supprimer un retour (test, spam)
import { getStore } from "@netlify/blobs";
import { refuserSiNonAutorise } from "../lib/acces.mjs";
import { PAYS, TYPES } from "../../douane/regles.js";

const magasin = () => getStore({ name: "retours", consistency: "strong" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async (req) => {
  const refus = refuserSiNonAutorise(req);
  if (refus) return refus;
  const st = magasin();
  if (req.method === "DELETE") {
    const id = (new URL(req.url).searchParams.get("id") || "").toLowerCase();
    if (!UUID.test(id)) return Response.json({ erreur: "Précisez ?id=… du retour à supprimer." }, { status: 400 });
    await st.delete(id);
    return Response.json({ supprime: id });
  }
  if (req.method !== "GET") return Response.json({ erreur: "Méthode non autorisée." }, { status: 405, headers: { Allow: "GET, DELETE" } });
  const { blobs } = await st.list();
  const retours = (await Promise.all(blobs.map((b) => st.get(b.key, { type: "json" })))).filter(Boolean);
  retours.sort((a, b) => String(b.recuLe).localeCompare(String(a.recuLe)));
  const parPays = {};
  for (const r of retours) {
    if (r.ecartPourcent == null) continue;
    const p = (parPays[r.pays] ||= { pays: PAYS[r.pays]?.nom || r.pays, nombre: 0, somme: 0 });
    p.nombre++;
    p.somme += r.ecartPourcent;
  }
  const ecarts = Object.values(parPays).map((p) => ({ pays: p.pays, nombre: p.nombre, ecartMoyen: Math.round((p.somme / p.nombre) * 10) / 10 }));
  return Response.json(
    { total: retours.length, ecartsParPays: ecarts, retours: retours.map((r) => ({ ...r, paysNom: PAYS[r.pays]?.nom || r.pays, typeNom: TYPES.find((t) => t.id === r.type)?.nom || r.type })) },
    { headers: { "Cache-Control": "no-store" } }
  );
};

export const config = { path: "/api/retours", method: ["GET", "POST", "PUT", "PATCH", "DELETE"] };
