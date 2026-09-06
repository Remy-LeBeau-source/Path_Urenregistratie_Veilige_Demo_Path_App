import { mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const outputDir = path.resolve('design-mockups/videos');
const outputPath = path.join(outputDir, '1919-medewerker-eindvisie.webm');
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1536, height: 954 },
  recordVideo: { dir: outputDir, size: { width: 1536, height: 954 } },
});
const page = await context.newPage();
const video = page.video();

const wait = (milliseconds) => page.waitForTimeout(milliseconds);

await page.goto('http://127.0.0.1:8000/pilot/1919-medewerker.html');
await page.addStyleTag({ content: `
  .pilot-flag{display:none!important}
  .rail{height:100vh!important}
  html{scroll-behavior:smooth}
  .video-mode .rail-curve path{stroke-dasharray:420;stroke-dashoffset:420;transition:stroke-dashoffset 1.15s cubic-bezier(.22,.8,.25,1),stroke .35s ease}
  .video-mode .stop.active .rail-curve path,.video-mode .stop.demo-done .rail-curve path{stroke-dashoffset:0}
  .video-mode .stop.demo-done{--connector-color:#6bbf95}
  .video-mode .stop.demo-done .node{border-color:#6bbf95;background:#153329;box-shadow:0 0 0 4px rgba(107,191,149,.12)}
  .video-mode .stop.demo-done .node svg{stroke:#6bbf95}
  .video-mode .stop.demo-done .eyebrow,.video-mode .stop.demo-done .sub{color:#6bbf95}
  .video-mode .day .cell{transition:background .35s ease,border-color .35s ease,transform .35s ease,box-shadow .35s ease}
  .video-mode .day .cell.is-filling{border-color:#6bbf95;background:rgba(107,191,149,.12);transform:translateY(-4px);box-shadow:0 10px 26px rgba(0,0,0,.15)}
  .video-mode .day .cell .h{transition:color .3s ease}
  .video-mode .btn-amber{transition:transform .25s ease,background .35s ease,box-shadow .35s ease}
  .video-mode .btn-amber.is-ready{background:#6bbf95;box-shadow:0 10px 26px rgba(107,191,149,.22)}
  .video-mode .btn-amber.is-pressed{transform:scale(.96)}
  .vision-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}
  .vision-action{min-height:40px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.055);color:#fff;padding:10px 13px;font:600 12px var(--sans);transition:border-color .3s ease,background .3s ease,transform .25s ease,opacity .3s ease}
  .vision-action.primary{border-color:#6bbf95;background:#2f6a4c}
  .vision-action.is-selected{border-color:#e0a13c;background:#d68f24;color:#241a06;transform:translateY(-2px);box-shadow:0 8px 22px rgba(214,143,36,.25)}
  .vision-status{display:none;align-items:center;gap:10px;margin-top:14px;border:1px solid rgba(224,161,60,.42);border-radius:10px;background:rgba(224,161,60,.11);color:#f4c879;padding:11px 13px;font-size:12px;font-weight:700}
  .vision-status.is-visible{display:flex;animation:vision-in .5s ease both}
  .vision-status.is-complete{border-color:rgba(107,191,149,.5);background:rgba(107,191,149,.12);color:#8dd5b0}
  .vision-status-dot{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 0 5px color-mix(in srgb,currentColor 14%,transparent)}
  .vision-toast{position:fixed;z-index:20;right:28px;bottom:28px;display:flex;align-items:center;gap:12px;max-width:390px;border:1px solid rgba(107,191,149,.35);border-radius:14px;background:rgba(10,28,40,.94);box-shadow:0 20px 55px rgba(0,0,0,.35);color:#fff;padding:14px 17px;font:600 13px var(--sans);opacity:0;transform:translateY(14px);transition:opacity .35s ease,transform .35s ease;backdrop-filter:blur(12px)}
  .vision-toast.is-visible{opacity:1;transform:none}
  .vision-toast-mark{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:#6bbf95;color:#0e2233;font-weight:900}
  @keyframes vision-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
` });

await page.evaluate(() => {
  document.documentElement.classList.add('video-mode');
  const copy = document.querySelector('#chapter-customer .doc-grid > div:first-child');
  copy.querySelector('h2').textContent = 'Voeg je klanturenstaat toe';
  copy.querySelector('.lead').textContent = 'Upload het officiële document of registreer dat het al rechtstreeks is gemaild.';
  copy.insertAdjacentHTML('beforeend', `
    <div class="vision-actions">
      <button class="vision-action primary" type="button">PDF / afbeelding uploaden</button>
      <button class="vision-action" type="button">Al rechtstreeks gemaild</button>
    </div>
    <div class="vision-status"><span class="vision-status-dot"></span><span>Rechtstreeks gemaild · wacht op bevestiging Backoffice</span></div>
  `);
  document.body.insertAdjacentHTML('beforeend', '<div class="vision-toast"><span class="vision-toast-mark">✓</span><span></span></div>');
});

const showToast = async (message, duration = 1450) => {
  await page.evaluate((text) => {
    const toast = document.querySelector('.vision-toast');
    toast.querySelector('span:last-child').textContent = text;
    toast.classList.add('is-visible');
  }, message);
  await wait(duration);
  await page.evaluate(() => document.querySelector('.vision-toast').classList.remove('is-visible'));
  await wait(300);
};

const markDoneThrough = async (index) => {
  await page.evaluate((doneIndex) => {
    [...document.querySelectorAll('.stop')].forEach((stop, currentIndex) => {
      stop.classList.toggle('demo-done', currentIndex <= doneIndex);
    });
  }, index);
};

await wait(1500);
await page.locator('#chapter-hours').scrollIntoViewIfNeeded();
await wait(900);

const hourValues = ['8:00', '8:00', '4:00', '0:00', '0:00'];
await page.evaluate(() => {
  document.querySelectorAll('.week .day:not(.total) .h').forEach((node) => { node.textContent = '0:00'; });
  document.querySelector('.week .day.total .h').textContent = '0:00';
});
for (let index = 0; index < hourValues.length; index += 1) {
  await page.evaluate(({ currentIndex, value }) => {
    const cell = document.querySelectorAll('.week .day:not(.total) .cell')[currentIndex];
    cell.classList.add('is-filling');
    cell.querySelector('.h').textContent = value;
  }, { currentIndex: index, value: hourValues[index] });
  await wait(370);
  await page.evaluate((currentIndex) => {
    document.querySelectorAll('.week .day:not(.total) .cell')[currentIndex].classList.remove('is-filling');
  }, index);
}
await page.evaluate(() => {
  document.querySelector('.week .day.total .h').textContent = '20:00';
  const button = document.querySelector('.btn-amber');
  button.classList.add('is-ready');
  button.lastChild.textContent = ' Uren indienen';
});
await showToast('20 uur ingevuld · klaar om in te dienen');

await page.evaluate(() => document.querySelector('.btn-amber').classList.add('is-pressed'));
await wait(260);
await page.evaluate(() => document.querySelector('.btn-amber').classList.remove('is-pressed'));
await markDoneThrough(2);
await showToast('Uren ingediend · Backoffice neemt het over');

await page.locator('#chapter-backoffice').scrollIntoViewIfNeeded();
await wait(1700);
await markDoneThrough(3);

await page.locator('#chapter-customer').scrollIntoViewIfNeeded();
await wait(1200);
await page.evaluate(() => document.querySelectorAll('.vision-action')[1].classList.add('is-selected'));
await wait(900);
await page.evaluate(() => {
  document.querySelector('.vision-actions').style.opacity = '.35';
  document.querySelector('.vision-status').classList.add('is-visible');
});
await showToast('Registratie opgeslagen · externe bevestiging nodig', 1800);

await page.evaluate(() => {
  const status = document.querySelector('.vision-status');
  status.classList.add('is-complete');
  status.querySelector('span:last-child').textContent = 'Extern bevestigd · maand gereed';
});
await markDoneThrough(4);
await showToast('Bevestigd door Backoffice · alles is afgerond', 2100);
await wait(1500);

await context.close();
await browser.close();

const temporaryVideoPath = await video.path();
renameSync(temporaryVideoPath, outputPath);
console.log(outputPath);
