// Visiteurs en direct, anonymes (aucun cookie, aucune donnée personnelle).
//   POST /api/presence  public  : signal envoyé toutes les 30 s par les pages ({ id, page, source, appareil, debut, depart })
//   GET  /api/presence  privé   : qui est sur le site en ce moment, et le total des dernières 24 h
//   DELETE /api/presence?id=…  ou  ?tout=oui   privé : efface une visite (tests) ou remet les compteurs à zéro
import { getStore } from "@netlify/blobs";
import { refuserSiNonAutorise } from "../lib/acces.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIF_MS = 75 * 1000;          // vu dans les 75 dernières secondes = sur le site
const GARDE_MS = 24 * 3600 * 1000;   // on garde 24 h pour le total du jour
const PAGES = { "/": "Calculateur", "/verification/": "Vérification", "/verification/merci/": "Demande envoyée", "/vitrine/": "Vitrine" };
const SOURCES = ["TikTok", "WhatsApp", "Facebook", "Instagram", "YouTube", "Google", "Autre site", "Direct"];
const nomsPays = new Intl.DisplayNames(["fr"], { type: "region" });
const magasin = () => getStore({ name: "presence", consistency: "strong" });
const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function signal(req, context) {
  let c;
  try { c = JSON.parse((await req.text()).slice(0, 2000)); } catch { return Response.json({ erreur: "Format invalide." }, { status: 400 }); }
  if (!c || typeof c !== "object" || !UUID.test(c.id || "")) return Response.json({ erreur: "Identifiant invalide." }, { status: 400 });
  const id = c.id.toLowerCase();
  const maintenant = Date.now();
  const page = texte(c.page, 80);
  if (c.depart) {
    // Le visiteur quitte la page : il n'est plus « en direct », mais reste compté dans le total des 24 h.
    // Si le signal de départ arrive après celui de la page suivante (changement de page), on l'ignore.
    const st = magasin(), fiche = await st.get(id, { type: "json" });
    if (fiche && !fiche.parti && (!page || fiche.page === (PAGES[page] || page))) await st.setJSON(id, { ...fiche, parti: maintenant });
    return new Response(null, { status: 204 });
  }
  const debut = Number.isFinite(c.debut) && c.debut <= maintenant && maintenant - c.debut < GARDE_MS ? c.debut : maintenant;
  const code = context.geo?.country?.code || "";
  let pays = "";
  try { pays = code ? nomsPays.of(code) : ""; } catch { pays = code; }
  await magasin().setJSON(id, {
    page: PAGES[page] || page || "?",
    source: SOURCES.includes(c.source) ? c.source : "Autre site",
    appareil: c.appareil === "téléphone" ? "téléphone" : "ordinateur",
    pays: pays || "Inconnu",
    debut,
    vu: maintenant,
  });
  return new Response(null, { status: 204 });
}

async function etat() {
  const st = magasin(), maintenant = Date.now();
  const { blobs } = await st.list();
  const fiches = await Promise.all(blobs.map(async (b) => ({ id: b.key, v: await st.get(b.key, { type: "json" }) })));
  const vieux = fiches.filter((f) => !f.v || maintenant - f.v.vu > GARDE_MS);
  await Promise.all(vieux.slice(0, 200).map((f) => st.delete(f.id)));   // ménage
  const jour = fiches.filter((f) => f.v && maintenant - f.v.vu <= GARDE_MS);
  const enDirect = jour.filter((f) => !f.v.parti && maintenant - f.v.vu <= ACTIF_MS)
    .map((f) => ({ page: f.v.page, source: f.v.source, appareil: f.v.appareil, pays: f.v.pays, depuisSecondes: Math.round((maintenant - f.v.debut) / 1000) }))
    .sort((a, b) => b.depuisSecondes - a.depuisSecondes);
  const compter = (liste, cle) => Object.entries(liste.reduce((o, x) => ((o[x[cle]] = (o[x[cle]] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]);
  return Response.json({
    enDirect: enDirect.length,
    visiteurs: enDirect,
    dernieres24h: { visites: jour.length, parSource: compter(jour.map((f) => f.v), "source"), parPays: compter(jour.map((f) => f.v), "pays") },
    misAJour: new Date(maintenant).toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}

async function effacer(req) {
  const url = new URL(req.url), st = magasin();
  const id = (url.searchParams.get("id") || "").toLowerCase();
  if (id) {
    if (!UUID.test(id)) return Response.json({ erreur: "Identifiant invalide." }, { status: 400 });
    await st.delete(id);
    return Response.json({ efface: 1 });
  }
  if (url.searchParams.get("tout") !== "oui") return Response.json({ erreur: "Précisez ?id=… pour une visite, ou ?tout=oui pour tout remettre à zéro." }, { status: 400 });
  const { blobs } = await st.list();
  await Promise.all(blobs.map((b) => st.delete(b.key)));
  return Response.json({ efface: blobs.length });
}

export default async (req, context) => {
  if (req.method === "POST") return signal(req, context);
  if (req.method === "GET") return refuserSiNonAutorise(req) || etat();
  if (req.method === "DELETE") return refuserSiNonAutorise(req) || effacer(req);
  return Response.json({ erreur: "Méthode non autorisée." }, { status: 405, headers: { Allow: "GET, POST, DELETE" } });
};

export const config = { path: "/api/presence", method: ["GET", "POST", "PUT", "PATCH", "DELETE"] };
