import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = path.resolve('design-mockups/videos');
const outputPath = path.join(outputDir, 'path-medewerker-naar-backoffice-30s.webm');
mkdirSync(outputDir, { recursive: true });
if (existsSync(outputPath)) rmSync(outputPath);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1536, height: 1024 },
  recordVideo: { dir: outputDir, size: { width: 1536, height: 1024 } },
});
const page = await context.newPage();
const video = page.video();

await page.setContent(`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<style>
  *{box-sizing:border-box}
  html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#031322;font-family:Inter,"Segoe UI",sans-serif;color:#f7f4ec}
  button{font:inherit}
  .stage,.scene{position:absolute;inset:0;width:1536px;height:1024px;overflow:hidden}
  .scene{opacity:0;transition:opacity .8s ease,transform .8s ease;transform:scale(1.012)}
  .scene.active{opacity:1;transform:scale(1);z-index:2}
  .design{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .wash{position:absolute;inset:0;background:rgba(1,15,27,.08);pointer-events:none}
  .chapter{position:absolute;z-index:30;left:50%;top:25px;transform:translate(-50%,-16px);display:flex;align-items:center;gap:12px;padding:11px 18px;border:1px solid rgba(133,214,163,.35);border-radius:999px;background:rgba(4,23,37,.91);box-shadow:0 14px 35px rgba(0,0,0,.28);opacity:0;transition:.45s ease;backdrop-filter:blur(12px);font-size:13px;font-weight:750;letter-spacing:.04em}
  .chapter.on{opacity:1;transform:translate(-50%,0)}
  .chapter b{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#6fcc93;color:#08251b}
  .cursor{position:absolute;z-index:40;width:29px;height:29px;border:2px solid #fff;border-radius:50%;background:rgba(117,211,151,.35);box-shadow:0 0 0 8px rgba(117,211,151,.12),0 8px 22px rgba(0,0,0,.35);opacity:0;transform:translate(-50%,-50%);transition:left .72s cubic-bezier(.2,.75,.25,1),top .72s cubic-bezier(.2,.75,.25,1),opacity .25s ease,box-shadow .2s ease}
  .cursor.on{opacity:1}.cursor.click{box-shadow:0 0 0 18px rgba(117,211,151,0),0 8px 22px rgba(0,0,0,.35)}
  .toast{position:absolute;z-index:50;right:28px;bottom:27px;display:flex;align-items:center;gap:13px;max-width:470px;padding:15px 19px;border:1px solid rgba(117,211,151,.38);border-radius:15px;background:rgba(3,24,38,.95);box-shadow:0 22px 58px rgba(0,0,0,.42);font-size:14px;font-weight:720;opacity:0;transform:translateY(18px);transition:.35s ease;backdrop-filter:blur(15px)}
  .toast.on{opacity:1;transform:none}.toast i{display:grid;place-items:center;width:31px;height:31px;border-radius:50%;background:#74d29a;color:#08241a;font-style:normal;font-weight:900}
  .focus{position:absolute;border:2px solid #7bd59e;border-radius:22px;box-shadow:0 0 0 9999px rgba(1,14,24,.18),0 0 34px rgba(123,213,158,.26);opacity:0;transform:scale(.985);transition:.4s ease}
  .focus.on{opacity:1;transform:none}

  /* Employee / Bento scene */
  .employee .focus-week{left:708px;top:81px;width:181px;height:584px;border-radius:29px}
  .employee .focus-flow{left:53px;top:658px;width:837px;height:260px}
  .employee .focus-customer{left:910px;top:513px;width:534px;height:405px}
  .day-overlay{position:absolute;z-index:6;left:708px;top:282px;width:181px;height:80px;padding:15px 20px;display:flex;align-items:center;justify-content:space-between;color:#fff;background:linear-gradient(90deg,#163b30,#102b2a);opacity:0;transform:translateX(-10px);transition:.4s ease}
  .day-overlay.on{opacity:1;transform:none}.day-overlay strong{font-size:18px;color:#86d5a2}.day-overlay small{display:block;margin-top:4px;color:#b6c9bf}
  .editor{position:absolute;z-index:10;left:360px;top:175px;width:720px;padding:25px 27px;border:1px solid rgba(131,207,159,.35);border-radius:24px;background:linear-gradient(145deg,rgba(5,30,43,.98),rgba(10,52,47,.97));box-shadow:0 28px 90px rgba(0,0,0,.52);opacity:0;transform:translateY(18px) scale(.98);transition:.5s ease}
  .editor.on{opacity:1;transform:none}.eyebrow{color:#7ed39d;font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.editor h2,.confirm h2,.handoff h2,.reason h2,.finish h2{margin:7px 0 8px;font:38px Georgia,serif}.editor p,.confirm p,.handoff p,.reason p,.finish p{margin:0;color:#b9c5c4;font-size:14px;line-height:1.55}
  .fields{display:grid;grid-template-columns:1.6fr 1.2fr .65fr;gap:12px;margin-top:21px}.field{border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:12px;background:rgba(1,18,30,.52)}.field label{display:block;color:#8fa6a5;font-size:11px;margin-bottom:7px}.field b{font-size:14px}.field.hours{border-color:#81d49f;box-shadow:0 0 18px rgba(117,211,151,.12)}
  .editor-actions{display:flex;justify-content:space-between;align-items:center;margin-top:20px}.saved{color:#7dd69d;font-size:13px}.primary{border:0;border-radius:10px;padding:13px 19px;background:linear-gradient(90deg,#d48500,#f1a000);color:#fff;font-weight:800;box-shadow:0 10px 25px rgba(227,145,0,.23)}
  .ring-overlay{position:absolute;z-index:7;left:941px;top:95px;width:504px;height:396px;display:grid;place-items:center;border-radius:28px;background:rgba(6,27,45,.92);opacity:0;transition:.45s ease}.ring-overlay.on{opacity:1}.ring{display:grid;place-items:center;width:292px;height:292px;border-radius:50%;background:conic-gradient(#78ca92 0 13%,rgba(255,255,255,.09) 13%);box-shadow:inset 0 0 0 12px rgba(6,27,45,.95)}.ring div{text-align:center}.ring small{display:block;color:#b6c4c5;letter-spacing:.08em}.ring strong{display:block;font:94px Georgia,serif}.ring span{color:#80d39b;font-size:28px}
  .confirm{position:absolute;z-index:13;left:445px;top:280px;width:645px;padding:28px;border:1px solid rgba(232,163,47,.55);border-radius:22px;background:rgba(5,25,38,.98);box-shadow:0 30px 100px rgba(0,0,0,.58);opacity:0;transform:scale(.95);transition:.45s ease}.confirm.on{opacity:1;transform:none}.confirm h2{font-size:32px}.warning{display:flex;gap:13px;margin:18px 0;padding:14px;border-radius:12px;background:rgba(226,146,0,.12);color:#ffd58d}.warning b{display:grid;place-items:center;min-width:30px;height:30px;border:1px solid #e49712;border-radius:50%}.confirm-actions{display:flex;justify-content:flex-end;gap:11px}.secondary{border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:12px 17px;background:transparent;color:#fff}
  .flow-svg{position:absolute;z-index:7;left:103px;top:718px;width:720px;height:70px}.flow-base{fill:none;stroke:rgba(255,255,255,.24);stroke-width:2;stroke-dasharray:5 5}.flow-live{fill:none;stroke:#7bd59e;stroke-width:5;stroke-linecap:round;stroke-dasharray:720;stroke-dashoffset:720;filter:drop-shadow(0 0 7px rgba(123,213,158,.65));transition:stroke-dashoffset 1.2s ease}.flow-live.one{stroke-dashoffset:480}.flow-live.two{stroke-dashoffset:240}.flow-live.all{stroke-dashoffset:0}
  .customer-modal{position:absolute;z-index:12;left:910px;top:520px;width:540px;padding:26px;border:1px solid rgba(42,82,63,.25);border-radius:22px;background:rgba(246,241,230,.98);box-shadow:0 28px 80px rgba(0,0,0,.38);color:#18322a;opacity:0;transform:translateY(18px);transition:.5s ease}.customer-modal.on{opacity:1;transform:none}.customer-modal h2{margin:5px 0 8px;font:34px Georgia,serif}.customer-modal p{margin:0;color:#596862;font-size:14px}.choices{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:18px}.choice{padding:14px 12px;border:1px solid #aec1b6;border-radius:11px;background:#fff;color:#163027;font-size:12px;font-weight:800;transition:.35s ease}.choice.selected{background:#d98c08;border-color:#d98c08;color:#fff;transform:translateY(-3px);box-shadow:0 11px 25px rgba(196,125,6,.28)}.waiting{display:none;margin-top:17px;padding:13px;border:1px solid #d8ad63;border-radius:11px;background:#fff4df;color:#89540d;font-size:13px;font-weight:780}.waiting.on{display:block;animation:rise .4s ease both}

  /* Handoff */
  .handoff-scene{position:absolute;inset:0;width:1536px;height:1024px;z-index:20;background:radial-gradient(circle at 50% 48%,#123b34 0,#061c2b 43%,#031321 100%);display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .7s ease}.handoff-scene.on{opacity:1}.handoff{width:990px;text-align:center}.handoff h2{font-size:56px}.handoff-track{position:relative;height:160px;margin-top:34px}.handoff-track:before{content:"";position:absolute;left:100px;right:100px;top:78px;height:2px;background:rgba(255,255,255,.17)}.handoff-live{position:absolute;left:100px;top:76px;width:0;height:5px;border-radius:4px;background:#7bd59e;box-shadow:0 0 18px rgba(123,213,158,.7);transition:width 2.3s ease}.handoff-live.go{width:790px}.role{position:absolute;top:24px;width:112px;text-align:center}.role.employee-role{left:44px}.role.admin-role{right:44px}.role i{display:grid;place-items:center;margin:auto;width:72px;height:72px;border:2px solid #7bd59e;border-radius:50%;background:#092638;font-style:normal;font-size:29px}.role span{display:block;margin-top:10px;font-weight:800}.packet{position:absolute;left:117px;top:51px;width:54px;height:54px;display:grid;place-items:center;border-radius:15px;background:#db900a;color:#fff;font-size:23px;box-shadow:0 0 25px rgba(219,144,10,.45);transition:left 2.3s ease}.packet.go{left:817px}

  /* Admin / Metro scene */
  .admin .focus-shawn{left:36px;top:580px;width:1054px;height:79px;border-radius:8px}.admin .focus-node{left:701px;top:564px;width:73px;height:73px;border-radius:50%;border-color:#5ca7ff;box-shadow:0 0 0 9999px rgba(1,14,24,.12),0 0 36px rgba(72,155,255,.55)}
  .admin-line{position:absolute;z-index:8;left:283px;top:614px;width:762px;height:10px}.admin-line .base{position:absolute;inset:3px 0 auto;height:3px;background:repeating-linear-gradient(90deg,rgba(170,185,190,.35) 0 7px,transparent 7px 13px)}.admin-line .live{position:absolute;left:0;top:1px;width:455px;height:6px;border-radius:5px;background:#76d39a;box-shadow:0 0 12px rgba(118,211,154,.7);transition:width 1.45s ease}.admin-line .live.invoice{width:610px;background:linear-gradient(90deg,#76d39a 0 75%,#de920a 75%)}.admin-line .live.done{width:762px;background:#76d39a}
  .reason{position:absolute;z-index:14;left:494px;top:619px;width:420px;padding:22px;border:1px solid rgba(226,151,20,.38);border-radius:16px;background:rgba(4,24,38,.98);box-shadow:0 25px 70px rgba(0,0,0,.5);opacity:0;transform:translateY(14px);transition:.45s ease}.reason.on{opacity:1;transform:none}.reason h2{font-size:23px;margin-top:4px}.select{margin:16px 0 10px;padding:13px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:#071d30;color:#b9c4c6;font-size:12px}.select.selected{border-color:#dc9314;color:#fff}.reason .primary{width:100%;margin-top:7px}
  .admin-status{position:absolute;z-index:12;left:493px;top:681px;width:424px;padding:15px 18px;border:1px solid rgba(118,211,154,.4);border-radius:12px;background:rgba(5,37,39,.97);color:#91dfac;font-weight:800;opacity:0;transform:translateY(10px);transition:.4s ease}.admin-status.on{opacity:1;transform:none}
  .finish{position:absolute;z-index:25;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 50% 46%,rgba(15,69,52,.91),rgba(2,17,30,.96));opacity:0;transition:.7s ease}.finish.on{opacity:1}.finish-card{width:830px;padding:43px;text-align:center;border:1px solid rgba(125,215,158,.38);border-radius:28px;background:rgba(6,27,40,.82);box-shadow:0 35px 100px rgba(0,0,0,.5);transform:scale(.95);transition:.6s ease}.finish.on .finish-card{transform:none}.finish-mark{display:grid;place-items:center;margin:auto;width:78px;height:78px;border-radius:50%;background:#79d39a;color:#07251b;font-size:38px;font-weight:900;box-shadow:0 0 0 14px rgba(121,211,154,.1)}.finish h2{font-size:50px}.status-chain{display:flex;justify-content:center;gap:10px;margin-top:25px}.status-chain span{padding:10px 13px;border:1px solid rgba(124,214,157,.25);border-radius:999px;background:rgba(124,214,157,.08);color:#a4e3ba;font-size:12px;font-weight:800}
  @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
</style>
</head>
<body>
<main class="stage">
  <section class="scene employee active">
    <img class="design" src="http://127.0.0.1:8000/design-mockups/1414-path-bento-space/medewerker-dashboard.jpg" alt="">
    <div class="wash"></div><div class="chapter"><b>1</b> Medewerker · uren en klanturenstaat</div>
    <div class="focus focus-week"></div><div class="focus focus-flow"></div><div class="focus focus-customer"></div>
    <div class="day-overlay"><span>WO<small>2 september</small></span><strong>8,00</strong></div>
    <section class="editor"><span class="eyebrow">Woensdag 2 september</span><h2>Uren aanvullen</h2><p>De dag wordt direct meegenomen in jouw week- en maandtotaal.</p><div class="fields"><div class="field"><label>Klant / project</label><b>Projectadvies NovaTech</b></div><div class="field"><label>Activiteit</label><b>Analyse &amp; advies</b></div><div class="field hours"><label>Uren</label><b>8,00</b></div></div><div class="editor-actions"><span class="saved">✓ Automatisch opgeslagen</span><button class="primary">Dag opslaan</button></div></section>
    <div class="ring-overlay"><div class="ring"><div><small>GEREGISTREERD</small><strong>24</strong><span>/ 160 uur</span></div></div></div>
    <section class="confirm"><span class="eyebrow">Maand indienen</span><h2>Weet je het zeker?</h2><p>Na indienen neemt Backoffice jouw uren over. Controleer of alle werkdagen compleet zijn.</p><div class="warning"><b>!</b><span>Je kunt de ingediende uren niet meer zelf aanpassen.</span></div><div class="confirm-actions"><button class="secondary">Nog even controleren</button><button class="primary">Ja, uren indienen</button></div></section>
    <svg class="flow-svg" viewBox="0 0 720 70"><path class="flow-base" d="M0 33 H720"/><path class="flow-live" d="M0 33 H720"/></svg>
    <section class="customer-modal"><span class="eyebrow">Klanturenstaat</span><h2>Hoe is deze aangeleverd?</h2><p>Upload het officiële document óf geef aan dat het al rechtstreeks naar de klant is gemaild.</p><div class="choices"><button class="choice">PDF / afbeelding uploaden</button><button class="choice">Al rechtstreeks gemaild</button></div><div class="waiting">● Rechtstreeks gemaild · wacht op externe bevestiging</div></section>
  </section>

  <section class="handoff-scene"><div class="handoff"><span class="eyebrow">Veilige overdracht</span><h2>Backoffice neemt het over</h2><p>De medewerker hoeft niets meer te doen. Het dossier verschijnt direct bij de juiste volgende actie.</p><div class="handoff-track"><div class="handoff-live"></div><div class="role employee-role"><i>✓</i><span>Medewerker</span></div><div class="role admin-role"><i>⌁</i><span>Backoffice</span></div><div class="packet">✦</div></div></div></section>

  <section class="scene admin">
    <img class="design" src="http://127.0.0.1:8000/design-mockups/1313-path-metro/beheerder-maandoverzicht.jpg" alt="">
    <div class="wash"></div><div class="chapter"><b>2</b> Beheer · proces van uren tot factuur</div>
    <div class="focus focus-shawn"></div><div class="focus focus-node"></div>
    <div class="admin-line"><div class="base"></div><div class="live"></div></div>
    <section class="reason"><span class="eyebrow">Extern bevestigen</span><h2>Reden is verplicht</h2><p>Leg vast waarom er geen bestand is geüpload.</p><div class="select">Kies een reden…</div><button class="primary">Bevestiging verzenden</button></section>
    <div class="admin-status">✓ Extern bevestigd · dossier kan door naar facturatie</div>
  </section>

  <section class="finish"><div class="finish-card"><div class="finish-mark">✓</div><span class="eyebrow">September 2026</span><h2>Eén vloeiende keten</h2><p>Stasjo registreert. Backoffice controleert en verzorgt de rest.<br>Iedereen ziet alleen wat voor zijn rol nodig is.</p><div class="status-chain"><span>Uren goedgekeurd</span><span>Klanturenstaat bevestigd</span><span>Factuur aangemaakt</span><span>Dossier gereed</span></div></div></section>
  <div class="cursor"></div><div class="toast"><i>✓</i><span></span></div>
</main>
</body>
</html>`, { waitUntil: 'networkidle' });

const wait = (ms) => page.waitForTimeout(ms);
const toggle = (selector, on = true) => page.locator(selector).evaluate((el, enabled) => el.classList.toggle('on', enabled), on);
const cursor = async (x, y, click = false) => {
  await page.locator('.cursor').evaluate((el, point) => { el.style.left = `${point.x}px`; el.style.top = `${point.y}px`; el.classList.add('on'); el.classList.toggle('click', point.click); }, { x, y, click });
  await wait(click ? 310 : 720);
  if (click) await page.locator('.cursor').evaluate((el) => el.classList.remove('click'));
};
const toast = async (message, duration = 1050) => {
  await page.locator('.toast span').evaluate((el, text) => { el.textContent = text; }, message);
  await toggle('.toast', true); await wait(duration); await toggle('.toast', false); await wait(180);
};

// 0–2 s — introduce the employee role.
await wait(600); await toggle('.employee .chapter', true); await wait(1250);

// 2–6 s — select Wednesday and complete the day.
await toggle('.employee .focus-week', true); await cursor(801, 320); await cursor(801, 320, true);
await toggle('.editor', true); await wait(700); await cursor(1010, 573); await cursor(1010, 573, true);
await toggle('.editor', false); await toggle('.day-overlay', true); await toggle('.ring-overlay', true);
await toast('Woensdag opgeslagen · maandtotaal direct bijgewerkt', 1100); await toggle('.ring-overlay', false); await toggle('.employee .focus-week', false);

// 6–11 s — submit with the explicit warning and advance the employee flow.
await toggle('.employee .focus-flow', true); await page.locator('.flow-live').evaluate((el) => el.classList.add('one')); await cursor(560, 770); await cursor(560, 770, true);
await toggle('.confirm', true); await wait(850); await cursor(972, 587); await cursor(972, 587, true);
await toggle('.confirm', false); await page.locator('.flow-live').evaluate((el) => el.classList.replace('one', 'two'));
await toast('Uren ingediend · vanaf nu neemt Backoffice het over', 1200); await toggle('.employee .focus-flow', false);

// 11–16 s — show both customer-timesheet routes and choose direct e-mail.
await toggle('.employee .focus-customer', true); await toggle('.customer-modal', true); await wait(750);
await cursor(1288, 735); await cursor(1288, 735, true); await page.locator('.choice').nth(1).evaluate((el) => el.classList.add('selected')); await wait(600);
await page.locator('.choices').evaluate((el) => { el.style.display = 'none'; }); await toggle('.waiting', true);
await toast('Rechtstreeks gemaild · Backoffice moet extern bevestigen', 1350); await wait(350);

// 16–19 s — visual handoff between the two roles.
await page.locator('.cursor').evaluate((el) => el.classList.remove('on')); await toggle('.handoff-scene', true); await wait(500);
await page.locator('.handoff-live').evaluate((el) => el.classList.add('go')); await page.locator('.packet').evaluate((el) => el.classList.add('go')); await wait(2450);
await toggle('.handoff-scene', false);
await page.locator('.employee').evaluate((el) => el.classList.remove('active'));
await page.locator('.admin').evaluate((el) => el.classList.add('active'));
await toggle('.admin .chapter', true); await wait(650);

// 19–25 s — Backoffice opens Shawn, records the required reason and confirms.
await toggle('.admin .focus-shawn', true); await cursor(742, 619); await cursor(742, 619, true); await toggle('.admin .focus-node', true); await toggle('.reason', true); await wait(700);
await cursor(703, 781); await cursor(703, 781, true); await page.locator('.select').evaluate((el) => { el.textContent = 'Goedkeuring van de uren ontvangen'; el.classList.add('selected'); }); await wait(500);
await cursor(701, 841); await cursor(701, 841, true); await toggle('.reason', false); await toggle('.admin-status', true); await page.locator('.admin-line .live').evaluate((el) => el.classList.add('invoice'));
await toast('Extern bevestigd · verplichte reden vastgelegd', 1200);

// 25–28 s — invoice and ready states complete the process line.
await cursor(874, 619); await cursor(874, 619, true); await toast('Factuurconcept aangemaakt', 850);
await page.locator('.admin-line .live').evaluate((el) => el.classList.add('done')); await cursor(1012, 619); await cursor(1012, 619, true); await toast('Factuur verzonden · dossier gereed', 850);

// 28–30 s — concise end state.
await page.locator('.cursor').evaluate((el) => el.classList.remove('on')); await toggle('.finish', true); await wait(2200);

await context.close();
await browser.close();
const temporaryVideoPath = await video.path();
renameSync(temporaryVideoPath, outputPath);
console.log(outputPath);
