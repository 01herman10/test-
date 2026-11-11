// Traitement des demandes « Faire vérifier mon véhicule » : estimation, message WhatsApp et rapport.
// Fonctions pures, sans accès réseau ni stockage : utilisées par l'API et par les tests.
import { PAYS, estimer, phraseAge, lireMontantLibre } from "./regles.js";

export const STATUTS = {
  nouvelle: "Nouvelle",
  contactee: "Client contacté",
  payee: "Payée",
  rapport_envoye: "Rapport envoyé",
  abandonnee: "Abandonnée",
};

const NOMS_ACHAT = ["France", "Belgique", "Allemagne", "Pays-Bas", "Italie", "Espagne", "Canada", "États-Unis", "Autre"];

function texte(v, max = 500) {
  return v == null ? "" : String(v).trim().slice(0, max);
}

/** Transforme les champs envoyés par le formulaire en fiche de demande, avec l'estimation. */
export function traiterDemande(data, { id, recueLe = new Date().toISOString(), anneeReference, taux = null } = {}) {
  const fiche = {
    id,
    recueLe,
    statut: "nouvelle",
    notes: "",
    client: {
      nom: texte(data.nom, 120),
      whatsapp: texte(data.whatsapp, 40),
      email: texte(data.email, 160),
    },
    vehicule: {
      modele: texte(data.vehicule, 120),
      annee: parseInt(data.annee, 10) || null,
      type: texte(data.type, 20) || "voiture",
      prixTexte: texte(data.prix, 60),
      lienAnnonce: /^https?:\/\//i.test(texte(data.lien_annonce)) ? texte(data.lien_annonce, 600) : "",
      paysAchat: NOMS_ACHAT.includes(texte(data.pays_achat)) ? texte(data.pays_achat) : texte(data.pays_achat, 40),
    },
    paysDestination: texte(data.pays_destination, 10),
    message: texte(data.message, 2000),
    estimation: null,
    remarque: "",
  };

  const montant = lireMontantLibre(fiche.vehicule.prixTexte);
  if (!PAYS[fiche.paysDestination]) {
    fiche.remarque = "Pays de destination pas encore couvert par le calculateur : estimation à faire à la main.";
  } else if (fiche.vehicule.type === "autre") {
    fiche.remarque = "Type de véhicule « autre » : estimation à faire à la main.";
  } else {
    try {
      const est = estimer({
        pays: fiche.paysDestination,
        type: fiche.vehicule.type,
        annee: fiche.vehicule.annee,
        prix: montant ? montant.valeur : 0,
        devise: montant ? montant.devise : "EUR",
        taux,
        anneeReference,
      });
      fiche.estimation = {
        devise: est.devise,
        conversion: est.conversion,
        cif: est.cif,
        lignes: est.lignes,
        taux: est.taux,
        total: est.total,
        coutTotal: est.coutTotal,
        age: est.age,
        phraseAge: phraseAge(est),
        documents: est.documents,
        prixLu: montant ? montant.valeur : null,
      };
      fiche.remarque = !montant
        ? "Prix non reconnu : estimation des taxes à refaire avec le prix."
        : montant.ambigu
          ? "Prix en « ¥ » sans préciser yen ou yuan : compté en euros, à vérifier avec le client."
          : "Estimation sur le prix seul : fret et assurance non inclus.";
    } catch (e) {
      fiche.remarque = "Estimation impossible : " + e.message;
    }
  }
  return fiche;
}

/** ", converti à 1 € = 655,957 FCFA" ou ", converti à 1 USD = 586,37 FCFA (taux indicatif du 2026-11-11)". */
function phraseConversion(e) {
  const c = e.conversion;
  if (!c || e.devise === "XOF") return "";
  const t = c.fcfaParUnite.toLocaleString("fr-FR", { maximumFractionDigits: 4 }).replace(/[\u00a0\u202f]/g, " ");
  const unite = e.devise === "EUR" ? "1 €" : "1 " + e.devise;
  return ", converti à " + unite + " = " + t + " FCFA" + (c.fixe ? "" : " (taux indicatif" + (c.date ? " du " + c.date : "") + ")");
}

const FCFA = (n) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ") + " FCFA";

/** Premier message à envoyer au client sur WhatsApp ; le tarif reste à compléter. */
export function messageWhatsApp(fiche) {
  const p = PAYS[fiche.paysDestination];
  const v = fiche.vehicule;
  const lignes = [
    `Bonjour ${fiche.client.nom || ""},`.trim(),
    "",
    `Merci pour votre demande de vérification : ${[v.modele, v.annee].filter(Boolean).join(" ")}${p ? `, destination ${p.nom}` : ""}.`,
  ];
  if (fiche.estimation) {
    lignes.push("", "Premier constat :", `• ${fiche.estimation.phraseAge}`);
    if (fiche.estimation.prixLu) lignes.push(`• Droits et taxes estimés : environ ${FCFA(fiche.estimation.total)} (hors fret et assurance).`);
  }
  lignes.push(
    "",
    "Le rapport complet vérifie aussi les papiers, le coût total à l'arrivée et les signaux d'alerte de l'annonce.",
    "Tarif de la vérification : ____ .",
    "",
    "Souhaitez-vous que nous continuions ?"
  );
  return lignes.join("\n");
}

/** Numéro WhatsApp au format international (chiffres seuls) ; null si l'indicatif manque. */
export function numeroInternational(numero) {
  const s = String(numero || "").trim();
  let chiffres = s.replace(/\D/g, "");
  if (s.startsWith("00")) chiffres = chiffres.slice(2);
  else if (!s.startsWith("+")) return null;
  return chiffres.length >= 8 ? chiffres : null;
}

export function lienWhatsApp(fiche) {
  const n = numeroInternational(fiche.client.whatsapp);
  const msg = encodeURIComponent(messageWhatsApp(fiche));
  return n ? `https://wa.me/${n}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

const echapper = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Rapport de vérification en HTML, prêt à imprimer en PDF. */
export function rapportHTML(fiche) {
  const p = PAYS[fiche.paysDestination];
  const v = fiche.vehicule;
  const e = fiche.estimation;
  const date = new Date(fiche.recueLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const verdict = !e ? "À vérifier à la main" : { refusee: "Risque de refus", acceptee: "Âge accepté", neuf: "Véhicule neuf", limite_inconnue: "Limite à confirmer", annee_manquante: "Année manquante" }[e.age.statut];
  const couleur = !e ? "#566870" : e.age.statut === "refusee" ? "#B3261E" : e.age.statut === "acceptee" || e.age.statut === "neuf" ? "#1E7448" : "#7A4B00";
  const ligne = (code, nom, montant) => `<tr><td class="c">${code}</td><td>${echapper(nom)}</td><td class="m">${FCFA(montant)}</td></tr>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Rapport de vérification ${echapper(v.modele)}</title>
<style>
body{margin:0;background:#EDF1F0;color:#15232A;font:15px/1.5 "IBM Plex Sans",system-ui,sans-serif}
.page{max-width:760px;margin:24px auto;background:#fff;border:1px solid #D2DBDA;border-radius:12px;padding:32px}
h1{font:800 26px/1.15 Archivo,"Arial Narrow",Arial,sans-serif;margin:0 0 4px}
h2{font:600 17px Archivo,Arial,sans-serif;margin:24px 0 8px;color:#0D5A66}
.meta{color:#566870;font-size:13px}.verdict{display:inline-block;margin:14px 0 6px;padding:6px 14px;border-radius:999px;color:#fff;font-weight:600;background:${couleur}}
table{width:100%;border-collapse:collapse}td{padding:7px 6px;border-bottom:1px solid #E3E9E8;vertical-align:top}
td.c{font:500 12px "IBM Plex Mono",monospace;color:#566870;width:46px}td.m{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
tr.t td{font-weight:700;background:#F2C230;border:0}ul{margin:0;padding-left:20px}li{margin:4px 0}
.note{font-size:12px;color:#566870;margin-top:24px}.imp{margin:16px auto;text-align:center}
.imp button{font:600 15px system-ui;padding:10px 18px;border:0;border-radius:8px;background:#0D5A66;color:#fff;cursor:pointer}
@media print{body{background:#fff}.page{border:0;margin:0;padding:0}.imp{display:none}}
</style></head><body>
<div class="imp"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>
<div class="page">
<div class="meta">Douane Afrique · Rapport de vérification avant achat · ${echapper(date)}</div>
<h1>${echapper([v.modele, v.annee].filter(Boolean).join(" ")) || "Véhicule"}</h1>
<div class="meta">Pour ${echapper(fiche.client.nom)} · véhicule en ${echapper(v.paysAchat || "?")} · destination ${echapper(p ? p.nom : fiche.paysDestination)}</div>
<div class="verdict">${verdict}</div>
${e ? `<p>${echapper(e.phraseAge)}</p>` : `<p>${echapper(fiche.remarque)}</p>`}
${e && e.prixLu ? `<h2>Droits et taxes estimés</h2>
<table>
${ligne("CIF", "Valeur retenue (prix seul" + phraseConversion(e) + ")", e.cif)}
${ligne("DD", `Droit de douane · ${e.taux.dd} %`, e.lignes.dd)}
${ligne("RS", "Redevance statistique · 1 %", e.lignes.rs)}
${ligne("PCS", "Prélèvement UEMOA · 1 %", e.lignes.pcs)}
${ligne("PC", (p && p.aes ? "Prélèvement communautaire" : "Prélèvement CEDEAO") + " · 0,5 %", e.lignes.pc)}
${ligne("TVA", `TVA · ${e.taux.tva} %`, e.lignes.tva)}
<tr class="t"><td></td><td>Total droits et taxes</td><td class="m">${FCFA(e.total)}</td></tr>
</table>
<p class="meta">Fret maritime et assurance non inclus : ils s'ajoutent à la valeur en douane et augmentent les taxes. Coût prix + taxes : ${FCFA(e.coutTotal)}.</p>` : ""}
${e ? `<h2>Papiers à réunir</h2><ul>${e.documents.map(([n, d]) => `<li><b>${echapper(n)}</b> : ${echapper(d)}</li>`).join("")}</ul>` : ""}
<h2>Points vérifiés sur l'annonce</h2>
<ul><li>Prix cohérent avec le marché pour ce modèle et cette année : ____</li><li>Kilométrage cohérent avec l'âge : ____</li><li>Historique et contrôle technique : ____</li><li>Vendeur et papiers : ____</li></ul>
${v.lienAnnonce ? `<p class="meta">Annonce : ${echapper(v.lienAnnonce)}</p>` : ""}
<p class="note">Estimation indicative fondée sur le tarif commun de l'UEMOA et les règles connues du pays de destination. Les taux et limites d'âge doivent être confirmés auprès des douanes ou d'un transitaire agréé avant l'achat.</p>
</div></body></html>`;
}
