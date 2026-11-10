// POST /api/verification : reçoit directement une demande « Faire vérifier mon véhicule » envoyée par la page,
// en plus de la copie gardée par Netlify Forms. La fiche est rangée même si le filtre anti-spam de Netlify
// classe la demande à tort comme indésirable. La référence « ref » évite les doublons avec demande-recue.
import { getStore } from "@netlify/blobs";
import { traiterDemande } from "../../douane/demandes.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAMPS = ["ref", "bot-field", "nom", "whatsapp", "email", "pays_destination", "pays_achat", "lien_annonce", "vehicule", "annee", "type", "prix", "message", "consentement"];

export default async (req) => {
  if (req.method !== "POST") return Response.json({ erreur: "Méthode non autorisée. Utiliser POST." }, { status: 405, headers: { Allow: "POST" } });
  const brut = await req.text();
  if (brut.length > 20000) return Response.json({ erreur: "Demande trop longue." }, { status: 413 });
  let recu;
  try {
    recu = JSON.parse(brut);
  } catch {
    return Response.json({ erreur: "Format invalide." }, { status: 400 });
  }
  if (!recu || typeof recu !== "object" || Array.isArray(recu)) return Response.json({ erreur: "Format invalide." }, { status: 400 });
  const data = Object.fromEntries(CHAMPS.map((c) => [c, typeof recu[c] === "string" ? recu[c] : ""]));
  // Piège anti-robots : un humain ne remplit jamais ce champ caché.
  if (data["bot-field"]) return new Response(null, { status: 204 });
  if (!UUID.test(data.ref)) return Response.json({ erreur: "Référence manquante." }, { status: 400 });
  if (!data.nom.trim() || !data.whatsapp.trim() || !data.vehicule.trim() || data.consentement !== "oui") {
    return Response.json({ erreur: "Champs obligatoires manquants." }, { status: 400 });
  }
  const fiche = traiterDemande(data, { id: data.ref.toLowerCase(), recueLe: new Date().toISOString() });
  fiche.source = "page";
  const { modified } = await getStore({ name: "demandes", consistency: "strong" }).setJSON(fiche.id, fiche, { onlyIfNew: true });
  return Response.json({ enregistre: true, deja: !modified, ref: fiche.id }, { status: modified ? 201 : 200 });
};

export const config = { path: "/api/verification", method: ["GET", "POST", "PUT", "PATCH", "DELETE"] };
