// Monnaies acceptées par le calculateur et taux de conversion en francs CFA.
// Le franc CFA (XOF en Afrique de l'Ouest, XAF en Afrique centrale) est lié à l'euro par un taux fixe :
// 1 € = 655,957 FCFA. Les autres monnaies bougent chaque jour : le site lit un taux du jour
// (fonction /api/taux) et garde ici des taux de secours datés, utilisés si ce taux n'arrive pas.

/** Taux fixe de l'euro en francs CFA (même valeur pour XOF et XAF). */
export const EUR = 655.957;

export const DEVISES = {
  EUR: { nom: "Euro", symbole: "€", fixe: EUR },
  XOF: { nom: "Franc CFA", symbole: "FCFA", fixe: 1 },
  USD: { nom: "Dollar américain", symbole: "$" },
  CNY: { nom: "Yuan chinois", symbole: "yuan" },
  JPY: { nom: "Yen japonais", symbole: "yen" },
  KRW: { nom: "Won coréen", symbole: "₩" },
  GBP: { nom: "Livre sterling", symbole: "£" },
  AED: { nom: "Dirham des Émirats", symbole: "AED" },
  RUB: { nom: "Rouble russe", symbole: "₽" },
};

// Le franc CFA d'Afrique centrale (XAF) vaut exactement le franc CFA d'Afrique de l'Ouest.
const ALIAS = { XAF: "XOF", FCFA: "XOF", CFA: "XOF" };

/** Code de monnaie reconnu (EUR, XOF, USD…) ou null. */
export function codeDevise(devise) {
  const c = String(devise || "").trim().toUpperCase();
  const code = ALIAS[c] || c;
  return DEVISES[code] ? code : null;
}

export const SOURCE_TAUX = "ExchangeRate-API (open.er-api.com)";
export const ATTRIBUTION_TAUX = "Rates By Exchange Rate API — https://www.exchangerate-api.com";

/**
 * Taux de secours : francs CFA pour 1 unité, relevés le 11 novembre 2026.
 * À mettre à jour de temps en temps ; le taux du jour les remplace dès qu'il est disponible.
 */
export const TAUX_SECOURS = {
  date: "2026-11-11",
  source: SOURCE_TAUX,
  secours: true,
  fcfa: { USD: 586.37, CNY: 87.72, JPY: 3.7002, KRW: 0.4368, GBP: 784.36, AED: 159.67, RUB: 7.06 },
};

/** Francs CFA pour 1 unité de la monnaie. EUR et XOF sont fixes ; les autres viennent du tableau de taux. */
export function fcfaPour(devise, taux = TAUX_SECOURS) {
  const code = codeDevise(devise);
  if (!code) throw new Error(`Devise inconnue : ${devise}. Devises possibles : ${Object.keys(DEVISES).join(", ")}.`);
  if (DEVISES[code].fixe) return DEVISES[code].fixe;
  const v = taux && taux.fcfa && taux.fcfa[code];
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return TAUX_SECOURS.fcfa[code];
}

/**
 * Transforme la réponse de open.er-api.com/v6/latest/EUR en tableau de taux en francs CFA.
 * Renvoie null si la réponse n'a pas la forme attendue (on garde alors les taux de secours).
 */
export function tauxDepuisApiEur(json) {
  if (!json || json.result !== "success" || json.base_code !== "EUR" || !json.rates) return null;
  const fcfa = {};
  for (const code of Object.keys(DEVISES)) {
    if (DEVISES[code].fixe) continue;
    const r = Number(json.rates[code]);
    if (!Number.isFinite(r) || r <= 0) return null;
    fcfa[code] = Math.round((EUR / r) * 10000) / 10000;
  }
  const t = Date.parse(json.time_last_update_utc || "");
  return {
    date: Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null,
    source: SOURCE_TAUX,
    secours: false,
    fcfa,
  };
}

// Mots qui désignent chaque monnaie dans un prix écrit librement.
const MOTS_DEVISE = [
  ["XOF", /f\s?cfa|\bxof\b|\bxaf\b|\bcfa\b|\bfrancs?\b|\d\s*f\b/i],
  ["EUR", /€|\beur\b|\beuros?\b/i],
  ["USD", /\$|\busd\b|\bdollars?\b/i],
  ["CNY", /\bcny\b|\brmb\b|\byuans?\b|元/i],
  ["JPY", /\bjpy\b|\byens?\b|円/i],
  ["KRW", /₩|\bkrw\b|\bwons?\b|원/i],
  ["GBP", /£|\bgbp\b|\blivres?\b/i],
  ["AED", /\baed\b|\bdirhams?\b|\bdhs?\b|د\.إ/i],
  ["RUB", /₽|\brub\b|\broubles?\b|руб/i],
];

/** Transforme "12,500" / "1.234.567" / "6500,50" / "1,234.50" en nombre. */
function lireNombre(brut) {
  let s = brut.replace(/[\s  ']/g, "");
  const virgules = (s.match(/,/g) || []).length, points = (s.match(/\./g) || []).length;
  if (virgules && points) {
    // Le dernier séparateur est celui des décimales ; l'autre sépare les milliers.
    const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    s = s.split(dec === "," ? "." : ",").join("").replace(dec, ".");
  } else if (virgules || points) {
    const sep = virgules ? "," : ".";
    const n = virgules || points;
    const apres = s.length - s.lastIndexOf(sep) - 1;
    // Plusieurs séparateurs, ou un seul suivi de 3 chiffres : séparateur des milliers.
    s = n > 1 || apres === 3 ? s.split(sep).join("") : s.replace(sep, ".");
  }
  return parseFloat(s);
}

/**
 * Lit un montant écrit librement ("5 000 €", "3 000 000 FCFA", "$12,500", "1 200 000 yen") ;
 * renvoie { valeur, devise } ou null. Le signe ¥ seul est ambigu (yen ou yuan) : la devise
 * reste alors celle par défaut et `ambigu` vaut "¥".
 */
export function lireMontantLibre(texte, deviseParDefaut = "EUR") {
  if (texte == null) return null;
  const s = String(texte);
  const m = s.match(/\d(?:[\d.,'\s  ]*\d)?/);
  if (!m) return null;
  const v = lireNombre(m[0]);
  if (!Number.isFinite(v) || v < 0) return null;
  // Si plusieurs monnaies sont citées ("5 000 € soit 3 279 785 FCFA"), on garde la plus proche du montant lu.
  const debut = m.index, fin = m.index + m[0].length;
  let trouve = null;
  for (const [code, re] of MOTS_DEVISE) {
    const x = re.exec(s);
    if (!x) continue;
    const d = x.index >= fin ? x.index - fin : Math.max(0, debut - (x.index + x[0].length));
    if (!trouve || d < trouve.d) trouve = { code, d };
  }
  if (trouve) return { valeur: v, devise: trouve.code };
  if (/¥|￥/.test(s)) return { valeur: v, devise: deviseParDefaut, ambigu: "¥" };
  return { valeur: v, devise: deviseParDefaut };
}
