import { test } from "node:test";
import assert from "node:assert/strict";
import { lireTaux } from "../netlify/lib/taux.mjs";
import { TAUX_SECOURS } from "../douane/devises.js";
import api from "../netlify/functions/api-taux.mjs";
import estimation from "../netlify/functions/api-estimation.mjs";

// Hors de Netlify, le stockage n'est pas disponible : lireTaux doit quand même répondre.
const reponseSource = { result: "success", base_code: "EUR", time_last_update_utc: "Tue, 01 Dec 2026 00:02:32 +0000",
  rates: { USD: 1.1, CNY: 7.5, JPY: 170, KRW: 1500, GBP: 0.84, AED: 4.1, RUB: 92 } };

test("taux du jour lus à la source", async () => {
  const t = await lireTaux({ chercher: async () => new Response(JSON.stringify(reponseSource)) });
  assert.equal(t.date, "2026-12-01");
  assert.equal(t.secours, false);
  assert.equal(t.fcfa.USD, 596.3245);
});

test("source injoignable ou réponse bizarre : taux de secours", async () => {
  assert.deepEqual(await lireTaux({ chercher: async () => { throw new Error("réseau"); } }), TAUX_SECOURS);
  assert.deepEqual(await lireTaux({ chercher: async () => new Response("{}", { status: 200 }) }), TAUX_SECOURS);
  assert.deepEqual(await lireTaux({ chercher: async () => new Response("", { status: 500 }) }), TAUX_SECOURS);
});

test("/api/estimation : euro sans réseau, budget inverse, devise refusée", async () => {
  const appel = (q) => estimation(new Request("http://x/api/estimation?" + q)).then(async (r) => [r.status, await r.json()]);
  const [s1, e1] = await appel("pays=CI&type=voiture&prix=5000&fret=400&assurance=100&devise=EUR&annee=2022");
  assert.equal(s1, 200);
  assert.equal(e1.total, 1607260);
  const [s2, e2] = await appel("pays=CI&type=voiture&budget=10000&fret=400&assurance=100&devise=EUR");
  assert.equal(s2, 200);
  assert.equal(e2.prixMax, 6418);
  const [s3, e3] = await appel("pays=CI&prix=5000&devise=BTC");
  assert.equal(s3, 400);
  assert.match(e3.erreur, /Devise inconnue/);
});

test("/api/taux répond même sans stockage", async () => {
  const vraiFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("pas de réseau dans les tests"); };
  try {
    const r = await api(new Request("http://x/api/taux"));
    const j = await r.json();
    assert.equal(r.status, 200);
    assert.equal(j.fcfa.EUR, 655.957);
    assert.equal(j.fcfa.XOF, 1);
    assert.equal(j.fcfa.USD, TAUX_SECOURS.fcfa.USD);
    assert.equal(j.secours, true);
    assert.match(j.attribution, /Exchange Rate API/);
    assert.equal((await api(new Request("http://x/api/taux", { method: "POST" }))).status, 405);
  } finally {
    globalThis.fetch = vraiFetch;
  }
});
