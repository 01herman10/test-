// Serveur local qui imite Netlify : pages du site, fonctions /api/* et stockage Netlify Blobs (dans un dossier
// temporaire). Permet de lancer les campagnes de tests complètes sans mettre le site en ligne (donc sans crédits).
// Utilisation : ADMIN_CLE=… node scripts/serveur-local.mjs [port]
// puis, dans un autre terminal : ADMIN_CLE=… node scripts/tester-api.mjs http://localhost:8888
//                               ADMIN_CLE=… BASE=http://localhost:8888 node scripts/tester-app.mjs
// Le pays du visiteur (géolocalisation Netlify) peut être simulé avec l'en-tête « x-pays-test: CM ».
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BlobsServer } from "@netlify/blobs/server";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || process.env.PORT || 8888);
if (!process.env.ADMIN_CLE) console.warn("ADMIN_CLE n'est pas définie : les adresses privées répondront 503.");

// Stockage Netlify Blobs local
const dossierBlobs = await fs.mkdtemp(path.join(os.tmpdir(), "blobs-"));
const blobs = new BlobsServer({ directory: dossierBlobs, token: "local" });
const { port: portBlobs } = await blobs.start();
const urlBlobs = `http://localhost:${portBlobs}`;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: urlBlobs, uncachedEdgeURL: urlBlobs, siteID: "local", token: "local" })).toString("base64");
globalThis.Netlify = { env: { get: (k) => process.env[k] } };

// Fonctions : on lit leur « config.path » comme Netlify.
const versRegex = (motif) => new RegExp("^" + motif.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*$|\*/g, ".*").replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$");
const fonctions = [];
for (const f of await fs.readdir(path.join(RACINE, "netlify/functions"))) {
  if (!f.endsWith(".mjs")) continue;
  const m = await import(pathToFileURL(path.join(RACINE, "netlify/functions", f)).href);
  if (!m.config?.path || typeof m.default !== "function") continue;
  const chemins = [].concat(m.config.path);
  fonctions.push({
    nom: f,
    joker: chemins.some((c) => c.includes("*")),
    motifs: chemins.map(versRegex),
    exclus: [].concat(m.config.excludedPath || []).map(versRegex),
    methodes: m.config.method ? [].concat(m.config.method) : null,
    gerer: m.default,
  });
}
// Les adresses précises passent avant les adresses « joker » (/api/*), comme sur Netlify.
fonctions.sort((a, b) => a.joker - b.joker);

function trouverFonction(chemin, methode) {
  for (const f of fonctions) {
    if (f.exclus.some((r) => r.test(chemin))) continue;
    for (const r of f.motifs) {
      const m = chemin.match(r);
      if (m && (!f.methodes || f.methodes.includes(methode))) return { f, params: { ...(m.groups || {}) } };
    }
  }
  return null;
}

// Redirections de netlify.toml (version simplifiée)
const INTERDITS = /^\/(netlify|tests|scripts|node_modules)\//;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".mp4": "video/mp4", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8" };

async function fichier(chemin) {
  let p = path.join(RACINE, decodeURIComponent(chemin));
  if (!p.startsWith(RACINE)) return null;
  try {
    const st = await fs.stat(p);
    if (st.isDirectory()) p = path.join(p, "index.html");
    return { contenu: await fs.readFile(p), type: TYPES[path.extname(p)] || "application/octet-stream" };
  } catch {
    return null;
  }
}

async function statique(req, url) {
  const c = url.pathname;
  if (c === "/outils/galerie.html") return new Response(null, { status: 301, headers: { Location: "/vitrine/" } });
  if (c.startsWith("/outils/")) return new Response(null, { status: 301, headers: { Location: "/" } });
  // Un dossier sans barre finale : Netlify ajoute la barre.
  if (!path.extname(c) && !c.endsWith("/") && (await fichier(c + "/"))) return new Response(null, { status: 301, headers: { Location: c + "/" + url.search } });
  const f = INTERDITS.test(c) ? null : await fichier(c);
  if (!f) {
    const page404 = await fichier("/404.html");
    return new Response(page404?.contenu || "Page introuvable", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const entetes = { "Content-Type": f.type, "Cache-Control": c === "/sw.js" ? "no-cache" : "public, max-age=0, must-revalidate" };
  // Comme Netlify à la mise en ligne : chaque formulaire data-netlify reçoit un champ caché « form-name ».
  if (f.type.startsWith("text/html")) {
    f.contenu = Buffer.from(f.contenu.toString("utf8").replace(/<form\b([^>]*\bname="([^"]+)"[^>]*\bdata-netlify="true"[^>]*)>/g, '<form$1><input type="hidden" name="form-name" value="$2">'));
  }
  // Netlify Forms : un POST sur une page renvoie la page (le formulaire est gardé par Netlify, pas ici).
  return new Response(req.method === "HEAD" ? null : f.contenu, { status: 200, headers: entetes });
}

const serveur = http.createServer(async (entree, sortie) => {
  try {
    const url = new URL(entree.url, `http://localhost:${PORT}`);
    const morceaux = [];
    for await (const m of entree) morceaux.push(m);
    const corps = morceaux.length ? Buffer.concat(morceaux) : null;
    const req = new Request(url, { method: entree.method, headers: entree.headers, body: ["GET", "HEAD"].includes(entree.method) ? undefined : corps });
    let rep;
    const trouve = url.pathname.startsWith("/api") ? trouverFonction(url.pathname.replace(/\/+$/, "") || "/", entree.method) : null;
    if (trouve) {
      const code = String(entree.headers["x-pays-test"] || "CI").toUpperCase();
      rep = await trouve.f.gerer(req, { params: trouve.params, geo: { country: { code } } });
    } else if (url.pathname.startsWith("/api")) {
      rep = Response.json({ erreur: "Méthode non autorisée." }, { status: 405 });
    } else {
      rep = await statique(req, url);
    }
    sortie.writeHead(rep.status, Object.fromEntries(rep.headers));
    sortie.end(rep.body ? Buffer.from(await rep.arrayBuffer()) : undefined);
  } catch (e) {
    console.error(e);
    sortie.writeHead(500, { "Content-Type": "application/json" });
    sortie.end(JSON.stringify({ erreur: "Erreur du serveur local : " + e.message }));
  }
});

serveur.listen(PORT, () => {
  console.log(`Site local : http://localhost:${PORT}  (stockage : ${dossierBlobs})`);
  console.log("Fonctions : " + fonctions.map((f) => f.nom).join(", "));
});
const arreter = async () => { serveur.close(); await blobs.stop(); await fs.rm(dossierBlobs, { recursive: true, force: true }); process.exit(0); };
process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
