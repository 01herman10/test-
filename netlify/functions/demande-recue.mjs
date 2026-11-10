// Déclenchée par Netlify à chaque demande validée du formulaire « verification » :
// calcule l'estimation et range la fiche dans le stockage « demandes ».
import { getStore } from "@netlify/blobs";
import { traiterDemande } from "../../douane/demandes.js";

export default {
  async formSubmitted(event) {
    const data = event.data || {};
    const nomFormulaire = data["form-name"] || event.form?.name || event.formName;
    if (nomFormulaire && nomFormulaire !== "verification") return;
    if (!data.whatsapp && !data.vehicule) return;
    const recueLe = new Date().toISOString();
    const id = crypto.randomUUID();
    const fiche = traiterDemande(data, { id, recueLe });
    await getStore({ name: "demandes", consistency: "strong" }).setJSON(`${recueLe}_${id}`, fiche);
    console.log(`Demande enregistrée : ${id} (${fiche.vehicule.modele}, ${fiche.paysDestination})`);
  },
};
