import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type VehiculeProps = {
  titre: string;
  prix: string;
  pays: string;
  details: string;
};

const encre = "#15232A";
const accent = "#0D5A66";
const jaune = "#F2C230";

export const Vehicule: React.FC<VehiculeProps> = ({ titre, prix, pays, details }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entree = (delai: number) => spring({ frame: frame - delai, fps, config: { damping: 200 } });
  const glisse = (delai: number) => interpolate(entree(delai), [0, 1], [80, 0]);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${accent} 0%, ${encre} 75%)`, fontFamily: "Arial, Helvetica, sans-serif", color: "white", padding: 90, justifyContent: "center", gap: 48 }}>
      <div style={{ fontSize: 44, letterSpacing: 6, textTransform: "uppercase", opacity: entree(0) }}>À vendre</div>
      <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1.05, opacity: entree(8), transform: `translateY(${glisse(8)}px)` }}>{titre}</div>
      <div style={{ fontSize: 52, opacity: entree(20), transform: `translateY(${glisse(20)}px)` }}>{details}</div>
      <div style={{ alignSelf: "flex-start", background: jaune, color: encre, borderRadius: 24, padding: "24px 44px", fontSize: 110, fontWeight: 800, opacity: entree(34), transform: `scale(${interpolate(entree(34), [0, 1], [0.8, 1])})` }}>{prix}</div>
      <div style={{ fontSize: 50, opacity: entree(48), transform: `translateY(${glisse(48)}px)` }}>{pays}</div>
    </AbsoluteFill>
  );
};
