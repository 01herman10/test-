// Taux de change du jour en francs CFA, gardés 12 heures dans le stockage « taux ».
// Source : open.er-api.com (gratuit, sans clé, attribution obligatoire). Si la source ne répond pas,
// on garde le dernier taux connu, puis les taux de secours inscrits dans douane/devises.js.
import { getStore } from "@netlify/blobs";
import { TAUX_SECOURS, tauxDepuisApiEur } from "../../douane/devises.js";

const DUREE = 12 * 3600 * 1000;
const URL_SOURCE = "https://open.er-api.com/v6/latest/EUR";

export async function lireTaux({ maintenant = Date.now(), chercher = fetch } = {}) {
  let magasin = null, garde = null;
  try {
    magasin = getStore({ name: "taux", consistency: "strong" });
    garde = await magasin.get("dernier", { type: "json" });
  } catch {
    magasin = null; // stockage indisponible : on continue sans cache
  }
  if (garde && garde.lu && maintenant - garde.lu < DUREE) return garde.taux;
  try {
    const rep = await chercher(URL_SOURCE, { signal: AbortSignal.timeout(5000) });
    const taux = rep.ok ? tauxDepuisApiEur(await rep.json()) : null;
    if (taux) {
      if (magasin) await magasin.setJSON("dernier", { lu: maintenant, taux }).catch(() => {});
      return taux;
    }
  } catch {
    // source injoignable : on retombe sur le dernier taux connu
  }
  if (garde && garde.taux) return { ...garde.taux, ancien: true };
  return TAUX_SECOURS;
}
