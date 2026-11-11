// Calculateur de la page d'accueil : lit le formulaire, calcule avec douane/regles.js et affiche le bulletin.
import { PAYS, TYPES, DEVISES, TAUX_SECOURS, estimer, budgetInverse, phraseAge, fcfaPour } from "./douane/regles.js";
import { lireParametres, lienCalcul, texteBulletin, lienPartageWhatsApp, montantDevise, fcfa } from "./douane/partage.js";

const MONTANTS = ["prix", "budget", "fret", "assur"];
const ENTIERS = ["XOF", "JPY", "KRW"];
const LIBELLES = {
  EUR: "Euro (€)", XOF: "Franc CFA (FCFA)", USD: "Dollar américain ($)", CNY: "Yuan chinois (CNY)", JPY: "Yen japonais (JPY)",
  KRW: "Won coréen (₩)", GBP: "Livre sterling (£)", AED: "Dirham des Émirats (AED)", RUB: "Rouble russe (₽)",
};
const $ = (id) => document.getElementById(id);
const anneeMax = new Date().getFullYear();
let taux = TAUX_SECOURS;

// Listes déroulantes
const selP = $("pays"), selT = $("type"), selD = $("devise");
for (const k of Object.keys(PAYS)) selP.add(new Option(PAYS[k].nom, k));
for (const t of TYPES) selT.add(new Option(t.nom, t.id));
for (const k of Object.keys(DEVISES)) selD.add(new Option(LIBELLES[k] || DEVISES[k].nom, k));
selP.value = "CI";
selD.value = "EUR";
$("annee").max = anneeMax;

const radio = (name) => { const r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; };
const choisir = (name, v) => { const r = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (r) r.checked = true; };

// Lit un montant saisi à la française ("5 000,50") ou à l'anglaise ("5000.50").
// Renvoie null si le champ est vide, NaN si la saisie n'est pas un montant valide.
function lireMontant(el) {
  const s = el.value.replace(/[\s  ]/g, "").replace(",", ".");
  if (s === "") return null;
  const v = /^\d*\.?\d+$|^\d+\.$/.test(s) ? Number(s) : NaN;
  return isFinite(v) ? v : NaN;
}
function montant(id) {
  const el = $(id), err = $(id + "-err"), v = lireMontant(el);
  if (v !== v) {
    el.setAttribute("aria-invalid", "true");
    err.textContent = "Montant non reconnu. Utilisez seulement des chiffres, par exemple 5000 ou 5000,50.";
    err.hidden = false;
    return 0;
  }
  el.removeAttribute("aria-invalid");
  err.hidden = true;
  return v === null ? 0 : v;
}
const ecrireMontant = (v, devise) => (ENTIERS.includes(devise) ? String(Math.round(v)) : String(Math.round(v * 100) / 100).replace(".", ","));
const unTaux = (v) => v.toLocaleString("fr-FR", { maximumFractionDigits: v >= 100 ? 2 : 4 });
const dateLisible = (iso) => {
  const d = new Date(iso + "T12:00:00Z");
  return isNaN(d) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

// Ligne d'information sous la monnaie : taux fixe pour l'euro, taux indicatif du jour pour les autres.
function afficherTaux() {
  const d = selD.value, el = $("taux");
  if (d === "XOF") { el.textContent = ""; el.hidden = true; return; }
  el.hidden = false;
  if (d === "EUR") { el.textContent = "Taux fixe : 1 € = 655,957 FCFA."; return; }
  const quand = taux.date ? dateLisible(taux.date) : "";
  el.textContent = "Taux indicatif : 1 " + DEVISES[d].symbole + " = " + unTaux(fcfaPour(d, taux)) + " FCFA" +
    (taux.secours ? " (taux de secours du " + quand + " : le taux du jour n'a pas pu être chargé)" : quand ? " (" + quand + ")" : "") +
    ". La douane applique son taux officiel du jour.";
}

// Convertit les montants déjà saisis quand on change de monnaie, pour que le calcul reste juste.
let devisePrec = selD.value;
function changerDevise() {
  const d = selD.value;
  if (d === devisePrec) return;
  const facteur = fcfaPour(devisePrec, taux) / fcfaPour(d, taux);
  let convertis = 0;
  for (const id of MONTANTS) {
    const el = $(id), v = lireMontant(el);
    if (v === null || v !== v) continue;
    el.value = ecrireMontant(v * facteur, d);
    convertis++;
  }
  const fixes = DEVISES[d].fixe && DEVISES[devisePrec].fixe;
  const c = $("conv");
  c.textContent = convertis ? "Montants convertis en " + DEVISES[d].nom.toLowerCase() + (fixes ? " au taux fixe 1 € = 655,957 FCFA." : " au taux indicatif du jour.") : "";
  c.hidden = !convertis;
  devisePrec = d;
}

function ligne(code, titre, explication, valeur, cls) {
  const li = document.createElement("li");
  if (cls) li.className = cls;
  li.innerHTML = '<span class="code"></span><span class="lab"></span><span class="amt"></span>';
  li.querySelector(".code").textContent = code;
  li.querySelector(".lab").textContent = titre;
  const s = document.createElement("small");
  s.textContent = explication;
  li.querySelector(".lab").appendChild(s);
  li.querySelector(".amt").textContent = fcfa(valeur);
  return li;
}

let dernier = null; // dernière saisie et estimation, pour le partage

function calculer() {
  const p = PAYS[selP.value];
  const t = TYPES.find((x) => x.id === selT.value);
  const devise = selD.value, etat = radio("etat"), mode = radio("mode");
  const annee = parseInt($("annee").value, 10);

  for (const el of document.querySelectorAll(".cur")) el.textContent = "(" + DEVISES[devise].symbole + ")";
  $("champ-prix").hidden = mode === "budget";
  $("champ-budget").hidden = mode !== "budget";
  $("t-port").textContent = p.port;
  $("l-grand").textContent = p.enclave ? "Coût total à l'arrivée" : "Coût total au port";
  $("transit").hidden = !p.enclave;
  $("transit").textContent = p.enclave ? "Pays sans accès à la mer : le véhicule débarque dans un port voisin (Abidjan, Lomé, Cotonou, Dakar, Tema…) puis rejoint " + p.port.replace("Bureau de douane de ", "") + " par la route. Les frais de transit et de transport routier ne sont pas inclus." : "";

  const base = { pays: selP.value, type: t.id, etat, annee, fret: montant("fret"), assurance: montant("assur"), devise, taux, anneeReference: anneeMax };
  const saisie = { pays: base.pays, type: base.type, etat, annee: annee || null, devise, mode, fret: base.fret, assurance: base.assurance };
  let est;
  const rb = $("res-budget");
  rb.hidden = mode !== "budget";
  if (mode === "budget") {
    const budget = montant("budget");
    saisie.budget = budget;
    if (budget > 0) {
      const r = budgetInverse({ ...base, budget });
      est = r.estimation;
      saisie.prix = r.prixMax;
      rb.classList.toggle("bad", !r.possible);
      $("rb-titre").textContent = r.possible ? "Prix d'achat maximum" : "Budget insuffisant";
      $("prix-max").textContent = r.possible ? montantDevise(r.prixMax, devise) : "—";
      $("rb-note").textContent = r.possible
        ? "Avec " + montantDevise(budget, devise) + " au total, le véhicule peut coûter jusqu'à ce prix. Le détail ci-dessous est calculé pour ce prix."
        : "Le fret, l'assurance et leurs taxes coûtent déjà " + fcfa(r.minimumFcfa) + ", soit plus que ce budget.";
    } else {
      est = estimer({ ...base, prix: 0 });
      saisie.prix = 0;
      rb.classList.remove("bad");
      $("rb-titre").textContent = "Prix d'achat maximum";
      $("prix-max").textContent = "—";
      $("rb-note").textContent = "Entrez votre budget total pour voir le prix maximum.";
    }
  } else {
    saisie.prix = montant("prix");
    est = estimer({ ...base, prix: saisie.prix });
  }
  dernier = { saisie, est };

  $("cta-verif").href = "verification/?pays=" + encodeURIComponent(selP.value) + "&type=" + encodeURIComponent(t.id) + (annee ? "&annee=" + annee : "") +
    (saisie.prix > 0 ? "&prix=" + encodeURIComponent(ecrireMontant(saisie.prix, devise)) + "&devise=" + devise : "");

  // Vérification de l'âge
  const al = $("alerte");
  const classe = { neuf: "ok", annee_manquante: "info", refusee: "bad", acceptee: "ok", limite_inconnue: "warn" };
  al.className = "alert " + classe[est.age.statut];
  al.textContent = phraseAge(est);
  $("calc").classList.toggle("dim", est.age.statut === "refusee");

  // Chaque ligne est arrondie au franc avant d'être additionnée : le total est la somme exacte des lignes affichées.
  const L = est.lignes, c = est.conversion;
  const conv = devise === "XOF" ? "" : devise === "EUR" ? ", converti en FCFA (1 € = 655,957 FCFA)" : ", converti en FCFA (1 " + devise + " = " + unTaux(c.fcfaParUnite) + " FCFA, taux indicatif)";
  const ol = $("lignes");
  ol.innerHTML = "";
  ol.appendChild(ligne("CIF", "Valeur en douane", "Prix + fret + assurance" + conv + ". Toutes les taxes se calculent à partir de ce montant.", est.cif, "cif"));
  ol.appendChild(ligne("DD", "Droit de douane · " + t.dd + " %", "La taxe principale. Son taux dépend du type de véhicule : " + t.nom.toLowerCase() + ".", L.dd));
  ol.appendChild(ligne("RS", "Redevance statistique · 1 %", "Finance le suivi des importations par la douane.", L.rs));
  ol.appendChild(ligne("PCS", "Prélèvement UEMOA · 1 %", "Contribution à l'Union économique et monétaire ouest-africaine.", L.pcs));
  ol.appendChild(ligne("PC", (p.aes ? "Prélèvement communautaire" : "Prélèvement CEDEAO") + " · 0,5 %", p.aes ? "Ce pays a quitté la CEDEAO : ce prélèvement est remplacé par celui de l'Alliance des États du Sahel (AES). Taux à confirmer auprès des douanes." : "Contribution à la Communauté des États d'Afrique de l'Ouest.", L.pc));
  ol.appendChild(ligne("TVA", "TVA · " + p.tva + " %" + (p.tvaNote || ""), "Calculée sur la valeur CIF plus toutes les taxes ci-dessus, pas seulement sur le prix. C'est pour ça qu'elle pèse lourd.", L.tva));

  $("total").textContent = fcfa(est.total);
  $("pct").textContent = est.cif > 0 ? ((est.total / est.cif) * 100).toFixed(1).replace(".", ",") + " %" : "—";
  $("grand").textContent = fcfa(est.coutTotal);

  const ul = $("docs");
  ul.innerHTML = "";
  for (const [nom, detail] of est.documents) {
    const li = document.createElement("li"), b = document.createElement("b"), s = document.createElement("span");
    b.textContent = nom; s.textContent = detail;
    li.append(b, s);
    ul.appendChild(li);
  }

  $("wa").href = lienPartageWhatsApp(texteBulletin(est, saisie, lienDuCalcul()));
}

function lienDuCalcul() {
  const s = dernier.saisie;
  return lienCalcul(location.origin + location.pathname, { ...s, prix: s.mode === "budget" ? 0 : s.prix });
}

// Préremplissage depuis l'adresse (lien partagé) : ?pays=SN&type=voiture&annee=2020&devise=USD&prix=12000…
const q = lireParametres(location.search);
if (q.pays) selP.value = q.pays;
if (q.type) selT.value = q.type;
if (q.etat) choisir("etat", q.etat);
if (q.annee) $("annee").value = q.annee;
if (q.devise) { selD.value = q.devise; devisePrec = q.devise; }
const dq = selD.value;
if (q.mode === "budget") { choisir("mode", "budget"); $("budget").value = ecrireMontant(q.budget, dq); }
if (q.prix != null) $("prix").value = ecrireMontant(q.prix, dq);
if (q.fret != null || q.prix != null || q.budget != null) { $("fret").value = ecrireMontant(q.fret || 0, dq); $("assur").value = ecrireMontant(q.assurance || 0, dq); }

selD.addEventListener("change", () => { changerDevise(); afficherTaux(); calculer(); });
for (const id of MONTANTS) $(id).addEventListener("input", () => { $("conv").hidden = true; });
const f = $("f");
f.addEventListener("input", calculer);
f.addEventListener("change", calculer);
f.addEventListener("submit", (e) => e.preventDefault());

$("copier").addEventListener("click", async () => {
  const lien = lienDuCalcul(), msg = $("copie");
  try {
    await navigator.clipboard.writeText(lien);
    msg.textContent = "Lien copié. Collez-le où vous voulez : il rouvre ce calcul avec les mêmes chiffres.";
  } catch {
    msg.textContent = "Copiez ce lien : " + lien;
  }
  msg.hidden = false;
});

afficherTaux();
calculer();

// Taux du jour : remplace les taux de secours dès qu'il arrive.
fetch("/api/taux")
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (!j || !j.fcfa) return;
    taux = { date: j.date, source: j.source, secours: !!j.secours, fcfa: j.fcfa };
    afficherTaux();
    calculer();
  })
  .catch(() => {});
