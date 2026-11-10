// Visiteurs en direct : signal anonyme toutes les 30 s tant que la page est ouverte et visible.
// Pas de cookie : un identifiant aléatoire gardé seulement pour l'onglet (sessionStorage).
(function () {
  if (navigator.webdriver) return; // robots et tests automatiques : non comptés
  var ss; try { ss = window.sessionStorage; } catch (e) { ss = null; }
  function lire(k) { try { return ss && ss.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { ss && ss.setItem(k, v); } catch (e) {} }
  var id = lire("presence-id");
  if (!id) {
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); });
    ecrire("presence-id", id); ecrire("presence-debut", String(Date.now()));
    // Source de la visite, fixée à l'arrivée : ?utm_source=… sinon le site d'où l'on vient.
    var utm = (new URLSearchParams(location.search).get("utm_source") || "").toLowerCase();
    var ref = ""; try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
    var t = utm || ref, source = "Direct";
    if (/tiktok/.test(t)) source = "TikTok"; else if (/whatsapp|wa\.me/.test(t)) source = "WhatsApp";
    else if (/facebook|fb\./.test(t)) source = "Facebook"; else if (/instagram/.test(t)) source = "Instagram";
    else if (/youtube|youtu\.be/.test(t)) source = "YouTube"; else if (/google/.test(t)) source = "Google";
    else if (t && t !== location.hostname) source = "Autre site";
    ecrire("presence-source", source);
  }
  var corps = function (depart) {
    return JSON.stringify({ id: id, page: location.pathname, source: lire("presence-source") || "Direct",
      appareil: (window.matchMedia && matchMedia("(pointer: coarse)").matches) || innerWidth < 760 ? "téléphone" : "ordinateur",
      debut: Number(lire("presence-debut")) || Date.now(), depart: !!depart });
  };
  function envoyer() { if (document.visibilityState === "visible") fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: corps(false), keepalive: true }).catch(function () {}); }
  envoyer();
  setInterval(envoyer, 30000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") envoyer(); });
  window.addEventListener("pagehide", function () {
    var b = new Blob([corps(true)], { type: "application/json" });
    if (!(navigator.sendBeacon && navigator.sendBeacon("/api/presence", b))) fetch("/api/presence", { method: "POST", body: corps(true), keepalive: true }).catch(function () {});
  });
})();
