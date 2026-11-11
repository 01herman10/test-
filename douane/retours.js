// Retours « Le vrai montant était différent ? » : une personne qui a dédouané indique ce qu'elle a vraiment payé.
// On recalcule l'estimation côté serveur (on ne croit pas le chiffre envoyé par la page) et on garde l'écart.
// Aucune donnée personnelle : ni nom, ni numéro, ni adresse.
import { PAYS, TYPES, estimer, codeDevise } from "./regles.js";

const COUVRE = { taxes: "Droits et taxes seulement", total: "Coût total (véhicule + taxes)" };

function nombre(v, nom, { obligatoire = false } = {}) {
  if (v === undefined || v === null || v === "") {
    if (obligatoire) throw new Error(`${nom} manquant.`);
    return 0;
  }
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[\s  ]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new Error(`${nom} invalide.`);
  return n;
}

/** Transforme les champs envoyés par la page en fiche de retour. Lève une erreur lisible si un champ est faux. */
export function traiterRetour(data, { id, recuLe = new Date().toISOString(), taux = null, anneeReference } = {}) {
  if (!data || typeof data !== "object") throw new Error("Format invalide.");
  const pays = String(data.pays || "").toUpperCase();
  if (!PAYS[pays]) throw new Error("Pays inconnu.");
  const type = String(data.type || "");
  if (!TYPES.some((t) => t.id === type)) throw new Error("Type de véhicule inconnu.");
  const devise = codeDevise(data.devise) || "EUR";
  const couvre = COUVRE[data.couvre] ? data.couvre : "taxes";
  const reel = nombre(data.montantReel, "Montant payé", { obligatoire: true });
  if (reel < 1000) throw new Error("Montant payé trop petit : indiquez-le en francs CFA.");
  const annee = /^\d{4}$/.test(String(data.annee || "")) ? parseInt(data.annee, 10) : null;
  const entree = {
    pays, type, devise, annee,
    etat: data.etat === "neuf" ? "neuf" : "occasion",
    prix: nombre(data.prix, "Prix"),
    fret: nombre(data.fret, "Fret"),
    assurance: nombre(data.assurance, "Assurance"),
  };
  const est = estimer({ ...entree, taux, anneeReference });
  const estime = couvre === "total" ? est.coutTotal : est.total;
  const ecart = estime > 0 ? Math.round(((reel - estime) / estime) * 1000) / 10 : null;
  const anneeDedouanement = /^\d{4}$/.test(String(data.anneeDedouanement || "")) ? parseInt(data.anneeDedouanement, 10) : null;
  return {
    id,
    recuLe,
    ...entree,
    anneeDedouanement,
    couvre,
    couvreLibelle: COUVRE[couvre],
    montantReel: Math.round(reel),
    montantEstime: estime,
    ecartPourcent: ecart,
    tauxConversion: est.conversion.fcfaParUnite,
    commentaire: String(data.commentaire || "").trim().slice(0, 600),
  };
}
