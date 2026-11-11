import { test } from "node:test";
import assert from "node:assert/strict";
import { traiterRetour } from "../douane/retours.js";
import { ajouterVisite, resumer } from "../douane/statistiques.js";

const base = { pays: "CI", type: "voiture", etat: "occasion", annee: "2022", devise: "EUR", prix: "5000", fret: "400", assurance: "100" };

test("retour « montant différent » : estimation recalculée et écart", () => {
  const r = traiterRetour({ ...base, montantReel: "1 800 000", couvre: "taxes", commentaire: "  frais de port en plus  " }, { id: "x", recuLe: "2026-11-11", anneeReference: 2026 });
  assert.equal(r.montantEstime, 1607260);
  assert.equal(r.montantReel, 1800000);
  assert.equal(r.ecartPourcent, 12);
  assert.equal(r.commentaire, "frais de port en plus");
  const t = traiterRetour({ ...base, montantReel: 5215024, couvre: "total" }, { id: "y", anneeReference: 2026 });
  assert.equal(t.montantEstime, 5215024);
  assert.equal(t.ecartPourcent, 0);
});

test("retour : champs faux refusés", () => {
  assert.throws(() => traiterRetour({ ...base, montantReel: "" }, { id: "x" }), /Montant payé manquant/);
  assert.throws(() => traiterRetour({ ...base, montantReel: "abc" }, { id: "x" }), /Montant payé invalide/);
  assert.throws(() => traiterRetour({ ...base, montantReel: "50" }, { id: "x" }), /trop petit/);
  assert.throws(() => traiterRetour({ ...base, pays: "FR", montantReel: 100000 }, { id: "x" }), /Pays inconnu/);
  assert.throws(() => traiterRetour({ ...base, type: "avion", montantReel: 100000 }, { id: "x" }), /Type/);
  assert.throws(() => traiterRetour(null, { id: "x" }), /Format/);
});

test("statistiques : compteurs par pays, pays couverts signalés", () => {
  let j = ajouterVisite(null, { pays: "CM", source: "TikTok", appareil: "téléphone" });
  j = ajouterVisite(j, { pays: "CM", source: "WhatsApp", appareil: "téléphone" });
  j = ajouterVisite(j, { pays: "CI", source: "TikTok", appareil: "ordinateur" });
  const k = ajouterVisite(null, { pays: "", source: "Direct" });
  const r = resumer([j, k, null], (c) => ({ CM: "Cameroun", CI: "Côte d'Ivoire" })[c] || c);
  assert.equal(r.visites, 4);
  assert.deepEqual(r.pays[0], { code: "CM", nom: "Cameroun", visites: 2, couvert: false });
  assert.deepEqual(r.pays.find((p) => p.code === "CI"), { code: "CI", nom: "Côte d'Ivoire", visites: 1, couvert: true });
  assert.equal(r.pays.find((p) => p.code === "??").nom, "Inconnu");
  assert.deepEqual(r.sources[0], ["TikTok", 2]);
});
