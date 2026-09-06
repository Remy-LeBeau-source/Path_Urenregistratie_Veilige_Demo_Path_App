import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = path.resolve('design-mockups/videos');
const outputPath = path.join(outputDir, 'path-desktop-uitgebreide-gui-60s.webm');
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
  .ring-overlay{position:absolute;z-index:7;left:941px;top:95px;width:504px;height:396px;display:grid;place-items:center;border-radius:28px;background:rgba(6,27,45,.96);opacity:1;transition:.45s ease}.ring{display:grid;place-items:center;width:292px;height:292px;border-radius:50%;background:radial-gradient(circle,#0b293e 0 63%,transparent 64%),conic-gradient(#78ca92 0 15%,rgba(255,255,255,.09) 15%);box-shadow:0 0 0 1px rgba(255,255,255,.05),0 20px 55px rgba(0,0,0,.2)}.ring div{text-align:center}.ring small{display:block;color:#b6c4c5;letter-spacing:.08em}.ring strong{display:block;font:94px Georgia,serif}.ring span{display:block;color:#80d39b;font-size:18px;line-height:1.45}
  .confirm{position:absolute;z-index:13;left:445px;top:280px;width:645px;padding:28px;border:1px solid rgba(232,163,47,.55);border-radius:22px;background:rgba(5,25,38,.98);box-shadow:0 30px 100px rgba(0,0,0,.58);opacity:0;transform:scale(.95);transition:.45s ease}.confirm.on{opacity:1;transform:none}.confirm h2{font-size:32px}.warning{display:flex;gap:13px;margin:18px 0;padding:14px;border-radius:12px;background:rgba(226,146,0,.12);color:#ffd58d}.warning b{display:grid;place-items:center;min-width:30px;height:30px;border:1px solid #e49712;border-radius:50%}.confirm-actions{display:flex;justify-content:flex-end;gap:11px}.secondary{border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:12px 17px;background:transparent;color:#fff}
  .flow-svg{position:absolute;z-index:7;left:76px;top:773px;width:661px;height:70px}.flow-base{fill:none;stroke:rgba(255,255,255,.24);stroke-width:2;stroke-dasharray:5 5}.flow-live{fill:none;stroke:#7bd59e;stroke-width:5;stroke-linecap:round;stroke-dasharray:661;stroke-dashoffset:661;filter:drop-shadow(0 0 7px rgba(123,213,158,.65));transition:stroke-dashoffset 1.2s ease}.flow-live.one{stroke-dashoffset:440}.flow-live.two{stroke-dashoffset:220}.flow-live.all{stroke-dashoffset:0}
  .flow-state{position:absolute;z-index:9;inset:0;pointer-events:none}.flow-state span{position:absolute;top:781px;width:52px;height:52px;display:grid;place-items:center;border:2px solid rgba(184,199,201,.28);border-radius:50%;background:#0a263b;color:#9aadaf;font-size:20px;box-shadow:0 0 0 6px rgba(5,25,39,.55);transition:.45s ease}.flow-state span:nth-child(1){left:50px}.flow-state span:nth-child(2){left:255px}.flow-state span:nth-child(3){left:486px}.flow-state span:nth-child(4){left:711px}.flow-state span.done{border-color:#7bd59e;background:#285f45;color:#fff;box-shadow:0 0 0 7px rgba(123,213,158,.11),0 0 18px rgba(123,213,158,.35)}.flow-state span.active{border-color:#73aee0;background:#183d60;color:#d9edff;box-shadow:0 0 0 7px rgba(83,151,210,.12),0 0 18px rgba(83,151,210,.35)}.flow-state span.waiting{border-color:#e39a16;background:#68450c;color:#ffd080;box-shadow:0 0 0 7px rgba(227,154,22,.11),0 0 18px rgba(227,154,22,.32)}
  .customer-modal{position:absolute;z-index:12;left:910px;top:520px;width:540px;padding:26px;border:1px solid rgba(42,82,63,.25);border-radius:22px;background:rgba(246,241,230,.98);box-shadow:0 28px 80px rgba(0,0,0,.38);color:#18322a;opacity:0;transform:translateY(18px);transition:.5s ease}.customer-modal.on{opacity:1;transform:none}.customer-modal h2{margin:5px 0 8px;font:34px Georgia,serif}.customer-modal p{margin:0;color:#596862;font-size:14px}.choices{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:18px}.choice{padding:14px 12px;border:1px solid #aec1b6;border-radius:11px;background:#fff;color:#163027;font-size:12px;font-weight:800;transition:.35s ease}.choice.selected{background:#d98c08;border-color:#d98c08;color:#fff;transform:translateY(-3px);box-shadow:0 11px 25px rgba(196,125,6,.28)}.waiting{display:none;margin-top:17px;padding:13px;border:1px solid #d8ad63;border-radius:11px;background:#fff4df;color:#89540d;font-size:13px;font-weight:780}.waiting.on{display:block;animation:rise .4s ease both}
  .month-menu{position:absolute;z-index:16;left:608px;top:76px;width:330px;padding:12px;border:1px solid rgba(120,210,155,.35);border-radius:18px;background:rgba(4,25,39,.98);box-shadow:0 28px 80px rgba(0,0,0,.48);opacity:0;transform:translateY(-10px);transition:.4s ease}.month-menu.on{opacity:1;transform:none}.month-option{display:flex;justify-content:space-between;align-items:center;padding:14px 13px;border-radius:11px;color:#fff}.month-option+ .month-option{margin-top:5px}.month-option small{color:#8fa5a5}.month-option.current{background:rgba(117,211,151,.13);border:1px solid rgba(117,211,151,.35)}.month-option.disabled{opacity:.43}.month-option.selected{background:#1d5b42}
  .archive,.settings{position:absolute;z-index:15;left:365px;top:205px;width:806px;padding:31px;border:1px solid rgba(125,214,158,.38);border-radius:24px;background:linear-gradient(145deg,rgba(5,29,43,.98),rgba(17,62,49,.98));box-shadow:0 32px 100px rgba(0,0,0,.58);opacity:0;transform:translateY(16px) scale(.985);transition:.5s ease}.archive.on,.settings.on{opacity:1;transform:none}.archive h2,.settings h2{margin:8px 0 9px;font:38px Georgia,serif}.archive p,.settings p{margin:0;color:#b9c7c4;line-height:1.55}.archive-stats{display:flex;gap:12px;margin-top:22px}.archive-stats span{padding:11px 14px;border:1px solid rgba(125,214,158,.28);border-radius:999px;background:rgba(125,214,158,.09);color:#a4e4ba;font-weight:800;font-size:12px}
  .setting-row{display:flex;justify-content:space-between;align-items:center;margin-top:23px;padding:17px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(2,20,32,.5)}.setting-row strong{display:block}.setting-row small{display:block;margin-top:5px;color:#92a5a4}.switch{position:relative;width:60px;height:32px;border-radius:999px;background:#31444c;transition:.35s ease}.switch:after{content:"";position:absolute;left:4px;top:4px;width:24px;height:24px;border-radius:50%;background:#fff;transition:.35s ease}.switch.on{background:#55b978}.switch.on:after{left:32px}.route-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.route-grid div{padding:13px;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#aebcba}.route-grid b{display:block;margin-top:5px;color:#fff}.zero-note{margin-top:13px!important;padding:12px;border-radius:10px;background:rgba(225,148,11,.11);color:#ffd18a!important;font-size:12px}

  /* Handoff */
  .handoff-scene{position:absolute;inset:0;width:1536px;height:1024px;z-index:20;background:radial-gradient(circle at 50% 50%,#104538 0,#08283a 42%,#031321 100%);display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .7s ease}.handoff-scene.on{opacity:1}.handoff{width:650px;text-align:center}.handoff h2{max-width:590px;margin:9px auto 10px;font-size:62px;line-height:.98}.handoff p{font-size:15px}.handoff-track{position:relative;width:360px;height:335px;margin:28px auto 0}.handoff-track:before{content:"";position:absolute;left:179px;top:55px;bottom:15px;width:2px;background:rgba(255,255,255,.2)}.handoff-live{position:absolute;left:178px;top:55px;width:4px;height:0;border-radius:4px;background:linear-gradient(#7bd59e,#b5dc72);box-shadow:0 0 18px rgba(123,213,158,.7);transition:height 2.3s ease}.handoff-live.go{height:250px}.role{position:absolute;text-align:center}.role.employee-role{display:none}.role.admin-role{left:55px;top:0;width:250px;height:68px;display:flex;align-items:center;gap:16px;padding:10px 18px;border:1px solid rgba(123,213,158,.5);border-radius:999px;background:#082743;box-shadow:0 18px 50px rgba(0,0,0,.3)}.role i{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:#1f6648;color:#b9f2cc;font-style:normal;font-size:22px;flex:0 0 auto}.role span{font-size:20px;font-weight:800;text-align:left}.packet{position:absolute;left:151px;top:57px;width:58px;height:58px;display:grid;place-items:center;border-radius:15px;background:#e39a0a;color:#fff;font-size:24px;box-shadow:0 0 28px rgba(227,154,10,.55);transition:top 2.3s cubic-bezier(.2,.75,.25,1)}.packet.go{top:238px}

  /* Admin / Metro scene */
  .admin .focus-shawn{left:36px;top:580px;width:1054px;height:79px;border-radius:8px;transition:top .65s ease,opacity .4s ease,transform .4s ease}.admin .focus-node{left:701px;top:564px;width:73px;height:73px;border-radius:50%;border-color:#5ca7ff;box-shadow:0 0 0 9999px rgba(1,14,24,.12),0 0 36px rgba(72,155,255,.55)}
  .admin-line{position:absolute;z-index:8;left:283px;top:614px;width:762px;height:10px}.admin-line .base{position:absolute;inset:3px 0 auto;height:3px;background:repeating-linear-gradient(90deg,rgba(170,185,190,.35) 0 7px,transparent 7px 13px)}.admin-line .live{position:absolute;left:0;top:1px;width:455px;height:6px;border-radius:5px;background:#76d39a;box-shadow:0 0 12px rgba(118,211,154,.7);transition:width 1.45s ease}.admin-line .live.invoice{width:610px;background:linear-gradient(90deg,#76d39a 0 75%,#de920a 75%)}.admin-line .live.done{width:762px;background:#76d39a}
  .reason{position:absolute;z-index:14;left:494px;top:619px;width:420px;padding:22px;border:1px solid rgba(226,151,20,.38);border-radius:16px;background:rgba(4,24,38,.98);box-shadow:0 25px 70px rgba(0,0,0,.5);opacity:0;transform:translateY(14px);transition:.45s ease}.reason.on{opacity:1;transform:none}.reason h2{font-size:23px;margin-top:4px}.select{margin:16px 0 10px;padding:13px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:#071d30;color:#b9c4c6;font-size:12px}.select.selected{border-color:#dc9314;color:#fff}.reason .primary{width:100%;margin-top:7px}
  .admin-status{position:absolute;z-index:12;left:493px;top:681px;width:424px;padding:15px 18px;border:1px solid rgba(118,211,154,.4);border-radius:12px;background:rgba(5,37,39,.97);color:#91dfac;font-weight:800;opacity:0;transform:translateY(10px);transition:.4s ease}.admin-status.on{opacity:1;transform:none}
  .dossier{position:absolute;z-index:11;left:344px;top:690px;width:745px;padding:18px 20px;border:1px solid rgba(124,214,157,.3);border-radius:16px;background:rgba(4,25,39,.96);box-shadow:0 22px 65px rgba(0,0,0,.42);opacity:0;transform:translateY(12px);transition:.4s ease}.dossier.on{opacity:1;transform:none}.dossier-head{display:flex;justify-content:space-between;align-items:flex-start}.dossier h3{margin:0;font:25px Georgia,serif}.dossier p{margin:5px 0 0;color:#9eb0af;font-size:12px}.dossier-state{padding:8px 11px;border-radius:999px;background:rgba(226,150,16,.13);color:#ffc568;font-size:11px;font-weight:800}.dossier-flow{position:relative;display:grid;grid-template-columns:repeat(6,1fr);margin-top:17px}.dossier-flow:before{content:"";position:absolute;left:39px;right:39px;top:16px;height:2px;background:rgba(255,255,255,.16)}.dossier-live{position:absolute;left:39px;top:15px;height:4px;width:0;border-radius:4px;background:#74d299;box-shadow:0 0 10px rgba(116,210,153,.55);transition:width .8s ease}.dstep{position:relative;text-align:center;color:#91a2a3;font-size:9px}.dstep i{display:grid;place-items:center;margin:0 auto 6px;width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:#082238;font-style:normal}.dstep.done i{border-color:#74d299;background:#174b37;color:#fff}.dstep.wait i{border-color:#e39a17;background:#583b0b;color:#ffc665}
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
    <div class="ring-overlay"><div class="ring"><div><small>GEREGISTREERD</small><strong>20</strong><span>uur geregistreerd<br>3 werkdagen met uren</span></div></div></div>
    <section class="confirm"><span class="eyebrow">Maand indienen</span><h2>Weet je het zeker?</h2><p>Na indienen neemt Backoffice jouw uren over. Controleer of alle werkdagen compleet zijn.</p><div class="warning"><b>!</b><span>Je kunt de ingediende uren niet meer zelf aanpassen.</span></div><div class="confirm-actions"><button class="secondary">Nog even controleren</button><button class="primary">Ja, uren indienen</button></div></section>
    <svg class="flow-svg" viewBox="0 0 661 70"><path class="flow-base" d="M0 33 H661"/><path class="flow-live" d="M0 33 H661"/></svg>
    <div class="flow-state"><span class="active">◷</span><span>✓</span><span>⌕</span><span>✉</span></div>
    <section class="customer-modal"><span class="eyebrow">Klanturenstaat</span><h2>Hoe is deze aangeleverd?</h2><p>Upload het officiële document óf geef aan dat het al rechtstreeks naar de klant is gemaild.</p><div class="choices"><button class="choice">PDF / afbeelding uploaden</button><button class="choice">Al rechtstreeks gemaild</button></div><div class="waiting">● Rechtstreeks gemaild · wacht op externe bevestiging</div></section>
    <section class="month-menu"><div class="month-option disabled"><span>Oktober 2026</span><small>Toekomstig · niet beschikbaar</small></div><div class="month-option current"><span>September 2026</span><small>Huidige maand</small></div><div class="month-option"><span>Augustus 2026</span><small>Goedgekeurd</small></div></section>
    <section class="archive"><span class="eyebrow">Augustus 2026</span><h2>Deze maand is afgerond</h2><p>Een gekozen oudere maand blijft staan bij details. Via Dashboard of Mijn uren kom je weer terug in de actuele maand.</p><div class="archive-stats"><span>32 uur geregistreerd</span><span>Uren goedgekeurd</span><span>Klanturenstaat verwerkt</span></div></section>
    <section class="settings"><span class="eyebrow">Beheer · organisatie-instelling</span><h2>Verlof en ziekte</h2><p>Standaard verwerkt via de vaste privacyroutes. Alleen Beheer kan handmatige invoer voor medewerkers aanzetten.</p><div class="setting-row"><div><strong>Handmatig laten invullen</strong><small>Geldt voor alle medewerkers</small></div><span class="switch"></span></div><div class="route-grid"><div>Verlof<b class="leave-route">Via salarisadministratie</b></div><div>Ziekte<b class="sick-route">Via Backoffice</b></div></div><p class="zero-note">Een maand met 0 uur mag worden ingediend. Een leeg dagveld en 0 uur hebben in de huidige opslag dezelfde waarde.</p></section>
  </section>

  <section class="handoff-scene"><div class="handoff"><span class="eyebrow">Veilige overdracht</span><h2>Backoffice neemt het over</h2><p>De medewerker hoeft niets meer te doen. Het dossier verschijnt direct bij de juiste volgende actie.</p><div class="handoff-track"><div class="handoff-live"></div><div class="role employee-role"><i>✓</i><span>Medewerker</span></div><div class="role admin-role"><i>⌁</i><span>Backoffice</span></div><div class="packet">✦</div></div></div></section>

  <section class="scene admin">
    <img class="design" src="http://127.0.0.1:8000/design-mockups/1313-path-metro/beheerder-maandoverzicht.jpg" alt="">
    <div class="wash"></div><div class="chapter"><b>2</b> Beheer · proces van uren tot factuur</div>
    <div class="focus focus-shawn"></div><div class="focus focus-node"></div>
    <div class="admin-line"><div class="base"></div><div class="live"></div></div>
    <section class="dossier"><div class="dossier-head"><div><h3>Shawn-Douglas Nahar</h3><p>Rechtstreeks gemaild · externe bevestiging vereist</p></div><span class="dossier-state">Extern bevestigen</span></div><div class="dossier-flow"><span class="dossier-live"></span><div class="dstep done"><i>✓</i>Uren</div><div class="dstep done"><i>✓</i>Controle</div><div class="dstep done"><i>✓</i>Staat</div><div class="dstep wait"><i>✈</i>Extern</div><div class="dstep"><i>▤</i>Factuur</div><div class="dstep"><i>✓</i>Gereed</div></div></section>
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
const setEmployeeFlow = async ({ completed, active = -1, waiting = -1 }) => {
  await page.locator('.flow-state span').evaluateAll((nodes, state) => {
    nodes.forEach((node, index) => {
      node.classList.toggle('done', index < state.completed);
      node.classList.toggle('active', index === state.active);
      node.classList.toggle('waiting', index === state.waiting);
    });
  }, { completed, active, waiting });
};
const showDossier = async ({ name, note, state, rowTop, completed, waiting }) => {
  await page.evaluate(({ name, note, state, rowTop, completed, waiting }) => {
    const focus = document.querySelector('.admin .focus-shawn');
    focus.style.top = `${rowTop}px`;
    const line = document.querySelector('.admin-line');
    line.style.top = `${rowTop + 34}px`;
    line.querySelector('.live').style.width = `${Math.round((completed / 6) * 762)}px`;
    document.querySelector('.dossier h3').textContent = name;
    document.querySelector('.dossier p').textContent = note;
    document.querySelector('.dossier-state').textContent = state;
    document.querySelector('.dossier-live').style.width = `${Math.round((completed / 6) * 667)}px`;
    document.querySelectorAll('.dstep').forEach((step, index) => {
      step.classList.toggle('done', index < completed);
      step.classList.toggle('wait', index === waiting);
    });
  }, { name, note, state, rowTop, completed, waiting });
  await wait(1200);
};

// 0–9 s — period behaviour: future blocked, older month, then Dashboard resets to current.
await wait(650); await toggle('.employee .chapter', true); await wait(850);
await cursor(780, 45); await cursor(780, 45, true); await toggle('.month-menu', true); await wait(650);
await cursor(770, 110); await cursor(770, 110, true); await toast('Oktober is nog niet beschikbaar voor medewerkers', 900);
await cursor(770, 238); await cursor(770, 238, true); await toggle('.month-menu', false); await toggle('.archive', true); await toast('Augustus 2026 geopend · afgeronde maand', 950); await wait(900);
await cursor(106, 45); await cursor(106, 45, true); await toggle('.archive', false); await toast('Dashboard opent weer de actuele maand: september', 1000);

// 9–15 s — complete Wednesday and show the useful progress metric without a contract maximum.
await toggle('.employee .focus-week', true); await cursor(801, 320); await cursor(801, 320, true);
await toggle('.editor', true); await wait(700); await cursor(1010, 573); await cursor(1010, 573, true);
await toggle('.editor', false); await toggle('.day-overlay', true); await page.locator('.ring strong').evaluate((el) => { el.textContent = '24'; });
await toast('24 uur geregistreerd · 3 werkdagen met uren', 1200); await wait(500); await toggle('.employee .focus-week', false);

// 15–23 s — company-wide leave/sickness setting, default off and then enabled.
await toggle('.settings', true); await wait(1100); await cursor(1090, 407); await cursor(1090, 407, true);
await page.locator('.switch').evaluate((el) => el.classList.add('on'));
await page.locator('.leave-route').evaluate((el) => { el.textContent = '4 uur handmatig ingevuld'; });
await page.locator('.sick-route').evaluate((el) => { el.textContent = '2 uur handmatig ingevuld'; });
await toast('Handmatige invoer staat nu aan voor medewerkers', 1200); await wait(900); await toggle('.settings', false);

// 23–30 s — submit with explicit confirmation and lock the month.
await toggle('.employee .focus-flow', true); await page.locator('.flow-live').evaluate((el) => el.classList.add('one')); await cursor(560, 770); await cursor(560, 770, true);
await toggle('.confirm', true); await wait(900); await cursor(972, 587); await cursor(972, 587, true);
await toggle('.confirm', false); await page.locator('.flow-live').evaluate((el) => el.classList.replace('one', 'two'));
await setEmployeeFlow({ completed: 2, active: 2, waiting: 3 });
await toast('Uren ingediend · maand is nu alleen-lezen', 1250); await toggle('.employee .focus-flow', false);

// 30–36 s — two customer-timesheet routes; choose “already e-mailed”.
await toggle('.employee .focus-customer', true); await toggle('.customer-modal', true); await wait(850);
await cursor(1040, 718); await cursor(1040, 718, true); await wait(450);
await cursor(1310, 718); await cursor(1310, 718, true); await page.locator('.choice').nth(1).evaluate((el) => el.classList.add('selected')); await wait(550);
await page.locator('.choices').evaluate((el) => { el.style.display = 'none'; }); await toggle('.customer-modal .waiting', true);
await toast('Rechtstreeks gemaild · Backoffice bevestigt extern', 1200);

// 36–40 s — visual handoff between employee and Backoffice.
await page.locator('.cursor').evaluate((el) => el.classList.remove('on')); await toggle('.handoff-scene', true); await wait(450);
await page.locator('.handoff-live').evaluate((el) => el.classList.add('go')); await page.locator('.packet').evaluate((el) => el.classList.add('go')); await wait(2400);
await toggle('.handoff-scene', false); await page.locator('.employee').evaluate((el) => el.classList.remove('active'));
await page.locator('.admin').evaluate((el) => el.classList.add('active')); await toggle('.admin .chapter', true); await toggle('.admin .focus-shawn', true); await toggle('.dossier', true); await wait(650);

// 40–54 s — selecting employees updates all six workflow stages.
await cursor(170, 375); await cursor(170, 375, true); await showDossier({ name:'Marc de Roon', note:'Factuur verzonden · dossier volledig afgerond', state:'Gereed', rowTop:335, completed:6, waiting:-1 }); await toast('Marc · alle stappen gereed', 700);
await cursor(170, 455); await cursor(170, 455, true); await showDossier({ name:'Brian Hek', note:'Uren gecontroleerd · klanturenstaat ontbreekt', state:'Urenstaat nodig', rowTop:420, completed:2, waiting:2 }); await toast('Brian · wacht op klanturenstaat', 700);
await cursor(170, 535); await cursor(170, 535, true); await showDossier({ name:'Stasjo van Bakel', note:'Extern bevestigd · factuur kan worden aangemaakt', state:'Factuur maken', rowTop:505, completed:4, waiting:4 }); await toast('Stasjo · factuur is de volgende actie', 700);
await cursor(170, 620); await cursor(170, 620, true); await showDossier({ name:'Shawn-Douglas Nahar', note:'Rechtstreeks gemaild · externe bevestiging vereist', state:'Extern bevestigen', rowTop:580, completed:3, waiting:3 }); await toast('Shawn · externe bevestiging vereist', 700);

// 54–61 s — required reason, invoice and ready state.
await toggle('.admin .focus-node', true); await cursor(742, 619); await cursor(742, 619, true); await toggle('.reason', true); await wait(700);
await cursor(703, 781); await cursor(703, 781, true); await page.locator('.select').evaluate((el) => { el.textContent = 'Goedkeuring van de uren ontvangen'; el.classList.add('selected'); }); await wait(450);
await cursor(701, 841); await cursor(701, 841, true); await toggle('.reason', false); await page.evaluate(() => {
  document.querySelector('.dossier p').textContent = 'Extern bevestigd · dossier kan door naar facturatie';
  document.querySelector('.dossier-state').textContent = 'Factuur maken';
  document.querySelector('.dossier-live').style.width = '445px';
  document.querySelectorAll('.dstep').forEach((step, index) => { step.classList.toggle('done', index < 4); step.classList.toggle('wait', index === 4); });
}); await page.locator('.admin-line .live').evaluate((el) => { el.style.width = '610px'; });
await toast('Extern bevestigd · verplichte reden vastgelegd', 900); await page.evaluate(() => {
  document.querySelector('.dossier p').textContent = 'Factuur verzonden · dossier volledig afgerond';
  document.querySelector('.dossier-state').textContent = 'Gereed';
  document.querySelector('.dossier-live').style.width = '667px';
  document.querySelectorAll('.dstep').forEach((step) => { step.classList.add('done'); step.classList.remove('wait'); });
}); await page.locator('.admin-line .live').evaluate((el) => { el.style.width = '762px'; }); await toast('Factuur verzonden · dossier gereed', 800);

// Final result.
await page.locator('.cursor').evaluate((el) => el.classList.remove('on')); await toggle('.finish', true); await wait(2600);

await context.close();
await browser.close();
const temporaryVideoPath = await video.path();
renameSync(temporaryVideoPath, outputPath);
console.log(outputPath);
