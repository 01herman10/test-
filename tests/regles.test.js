import { test } from "node:test";
import assert from "node:assert/strict";
import { estimer, budgetInverse, phraseAge, lireMontantLibre, PAYS, TYPES } from "../douane/regles.js";

test("exemple du calculateur : voiture d'occasion 2022, 5 000 + 400 + 100 €, Côte d'Ivoire", () => {
  const e = estimer({ pays: "CI", type: "voiture", annee: 2022, prix: 5000, fret: 400, assurance: 100, devise: "EUR", anneeReference: 2026 });
  assert.equal(e.cif, 3607764);
  assert.deepEqual(e.lignes, { dd: 721553, rs: 36078, pcs: 36078, pc: 18039, tva: 795512 });
  assert.equal(e.total, 1607260);
  assert.equal(e.total, Object.values(e.lignes).reduce((a, b) => a + b, 0));
  assert.equal(e.age.statut, "acceptee");
});

test("Niger : TVA à 19 %", () => {
  assert.equal(estimer({ pays: "NE", type: "voiture", prix: 5500, devise: "EUR", annee: 2022, anneeReference: 2026 }).total, 1651455);
});

test("limite d'âge : refus, neuf, limite inconnue, année manquante", () => {
  const base = { type: "voiture", prix: 1000, devise: "EUR", anneeReference: 2026 };
  assert.equal(estimer({ ...base, pays: "CI", annee: 2005 }).age.statut, "refusee");
  assert.equal(estimer({ ...base, pays: "CI", annee: 2005, etat: "neuf" }).age.statut, "neuf");
  assert.equal(estimer({ ...base, pays: "ML", annee: 2005 }).age.statut, "limite_inconnue");
  assert.equal(estimer({ ...base, pays: "CI" }).age.statut, "annee_manquante");
  assert.match(phraseAge(estimer({ ...base, pays: "CI", annee: 2005 })), /En Côte d'Ivoire, la limite est de 5 ans/);
});

test("pays enclavés : documents de transit", () => {
  for (const code of ["BF", "ML", "NE"]) {
    const e = estimer({ pays: code, type: "voiture", prix: 1000, devise: "EUR" });
    assert.ok(e.documents.some(([n]) => n === "Documents de transit"), code);
  }
});

test("entrées invalides refusées", () => {
  assert.throws(() => estimer({ pays: "FR", type: "voiture" }), /Pays inconnu/);
  assert.throws(() => estimer({ pays: "CI", type: "avion" }), /Type inconnu/);
  assert.throws(() => estimer({ pays: "CI", type: "voiture", prix: -5 }), /Montant invalide/);
  assert.throws(() => estimer({ pays: "CI", type: "voiture", devise: "BTC" }), /Devise inconnue/);
  assert.throws(() => estimer({ pays: "CI", type: "voiture", devise: "USD", fcfaParUnite: -1 }), /Taux de conversion invalide/);
});

test("lecture des prix écrits librement", () => {
  assert.deepEqual(lireMontantLibre("5 000 €"), { valeur: 5000, devise: "EUR" });
  assert.deepEqual(lireMontantLibre("3 000 000 FCFA"), { valeur: 3000000, devise: "XOF" });
  assert.deepEqual(lireMontantLibre("6500,50"), { valeur: 6500.5, devise: "EUR" });
  assert.deepEqual(lireMontantLibre("1.234.567 F"), { valeur: 1234567, devise: "XOF" });
  assert.equal(lireMontantLibre("à discuter"), null);
});

test("14 pays (8 UEMOA + 6 CEMAC) et 9 types", () => {
  assert.equal(Object.keys(PAYS).length, 14);
  assert.equal(Object.values(PAYS).filter((p) => p.zone === "UEMOA").length, 8);
  assert.deepEqual(Object.keys(PAYS).filter((k) => PAYS[k].zone === "CEMAC").sort(), ["CF", "CG", "CM", "GA", "GQ", "TD"]);
  assert.equal(TYPES.length, 9);
});

// Valeurs attendues calculées à part (même arrondi au franc par ligne) : CIF 5 000 + 400 + 100 € = 3 607 764 FCFA.
const cemac = { type: "voiture", prix: 5000, fret: 400, assurance: 100, devise: "EUR", anneeReference: 2026 };

test("Cameroun : droit de douane 30 %, TCI, CCI, OHADA/UA, accises selon l'âge, TVA 19,25 %", () => {
  const e = estimer({ ...cemac, pays: "CM", annee: 2010 }); // 16 ans, moteur ≤ 2 500 cm3 → accises 12,5 %
  assert.equal(e.cif, 3607764);
  assert.deepEqual(e.lignes, { dd: 1082329, tci: 36078, cci: 14431, aut: 9019, da: 586262, tva: 1027157 });
  assert.equal(e.total, 2755276);
  assert.deepEqual(e.detail.map((l) => l.code), ["DD", "TCI", "CCI", "AUT", "DA", "TVA"]);
  assert.equal(e.age.statut, "limite_inconnue");
  assert.match(phraseAge(e), /ne fixe pas d'âge maximum/);
  assert.equal(estimer({ ...cemac, pays: "CM", annee: 2010, grosMoteur: true }).total, 3454393); // accises 25 %
  assert.equal(estimer({ ...cemac, pays: "CM", annee: 2020 }).lignes.da, 0); // 6 ans : pas d'accises
  assert.equal(estimer({ ...cemac, pays: "CM", annee: 2020 }).total, 2056159);
  assert.equal(estimer({ ...cemac, pays: "CM", etat: "neuf", grosMoteur: true }).taux.da, 12.5);
  assert.equal(estimer({ ...cemac, pays: "CM", type: "tracteur", annee: 1990 }).taux.da, 0);
  assert.equal(estimer({ ...cemac, pays: "CM", type: "camion", annee: 2008 }).taux.da, 12.5); // 18 ans
});

test("Congo, Gabon : TVA, droits par type et limites d'âge", () => {
  const cg = estimer({ ...cemac, pays: "CG", annee: 2022 });
  assert.equal(cg.total, 2039535);
  assert.equal(cg.lignes.da, undefined); // pas d'accises connues au Congo
  assert.equal(cg.age.statut, "acceptee");
  assert.equal(estimer({ ...cemac, pays: "CG", annee: 2017 }).age.statut, "refusee"); // 9 ans > 7 ans
  assert.equal(estimer({ ...cemac, pays: "CG", type: "camion", annee: 2017 }).age.statut, "acceptee"); // 10 ans pour les marchandises
  const ga = estimer({ ...cemac, pays: "GA", type: "camion", annee: 2020 });
  assert.equal(ga.taux.dd, 20);
  assert.equal(ga.total, 1571073);
  assert.equal(estimer({ ...cemac, pays: "GA", annee: 2014 }).age.statut, "refusee"); // 12 ans > 10 ans
  assert.match(phraseAge(estimer({ ...cemac, pays: "TD", annee: 2010 })), /2009/);
});

test("CEMAC : pays enclavés, papiers et budget inverse avec accises", () => {
  for (const code of ["TD", "CF"]) assert.ok(estimer({ ...cemac, pays: code }).documents.some(([n]) => n === "Documents de transit"), code);
  assert.ok(estimer({ ...cemac, pays: "CG" }).documents.some(([n]) => /suivi des cargaisons/.test(n)));
  const r = budgetInverse({ pays: "CM", type: "voiture", annee: 2010, budget: 15000, fret: 800, devise: "EUR", anneeReference: 2026 });
  assert.ok(r.possible && r.estimation.coutTotal <= r.budgetFcfa);
  assert.ok(estimer({ pays: "CM", type: "voiture", annee: 2010, prix: r.prixMax + 1, fret: 800, devise: "EUR", anneeReference: 2026 }).coutTotal > r.budgetFcfa);
});
