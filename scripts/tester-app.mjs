// Campagne de tests de l'application sur le site en ligne (navigateur Chromium via Playwright).
// Lancement : ADMIN_CLE=… node scripts/tester-app.mjs [dossier-captures]
// Playwright doit être installé à part : npm i -g playwright && npx playwright install chromium
import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const B = process.env.BASE || "https://douane-afrique.netlify.app";
const CLE = process.env.ADMIN_CLE, S = process.argv[2] || "";
if (!CLE) { console.error("Indiquez la clé : ADMIN_CLE=… node scripts/tester-app.mjs"); process.exit(1); }
let ok = 0, ko = 0; const echecs = [];
const v = (nom, c, d = '') => { if (c) { ok++; console.log('  ✓ ' + nom); } else { ko++; echecs.push(nom); console.log('  ✗ ' + nom + (d ? '  → ' + d : '')); } };

const refsTest = [];
(async () => {
  const b = await chromium.launch();
  try {

  console.log('\n# Toutes les pages : ordinateur/téléphone, clair/sombre');
  const pages = ['/', '/verification/', '/verification/merci/', '/vitrine/', '/suivi/', '/admin/'];
  for (const chemin of pages) for (const [nomVue, vue] of [['ordi', { width: 1280, height: 900 }], ['tel', { width: 390, height: 844 }]]) for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: vue, colorScheme: theme });
    const p = await ctx.newPage(); const err = [], ech = [];
    p.on('pageerror', e => err.push(e.message));
    p.on('console', m => { if (m.type() === 'error') err.push(m.text().slice(0, 120)); });
    p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) ech.push(r.status() + ' ' + r.url()); });
    await p.goto(B + chemin, { waitUntil: 'networkidle' }).catch(e => err.push(e.message));
    await p.waitForTimeout(chemin === '/admin/' ? 2500 : 300);
    const info = await p.evaluate(() => ({
      titre: document.title,
      debord: document.documentElement.scrollWidth - window.innerWidth,
      imgSansAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
      champsSansNom: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el => {
        if (el.closest('.cache')) return false;
        const id = el.id; return !(el.closest('label') || (id && document.querySelector(`label[for="${id}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
      }).length,
      fond: getComputedStyle(document.body).backgroundColor,
    }));
    const nom = `${chemin} ${nomVue} ${theme}`;
    v(`${nom} : sans erreur`, err.length === 0 && ech.length === 0, [...err, ...ech].join(' | ').slice(0, 200));
    v(`${nom} : pas de débordement horizontal`, info.debord <= 0, 'débord ' + info.debord + 'px');
    if (chemin !== '/admin/') v(`${nom} : images avec alt, champs avec étiquette`, info.imgSansAlt === 0 && info.champsSansNom === 0, JSON.stringify(info));
    if (S && theme === 'dark' && nomVue === 'tel') await p.screenshot({ path: `${S}/app${chemin.replace(/\//g, '_')}dark.png`, fullPage: true });
    await ctx.close();
  }

  console.log('\n# Calculateur');
  let p = await b.newPage();
  await p.goto(B + '/');
  v('valeur de départ 1 607 260 FCFA', (await p.textContent('#total')).replace(/\s/g, '') === '1607260FCFA');
  await p.fill('#prix', 'abc'); v('montant invalide signalé', await p.isVisible('#prix-err') && (await p.getAttribute('#prix', 'aria-invalid')) === 'true');
  await p.fill('#prix', '5 000,50'); v('virgule et espaces acceptés', !(await p.isVisible('#prix-err')));
  await p.fill('#prix', '5000');
  await p.selectOption('#devise', 'XOF'); v('passage en FCFA : montants convertis', (await p.inputValue('#prix')) === '3279785' && (await p.textContent('#total')).replace(/\s/g, '') === '1607260FCFA');
  await p.selectOption('#devise', 'EUR'); v('retour en euros', (await p.inputValue('#prix')) === '5000');
  await p.waitForResponse(r => r.url().includes('/api/taux'), { timeout: 5000 }).catch(() => {});
  await p.selectOption('#devise', 'USD'); v('en dollars : taux du jour affiché', /Taux indicatif : 1 \$ = [\d ,]+ FCFA \(\d/.test(await p.textContent('#taux')) && !/secours/.test(await p.textContent('#taux')), await p.textContent('#taux'));
  await p.selectOption('#devise', 'EUR'); await p.fill('#prix', '5000'); await p.fill('#fret', '400'); await p.fill('#assur', '100');
  await p.click('label[for=mode-budget]'); await p.fill('#budget', '10000');
  v('mon budget : 10 000 € → prix maximum 6 418 €', (await p.textContent('#prix-max')).replace(/\s/g, '') === '6418€', await p.textContent('#prix-max'));
  const wa = await p.getAttribute('#wa', 'href');
  v('partage WhatsApp du bulletin', wa.startsWith('https://wa.me/?text=') && /Prix d'achat maximum/.test(decodeURIComponent(wa)), wa.slice(0, 120));
  await p.click('label[for=mode-prix]');
  await p.fill('#annee', ''); v('année vide → message d\'aide', /Entrez l'année/.test(await p.textContent('#alerte')));
  await p.fill('#annee', '1975'); v('année trop ancienne → message d\'aide', /Entrez l'année/.test(await p.textContent('#alerte')));
  await p.fill('#annee', String(new Date().getFullYear() + 3)); v('année future → message d\'aide', /Entrez l'année/.test(await p.textContent('#alerte')));
  await p.fill('#annee', '2005'); v('véhicule trop vieux → refus et résultat grisé', /Attention/.test(await p.textContent('#alerte')) && await p.$eval('#calc', e => e.classList.contains('dim')));
  v('bouton « Faire vérifier » visible même grisé', await p.$eval('#cta-verif', e => getComputedStyle(e).opacity) === '1');
  await p.click('label[for=etat-neuf]'); v('neuf → pas de limite', /neuf/.test(await p.textContent('#alerte')));
  await p.click('label[for=etat-occ]');
  await p.selectOption('#pays', 'BF'); v('Burkina : message de transit', await p.isVisible('#transit') && /Ouagadougou/.test(await p.textContent('#transit')));
  await p.fill('#prix', '5 000'); const href = await p.getAttribute('#cta-verif', 'href');
  v('lien « Faire vérifier » avec pays, année et prix', /pays=BF/.test(href) && /annee=2005/.test(href) && /prix=5000&devise=EUR/.test(href), href);
  await p.click('#cta-verif'); await p.waitForLoadState();
  v('formulaire prérempli depuis le calculateur', (await p.inputValue('#pays_destination')) === 'BF' && (await p.inputValue('#annee')) === '2005' && (await p.inputValue('#prix')) === '5000 €');
  await p.close();

  console.log('\n# Formulaire « Faire vérifier mon véhicule » (envoi intercepté)');
  p = await b.newPage();
  const envois = [];
  await p.route('**/api/verification', async r => { envois.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 201, contentType: 'application/json', body: '{"enregistre":true}' }); });
  await p.route('**/verification/merci/', async r => { if (r.request().method() === 'POST') { envois.push({ netlify: r.request().postData() }); await r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>merci</h1>' }); } else await r.continue(); });
  await p.goto(B + '/verification/?pays=XX&annee=<script>&type=avion');
  v('paramètres d\'adresse invalides ignorés', (await p.inputValue('#pays_destination')) === '' && (await p.inputValue('#type')) === 'voiture' && (await p.inputValue('#annee')) === '');
  await p.click('button[type=submit]'); await p.waitForTimeout(500);
  v('formulaire vide : rien n\'est envoyé', envois.length === 0 && p.url().includes('/verification/'));
  await p.fill('#nom', 'Client Test'); await p.fill('#whatsapp', '90 00 00 00'); await p.selectOption('#pays_destination', 'TG'); await p.selectOption('#pays_achat', 'France');
  await p.fill('#vehicule', 'Renault Clio'); await p.fill('#annee', '2020'); await p.check('input[name=consentement]');
  v('WhatsApp : exemple adapté au pays choisi', (await p.getAttribute('#whatsapp', 'placeholder')).startsWith('+228'));
  await p.click('button[type=submit]'); await p.waitForTimeout(500);
  const msgWa = await p.$eval('#whatsapp', el => el.validationMessage);
  v('WhatsApp sans indicatif : envoi bloqué avec explication', envois.length === 0 && /indicatif.*\+228 pour le Togo/.test(msgWa), msgWa);
  v('l\'exemple du numéro n\'est pas un lien d\'appel sur iPhone', await p.$('meta[name="format-detection"][content="telephone=no"]') !== null);
  await p.fill('#whatsapp', '+228 90 00 00 00');
  await p.click('button[type=submit]'); await p.waitForTimeout(1500);
  const api = envois.find(e => e.ref), net = envois.find(e => e.netlify);
  v('envoi à l\'API avec une référence', !!api && /^[0-9a-f-]{36}$/.test(api.ref) && api.vehicule === 'Renault Clio');
  v('puis envoi Netlify Forms avec la même référence', !!net && net.netlify.includes('ref=' + api?.ref) && net.netlify.includes('form-name=verification'));
  v('une seule fois chacun', envois.filter(e => e.ref).length === 1 && envois.filter(e => e.netlify).length === 1);
  await p.close();
  p = await b.newPage();
  const envois2 = [];
  await p.route('**/api/verification', r => r.abort());
  await p.route('**/verification/merci/', async r => { if (r.request().method() === 'POST') { envois2.push(1); await r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }); } else await r.continue(); });
  await p.goto(B + '/verification/');
  await p.fill('#nom', 'Client Test'); await p.fill('#whatsapp', '+242 06 000 0000'); await p.selectOption('#pays_destination', 'TG'); await p.selectOption('#pays_achat', 'France');
  await p.fill('#vehicule', 'Renault Clio'); await p.fill('#annee', '2020'); await p.check('input[name=consentement]');
  await p.click('button[type=submit]'); await p.waitForTimeout(1500);
  v('API injoignable : la demande part quand même à Netlify', envois2.length === 1);
  await p.close();

  console.log('\n# Espace de suivi');
  const ref = crypto.randomUUID(), piege = '<img src=x onerror="window.__xss=1">'; refsTest.push(ref);
  await fetch(B + '/api/verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, nom: 'Test Suivi ' + piege, whatsapp: '+242 06 000 0000', pays_destination: 'SN', pays_achat: 'France', vehicule: 'Kia Sportage ' + piege, annee: '2019', type: 'suv', prix: '12 000 €', message: piege, consentement: 'oui' }) });
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 } }); p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '/suivi/'); await p.fill('#cle', 'mauvaise'); await p.click('#entrer'); await p.waitForTimeout(1500);
  v('mauvaise clé → message, reste sur la connexion', /incorrecte/.test(await p.textContent('#erreur')) && await p.isVisible('#connexion'));
  await p.fill('#cle', CLE); await p.click('#entrer'); await p.waitForSelector('article');
  const carte = p.locator('article', { hasText: 'Kia Sportage' });
  v('la demande apparaît', await carte.count() === 1);
  v('code piégé affiché comme du texte, jamais exécuté', !(await p.evaluate(() => window.__xss)) && (await carte.textContent()).includes('<img'));
  v('nom du pays affiché', (await carte.textContent()).includes('Sénégal'));
  await carte.locator('select').selectOption('payee'); await p.waitForTimeout(2000);
  v('changement de statut enregistré', /Payée\s*1/.test(await p.textContent('#compteurs')));
  await carte.locator('textarea').fill('Rendez-vous lundi'); await carte.locator('textarea').blur(); await p.waitForTimeout(1500);
  const fiche = await (await fetch(B + '/api/demandes/' + ref, { headers: { Authorization: 'Bearer ' + CLE } })).json();
  v('notes enregistrées', fiche.notes === 'Rendez-vous lundi' && fiche.statut === 'payee');
  const [pop] = await Promise.all([ctx.waitForEvent('page'), carte.locator('text=Rapport (PDF)').click()]); await pop.waitForLoadState(); await pop.waitForTimeout(800);
  v('rapport ouvert, sans code exécuté', /Kia Sportage/.test(await pop.textContent('h1')) && !(await pop.evaluate(() => window.__xss)));
  v('bouton WhatsApp vers le bon numéro', (await carte.locator('a.wa').getAttribute('href')).startsWith('https://wa.me/242060000000'));
  await p.click('#sortir'); await p.waitForTimeout(800);
  v('déconnexion : retour à la connexion', await p.isVisible('#connexion'));
  v('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
  await fetch(B + '/api/demandes/' + ref, { method: 'DELETE', headers: { Authorization: 'Bearer ' + CLE } });
  await ctx.close();

  console.log('\n# Liens et anciennes adresses');
  p = await b.newPage();
  const r = await p.goto(B + '/outils/galerie.html'); v('ancienne vitrine → redirigée vers /vitrine/', p.url().endsWith('/vitrine/'));
  await p.goto(B + '/vitrine/');
  v('vitrine : boutons vers le calculateur et la vérification', (await p.$$eval('.hero a', as => as.map(a => a.getAttribute('href')))).join() .includes('../verification/'));
  } catch (e) {
    ko++; echecs.push('arrêt imprévu : ' + e.message.split('\n')[0]); console.log('  ✗ arrêt imprévu : ' + e.message.split('\n')[0]);
  } finally {
    // Les demandes de test sont toujours effacées, même si un test s'arrête en route.
    for (const ref of refsTest) await fetch(B + '/api/demandes/' + ref, { method: 'DELETE', headers: { Authorization: 'Bearer ' + CLE } }).catch(() => {});
    await b.close();
  }
  console.log(`\n${ok} réussis, ${ko} échoués`); if (ko) { console.log('Échecs : ' + echecs.join(' ; ')); process.exitCode = 1; }
})();
