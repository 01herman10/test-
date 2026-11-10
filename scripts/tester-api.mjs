// Campagne de tests de l'API en ligne. Crée une demande de test, la manipule, puis la supprime.
// Utilisation : ADMIN_CLE=... node scripts/tester-api.mjs [https://douane-afrique.netlify.app]
const BASE = (process.argv[2] || "https://douane-afrique.netlify.app").replace(/\/$/, "");
const CLE = process.env.ADMIN_CLE;
if (!CLE) { console.error("Définir ADMIN_CLE pour tester les adresses privées."); process.exit(2); }

let ok = 0, ko = 0;
const echecs = [];
async function appel(methode, chemin, { corps, cle, brut, entetes } = {}) {
  const h = { ...(entetes || {}) };
  if (cle) h.Authorization = "Bearer " + cle;
  if (corps !== undefined || brut !== undefined) h["Content-Type"] = "application/json";
  const r = await fetch(BASE + chemin, { method: methode, headers: h, body: brut !== undefined ? brut : corps !== undefined ? JSON.stringify(corps) : undefined });
  const texte = await r.text();
  let json = null; try { json = JSON.parse(texte); } catch {}
  return { statut: r.status, json, texte, entetes: r.headers };
}
function verifier(nom, condition, detail = "") {
  if (condition) { ok++; console.log("  ✓ " + nom); }
  else { ko++; echecs.push(nom); console.log("  ✗ " + nom + (detail ? "  → " + detail : "")); }
}
const pasDeFuite = (r) => !/errorType|stack|trace|at .*\.mjs/i.test(r.texte);

console.log("\n# Description et règles");
let r = await appel("GET", "/api");
verifier("GET /api décrit le service", r.statut === 200 && r.json?.service === "API Douane Afrique" && r.json.adresses.length >= 8);
r = await appel("POST", "/api"); verifier("POST /api → 405", r.statut === 405 && r.json?.erreur);
r = await appel("GET", "/api/inexistante"); verifier("adresse inconnue → 404 JSON", r.statut === 404 && r.json?.erreur);
r = await appel("GET", "/api/regles");
verifier("GET /api/regles : 8 pays, 9 types", r.statut === 200 && Object.keys(r.json.pays).length === 8 && r.json.types.length === 9);
verifier("CORS ouvert sur /api/regles", r.entetes.get("access-control-allow-origin") === "*");
r = await appel("POST", "/api/regles"); verifier("POST /api/regles → 405", r.statut === 405 && r.json?.erreur);
r = await appel("OPTIONS", "/api/regles"); verifier("OPTIONS /api/regles → 204", r.statut === 204);

console.log("\n# Estimation");
r = await appel("GET", "/api/estimation?pays=CI&type=voiture&annee=2022&prix=5000&fret=400&assurance=100&devise=EUR");
verifier("exemple de référence : 1 607 260 FCFA", r.statut === 200 && r.json.total === 1607260, r.texte.slice(0, 80));
verifier("total = somme des lignes", r.json && r.json.total === Object.values(r.json.lignes).reduce((a, b) => a + b, 0));
r = await appel("POST", "/api/estimation", { corps: { pays: "NE", type: "voiture", annee: 2022, prix: 5500, devise: "EUR" } });
verifier("POST JSON, Niger TVA 19 % : 1 651 455 FCFA", r.statut === 200 && r.json.total === 1651455, r.texte.slice(0, 80));
r = await appel("GET", "/api/estimation?pays=ci&type=VOITURE&prix=5000"); verifier("codes en minuscules/majuscules acceptés", r.statut === 200);
r = await appel("GET", "/api/estimation?pays=SN&type=bus&annee=2008&prix=3000000&devise=XOF");
verifier("bus de 2008 au Sénégal → refusé (limite 15 ans)", r.json?.age?.statut === "refusee");
r = await appel("GET", "/api/estimation?pays=CI&prix=5000&etat=neuf&annee=1990"); verifier("véhicule neuf → pas de limite", r.json?.age?.statut === "neuf");
r = await appel("GET", "/api/estimation?pays=ML&prix=5000&annee=2000"); verifier("Mali → limite inconnue, documents de transit", r.json?.age?.statut === "limite_inconnue" && r.json.documents.some(([n]) => n === "Documents de transit"));
r = await appel("GET", "/api/estimation?pays=CI&prix=0"); verifier("prix 0 → total 0", r.statut === 200 && r.json.total === 0);
r = await appel("GET", "/api/estimation?pays=CI&prix=5%20000%2C50"); verifier("prix « 5 000,50 » accepté", r.statut === 200 && r.json.cif === Math.round(5000.5 * 655.957));
for (const [nom, q] of [["pays manquant", "prix=5000"], ["pays inconnu", "pays=FR"], ["type inconnu", "pays=CI&type=avion"], ["prix négatif", "pays=CI&prix=-1"], ["prix texte", "pays=CI&prix=abc"], ["prix infini", "pays=CI&prix=1e400"], ["devise inconnue", "pays=CI&devise=USD"], ["année invalide", "pays=CI&annee=20x1"]]) {
  r = await appel("GET", "/api/estimation?" + q);
  verifier(`${nom} → 400 avec message clair`, r.statut === 400 && r.json?.erreur && pasDeFuite(r), r.texte.slice(0, 80));
}
for (const [nom, brut] of [["corps null", "null"], ["corps tableau", "[1,2]"], ["JSON cassé", "{oops"], ["corps nombre", "42"]]) {
  r = await appel("POST", "/api/estimation", { brut });
  verifier(`POST ${nom} → 400 sans détail technique`, r.statut === 400 && pasDeFuite(r) && !/Cannot read/.test(r.texte), r.texte.slice(0, 80));
}
r = await appel("DELETE", "/api/estimation"); verifier("DELETE /api/estimation → 405", r.statut === 405);

console.log("\n# Réception des demandes");
const ref = crypto.randomUUID();
const piege = '<img src=x onerror="alert(1)">';
const demande = { ref, nom: "Test API " + piege, whatsapp: "+242 06 000 0000", email: "", pays_destination: "CI", pays_achat: "France", lien_annonce: "javascript:alert(1)", vehicule: "Peugeot 3008 " + piege, annee: "2017", type: "suv", prix: "9 500 €", message: "Test automatique, à supprimer.", consentement: "oui", "bot-field": "" };
r = await appel("POST", "/api/verification", { corps: demande }); verifier("demande valide → 201", r.statut === 201 && r.json?.ref === ref, r.texte);
r = await appel("POST", "/api/verification", { corps: demande }); verifier("même demande renvoyée → pas de doublon", r.statut === 200 && r.json?.deja === true, r.texte);
r = await appel("POST", "/api/verification", { corps: { ...demande, ref: crypto.randomUUID(), "bot-field": "robot" } }); verifier("piège anti-robots → 204, rien enregistré", r.statut === 204);
r = await appel("POST", "/api/verification", { corps: { ...demande, ref: crypto.randomUUID(), consentement: "" } }); verifier("sans consentement → 400", r.statut === 400);
r = await appel("POST", "/api/verification", { corps: { ...demande, ref: "pas-un-uuid" } }); verifier("référence invalide → 400", r.statut === 400);
r = await appel("POST", "/api/verification", { brut: "x".repeat(30000) }); verifier("demande trop longue → 413", r.statut === 413);
for (const brut of ["null", "[]", "42", "{oops"]) { r = await appel("POST", "/api/verification", { brut }); verifier(`corps ${brut.slice(0, 6)} → 400 sans plantage`, r.statut === 400 && pasDeFuite(r), r.texte.slice(0, 80)); }
r = await appel("GET", "/api/verification"); verifier("GET /api/verification → 405", r.statut === 405);

console.log("\n# Espace privé");
r = await appel("GET", "/api/demandes"); verifier("sans clé → 401", r.statut === 401);
r = await appel("GET", "/api/demandes", { cle: "mauvaise-cle" }); verifier("mauvaise clé → 401", r.statut === 401);
r = await appel("GET", "/api/demandes", { cle: CLE }); const liste = r.json;
verifier("liste avec la bonne clé", r.statut === 200 && Array.isArray(liste?.demandes));
const fiche = liste?.demandes?.find((d) => d.id === ref);
verifier("la demande de test est dans la liste", !!fiche);
verifier("estimation automatique : SUV 2017 → refusé en Côte d'Ivoire", fiche?.estimation?.age?.statut === "refusee");
verifier("lien WhatsApp au format international", fiche?.lienWhatsApp?.startsWith("https://wa.me/242060000000?text="));
verifier("lien d'annonce dangereux (javascript:) écarté", fiche?.vehicule?.lienAnnonce === "");
r = await appel("GET", `/api/demandes/${ref}`, { cle: CLE }); verifier("GET une demande", r.statut === 200 && r.json?.id === ref);
r = await appel("GET", `/api/demandes/${ref}/rapport`, { cle: CLE });
verifier("rapport HTML", r.statut === 200 && /Rapport de vérification/.test(r.texte));
verifier("rapport : code du client neutralisé", !r.texte.includes(piege) && r.texte.includes("&lt;img"));
r = await appel("GET", `/api/demandes/${ref}/inconnue`, { cle: CLE }); verifier("action inconnue → 404", r.statut === 404);
r = await appel("PATCH", `/api/demandes/${ref}`, { cle: CLE, corps: { statut: "contactee", notes: "Tarif proposé : 35 €" } });
verifier("PATCH statut + notes", r.statut === 200 && r.json?.statut === "contactee" && r.json?.notes === "Tarif proposé : 35 €");
r = await appel("PATCH", `/api/demandes/${ref}`, { cle: CLE, corps: { statut: "inventé" } }); verifier("statut inconnu → 400", r.statut === 400);
r = await appel("PATCH", `/api/demandes/${ref}`, { cle: CLE, corps: { notes: "x".repeat(6000) } }); verifier("notes trop longues coupées à 4000", r.json?.notes?.length === 4000);
r = await appel("PATCH", `/api/demandes/${ref}`, { cle: CLE, brut: "{oops" }); verifier("PATCH JSON cassé → pas de plantage", r.statut === 200 && pasDeFuite(r));
r = await appel("PATCH", `/api/demandes/${ref}`, { corps: { statut: "payee" } }); verifier("PATCH sans clé → 401", r.statut === 401);
r = await appel("POST", "/api/demandes", { cle: CLE }); verifier("POST /api/demandes → 405", r.statut === 405);
r = await appel("DELETE", "/api/demandes", { cle: CLE }); verifier("DELETE de toute la liste → 405", r.statut === 405);
r = await appel("GET", "/api/demandes/00000000-0000-4000-8000-000000000000", { cle: CLE }); verifier("demande inexistante → 404", r.statut === 404);
r = await appel("DELETE", `/api/demandes/${ref}`); verifier("DELETE sans clé → 401", r.statut === 401);
r = await appel("DELETE", `/api/demandes/${ref}`, { cle: CLE }); verifier("DELETE avec clé", r.statut === 200 && r.json?.supprime === ref);
r = await appel("DELETE", `/api/demandes/${ref}`, { cle: CLE }); verifier("DELETE une 2e fois → 404", r.statut === 404);

console.log("\n# Visiteurs en direct");
const visiteur = crypto.randomUUID();
r = await appel("POST", "/api/presence", { corps: { id: visiteur, page: "/vitrine/", source: "TikTok", appareil: "téléphone", debut: Date.now() - 90000 } });
verifier("signal de visite → 204", r.statut === 204, r.texte);
for (const [nom, corps] of [["identifiant invalide", { id: "x" }], ["corps null", null], ["sans identifiant", { page: "/" }]]) {
  r = await appel("POST", "/api/presence", { brut: JSON.stringify(corps) }); verifier(`${nom} → 400`, r.statut === 400 && pasDeFuite(r));
}
r = await appel("GET", "/api/presence"); verifier("liste en direct sans clé → 401", r.statut === 401);
r = await appel("GET", "/api/presence", { cle: CLE });
const vu = r.json?.visiteurs?.find((x) => x.page === "Vitrine" && x.source === "TikTok" && x.appareil === "téléphone");
verifier("le visiteur apparaît en direct (Vitrine, TikTok, téléphone)", r.statut === 200 && !!vu, r.texte.slice(0, 120));
verifier("durée de visite calculée (≈ 90 s)", vu && vu.depuisSecondes >= 85 && vu.depuisSecondes < 200);
verifier("total des 24 h présent", r.json?.dernieres24h?.visites >= 1);
const avant = r.json?.enDirect ?? 0;
r = await appel("POST", "/api/presence", { corps: { id: visiteur, depart: true } }); verifier("départ du visiteur → 204", r.statut === 204);
r = await appel("GET", "/api/presence", { cle: CLE }); verifier("le visiteur parti n'est plus compté", r.json?.enDirect === avant - 1, `avant ${avant}, après ${r.json?.enDirect}`);
r = await appel("DELETE", "/api/presence", { cle: CLE }); verifier("DELETE /api/presence → 405", r.statut === 405);

console.log("\n# Fichiers privés");
for (const c of ["/netlify/functions/api-demandes.mjs", "/tests/regles.test.js", "/package.json", "/node_modules/@netlify/blobs/package.json"]) {
  r = await appel("GET", c); verifier(`${c} non publié`, r.statut === 404 || (c === "/package.json" && r.statut === 200));
}

console.log(`\n${ok} réussis, ${ko} échoués`);
if (ko) { console.log("Échecs : " + echecs.join(" ; ")); process.exit(1); }
