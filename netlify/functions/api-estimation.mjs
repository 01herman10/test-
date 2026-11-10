// GET ou POST /api/estimation : droits et taxes d'un véhicule et vérification de la limite d'âge.
// Paramètres : pays (BJ, BF, CI, GW, ML, NE, SN, TG), type (voiture, suv…), etat (occasion | neuf),
// annee, prix, fret, assurance, devise (EUR | XOF). Exemple :
// /api/estimation?pays=CI&type=voiture&annee=2021&prix=5000&fret=400&assurance=100&devise=EUR
import { estimer, phraseAge } from "../../douane/regles.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

function nombre(v, nom) {
  if (v === undefined || v === null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[\s  ]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Montant invalide pour ${nom} : ${v}`);
  return n;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  let p;
  try {
    p = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
  } catch {
    return Response.json({ erreur: "Corps JSON invalide." }, { status: 400, headers: CORS });
  }
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    return Response.json({ erreur: "Envoyer un objet JSON, par exemple { \"pays\": \"CI\", \"prix\": 5000 }." }, { status: 400, headers: CORS });
  }
  if (p.annee !== undefined && p.annee !== null && p.annee !== "" && !/^\d{4}$/.test(String(p.annee).trim())) {
    return Response.json({ erreur: `Année invalide : ${p.annee}. Utiliser 4 chiffres, par exemple 2021.` }, { status: 400, headers: CORS });
  }
  try {
    const est = estimer({
      pays: String(p.pays || "").toUpperCase(),
      type: String(p.type || "voiture").toLowerCase(),
      etat: p.etat === "neuf" ? "neuf" : "occasion",
      prix: nombre(p.prix, "prix"),
      fret: nombre(p.fret, "fret"),
      assurance: nombre(p.assurance, "assurance"),
      devise: String(p.devise || "EUR").toUpperCase(),
      annee: p.annee === undefined || p.annee === "" ? null : parseInt(p.annee, 10),
    });
    return Response.json({ ...est, phraseAge: phraseAge(est) }, { headers: CORS });
  } catch (e) {
    return Response.json({ erreur: e.message }, { status: 400, headers: CORS });
  }
};

export const config = { path: "/api/estimation", method: ["GET", "POST", "OPTIONS"] };
