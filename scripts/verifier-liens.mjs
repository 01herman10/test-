// Vérifie que chaque lien, image, script ou feuille de style local cité dans les pages HTML existe.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const racine = resolve(dirname(new URL(import.meta.url).pathname), "..");
const ignorer = new Set(["node_modules", ".git", "video"]);
const pages = [];
(function parcourir(dossier) {
  for (const nom of readdirSync(dossier)) {
    if (ignorer.has(nom)) continue;
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (nom.endsWith(".html")) pages.push(chemin);
  }
})(racine);

let erreurs = 0;
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const [, cible] of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(cible)) continue;
    let fichier = cible.startsWith("/") ? join(racine, cible) : join(dirname(page), cible);
    if (existsSync(fichier) && statSync(fichier).isDirectory()) fichier = join(fichier, "index.html");
    if (!existsSync(fichier)) { console.error(`✗ ${page.slice(racine.length + 1)} → ${cible} introuvable`); erreurs++; }
  }
}
console.log(`${pages.length} pages vérifiées, ${erreurs} erreur(s).`);
process.exit(erreurs ? 1 : 0);
