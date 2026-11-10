// Contrôle de la clé d'accès de l'espace privé (variable d'environnement ADMIN_CLE).
import { createHash, timingSafeEqual } from "node:crypto";

const empreinte = (s) => createHash("sha256").update(String(s)).digest();

/** Renvoie une réponse d'erreur (503 ou 401), ou null si la requête porte la bonne clé. */
export function refuserSiNonAutorise(req) {
  const cle = Netlify.env.get("ADMIN_CLE");
  if (!cle) return Response.json({ erreur: "ADMIN_CLE n'est pas configurée sur Netlify." }, { status: 503 });
  const recu = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!recu || !timingSafeEqual(empreinte(recu), empreinte(cle))) {
    return Response.json({ erreur: "Clé d'accès manquante ou incorrecte." }, { status: 401 });
  }
  return null;
}
