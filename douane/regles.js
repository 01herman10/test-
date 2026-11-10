// Règles douanières de la zone UEMOA : source unique utilisée par le calculateur (navigateur)
// et par l'API (fonctions Netlify). Modifier un taux ou une limite ici le change partout.

/** Taux fixe de l'euro en francs CFA. */
export const EUR = 655.957;

// en : préposition devant le nom du pays. enclave : pays sans accès à la mer (arrivée par un port voisin puis par la route).
// aes : Burkina Faso, Mali et Niger ont quitté la CEDEAO ; le prélèvement de 0,5 % y est à confirmer.
// vp / lourd : limite d'âge connue (en années) ; null = non renseignée.
export const PAYS = {
  BJ: { nom: "Bénin", en: "au Bénin", port: "Port de Cotonou", tva: 18, vp: 10, lourd: null, note: " (limite à confirmer auprès des douanes béninoises)" },
  BF: { nom: "Burkina Faso", en: "au Burkina Faso", port: "Bureau de douane de Ouagadougou", enclave: true, aes: true, tva: 18, vp: null, lourd: null, note: "" },
  CI: { nom: "Côte d'Ivoire", en: "en Côte d'Ivoire", port: "Port d'Abidjan", tva: 18, vp: 5, lourd: null, note: "" },
  GW: { nom: "Guinée-Bissau", en: "en Guinée-Bissau", port: "Port de Bissau", tva: 18, tvaNote: " (taux à confirmer)", vp: null, lourd: null, note: "" },
  ML: { nom: "Mali", en: "au Mali", port: "Bureau de douane de Bamako", enclave: true, aes: true, tva: 18, vp: null, lourd: null, note: "" },
  NE: { nom: "Niger", en: "au Niger", port: "Bureau de douane de Niamey", enclave: true, aes: true, tva: 19, vp: null, lourd: null, note: "" },
  SN: { nom: "Sénégal", en: "au Sénégal", port: "Port de Dakar", tva: 18, vp: 10, lourd: 15, note: "" },
  TG: { nom: "Togo", en: "au Togo", port: "Port de Lomé", tva: 18, vp: 8, lourd: null, note: "" },
};

export const TYPES = [
  { id: "voiture", nom: "Voiture particulière", dd: 20, cat: "vp" },
  { id: "suv", nom: "SUV / 4x4", dd: 20, cat: "vp" },
  { id: "taxi", nom: "Taxi", dd: 20, cat: "vp" },
  { id: "moto", nom: "Moto", dd: 20, cat: "deux" },
  { id: "tricycle", nom: "Tricycle", dd: 20, cat: "deux" },
  { id: "pickup", nom: "Pick-up", dd: 10, cat: "util" },
  { id: "bus", nom: "Bus / minibus", dd: 10, cat: "lourd" },
  { id: "camion", nom: "Camion", dd: 10, cat: "lourd" },
  { id: "tracteur", nom: "Tracteur agricole", dd: 5, cat: "agri" },
];

/** Taux communs à toute la zone, en pourcentage de la valeur CIF. */
export const TAUX = { rs: 1, pcs: 1, pc: 0.5 };

export function trouverType(id) {
  return TYPES.find((t) => t.id === id) || null;
}

/**
 * Calcule les droits et taxes d'un véhicule et vérifie sa limite d'âge.
 * Montants en euros (devise "EUR") ou en francs CFA (devise "XOF").
 * Chaque ligne est arrondie au franc avant l'addition, comme sur un bulletin de liquidation.
 */
export function estimer({ pays, type, etat = "occasion", annee = null, prix = 0, fret = 0, assurance = 0, devise = "EUR", anneeReference = new Date().getFullYear() }) {
  const p = PAYS[pays];
  if (!p) throw new Error(`Pays inconnu : ${pays}. Pays possibles : ${Object.keys(PAYS).join(", ")}.`);
  const t = trouverType(type);
  if (!t) throw new Error(`Type inconnu : ${type}. Types possibles : ${TYPES.map((x) => x.id).join(", ")}.`);
  if (devise !== "EUR" && devise !== "XOF") throw new Error(`Devise inconnue : ${devise}. Utiliser EUR ou XOF.`);
  for (const [nom, v] of Object.entries({ prix, fret, assurance })) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new Error(`Montant invalide pour ${nom}.`);
  }

  const R = Math.round;
  const taux = devise === "EUR" ? EUR : 1;
  const cif = R((prix + fret + assurance) * taux);
  const dd = R((cif * t.dd) / 100);
  const rs = R((cif * TAUX.rs) / 100);
  const pcs = R((cif * TAUX.pcs) / 100);
  const pc = R((cif * TAUX.pc) / 100);
  const tva = R(((cif + dd + rs + pcs + pc) * p.tva) / 100);
  const total = dd + rs + pcs + pc + tva;

  // Limite d'âge
  const limite = t.cat === "vp" ? p.vp : t.cat === "lourd" ? p.lourd : null;
  const an = Number.isInteger(annee) ? annee : parseInt(annee, 10);
  let age;
  if (etat === "neuf") age = { statut: "neuf", age: null, limite };
  else if (!an || an < 1980 || an > anneeReference) age = { statut: "annee_manquante", age: null, limite };
  else if (limite) {
    const a = anneeReference - an;
    age = { statut: a > limite ? "refusee" : "acceptee", age: a, limite };
  } else age = { statut: "limite_inconnue", age: anneeReference - an, limite: null };

  return {
    pays: { code: pays, ...p },
    type: t,
    devise,
    cif,
    lignes: { dd, rs, pcs, pc, tva },
    taux: { dd: t.dd, ...TAUX, tva: p.tva },
    total,
    coutTotal: cif + total,
    pourcentageCif: cif > 0 ? Math.round((total / cif) * 1000) / 10 : null,
    age,
    documents: documents(p),
  };
}

/** Papiers à préparer, selon le pays. */
export function documents(p) {
  const docs = [
    ["Facture d'achat", "Remise par le vendeur ou le concessionnaire."],
    ["Connaissement (Bill of Lading)", "Remis par la compagnie maritime à l'expédition."],
    ["Carte grise d'origine", "À récupérer auprès du vendeur, en original."],
    ["Pièce d'identité de l'importateur", "Carte d'identité ou passeport valide."],
    ["Identifiant fiscal", "Demandé selon le pays, auprès des impôts."],
    ["Déclaration en douane", "Faite par un transitaire agréé au " + p.port + "."],
  ];
  if (p.enclave) docs.splice(5, 0, ["Documents de transit", "Établis au port de débarquement pour traverser le pays voisin jusqu'à la frontière."]);
  return docs;
}

/** Phrase lisible sur la limite d'âge (même texte que le calculateur). */
export function phraseAge(est) {
  const p = est.pays, a = est.age;
  switch (a.statut) {
    case "neuf": return "Véhicule neuf : pas de limite d'âge à vérifier.";
    case "annee_manquante": return "Entrez l'année de fabrication pour vérifier si le véhicule a le droit d'entrer.";
    case "refusee": return "Attention : ce véhicule a " + a.age + " ans. " + p.en.charAt(0).toUpperCase() + p.en.slice(1) + ", la limite est de " + a.limite + " ans pour ce type de véhicule d'occasion" + p.note + ". Il risque d'être refusé à la douane.";
    case "acceptee": return "Âge accepté : " + a.age + " an" + (a.age > 1 ? "s" : "") + " (limite " + p.en + " : " + a.limite + " ans" + p.note + ").";
    default: return "Ce véhicule a " + a.age + " an" + (a.age > 1 ? "s" : "") + ". Ce calculateur ne connaît pas la limite d'âge pour ce type de véhicule " + p.en + ". Certains pays en fixent une pour les utilitaires et les véhicules anciens : vérifiez auprès des douanes ou d'un transitaire avant d'acheter.";
  }
}

/** Lit un montant écrit librement ("5 000 €", "3 000 000 FCFA", "6500,50") ; renvoie { valeur, devise } ou null. */
export function lireMontantLibre(texte, deviseParDefaut = "EUR") {
  if (texte == null) return null;
  const s = String(texte);
  const devise = /fcfa|xof|cfa|f\b/i.test(s) && !/€|eur/i.test(s) ? "XOF" : /€|eur/i.test(s) ? "EUR" : deviseParDefaut;
  const chiffres = s.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const v = parseFloat(chiffres);
  return Number.isFinite(v) && v >= 0 ? { valeur: v, devise } : null;
}
