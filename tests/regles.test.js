import { test } from "node:test";
import assert from "node:assert/strict";
import { estimer, phraseAge, lireMontantLibre, PAYS, TYPES } from "../douane/regles.js";

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
  assert.throws(() => estimer({ pays: "CI", type: "voiture", devise: "USD" }), /Devise inconnue/);
});

test("lecture des prix écrits librement", () => {
  assert.deepEqual(lireMontantLibre("5 000 €"), { valeur: 5000, devise: "EUR" });
  assert.deepEqual(lireMontantLibre("3 000 000 FCFA"), { valeur: 3000000, devise: "XOF" });
  assert.deepEqual(lireMontantLibre("6500,50"), { valeur: 6500.5, devise: "EUR" });
  assert.deepEqual(lireMontantLibre("1.234.567 F"), { valeur: 1234567, devise: "XOF" });
  assert.equal(lireMontantLibre("à discuter"), null);
});

test("8 pays et 9 types", () => {
  assert.equal(Object.keys(PAYS).length, 8);
  assert.equal(TYPES.length, 9);
});
