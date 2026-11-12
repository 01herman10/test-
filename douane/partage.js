// Partage d'une estimation : lien qui rouvre le calculateur avec les mêmes chiffres, et texte du bulletin
// à envoyer sur WhatsApp. Fonctions pures, utilisées par la page et par les tests.
import { PAYS, TYPES, DEVISES, codeDevise, phraseAge } from "./regles.js";

const espaces = (s) => s.replace(/[  ]/g, " ");

/** "5 000 €", "3 279 785 FCFA", "12 500 $", "1 200 000 yen". */
export function montantDevise(v, devise) {
  const code = codeDevise(devise) || "EUR";
  const entier = code === "XOF" || code === "JPY" || code === "KRW";
  const n = espaces(Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: entier ? 0 : 2 }));
  return n + " " + DEVISES[code].symbole;
}

export const fcfa = (n) => espaces(Math.round(n).toLocaleString("fr-FR")) + " FCFA";

function nombre(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Lit les paramètres d'une adresse (?pays=CI&prix=5000…) ; ne garde que les valeurs valides. */
export function lireParametres(recherche) {
  const sp = recherche instanceof URLSearchParams ? recherche : new URLSearchParams(recherche || "");
  const r = {};
  const pays = String(sp.get("pays") || "").toUpperCase();
  if (PAYS[pays]) r.pays = pays;
  const type = String(sp.get("type") || "").toLowerCase();
  if (TYPES.some((t) => t.id === type)) r.type = type;
  if (sp.get("etat") === "neuf" || sp.get("etat") === "occasion") r.etat = sp.get("etat");
  if (/^\d{4}$/.test(sp.get("annee") || "")) r.annee = parseInt(sp.get("annee"), 10);
  const devise = codeDevise(sp.get("devise"));
  if (devise) r.devise = devise;
  for (const [cle, nom] of [["prix", "prix"], ["fret", "fret"], ["assurance", "assurance"], ["budget", "budget"]]) {
    const n = nombre(sp.get(cle));
    if (n !== null) r[nom] = n;
  }
  if (sp.get("moteur") === "gros") r.grosMoteur = true;
  if (r.budget != null) r.mode = "budget";
  return r;
}

/** Adresse qui rouvre le calculateur avec ces chiffres. */
export function lienCalcul(origine, e) {
  const sp = new URLSearchParams();
  sp.set("pays", e.pays);
  sp.set("type", e.type);
  if (e.etat === "neuf") sp.set("etat", "neuf");
  if (e.annee) sp.set("annee", String(e.annee));
  if (e.grosMoteur) sp.set("moteur", "gros");
  sp.set("devise", e.devise);
  if (e.mode === "budget") sp.set("budget", String(e.budget || 0));
  else sp.set("prix", String(e.prix || 0));
  if (e.fret) sp.set("fret", String(e.fret));
  if (e.assurance) sp.set("assurance", String(e.assurance));
  return origine.replace(/\/+$/, "") + "/?" + sp.toString();
}

/**
 * Texte du bulletin à envoyer sur WhatsApp.
 * `saisie` : ce que la personne a entré (prix ou budget, fret, assurance, devise…) ; `est` : résultat de estimer().
 */
export function texteBulletin(est, saisie, lien) {
  const p = est.pays, t = est.type, d = saisie.devise;
  const quoi = t.nom + (saisie.annee ? " " + saisie.annee : "") + " · " + (saisie.etat === "neuf" ? "neuf" : "occasion") + (saisie.grosMoteur ? " · plus de 2 500 cm³" : "");
  const lignes = ["*Estimation douane – Douane Afrique*", "", quoi + " → " + p.nom + " (" + p.port + ")"];
  if (saisie.mode === "budget") {
    lignes.push("Budget total : " + montantDevise(saisie.budget, d));
    lignes.push("*Prix d'achat maximum : " + montantDevise(saisie.prix, d) + "*");
  } else {
    lignes.push("Prix : " + montantDevise(saisie.prix, d));
  }
  if (saisie.fret || saisie.assurance) lignes.push("Fret : " + montantDevise(saisie.fret || 0, d) + " · Assurance : " + montantDevise(saisie.assurance || 0, d));
  lignes.push(
    "",
    "Valeur en douane (CIF) : " + fcfa(est.cif),
    "*Droits et taxes : " + fcfa(est.total) + "*" + (est.pourcentageCif != null ? " (" + String(est.pourcentageCif).replace(".", ",") + " %)" : ""),
    (p.enclave ? "Coût total à l'arrivée : " : "Coût total au port : ") + fcfa(est.coutTotal),
    "",
    phraseAge(est)
  );
  if (est.conversion && !est.conversion.fixe) {
    lignes.push("Taux indicatif : 1 " + d + " = " + espaces(est.conversion.fcfaParUnite.toLocaleString("fr-FR", { maximumFractionDigits: 4 })) + " FCFA" + (est.conversion.date ? " (" + est.conversion.date + ")" : "") + ".");
  }
  lignes.push("Estimation indicative, à confirmer avec un transitaire agréé.");
  if (lien) lignes.push("", "Refaire le calcul : " + lien);
  return lignes.join("\n");
}

/** Lien WhatsApp sans numéro : la personne choisit à qui l'envoyer. */
export function lienPartageWhatsApp(texte) {
  return "https://wa.me/?text=" + encodeURIComponent(texte);
}
