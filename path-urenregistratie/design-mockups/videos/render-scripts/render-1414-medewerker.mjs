import { mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = path.resolve('design-mockups/videos');
const outputPath = path.join(outputDir, '1414-medewerker-eindvisie.webm');
mkdirSync(outputDir, { recursive: true });

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
  html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#061727;font-family:Inter,"Segoe UI",sans-serif}
  .stage{position:relative;width:1536px;height:1024px;overflow:hidden;background:#061727}
  .design{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .focus{position:absolute;border:2px solid transparent;border-radius:28px;opacity:0;transform:scale(.985);box-shadow:0 0 0 9999px rgba(1,13,24,0);transition:opacity .45s ease,transform .45s ease,border-color .45s ease,box-shadow .45s ease}
  .focus.is-on{opacity:1;transform:none;border-color:rgba(112,211,155,.8);box-shadow:0 0 0 9999px rgba(1,13,24,.13),0 0 36px rgba(112,211,155,.18)}
  .focus.start{left:19px;top:94px;width:687px;height:598px}
  .focus.week{left:722px;top:94px;width:199px;height:628px;border-radius:30px}
  .focus.flow{left:19px;top:713px;width:903px;height:281px}
  .focus.customer{left:940px;top:558px;width:576px;height:437px}
  .arrow-pulse{position:absolute;left:481px;top:336px;width:185px;height:185px;border:2px solid rgba(229,238,214,.75);border-radius:50%;opacity:0;transform:scale(.78);transition:opacity .4s ease,transform .65s cubic-bezier(.2,.85,.25,1),box-shadow .65s ease}
  .arrow-pulse.is-on{opacity:1;transform:scale(1);box-shadow:0 0 0 24px rgba(112,211,155,.1),0 0 48px rgba(112,211,155,.2)}
  .week-value{position:absolute;left:743px;top:312px;width:160px;height:67px;display:flex;align-items:center;justify-content:space-between;border-radius:0;background:#10243a;color:#fff;padding:0 18px;opacity:0;transform:translateX(-10px);transition:opacity .35s ease,transform .35s ease,background .35s ease}
  .week-value.is-on{opacity:1;transform:none;background:#174835}
  .week-value span:first-child{font-size:17px}.week-value b{font-size:18px;color:#8dddaf}
  .flow-svg{position:absolute;left:66px;top:776px;width:716px;height:66px;overflow:visible}
  .flow-base{fill:none;stroke:rgba(255,255,255,.26);stroke-width:2;stroke-dasharray:4 5}
  .flow-live{fill:none;stroke:#79d49f;stroke-width:4;stroke-linecap:round;stroke-dasharray:716;stroke-dashoffset:716;filter:drop-shadow(0 0 7px rgba(121,212,159,.7));transition:stroke-dashoffset 1.25s cubic-bezier(.25,.8,.25,1),stroke .45s ease}
  .flow-live.stage-one{stroke-dashoffset:476}.flow-live.stage-two{stroke-dashoffset:238}.flow-live.stage-three{stroke-dashoffset:0}
  .node-glow{position:absolute;top:782px;width:51px;height:51px;border-radius:50%;border:2px solid rgba(255,255,255,.18);opacity:0;transform:scale(.7);transition:opacity .35s ease,transform .45s ease,background .4s ease,box-shadow .4s ease}
  .node-glow.is-on{opacity:1;transform:scale(1);background:rgba(105,194,139,.25);border-color:#79d49f;box-shadow:0 0 22px rgba(121,212,159,.5)}
  .node-1{left:51px}.node-2{left:256px}.node-3{left:489px}.node-4{left:710px}
  .hero-status{position:absolute;left:90px;top:522px;display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(6,29,24,.82);color:#eef5e6;padding:11px 16px;font-size:14px;font-weight:700;opacity:0;transform:translateY(8px);transition:opacity .4s ease,transform .4s ease}
  .hero-status.is-on{opacity:1;transform:none}
  .hero-status i{width:10px;height:10px;border-radius:50%;background:#79d49f;box-shadow:0 0 0 5px rgba(121,212,159,.13)}
  .customer-panel{position:absolute;left:969px;top:592px;width:518px;min-height:178px;border:1px solid rgba(31,62,48,.18);border-radius:20px;background:rgba(246,241,231,.96);box-shadow:0 18px 50px rgba(7,21,31,.2);color:#172a28;padding:24px 26px;opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease}
  .customer-panel.is-on{opacity:1;transform:none}
  .customer-panel small{display:block;color:#387154;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
  .customer-panel h2{margin:6px 0 8px;font:34px Georgia,serif;color:#183127}
  .customer-panel p{margin:0;color:#52635d;font-size:14px;line-height:1.4}
  .choices{display:flex;gap:10px;margin-top:17px}
  .choice{min-height:42px;border:1px solid #aec3b5;border-radius:10px;background:#fff;color:#183127;padding:10px 14px;font-size:12px;font-weight:750;transition:transform .3s ease,background .3s ease,border-color .3s ease,box-shadow .3s ease}
  .choice.primary{background:#265f43;border-color:#265f43;color:#fff}
  .choice.selected{transform:translateY(-3px);background:#d68f24;border-color:#e8ad50;color:#211809;box-shadow:0 10px 25px rgba(214,143,36,.27)}
  .state-pill{display:none;align-items:center;gap:11px;margin-top:17px;border:1px solid #d7aa61;border-radius:11px;background:#fff4df;color:#8b5712;padding:12px 14px;font-size:13px;font-weight:750}
  .state-pill.is-on{display:flex;animation:rise .45s ease both}.state-pill.done{border-color:#8fc6a5;background:#eaf6ee;color:#285f40}
  .state-pill i{width:11px;height:11px;border-radius:50%;background:currentColor;box-shadow:0 0 0 5px color-mix(in srgb,currentColor 14%,transparent)}
  .toast{position:absolute;z-index:20;right:28px;bottom:28px;display:flex;align-items:center;gap:12px;max-width:430px;border:1px solid rgba(121,212,159,.35);border-radius:15px;background:rgba(5,24,38,.95);box-shadow:0 20px 60px rgba(0,0,0,.4);color:#fff;padding:15px 18px;font-size:14px;font-weight:700;opacity:0;transform:translateY(16px);transition:opacity .35s ease,transform .35s ease;backdrop-filter:blur(12px)}
  .toast.is-on{opacity:1;transform:none}.toast-mark{display:grid;width:31px;height:31px;place-items:center;border-radius:50%;background:#79d49f;color:#092034;font-weight:900}
  @keyframes rise{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
</style>
</head>
<body>
<main class="stage">
  <img class="design" src="http://127.0.0.1:8000/design-mockups/1414-path-bento-space/medewerker-dashboard.jpg" alt="">
  <div class="focus start"></div><div class="focus week"></div><div class="focus flow"></div><div class="focus customer"></div>
  <div class="arrow-pulse"></div>
  <div class="week-value"><span>WO<br><small>2 SEP</small></span><b>8,00</b></div>
  <svg class="flow-svg" viewBox="0 0 716 66" aria-hidden="true"><path class="flow-base" d="M10 28 H706"/><path class="flow-live" d="M10 28 H706"/></svg>
  <span class="node-glow node-1"></span><span class="node-glow node-2"></span><span class="node-glow node-3"></span><span class="node-glow node-4"></span>
  <div class="hero-status"><i></i><span>Uren compleet · klaar om in te dienen</span></div>
  <section class="customer-panel">
    <small>Klanturenstaat</small><h2>Kies wat van toepassing is</h2>
    <p>Voeg het officiële document toe of registreer dat het al rechtstreeks naar de klant is gestuurd.</p>
    <div class="choices"><button class="choice primary">PDF / afbeelding uploaden</button><button class="choice">Al rechtstreeks gemaild</button></div>
    <div class="state-pill"><i></i><span>Rechtstreeks gemaild · wacht op Backoffice</span></div>
  </section>
  <div class="toast"><span class="toast-mark">✓</span><span></span></div>
</main>
</body></html>`, { waitUntil: 'networkidle' });

const wait = (milliseconds) => page.waitForTimeout(milliseconds);
const toggle = (selector, enabled = true) => page.locator(selector).evaluate((element, on) => element.classList.toggle('is-on', on), enabled);
const toast = async (message, duration = 1400) => {
  await page.locator('.toast > span:last-child').evaluate((element, text) => { element.textContent = text; }, message);
  await toggle('.toast', true);
  await wait(duration);
  await toggle('.toast', false);
  await wait(250);
};

await wait(900);
await toggle('.focus.start', true);
await toggle('.arrow-pulse', true);
await toast('Begin of ga verder met je uren', 1500);
await toggle('.focus.start', false);
await toggle('.arrow-pulse', false);

await toggle('.focus.week', true);
await toggle('.week-value', true);
await wait(850);
await toggle('.hero-status', true);
await toast('Dag aangepast · maandtotaal bijgewerkt', 1450);
await toggle('.focus.week', false);

await toggle('.focus.flow', true);
await page.locator('.flow-live').evaluate((element) => element.classList.add('stage-one'));
await toggle('.node-1', true);
await wait(850);
await page.locator('.flow-live').evaluate((element) => element.classList.replace('stage-one', 'stage-two'));
await toggle('.node-2', true);
await toggle('.node-3', true);
await toast('Uren ingediend · Backoffice neemt het over', 1550);

await toggle('.focus.flow', false);
await toggle('.focus.customer', true);
await toggle('.customer-panel', true);
await wait(1300);
await page.locator('.choice').nth(1).evaluate((element) => element.classList.add('selected'));
await wait(700);
await page.locator('.choices').evaluate((element) => { element.style.display = 'none'; });
await toggle('.state-pill', true);
await toast('Rechtstreeks gemaild · externe bevestiging nodig', 1750);

await page.locator('.state-pill').evaluate((element) => {
  element.classList.add('done');
  element.querySelector('span').textContent = 'Extern bevestigd · klanturenstaat gereed';
});
await page.locator('.flow-live').evaluate((element) => element.classList.replace('stage-two', 'stage-three'));
await toggle('.node-4', true);
await toast('Bevestigd door Backoffice · alles is afgerond', 2050);
await wait(1200);

await context.close();
await browser.close();
const temporaryVideoPath = await video.path();
renameSync(temporaryVideoPath, outputPath);
console.log(outputPath);
