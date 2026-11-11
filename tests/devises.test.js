import { test } from "node:test";
import assert from "node:assert/strict";
import { estimer, budgetInverse } from "../douane/regles.js";
import { DEVISES, TAUX_SECOURS, codeDevise, fcfaPour, tauxDepuisApiEur, lireMontantLibre } from "../douane/devises.js";

test("monnaies fortes disponibles, euro et franc CFA fixes", () => {
  for (const c of ["EUR", "XOF", "USD", "CNY", "JPY", "KRW", "GBP", "AED", "RUB"]) assert.ok(DEVISES[c], c);
  assert.equal(fcfaPour("EUR"), 655.957);
  assert.equal(fcfaPour("XOF"), 1);
  assert.equal(fcfaPour("XAF"), 1); // franc CFA d'Afrique centrale : même valeur
  assert.equal(codeDevise("usd"), "USD");
  assert.equal(codeDevise("BTC"), null);
  for (const c of Object.keys(TAUX_SECOURS.fcfa)) assert.ok(TAUX_SECOURS.fcfa[c] > 0, c);
});

test("estimation en dollars avec un taux donné", () => {
  const e = estimer({ pays: "CI", type: "voiture", prix: 10000, devise: "USD", fcfaParUnite: 600, annee: 2022, anneeReference: 2026 });
  assert.equal(e.cif, 6000000);
  assert.equal(e.devise, "USD");
  assert.equal(e.conversion.fcfaParUnite, 600);
  assert.equal(e.lignes.dd, 1200000);
});

test("estimation avec le tableau du jour, sinon les taux de secours", () => {
  const jour = { date: "2026-12-01", source: "test", secours: false, fcfa: { JPY: 4 } };
  const a = estimer({ pays: "SN", type: "voiture", prix: 1000000, devise: "JPY", taux: jour });
  assert.equal(a.cif, 4000000);
  assert.equal(a.conversion.date, "2026-12-01");
  const b = estimer({ pays: "SN", type: "voiture", prix: 1000000, devise: "JPY" });
  assert.equal(b.cif, Math.round(1000000 * TAUX_SECOURS.fcfa.JPY));
  assert.equal(b.conversion.secours, true);
  // L'euro reste fixe même si un tableau du jour est fourni.
  assert.equal(estimer({ pays: "CI", type: "voiture", prix: 5000, fret: 400, assurance: 100, devise: "EUR", taux: jour }).cif, 3607764);
});

test("lecture de la réponse open.er-api.com", () => {
  const json = { result: "success", base_code: "EUR", time_last_update_utc: "Wed, 11 Nov 2026 00:02:32 +0000",
    rates: { EUR: 1, USD: 1.118669, CNY: 7.477487, JPY: 177.2741, KRW: 1501.638315, GBP: 0.836294, AED: 4.108312, RUB: 92.911591, XOF: 655.957 } };
  const t = tauxDepuisApiEur(json);
  assert.equal(t.date, "2026-11-11");
  assert.equal(t.secours, false);
  assert.equal(t.fcfa.USD, 586.3727);
  assert.equal(t.fcfa.KRW, 0.4368);
  assert.equal(tauxDepuisApiEur({ result: "error" }), null);
  assert.equal(tauxDepuisApiEur({ ...json, rates: { ...json.rates, RUB: undefined } }), null);
});

test("budget inverse : le prix maximal tient dans le budget, un franc de plus le dépasse", () => {
  for (const [devise, budget, fret] of [["EUR", 10000, 800], ["XOF", 6000000, 0], ["USD", 12000, 1000], ["KRW", 15000000, 0], ["JPY", 2000000, 150000]]) {
    const r = budgetInverse({ pays: "CI", type: "voiture", budget, fret, devise });
    assert.ok(r.possible, devise);
    assert.ok(r.estimation.coutTotal <= r.budgetFcfa, devise);
    const plus = estimer({ pays: "CI", type: "voiture", prix: r.prixMax + 1, fret, devise });
    assert.ok(plus.coutTotal > r.budgetFcfa, devise);
  }
  const r = budgetInverse({ pays: "CI", type: "voiture", budget: 10000, fret: 400, assurance: 100, devise: "EUR" });
  // Facteur Côte d'Ivoire voiture : 1,225 × 1,18 = 1,4455 → 10 000 / 1,4455 − 500 ≈ 6 418 €
  assert.equal(r.prixMax, 6418);
  assert.equal(budgetInverse({ pays: "CI", type: "voiture", budget: 100, fret: 400, devise: "EUR" }).possible, false);
  assert.throws(() => budgetInverse({ pays: "CI", type: "voiture", budget: 0 }), /Budget invalide/);
});

test("prix écrits librement dans toutes les monnaies", () => {
  const cas = {
    "5 000 €": [5000, "EUR"], "3 000 000 FCFA": [3000000, "XOF"], "6500,50": [6500.5, "EUR"], "1.234.567 F": [1234567, "XOF"],
    "$12,500": [12500, "USD"], "12 500 USD": [12500, "USD"], "1,234.50 dollars": [1234.5, "USD"],
    "85 000 yuan": [85000, "CNY"], "85000 RMB": [85000, "CNY"], "1 200 000 yen": [1200000, "JPY"], "150万円": [150, "JPY"],
    "₩15,000,000": [15000000, "KRW"], "15 000 000 won": [15000000, "KRW"], "£8,000": [8000, "GBP"],
    "45 000 AED": [45000, "AED"], "45000 dirhams": [45000, "AED"], "900 000 ₽": [900000, "RUB"], "900000 roubles": [900000, "RUB"],
    "5 000 € soit 3 279 785 FCFA": [5000, "EUR"], "4 900 000 FCFA (7 470 €)": [4900000, "XOF"],
  };
  for (const [texte, [valeur, devise]] of Object.entries(cas)) assert.deepEqual(lireMontantLibre(texte), { valeur, devise }, texte);
  assert.deepEqual(lireMontantLibre("¥ 500 000"), { valeur: 500000, devise: "EUR", ambigu: "¥" });
  assert.equal(lireMontantLibre("à discuter"), null);
});
