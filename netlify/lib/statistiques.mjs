// Compteurs de visites par jour dans le stockage « statistiques » (clé = date, ex. 2026-11-11).
// Écriture conditionnelle (etag) pour ne pas perdre de visite quand deux arrivent en même temps.
import { getStore } from "@netlify/blobs";
import { ajouterVisite, cleJour } from "../../douane/statistiques.js";

export const magasinStats = () => getStore({ name: "statistiques", consistency: "strong" });

export async function compterVisite(visite, t = Date.now()) {
  const st = magasinStats(), cle = cleJour(t);
  for (let essai = 0; essai < 4; essai++) {
    const lu = await st.getWithMetadata(cle, { type: "json" });
    const nouveau = ajouterVisite(lu ? lu.data : null, visite);
    const { modified } = lu ? await st.setJSON(cle, nouveau, { onlyIfMatch: lu.etag }) : await st.setJSON(cle, nouveau, { onlyIfNew: true });
    if (modified) return true;
  }
  return false;
}
