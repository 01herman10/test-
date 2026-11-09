import { Composition } from "remotion";
import { Vehicule, VehiculeProps } from "./Vehicule";

// Format vertical 1080x1920 (TikTok, Reels, statuts WhatsApp), 6 secondes.
const exemple: VehiculeProps = {
  titre: "Toyota Corolla 2022",
  prix: "5 000 €",
  pays: "Livraison au port d'Abidjan",
  details: "Occasion · Essence · Boîte automatique",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Vehicule"
    component={Vehicule}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={exemple}
  />
);
