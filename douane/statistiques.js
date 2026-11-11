// Statistiques de visites par jour, sans donnée personnelle : seulement des compteurs
// (pays du visiteur, source, appareil). Servent à choisir les prochains pays à ajouter.
import { PAYS } from "./regles.js";

/** Ajoute une visite au compteur du jour (fonction pure : renvoie un nouvel objet). */
export function ajouterVisite(jour, { pays = "", source = "Direct", appareil = "ordinateur" } = {}) {
  const j = jour && typeof jour === "object" ? structuredClone(jour) : { visites: 0, pays: {}, sources: {}, appareils: {} };
  const code = /^[A-Z]{2}$/.test(pays) ? pays : "??";
  j.visites = (j.visites || 0) + 1;
  for (const [cle, v] of [["pays", code], ["sources", source], ["appareils", appareil]]) {
    j[cle] = j[cle] || {};
    j[cle][v] = (j[cle][v] || 0) + 1;
  }
  return j;
}

/**
 * Additionne plusieurs jours. Renvoie le total, la liste des pays (du plus visité au moins visité)
 * avec l'indication « couvert par le calculateur », et les sources.
 */
export function resumer(jours, nomPays = (c) => c) {
  const pays = {}, sources = {}, appareils = {};
  let visites = 0;
  for (const j of jours) {
    if (!j) continue;
    visites += j.visites || 0;
    for (const [dest, src] of [[pays, j.pays], [sources, j.sources], [appareils, j.appareils]]) {
      for (const [k, n] of Object.entries(src || {})) dest[k] = (dest[k] || 0) + n;
    }
  }
  const trier = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  return {
    visites,
    pays: trier(pays).map(([code, n]) => ({ code, nom: code === "??" ? "Inconnu" : nomPays(code), visites: n, couvert: !!PAYS[code] })),
    sources: trier(sources),
    appareils: trier(appareils),
  };
}

/** "2026-11-11" pour une date donnée (heure UTC). */
export const cleJour = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
