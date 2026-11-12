// Met à jour les taux de secours des monnaies (douane/devises.js) avec les taux du jour, avant une mise en ligne.
// Le site lit déjà le taux du jour tout seul (/api/taux) ; ces taux de secours ne servent que si la source ne répond pas,
// ou hors ligne : il faut donc qu'ils soient récents le jour de la mise en ligne.
// Utilisation : node scripts/mettre-a-jour-taux.mjs            (écrit le fichier)
//               node scripts/mettre-a-jour-taux.mjs --essai    (affiche seulement)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tauxDepuisApiEur, TAUX_SECOURS } from "../douane/devises.js";

const FICHIER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../douane/devises.js");
const essai = process.argv.includes("--essai");

const rep = await fetch("https://open.er-api.com/v6/latest/EUR", { signal: AbortSignal.timeout(15000) });
if (!rep.ok) throw new Error("Source des taux injoignable : " + rep.status);
const taux = tauxDepuisApiEur(await rep.json());
if (!taux || !taux.date) throw new Error("Réponse de la source inattendue : taux non mis à jour.");

// Contrôle de vraisemblance : un taux qui bouge de plus de 30 % d'un coup est suspect, on s'arrête.
for (const [code, v] of Object.entries(taux.fcfa)) {
  const ancien = TAUX_SECOURS.fcfa[code];
  const ecart = Math.abs(v - ancien) / ancien;
  console.log(`${code} : ${ancien} → ${v} FCFA (${ecart >= 0.0005 ? (v > ancien ? "+" : "-") + (ecart * 100).toFixed(1) + " %" : "stable"})`);
  if (ecart > 0.3) throw new Error(`Écart anormal pour ${code} (${(ecart * 100).toFixed(0)} %) : vérifier à la main avant de publier.`);
}

const arrondi = (v) => (v >= 100 ? Math.round(v * 100) / 100 : Math.round(v * 10000) / 10000);
const lignes = Object.entries(taux.fcfa).map(([c, v]) => `${c}: ${arrondi(v)}`).join(", ");
const [a, m, j] = taux.date.split("-");
const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][Number(m) - 1];

let src = await fs.readFile(FICHIER, "utf8");
const avant = src;
src = src
  .replace(/relevés le [^.]+\./, `relevés le ${Number(j)} ${mois} ${a}.`)
  .replace(/(export const TAUX_SECOURS = \{\n\s*date: )"[^"]+"/, `$1"${taux.date}"`)
  .replace(/(TAUX_SECOURS = \{[\s\S]*?fcfa: \{ )[^}]+( \})/, `$1${lignes}$2`);
if (src === avant) {
  console.log("Taux déjà à jour.");
} else if (essai) {
  console.log(`\n(essai) Nouveaux taux de secours du ${taux.date} : ${lignes}`);
} else {
  await fs.writeFile(FICHIER, src);
  console.log(`\nTaux de secours mis à jour au ${taux.date} dans douane/devises.js.`);
}
