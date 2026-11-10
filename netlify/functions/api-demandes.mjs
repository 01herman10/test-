// API privée de suivi des demandes. Clé : variable d'environnement ADMIN_CLE,
// envoyée dans l'en-tête « Authorization: Bearer <clé> ».
//   GET   /api/demandes               liste des fiches (les plus récentes d'abord)
//   GET   /api/demandes/:id           une fiche, avec le message et le lien WhatsApp
//   PATCH /api/demandes/:id           { "statut": "...", "notes": "..." }
//   GET   /api/demandes/:id/rapport   rapport HTML prêt à imprimer en PDF
//   DELETE /api/demandes/:id          supprimer une fiche (test, spam)
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";
import { STATUTS, messageWhatsApp, lienWhatsApp, rapportHTML } from "../../douane/demandes.js";

const magasin = () => getStore({ name: "demandes", consistency: "strong" });
const empreinte = (s) => createHash("sha256").update(String(s)).digest();

function autorise(req) {
  const cle = Netlify.env.get("ADMIN_CLE");
  if (!cle) return false;
  const recu = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return recu.length > 0 && timingSafeEqual(empreinte(recu), empreinte(cle));
}

async function trouver(id) {
  const { blobs } = await magasin().list();
  const b = blobs.find((x) => x.key.endsWith("_" + id));
  if (!b) return null;
  return { cle: b.key, fiche: await magasin().get(b.key, { type: "json" }) };
}

const enrichir = (f) => ({ ...f, statutLibelle: STATUTS[f.statut] || f.statut, messageWhatsApp: messageWhatsApp(f), lienWhatsApp: lienWhatsApp(f) });

export default async (req, context) => {
  if (!Netlify.env.get("ADMIN_CLE")) return Response.json({ erreur: "ADMIN_CLE n'est pas configurée sur Netlify." }, { status: 503 });
  if (!autorise(req)) return Response.json({ erreur: "Clé d'accès manquante ou incorrecte." }, { status: 401 });

  const { id, action } = context.params;
  try {
    if (!id) {
      const { blobs } = await magasin().list();
      const cles = blobs.map((b) => b.key).sort().reverse();
      const fiches = await Promise.all(cles.map((k) => magasin().get(k, { type: "json" })));
      return Response.json({ total: fiches.length, statuts: STATUTS, demandes: fiches.filter(Boolean).map(enrichir) });
    }
    const trouve = await trouver(id);
    if (!trouve) return Response.json({ erreur: "Demande introuvable." }, { status: 404 });

    if (action === "rapport") {
      return new Response(rapportHTML(trouve.fiche), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (req.method === "DELETE") {
      await magasin().delete(trouve.cle);
      return Response.json({ supprime: id });
    }
    if (req.method === "PATCH") {
      const corps = await req.json().catch(() => ({}));
      if (corps.statut !== undefined && !STATUTS[corps.statut]) return Response.json({ erreur: "Statut inconnu.", statuts: STATUTS }, { status: 400 });
      const fiche = { ...trouve.fiche };
      if (corps.statut !== undefined) fiche.statut = corps.statut;
      if (corps.notes !== undefined) fiche.notes = String(corps.notes).slice(0, 4000);
      fiche.modifieLe = new Date().toISOString();
      await magasin().setJSON(trouve.cle, fiche);
      return Response.json(enrichir(fiche));
    }
    return Response.json(enrichir(trouve.fiche));
  } catch (e) {
    console.error(e);
    return Response.json({ erreur: "Erreur du serveur : " + e.message }, { status: 500 });
  }
};

export const config = { path: ["/api/demandes", "/api/demandes/:id", "/api/demandes/:id/:action"], method: ["GET", "PATCH", "DELETE"] };
