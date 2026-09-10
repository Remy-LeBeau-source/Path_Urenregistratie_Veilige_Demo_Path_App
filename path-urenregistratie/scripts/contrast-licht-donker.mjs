import { readFileSync } from 'node:fs';

// Loopt elke CSS-regel na die zowel een achtergrond als een tekstkleur zet, en
// rekent het contrast uit in de lichte en de donkere modus. Een vaste lichte
// achtergrond die niet meebeweegt met de modus is de gevaarlijkste vorm: de tekst
// wisselt wel mee, de achtergrond niet, en dan verdwijnt de tekst.
//
// Draait over beide skins: styles.css (Klassiek, tokens in :root /
// html[data-theme="dark"]) en styles-new.css (New, tokens genest onder
// html[data-skin="new"] / html[data-skin="new"][data-theme="dark"]).
// Regels op :disabled-elementen worden overgeslagen: WCAG 1.4.3 (contrast van
// tekst) geldt niet voor inactieve UI-onderdelen, en de uitgeschakelde
// velden/knoppen in beide skins zijn bewust gedempt om "niet aanklikbaar" te
// laten aanvoelen -- dat zou hier anders elke keer als vals-positief opduiken.

function tokensUit(css, blok) {
  const uit = {};
  for (const m of blok.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) uit[m[1]] = m[2].trim();
  return uit;
}

function blokNa(css, zoek) {
  const i = css.indexOf(zoek);
  if (i < 0) return '';
  const start = css.indexOf('{', i);
  let diepte = 0;
  for (let p = start; p < css.length; p++) {
    if (css[p] === '{') diepte++;
    else if (css[p] === '}') { diepte--; if (diepte === 0) return css.slice(start, p); }
  }
  return '';
}

function los(waarde, tokens, diep = 0) {
  if (diep > 6) return null;
  const v = String(waarde).trim();
  const m = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i.exec(v);
  if (m) {
    if (tokens[m[1]] !== undefined) return los(tokens[m[1]], tokens, diep + 1);
    return m[2] ? los(m[2], tokens, diep + 1) : null;
  }
  return v;
}

function rgb(kleur) {
  if (!kleur) return null;
  const k = kleur.trim().toLowerCase();
  let m = /^#([0-9a-f]{6})$/.exec(k);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = /^#([0-9a-f]{3})$/.exec(k);
  if (m) return [0, 1, 2].map(i => parseInt(m[1][i] + m[1][i], 16));
  m = /^rgba?\(([^)]+)\)$/.exec(k);
  if (m) {
    const d = m[1].split(/[, /]+/).filter(Boolean).map(Number);
    if (d.length >= 3 && d.slice(0, 3).every(n => Number.isFinite(n))) return d.slice(0, 3);
  }
  if (k === 'white') return [255, 255, 255];
  if (k === 'black') return [0, 0, 0];
  return null;
}

function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function controleerBestand(pad, lichtSelector, donkerSelector) {
  const css = readFileSync(pad, 'utf8');
  const licht = tokensUit(css, blokNa(css, lichtSelector));
  const donker = Object.assign({}, licht, tokensUit(css, blokNa(css, donkerSelector)));

  // Elke regel met selector + declaraties, media-blokken meegenomen.
  const regels = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(m => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
    .filter(r => r.selector
      && !r.selector.startsWith('@')
      && !r.selector.startsWith(':root')
      && r.selector !== lichtSelector.replace(/\s*\{$/, '')
      && r.selector !== donkerSelector.replace(/\s*\{$/, '')
      && !r.selector.includes(':disabled'));

  const problemen = [];
  for (const regel of regels) {
    const kleurM = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(regel.body);
    const achterM = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(regel.body);
    if (!kleurM || !achterM) continue;

    const achterRuw = achterM[1].trim().split(/\s+/)[0];
    const alleenDonker = regel.selector.includes('[data-theme="dark"]');
    const modi = alleenDonker ? [['donker', donker]] : [['licht', licht], ['donker', donker]];
    for (const [modus, tokens] of modi) {
      const voor = rgb(los(kleurM[1], tokens));
      const achter = rgb(los(achterRuw, tokens));
      if (!voor || !achter) continue;
      // Een doorzichtige achtergrond hangt af van wat eronder ligt; die kan deze
      // scan niet beoordelen.
      if (String(los(achterRuw, tokens)).toLowerCase().includes('rgba')) continue;
      const c = contrast(voor, achter);
      if (c < 4.5) {
        problemen.push({ bestand: pad, modus, selector: regel.selector, contrast: c.toFixed(2), voor: kleurM[1].trim(), achter: achterRuw });
      }
    }
  }
  return problemen;
}

const problemen = [
  ...controleerBestand('assets/styles.css', ':root {', 'html[data-theme="dark"] {'),
  ...controleerBestand('assets/styles-new.css', 'html[data-skin="new"] {', 'html[data-skin="new"][data-theme="dark"] {'),
];

if (problemen.length === 0) {
  console.log('Contrast lichte en donkere modus, Klassiek en New: geslaagd, geen regel onder 4,5:1.');
} else {
  console.log(problemen.length + ' regel(s) met te weinig contrast (grens 4.5):');
  for (const p of problemen.sort((a, b) => a.contrast - b.contrast)) {
    console.log('  [' + p.bestand + ' / ' + p.modus + '] ' + p.contrast + ':1  ' + p.selector);
    console.log('        tekst ' + p.voor + '  op  ' + p.achter);
  }
}

if (problemen.length > 0) process.exit(1);
