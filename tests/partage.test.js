import { test } from "node:test";
import assert from "node:assert/strict";
import { estimer } from "../douane/regles.js";
import { lireParametres, lienCalcul, texteBulletin, lienPartageWhatsApp, montantDevise } from "../douane/partage.js";

test("montants affichés dans chaque monnaie", () => {
  assert.equal(montantDevise(5000, "EUR"), "5 000 €");
  assert.equal(montantDevise(3279785.4, "XOF"), "3 279 785 FCFA");
  assert.equal(montantDevise(12500.5, "USD"), "12 500,5 $");
  assert.equal(montantDevise(1200000, "JPY"), "1 200 000 yen");
});

test("paramètres d'adresse : valeurs valides gardées, le reste ignoré", () => {
  assert.deepEqual(lireParametres("?pays=ci&type=suv&annee=2021&prix=5000,5&fret=400&devise=usd"),
    { pays: "CI", type: "suv", annee: 2021, devise: "USD", prix: 5000.5, fret: 400 });
  assert.deepEqual(lireParametres("?pays=XX&type=avion&annee=<script>&prix=abc&devise=BTC"), {});
  assert.equal(lireParametres("?budget=10000").mode, "budget");
});

test("le lien rouvre le même calcul", () => {
  const saisie = { pays: "SN", type: "voiture", etat: "occasion", annee: 2020, devise: "JPY", prix: 1200000, fret: 150000, assurance: 0 };
  const lien = lienCalcul("https://douane-afrique.netlify.app/", saisie);
  assert.equal(lien, "https://douane-afrique.netlify.app/?pays=SN&type=voiture&annee=2020&devise=JPY&prix=1200000&fret=150000");
  const relu = lireParametres(new URL(lien).search);
  assert.deepEqual(relu, { pays: "SN", type: "voiture", annee: 2020, devise: "JPY", prix: 1200000, fret: 150000 });
});

test("texte du bulletin WhatsApp", () => {
  const saisie = { pays: "CI", type: "voiture", etat: "occasion", annee: 2022, devise: "EUR", prix: 5000, fret: 400, assurance: 100 };
  const est = estimer({ ...saisie, anneeReference: 2026 });
  const t = texteBulletin(est, saisie, "https://x/?a=1");
  assert.match(t, /Voiture particulière 2022 · occasion → Côte d'Ivoire \(Port d'Abidjan\)/);
  assert.match(t, /Prix : 5 000 €/);
  assert.match(t, /\*Droits et taxes : 1 607 260 FCFA\* \(44,6 %\)/);
  assert.match(t, /Coût total au port : 5 215 024 FCFA/);
  assert.match(t, /Refaire le calcul : https:\/\/x\/\?a=1/);
  assert.ok(!/Taux indicatif/.test(t)); // euro : taux fixe, pas de mention
  const b = texteBulletin(est, { ...saisie, mode: "budget", budget: 10000 });
  assert.match(b, /Budget total : 10 000 €/);
  assert.match(b, /Prix d'achat maximum : 5 000 €/);
  const usd = estimer({ ...saisie, devise: "USD", fcfaParUnite: 600 });
  assert.match(texteBulletin(usd, { ...saisie, devise: "USD" }), /Taux indicatif : 1 USD = 600 FCFA/);
  assert.ok(lienPartageWhatsApp("a b").startsWith("https://wa.me/?text=a%20b"));
});
