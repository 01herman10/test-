// Règles douanières des zones UEMOA (Afrique de l'Ouest) et CEMAC (Afrique centrale) : source unique utilisée
// par le calculateur (navigateur) et par l'API (fonctions Netlify). Modifier un taux ou une limite ici le change partout.

import { EUR, DEVISES, TAUX_SECOURS, codeDevise, fcfaPour, lireMontantLibre } from "./devises.js";

export { EUR, DEVISES, TAUX_SECOURS, codeDevise, fcfaPour, lireMontantLibre };

// en : préposition devant le nom du pays. enclave : pays sans accès à la mer (arrivée par un port voisin puis par la route).
// aes : Burkina Faso, Mali et Niger ont quitté la CEDEAO ; le prélèvement de 0,5 % y est à confirmer.
// vp / lourd : limite d'âge connue (en années) ; null = non renseignée. limites : limite par type de véhicule (remplace vp / lourd).
// noteAge : phrase affichée quand aucune limite n'est connue. accises : droit d'accises selon l'âge (Cameroun).
export const PAYS = {
  // Afrique de l'Ouest (UEMOA)
  BJ: { zone: "UEMOA", nom: "Bénin", en: "au Bénin", port: "Port de Cotonou", tva: 18, vp: 10, lourd: null, note: " (limite à confirmer auprès des douanes béninoises)" },
  BF: { zone: "UEMOA", nom: "Burkina Faso", en: "au Burkina Faso", port: "Bureau de douane de Ouagadougou", enclave: true, aes: true, tva: 18, vp: null, lourd: null, note: "" },
  CI: { zone: "UEMOA", nom: "Côte d'Ivoire", en: "en Côte d'Ivoire", port: "Port d'Abidjan", tva: 18, vp: 5, lourd: null, note: "" },
  GW: { zone: "UEMOA", nom: "Guinée-Bissau", en: "en Guinée-Bissau", port: "Port de Bissau", tva: 18, tvaNote: " (taux à confirmer)", vp: null, lourd: null, note: "" },
  ML: { zone: "UEMOA", nom: "Mali", en: "au Mali", port: "Bureau de douane de Bamako", enclave: true, aes: true, tva: 18, vp: null, lourd: null, note: "" },
  NE: { zone: "UEMOA", nom: "Niger", en: "au Niger", port: "Bureau de douane de Niamey", enclave: true, aes: true, tva: 19, vp: null, lourd: null, note: "" },
  SN: { zone: "UEMOA", nom: "Sénégal", en: "au Sénégal", port: "Port de Dakar", tva: 18, vp: 10, lourd: 15, note: "" },
  TG: { zone: "UEMOA", nom: "Togo", en: "au Togo", port: "Port de Lomé", tva: 18, vp: 8, lourd: null, note: "" },
  // Afrique centrale (CEMAC) : taux et limites à faire confirmer par un transitaire avant toute publication définitive.
  CM: {
    zone: "CEMAC", nom: "Cameroun", en: "au Cameroun", port: "Port de Douala", tva: 19.25, tvaNote: " (17,5 % + centimes additionnels communaux)",
    vp: null, lourd: null, note: "",
    noteAge: "Le Cameroun ne fixe pas d'âge maximum, mais le droit d'accises augmente avec l'âge du véhicule (ligne DA).",
    // Loi de finances 2026, article 10 : [âge maximum de la tranche, taux en %] selon la cylindrée et le type (999 = sans limite).
    accises: {
      tourisme: [[12, 0], [20, 12.5], [999, 25]],
      tourismeGrosMoteur: [[15, 12.5], [999, 25]],
      utilitaire: [[15, 0], [20, 12.5], [999, 25]],
    },
  },
  CF: { zone: "CEMAC", nom: "Centrafrique", en: "en Centrafrique", port: "Bureau de douane de Bangui", enclave: true, tva: 19, tvaNote: " (taux à confirmer)", vp: null, lourd: null, note: "" },
  CG: {
    zone: "CEMAC", nom: "Congo-Brazzaville", en: "au Congo", port: "Port de Pointe-Noire", tva: 18.9, tvaNote: " (18 % + centimes additionnels, à confirmer)",
    limites: { voiture: 7, suv: 7, taxi: 7, bus: 7, pickup: 10, camion: 10 }, note: " (décret n° 2011-489 ; application à confirmer)",
  },
  GA: {
    zone: "CEMAC", nom: "Gabon", en: "au Gabon", port: "Port d'Owendo (Libreville)", tva: 18,
    limites: { voiture: 10, suv: 10, taxi: 10, moto: 10, tricycle: 10, pickup: 10, bus: 10, camion: 10 }, note: " (décret de janvier 2024)",
  },
  GQ: { zone: "CEMAC", nom: "Guinée équatoriale", en: "en Guinée équatoriale", port: "Port de Malabo", tva: 15, tvaNote: " (taux à confirmer)", vp: null, lourd: null, note: "" },
  TD: {
    zone: "CEMAC", nom: "Tchad", en: "au Tchad", port: "Bureau de douane de N'Djamena", enclave: true, tva: 18, tvaNote: " (taux à confirmer)", vp: null, lourd: null, note: "",
    noteAge: "Une décision de 2009 limitait les voitures à 3 ans et les camions à 5 ans ; son application aujourd'hui est à confirmer auprès des douanes tchadiennes.",
  },
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

/** Taux communs à la zone UEMOA, en pourcentage de la valeur CIF. */
export const TAUX = { rs: 1, pcs: 1, pc: 0.5 };

// Chaque zone a son tarif extérieur commun (droit de douane par type de véhicule) et ses prélèvements communautaires,
// en pourcentage de la valeur CIF. La TVA (par pays) se calcule sur la valeur CIF plus tous les droits et taxes.
export const ZONES = {
  UEMOA: {
    nom: "UEMOA", region: "Afrique de l'Ouest",
    portsVoisins: "Abidjan, Lomé, Cotonou, Dakar, Tema…",
    noteDD: "",
    prelevements: [
      { cle: "rs", code: "RS", nom: "Redevance statistique", taux: TAUX.rs, explication: "Finance le suivi des importations par la douane." },
      { cle: "pcs", code: "PCS", nom: "Prélèvement UEMOA", taux: TAUX.pcs, explication: "Contribution à l'Union économique et monétaire ouest-africaine." },
      { cle: "pc", code: "PC", nom: "Prélèvement CEDEAO", nomAes: "Prélèvement communautaire", taux: TAUX.pc,
        explication: "Contribution à la Communauté des États d'Afrique de l'Ouest.",
        explicationAes: "Ce pays a quitté la CEDEAO : ce prélèvement est remplacé par celui de l'Alliance des États du Sahel (AES). Taux à confirmer auprès des douanes." },
    ],
  },
  CEMAC: {
    nom: "CEMAC", region: "Afrique centrale",
    portsVoisins: "le plus souvent Douala, au Cameroun",
    // Tarif des douanes CEMAC : catégorie 4 (30 %) pour les voitures et les motos, 20 % pour les camions,
    // 10 % pour les bus à un essieu moteur et les tracteurs.
    dd: { voiture: 30, suv: 30, taxi: 30, moto: 30, tricycle: 30, pickup: 20, bus: 10, camion: 20, tracteur: 10 },
    noteDD: " Taux du tarif CEMAC, à confirmer : un nouveau tarif CEEAC-CEMAC s'applique depuis janvier 2026.",
    noteType: { bus: " (30 % s'il a plus d'un essieu moteur)", camion: " (10 % au-delà de 20 tonnes de charge)" },
    prelevements: [
      { cle: "tci", code: "TCI", nom: "Taxe communautaire d'intégration", taux: 1, explication: "Finance la Communauté économique et monétaire de l'Afrique centrale (CEMAC)." },
      { cle: "cci", code: "CCI", nom: "Contribution communautaire d'intégration", taux: 0.4, explication: "Finance la Communauté économique des États de l'Afrique centrale (CEEAC). Taux à confirmer." },
      { cle: "aut", code: "AUT", nom: "Prélèvements OHADA et Union africaine", taux: 0.25, explication: "0,05 % pour l'OHADA (droit des affaires) et 0,2 % pour l'Union africaine." },
    ],
  },
};

/** Taux du droit d'accises (en %) selon le pays, le type, l'âge et la cylindrée ; 0 si le pays n'en a pas. */
export function tauxAccises(p, t, age, grosMoteur = false) {
  if (!p.accises || age == null) return 0;
  const bareme = t.cat === "vp" ? (grosMoteur ? p.accises.tourismeGrosMoteur : p.accises.tourisme)
    : ["util", "lourd"].includes(t.cat) ? p.accises.utilitaire : null;
  if (!bareme) return 0;
  return bareme.find(([max]) => age <= max)[1];
}

export function trouverType(id) {
  return TYPES.find((t) => t.id === id) || null;
}

/**
 * Calcule les droits et taxes d'un véhicule et vérifie sa limite d'âge.
 * Montants dans la monnaie `devise` (EUR, XOF, USD, CNY, JPY, KRW, GBP, AED, RUB), convertis en francs CFA
 * avec `fcfaParUnite` s'il est donné, sinon avec le tableau `taux` (taux du jour), sinon avec les taux de secours.
 * Chaque ligne est arrondie au franc avant l'addition, comme sur un bulletin de liquidation.
 */
export function estimer({ pays, type, etat = "occasion", annee = null, prix = 0, fret = 0, assurance = 0, devise = "EUR", taux = null, fcfaParUnite = null, grosMoteur = false, anneeReference = new Date().getFullYear() }) {
  const p = PAYS[pays];
  if (!p) throw new Error(`Pays inconnu : ${pays}. Pays possibles : ${Object.keys(PAYS).join(", ")}.`);
  const t = trouverType(type);
  if (!t) throw new Error(`Type inconnu : ${type}. Types possibles : ${TYPES.map((x) => x.id).join(", ")}.`);
  const code = codeDevise(devise);
  if (!code) throw new Error(`Devise inconnue : ${devise}. Devises possibles : ${Object.keys(DEVISES).join(", ")}.`);
  for (const [nom, v] of Object.entries({ prix, fret, assurance })) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new Error(`Montant invalide pour ${nom}.`);
  }
  const conversion = conversionPour(code, taux, fcfaParUnite);

  const R = Math.round;
  const z = ZONES[p.zone];
  const cif = R((prix + fret + assurance) * conversion.fcfaParUnite);
  const tauxDD = z.dd ? z.dd[t.id] : t.dd;
  const dd = R((cif * tauxDD) / 100);

  // Limite d'âge
  const limite = p.limites ? p.limites[t.id] ?? null : t.cat === "vp" ? p.vp : t.cat === "lourd" ? p.lourd : null;
  const an = Number.isInteger(annee) ? annee : parseInt(annee, 10);
  let age;
  if (etat === "neuf") age = { statut: "neuf", age: null, limite };
  else if (!an || an < 1980 || an > anneeReference) age = { statut: "annee_manquante", age: null, limite };
  else if (limite) {
    const a = anneeReference - an;
    age = { statut: a > limite ? "refusee" : "acceptee", age: a, limite };
  } else age = { statut: "limite_inconnue", age: anneeReference - an, limite: null };

  // Lignes du bulletin : droit de douane, prélèvements communautaires, droit d'accises éventuel, puis TVA.
  const detail = [{ cle: "dd", code: "DD", nom: "Droit de douane", taux: tauxDD, montant: dd,
    explication: "La taxe principale. Son taux dépend du type de véhicule : " + t.nom.toLowerCase() + ((z.noteType && z.noteType[t.id]) || "") + "." + z.noteDD }];
  for (const pr of z.prelevements) {
    detail.push({ cle: pr.cle, code: pr.code, nom: p.aes && pr.nomAes ? pr.nomAes : pr.nom, taux: pr.taux, montant: R((cif * pr.taux) / 100),
      explication: p.aes && pr.explicationAes ? pr.explicationAes : pr.explication });
  }
  if (p.accises) {
    const ageAccises = etat === "neuf" ? 0 : age.age;
    const ta = tauxAccises(p, t, ageAccises, grosMoteur);
    detail.push({ cle: "da", code: "DA", nom: "Droit d'accises", taux: ta, montant: R(((cif + dd) * ta) / 100),
      explication: ageAccises == null ? "Dépend de l'âge du véhicule : entrez l'année de fabrication. Compté à 0 en attendant."
        : "Calculé sur la valeur CIF plus le droit de douane. Son taux augmente avec l'âge" + (t.cat === "vp" ? " et la cylindrée" : "") + " du véhicule (loi de finances 2026, à confirmer)." });
  }
  const avantTva = cif + detail.reduce((a, l) => a + l.montant, 0);
  const tva = R((avantTva * p.tva) / 100);
  detail.push({ cle: "tva", code: "TVA", nom: "TVA", taux: p.tva, note: p.tvaNote || "", montant: tva,
    explication: "Calculée sur la valeur CIF plus toutes les taxes ci-dessus, pas seulement sur le prix. C'est pour ça qu'elle pèse lourd." });

  const lignes = Object.fromEntries(detail.map((l) => [l.cle, l.montant]));
  const total = detail.reduce((a, l) => a + l.montant, 0);
  return {
    pays: { code: pays, ...p },
    zone: z.nom,
    type: t,
    devise: code,
    conversion,
    cif,
    lignes,
    detail,
    taux: Object.fromEntries(detail.map((l) => [l.cle, l.taux])),
    total,
    coutTotal: cif + total,
    pourcentageCif: cif > 0 ? Math.round((total / cif) * 1000) / 10 : null,
    age,
    documents: documents(p),
  };
}

/** Taux appliqué pour une monnaie : fixe (EUR, XOF), donné, du jour ou de secours. */
function conversionPour(code, taux, fcfaParUnite) {
  const d = DEVISES[code];
  if (d.fixe) return { devise: code, fcfaParUnite: d.fixe, fixe: true };
  if (fcfaParUnite != null) {
    if (typeof fcfaParUnite !== "number" || !Number.isFinite(fcfaParUnite) || fcfaParUnite <= 0) throw new Error("Taux de conversion invalide.");
    return { devise: code, fcfaParUnite, fixe: false, date: null, source: "donné", secours: false };
  }
  const table = taux && taux.fcfa && taux.fcfa[code] > 0 ? taux : TAUX_SECOURS;
  return { devise: code, fcfaParUnite: fcfaPour(code, table), fixe: false, date: table.date || null, source: table.source || null, secours: !!table.secours };
}

/** Facteur total CIF → CIF + droits et taxes, tiré des taux d'une estimation (droit d'accises compris). */
function facteur(est) {
  let hors = 1, da = 0;
  for (const l of est.detail) {
    if (l.cle === "tva") continue;
    if (l.cle === "da") da = l.taux / 100;
    else hors += l.taux / 100;
  }
  const dd = est.taux.dd / 100;
  return (hors + da * (1 + dd)) * (1 + est.taux.tva / 100);
}

/**
 * Budget inverse : « J'ai X au total, quel prix d'achat maximum ? ».
 * `budget` couvre tout (prix + fret + assurance + droits et taxes), dans la monnaie `devise`.
 * Renvoie le prix d'achat maximal (arrondi à l'unité inférieure) et l'estimation correspondante.
 */
export function budgetInverse({ pays, type, budget, fret = 0, assurance = 0, devise = "EUR", taux = null, fcfaParUnite = null, etat = "occasion", annee = null, grosMoteur = false, anneeReference = new Date().getFullYear() }) {
  if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) throw new Error("Budget invalide.");
  const base = { pays, type, etat, annee, fret, assurance, devise, taux, fcfaParUnite, grosMoteur, anneeReference };
  const vide = estimer({ ...base, prix: 0 }); // vérifie pays, type, devise et montants
  const u = vide.conversion.fcfaParUnite;
  const budgetFcfa = Math.floor(budget * u);
  const cifMax = budgetFcfa / facteur(vide);
  let prix = Math.floor(cifMax / u - fret - assurance);
  if (prix < 0) return { possible: false, prixMax: 0, budgetFcfa, minimumFcfa: vide.coutTotal, estimation: vide };
  // Les arrondis au franc décalent le résultat de quelques francs : on ajuste à l'unité près.
  let est = estimer({ ...base, prix });
  for (let i = 0; i < 1000 && prix > 0 && est.coutTotal > budgetFcfa; i++) est = estimer({ ...base, prix: --prix });
  for (let i = 0; i < 1000; i++) {
    const suivant = estimer({ ...base, prix: prix + 1 });
    if (suivant.coutTotal > budgetFcfa) break;
    prix++; est = suivant;
  }
  return { possible: true, prixMax: prix, budgetFcfa, estimation: est };
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
  if (p.zone === "CEMAC") docs.splice(2, 0, ["Bordereau de suivi des cargaisons", "BESC ou équivalent, souvent exigé à l'arrivée en Afrique centrale : votre transitaire vous dira s'il le faut."]);
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
    default: if (p.noteAge) return "Ce véhicule a " + a.age + " an" + (a.age > 1 ? "s" : "") + ". " + p.noteAge;
      return "Ce véhicule a " + a.age + " an" + (a.age > 1 ? "s" : "") + ". Ce calculateur ne connaît pas la limite d'âge pour ce type de véhicule " + p.en + ". Certains pays en fixent une pour les utilitaires et les véhicules anciens : vérifiez auprès des douanes ou d'un transitaire avant d'acheter.";
  }
}
