import { mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = path.resolve('design-mockups/videos');
const outputPath = path.join(outputDir, '2020-adaptive-medewerker-en-beheer-eindvisie.webm');
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
  *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#031423;font-family:Inter,"Segoe UI",sans-serif}
  .stage{position:relative;width:1536px;height:1024px;overflow:hidden;background:#031423}
  .screen{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .9s ease,transform 1.2s ease,filter .9s ease}
  .employee{opacity:1}.admin{opacity:0;transform:scale(1.018);filter:blur(3px)}
  body.show-admin .employee{opacity:0;transform:scale(.985);filter:blur(3px)}body.show-admin .admin{opacity:1;transform:none;filter:none}
  .focus{position:absolute;border:2px solid rgba(104,208,135,.78);border-radius:20px;opacity:0;transform:scale(.985);box-shadow:0 0 0 9999px rgba(1,13,24,0);transition:opacity .4s ease,transform .45s ease,box-shadow .45s ease}
  .focus.on{opacity:1;transform:none;box-shadow:0 0 0 9999px rgba(1,13,24,.12),0 0 34px rgba(104,208,135,.2)}
  .employee-hours{left:49px;top:344px;width:927px;height:308px}.employee-week{left:1022px;top:91px;width:492px;height:844px}.employee-submit{left:411px;top:786px;width:318px;height:72px;border-color:#e5a22b}
  .admin-person{left:387px;top:205px;width:762px;height:657px;border-radius:28px}.admin-action{left:388px;top:863px;width:747px;height:110px;border-color:#e5a22b}.admin-detail{left:1160px;top:204px;width:363px;height:540px;border-color:#e5a22b}
  .switch-demo{position:absolute;left:781px;top:18px;width:218px;height:61px;opacity:1;transition:opacity .5s ease}
  body.show-admin .switch-demo{opacity:0}
  .switch-dot{position:absolute;width:13px;height:13px;border-radius:50%;background:#72d28a;box-shadow:0 0 13px rgba(114,210,138,.75);transition:transform .7s cubic-bezier(.2,.8,.25,1)}
  .switch-dot.style{left:144px;top:9px}.switch-dot.theme{left:112px;top:40px}
  .switch-demo.business .switch-dot.style{transform:translateX(-92px)}.switch-demo.light .switch-dot.theme{transform:translateX(-62px)}
  .hours-overlay{position:absolute;left:765px;top:407px;width:190px;height:60px;display:flex;align-items:center;justify-content:space-between;border:1px solid #62c77d;border-radius:5px;background:#123d2b;color:#fff;padding:0 14px;font-size:15px;opacity:0;transform:translateY(8px);transition:opacity .35s ease,transform .35s ease}
  .hours-overlay.on{opacity:1;transform:none}.hours-overlay b{color:#78d891;font-size:18px}
  .submit-glow{position:absolute;left:412px;top:787px;width:316px;height:69px;border-radius:5px;border:2px solid rgba(239,171,45,.92);opacity:0;transform:scale(.96);transition:opacity .35s ease,transform .45s ease,box-shadow .45s ease}
  .submit-glow.on{opacity:1;transform:none;box-shadow:0 0 0 10px rgba(229,155,22,.08),0 0 34px rgba(229,155,22,.35)}
  .handoff{position:absolute;left:412px;top:862px;display:flex;align-items:center;gap:10px;border:1px solid rgba(103,202,130,.4);border-radius:999px;background:rgba(7,35,28,.9);color:#dff4e3;padding:11px 15px;font-size:13px;font-weight:750;opacity:0;transform:translateY(8px);transition:opacity .4s ease,transform .4s ease}
  .handoff.on{opacity:1;transform:none}.handoff i{width:10px;height:10px;border-radius:50%;background:#70d086;box-shadow:0 0 0 5px rgba(112,208,134,.13)}
  body.show-admin .hours-overlay,body.show-admin .submit-glow,body.show-admin .handoff{opacity:0!important;transition:opacity .35s ease}
  .constellation{position:absolute;inset:0;opacity:0;transition:opacity .6s ease;pointer-events:none}.show-admin .constellation{opacity:1}
  .constellation path{fill:none;stroke:#78d891;stroke-width:3;stroke-linecap:round;stroke-dasharray:760;stroke-dashoffset:760;filter:drop-shadow(0 0 8px rgba(120,216,145,.7));transition:stroke-dashoffset 1.3s cubic-bezier(.2,.8,.25,1),stroke .45s ease}
  .constellation path.draw{stroke-dashoffset:0}.constellation path.warning{stroke:#e3a225}
  .reason{position:absolute;left:738px;top:897px;width:158px;height:46px;border:1px solid #dea029;border-radius:7px;background:#152638;color:#f6d390;padding:13px;font-size:12px;opacity:0;transform:translateY(7px);transition:opacity .35s ease,transform .35s ease}.reason.on{opacity:1;transform:none}
  .admin-status{position:absolute;left:1181px;top:568px;width:319px;border:1px solid #e0a12e;border-radius:10px;background:rgba(18,37,49,.96);color:#ffc65d;padding:17px 18px;font-size:13px;font-weight:750;opacity:0;transform:translateY(8px);transition:opacity .4s ease,transform .4s ease,border-color .4s ease,color .4s ease}.admin-status.on{opacity:1;transform:none}.admin-status.done{border-color:#6dcd84;color:#8ce09f}
  .toast{position:absolute;z-index:30;right:28px;bottom:28px;display:flex;align-items:center;gap:12px;max-width:470px;border:1px solid rgba(111,210,137,.38);border-radius:15px;background:rgba(5,24,38,.96);box-shadow:0 20px 60px rgba(0,0,0,.42);color:#fff;padding:15px 18px;font-size:14px;font-weight:750;opacity:0;transform:translateY(15px);transition:opacity .35s ease,transform .35s ease;backdrop-filter:blur(12px)}
  .toast.on{opacity:1;transform:none}.toast-mark{display:grid;width:31px;height:31px;place-items:center;border-radius:50%;background:#72d28a;color:#092034;font-weight:900}
</style>
</head>
<body>
<main class="stage">
  <img class="screen employee" src="http://127.0.0.1:8000/design-mockups/2020-path-adaptive/medewerker-dashboard.jpg" alt="">
  <img class="screen admin" src="http://127.0.0.1:8000/design-mockups/2020-path-adaptive/beheerder-maandoverzicht.jpg" alt="">
  <div class="switch-demo"><i class="switch-dot style"></i><i class="switch-dot theme"></i></div>
  <div class="focus employee-hours"></div><div class="focus employee-week"></div><div class="focus employee-submit"></div>
  <div class="focus admin-person"></div><div class="focus admin-action"></div><div class="focus admin-detail"></div>
  <div class="hours-overlay"><span>WO 2 SEP</span><b>8,00 uur</b></div><div class="submit-glow"></div><div class="handoff"><i></i><span>Ingediend · Backoffice neemt het over</span></div>
  <svg class="constellation" viewBox="0 0 1536 1024" aria-hidden="true">
    <path class="path-hours" d="M743 504 C655 475 602 405 529 403"/>
    <path class="path-customer" d="M690 518 C602 523 542 566 509 574"/>
    <path class="path-office" d="M700 542 C613 591 585 665 542 715"/>
    <path class="path-invoice warning" d="M800 526 C874 548 917 626 961 697"/>
    <path class="path-external warning" d="M815 510 C891 486 935 433 981 405"/>
  </svg>
  <div class="reason">Goedkeuring ontvangen</div><div class="admin-status">Reden vereist voor externe bevestiging</div>
  <div class="toast"><span class="toast-mark">✓</span><span></span></div>
</main>
</body></html>`, { waitUntil: 'networkidle' });

const wait = (milliseconds) => page.waitForTimeout(milliseconds);
const toggle = (selector, enabled = true) => page.locator(selector).evaluate((element, on) => element.classList.toggle('on', on), enabled);
const toast = async (message, duration = 1450) => {
  await page.locator('.toast > span:last-child').evaluate((element, text) => { element.textContent = text; }, message);
  await toggle('.toast', true);
  await wait(duration);
  await toggle('.toast', false);
  await wait(250);
};

await wait(800);
await page.locator('.switch-demo').evaluate((element) => element.classList.add('business', 'light'));
await toast('Zakelijk of menselijk · licht of donker, zonder functieverlies', 1550);
await page.locator('.switch-demo').evaluate((element) => element.classList.remove('business', 'light'));

await toggle('.employee-hours', true);await toggle('.employee-week', true);await toggle('.hours-overlay', true);
await toast('Dag aangepast · week- en maandtotaal veranderen direct', 1500);
await toggle('.employee-hours', false);await toggle('.employee-week', false);

await toggle('.employee-submit', true);await toggle('.submit-glow', true);
await wait(750);await toggle('.handoff', true);
await toast('Uren ingediend · medewerker hoeft verder niets te doen', 1550);
await toggle('.employee-submit', false);await toggle('.submit-glow', false);

await page.locator('body').evaluate((element) => element.classList.add('show-admin'));
await wait(1100);await toggle('.admin-person', true);
await page.locator('.path-hours').evaluate((element) => element.classList.add('draw'));
await page.locator('.path-customer').evaluate((element) => element.classList.add('draw'));
await page.locator('.path-office').evaluate((element) => element.classList.add('draw'));
await wait(1150);
await page.locator('.path-invoice').evaluate((element) => element.classList.add('draw'));
await page.locator('.path-external').evaluate((element) => element.classList.add('draw'));
await toast('Backoffice ziet dezelfde status als één verbonden dossier', 1550);

await toggle('.admin-person', false);await toggle('.admin-detail', true);await toggle('.admin-action', true);await toggle('.admin-status', true);
await wait(900);await toggle('.reason', true);
await toast('Extern bevestigen kan alleen met een verplichte reden', 1650);

await page.locator('.admin-status').evaluate((element) => { element.classList.add('done'); element.textContent = 'Extern bevestigd · dossier gereed'; });
await page.locator('.path-invoice').evaluate((element) => element.classList.remove('warning'));
await page.locator('.path-external').evaluate((element) => element.classList.remove('warning'));
await toast('Bevestigd · alle lijnen en statussen zijn bijgewerkt', 2100);
await wait(1200);

await context.close();
await browser.close();
const temporaryVideoPath = await video.path();
renameSync(temporaryVideoPath, outputPath);
console.log(outputPath);
