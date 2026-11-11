import { test } from "node:test";
import assert from "node:assert/strict";
import { traiterDemande, messageWhatsApp, lienWhatsApp, numeroInternational, rapportHTML } from "../douane/demandes.js";

const formulaire = {
  nom: "Awa Koné", whatsapp: "+242 06 123 4567", email: "", pays_destination: "CI", pays_achat: "France",
  lien_annonce: "https://www.exemple.fr/annonce/123", vehicule: "Toyota Corolla", annee: "2019", type: "voiture",
  prix: "5 000 €", message: "Est-ce que <b>ça</b> passe ?", consentement: "oui",
};

test("une demande complète est estimée", () => {
  const f = traiterDemande(formulaire, { id: "abc", recueLe: "2026-11-10T12:00:00Z", anneeReference: 2026 });
  assert.equal(f.statut, "nouvelle");
  assert.equal(f.estimation.age.statut, "refusee"); // 7 ans > 5 ans en Côte d'Ivoire
  assert.equal(f.estimation.cif, 3279785);
  assert.match(f.remarque, /fret et assurance non inclus/);
});

test("pays hors UEMOA ou type « autre » : pas d'estimation automatique", () => {
  assert.equal(traiterDemande({ ...formulaire, pays_destination: "autre" }, { id: "x" }).estimation, null);
  assert.equal(traiterDemande({ ...formulaire, type: "autre" }, { id: "x" }).estimation, null);
});

test("prix illisible : estimation de l'âge seulement", () => {
  const f = traiterDemande({ ...formulaire, prix: "à discuter" }, { id: "x", anneeReference: 2026 });
  assert.equal(f.estimation.prixLu, null);
  assert.match(f.remarque, /Prix non reconnu/);
});

test("message et lien WhatsApp", () => {
  const f = traiterDemande(formulaire, { id: "abc", anneeReference: 2026 });
  const m = messageWhatsApp(f);
  assert.match(m, /Bonjour Awa Koné/);
  assert.match(m, /Toyota Corolla 2019, destination Côte d'Ivoire/);
  assert.match(m, /Tarif de la vérification : ____/);
  assert.ok(lienWhatsApp(f).startsWith("https://wa.me/242061234567?text="));
  assert.equal(numeroInternational("06 123 4567"), null);
  assert.equal(numeroInternational("00242 06 123 4567"), "242061234567");
});

test("le rapport échappe le texte saisi par le client", () => {
  const html = rapportHTML(traiterDemande({ ...formulaire, vehicule: "<script>alert(1)</script>" }, { id: "abc", recueLe: "2026-11-10T12:00:00Z", anneeReference: 2026 }));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Risque de refus/);
});

test("prix en dollars, yen ou « ¥ » ambigu dans une demande", () => {
  const taux = { date: "2026-12-01", source: "test", secours: false, fcfa: { USD: 600, JPY: 4 } };
  const f = traiterDemande({ ...formulaire, prix: "$10,000" }, { id: "x", anneeReference: 2026, taux });
  assert.equal(f.estimation.devise, "USD");
  assert.equal(f.estimation.cif, 6000000);
  assert.match(rapportHTML(f), /converti à 1 USD = 600 FCFA \(taux indicatif du 2026-12-01\)/);
  assert.match(rapportHTML(traiterDemande(formulaire, { id: "x", anneeReference: 2026 })), /converti à 1 € = 655,957 FCFA\)/);
  assert.equal(traiterDemande({ ...formulaire, prix: "1 500 000 yen" }, { id: "x", taux }).estimation.cif, 6000000);
  assert.match(traiterDemande({ ...formulaire, prix: "¥ 500 000" }, { id: "x" }).remarque, /yen ou yuan/);
});
