// Moteurs IA partagés par les pages de la boîte à outils.
// Tout tourne dans le navigateur. Les fichiers des moteurs sont dans outils/lib/ ;
// les modèles (voix, Whisper, détourage) sont téléchargés depuis huggingface.co au premier usage,
// puis gardés en cache par le navigateur.
//
// Page qui importe ce module : elle doit déclarer l'import map suivante AVANT tout script module :
//   <script type="importmap">{"imports":{"onnxruntime-web/wasm":"./lib/onnxruntime/ort.wasm.min.mjs"}}</script>

import * as piper from "./lib/piper/piper-tts-web.js";
// transformers.js est chargé depuis jsDelivr (version figée) : le fichier déclenche une fausse alerte
// « clé secrète » du scanner de GitHub, il ne peut donc pas être placé dans le dépôt.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js";

const ici = (p) => new URL(p, import.meta.url).href;

// transformers.js : utiliser les fichiers ONNX Runtime installés dans le dépôt.
env.backends.onnx.wasm.wasmPaths = ici("./lib/transformers/");

// ---------- Voix (Piper) ----------
export const VOIX = [
  { id: "fr_FR-siwis-medium", nom: "Siwis (femme)", licence: "CC-BY 4.0 : citer « voix SIWIS »" },
  { id: "fr_FR-gilles-low", nom: "Gilles (homme)", licence: "CC0 : libre" },
  { id: "fr_FR-upmc-medium", nom: "UPMC (femme)", licence: "CC-BY-SA 4.0" },
];

let voixChargee = null;
/** Transforme un texte en voix. Renvoie un Blob WAV. */
export async function parler(texte, voiceId, progres) {
  if (voixChargee !== voiceId) piper.TtsSession._instance = null; // la bibliothèque ne recharge pas le modèle seule
  const session = await piper.TtsSession.create({
    voiceId,
    progress: (p) => progres && p.total && progres(p.loaded / p.total),
    wasmPaths: {
      onnxWasm: ici("./lib/onnxruntime/"),
      piperData: ici("./lib/piper/piper_phonemize.data"),
      piperWasm: ici("./lib/piper/piper_phonemize.wasm"),
    },
  });
  voixChargee = voiceId;
  return session.predict(texte);
}

// ---------- Transcription (Whisper) ----------
export const WHISPER = {
  rapide: { modele: "onnx-community/whisper-base", nom: "Rapide (≈ 80 Mo)" },
  precis: { modele: "onnx-community/whisper-small", nom: "Précis (≈ 250 Mo, ordinateur conseillé)" },
};
const cacheAsr = {};
function suiviTelechargement(progres) {
  const fichiers = {};
  return (p) => {
    if (!progres || p.status !== "progress" || !p.total) return;
    fichiers[p.file] = [p.loaded, p.total];
    const v = Object.values(fichiers);
    progres(v.reduce((s, x) => s + x[0], 0) / v.reduce((s, x) => s + x[1], 0));
  };
}
/** Lit un fichier audio ou vidéo et le convertit en son mono 16 kHz pour Whisper. */
export async function audio16k(fichier) {
  const ctx = new OfflineAudioContext(1, 1, 16000);
  const buf = await ctx.decodeAudioData(await fichier.arrayBuffer());
  return buf.getChannelData(0);
}
/** Transcrit en français. Renvoie [{debut, fin, texte}] en secondes. */
export async function transcrire(son, qualite, progres) {
  const m = WHISPER[qualite] || WHISPER.rapide;
  cacheAsr[m.modele] ||= pipeline("automatic-speech-recognition", m.modele, { dtype: "q8", device: "wasm", progress_callback: suiviTelechargement(progres) });
  const asr = await cacheAsr[m.modele];
  const out = await asr(son, { language: "french", task: "transcribe", return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
  const duree = son.length / 16000;
  return (out.chunks || [{ timestamp: [0, duree], text: out.text }])
    .map((c) => ({ debut: c.timestamp[0] ?? 0, fin: c.timestamp[1] ?? duree, texte: c.text.trim() }))
    .filter((c) => c.texte);
}

// ---------- Détourage ----------
export const DETOURAGE = {
  personnes: { modele: "Xenova/modnet", dtype: "q8", nom: "Personnes (rapide, ≈ 7 Mo)" },
  objets: { modele: "onnx-community/ormbg-ONNX", dtype: "int8", nom: "Objets et véhicules (≈ 45 Mo)" },
};
const cacheFond = {};
/** Retire le fond d'une image. Renvoie un canvas avec transparence. */
export async function detourer(urlImage, type, progres) {
  const m = DETOURAGE[type] || DETOURAGE.objets;
  cacheFond[m.modele] ||= pipeline("background-removal", m.modele, { dtype: m.dtype, device: "wasm", progress_callback: suiviTelechargement(progres) });
  const p = await cacheFond[m.modele];
  const res = await p(urlImage);
  const img = Array.isArray(res) ? res[0] : res;
  return img.toCanvas();
}

// ---------- Utilitaires ----------
export function srtTemps(s) {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(sec)},${p(ms % 1000, 3)}`;
}
export function versSRT(segments) {
  return segments.map((s, i) => `${i + 1}\n${srtTemps(s.debut)} --> ${srtTemps(s.fin)}\n${s.texte}\n`).join("\n");
}
export function versVTT(segments) {
  return "WEBVTT\n\n" + segments.map((s) => `${srtTemps(s.debut).replace(",", ".")} --> ${srtTemps(s.fin).replace(",", ".")}\n${s.texte}\n`).join("\n");
}
export function telecharger(blob, nom) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
