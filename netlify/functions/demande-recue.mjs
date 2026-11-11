// Déclenchée par Netlify à chaque demande validée du formulaire « verification » :
// calcule l'estimation et range la fiche dans le stockage « demandes ».
import { getStore } from "@netlify/blobs";
import { traiterDemande } from "../../douane/demandes.js";
import { lireTaux } from "../lib/taux.mjs";

export default {
  async formSubmitted(event) {
    const data = event.data || {};
    const nomFormulaire = data["form-name"] || event.form?.name || event.formName;
    if (nomFormulaire && nomFormulaire !== "verification") return;
    if (!data.whatsapp && !data.vehicule) return;
    const ref = String(data.ref || "").toLowerCase();
    const id = /^[0-9a-f-]{36}$/.test(ref) ? ref : crypto.randomUUID();
    const fiche = traiterDemande(data, { id, recueLe: new Date().toISOString(), taux: await lireTaux() });
    fiche.source = "netlify-forms";
    // onlyIfNew : la page a peut-être déjà rangé cette demande via /api/verification.
    const { modified } = await getStore({ name: "demandes", consistency: "strong" }).setJSON(id, fiche, { onlyIfNew: true });
    console.log(`Demande ${modified ? "enregistrée" : "déjà présente"} : ${id}`);
  },
};
