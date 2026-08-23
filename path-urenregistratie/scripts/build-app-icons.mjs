/*
 * Maakt de app-iconen voor de PWA uit assets/path-logo.png.
 *
 * Waarom dit script bestaat: het manifest verwees voor zowel 192x192 als 512x512
 * naar path-logo.png, en dat is 162x54 -- een breed logo, geen vierkant icoon.
 * Android kan zo'n icoon weigeren of vervormd tonen, en iOS had helemaal geen
 * apple-touch-icon en maakte dan zelf een schermafdruk als beginschermicoon.
 *
 * Alles wordt uit het bestaande logo afgeleid, zodat er geen nieuw beeldmerk
 * wordt verzonnen: het logo komt gecentreerd op het huisstijlblauw te staan.
 * Voor het maskeerbare icoon staat het kleiner, want Android snijdt daar een
 * cirkel of afgeronde vorm uit en de randen moeten leeg blijven.
 *
 * Draai met: node scripts/build-app-icons.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const BRON = 'assets/path-logo.png';
const ACHTERGROND = [0x0d, 0x1b, 0x38]; // --navy

// --- PNG lezen -------------------------------------------------------------

function leesPng(pad) {
  const buf = readFileSync(pad);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('geen PNG: ' + pad);

  const breedte = buf.readUInt32BE(16);
  const hoogte = buf.readUInt32BE(20);
  const bitdiepte = buf[24];
  const kleurtype = buf[25];
  if (bitdiepte !== 8) throw new Error('alleen 8 bit per kanaal wordt ondersteund');

  let palet = null;
  let paletAlpha = null;
  const stukken = [];

  let i = 8;
  while (i < buf.length) {
    const lengte = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const inhoud = buf.subarray(i + 8, i + 8 + lengte);
    if (type === 'PLTE') palet = inhoud;
    else if (type === 'tRNS') paletAlpha = inhoud;
    else if (type === 'IDAT') stukken.push(inhoud);
    i += 12 + lengte;
  }

  const ruw = inflateSync(Buffer.concat(stukken));
  const kanalen = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[kleurtype];
  if (!kanalen) throw new Error('kleurtype ' + kleurtype + ' wordt niet ondersteund');

  // Filters terugdraaien, regel voor regel.
  const regelBytes = breedte * kanalen;
  const vlak = Buffer.alloc(hoogte * regelBytes);
  let pos = 0;
  for (let y = 0; y < hoogte; y++) {
    const filter = ruw[pos++];
    const regel = ruw.subarray(pos, pos + regelBytes);
    pos += regelBytes;
    const uit = vlak.subarray(y * regelBytes, (y + 1) * regelBytes);
    const vorige = y > 0 ? vlak.subarray((y - 1) * regelBytes, y * regelBytes) : null;

    for (let x = 0; x < regelBytes; x++) {
      const links = x >= kanalen ? uit[x - kanalen] : 0;
      const boven = vorige ? vorige[x] : 0;
      const linksboven = vorige && x >= kanalen ? vorige[x - kanalen] : 0;
      let waarde = regel[x];
      if (filter === 1) waarde += links;
      else if (filter === 2) waarde += boven;
      else if (filter === 3) waarde += (links + boven) >> 1;
      else if (filter === 4) {
        const p = links + boven - linksboven;
        const pa = Math.abs(p - links);
        const pb = Math.abs(p - boven);
        const pc = Math.abs(p - linksboven);
        waarde += (pa <= pb && pa <= pc) ? links : (pb <= pc ? boven : linksboven);
      }
      uit[x] = waarde & 0xff;
    }
  }

  // Naar RGBA omzetten.
  const rgba = Buffer.alloc(breedte * hoogte * 4);
  for (let p = 0; p < breedte * hoogte; p++) {
    let r; let g; let b; let a = 255;
    if (kleurtype === 3) {
      const index = vlak[p];
      r = palet[index * 3];
      g = palet[index * 3 + 1];
      b = palet[index * 3 + 2];
      if (paletAlpha && index < paletAlpha.length) a = paletAlpha[index];
    } else if (kleurtype === 2) {
      r = vlak[p * 3]; g = vlak[p * 3 + 1]; b = vlak[p * 3 + 2];
    } else if (kleurtype === 6) {
      r = vlak[p * 4]; g = vlak[p * 4 + 1]; b = vlak[p * 4 + 2]; a = vlak[p * 4 + 3];
    } else if (kleurtype === 0) {
      r = g = b = vlak[p];
    } else {
      r = g = b = vlak[p * 2]; a = vlak[p * 2 + 1];
    }
    rgba[p * 4] = r; rgba[p * 4 + 1] = g; rgba[p * 4 + 2] = b; rgba[p * 4 + 3] = a;
  }

  return { breedte, hoogte, rgba };
}

// --- PNG schrijven ---------------------------------------------------------

function schrijfPng(pad, breedte, hoogte, rgba) {
  const ruw = Buffer.alloc(hoogte * (breedte * 4 + 1));
  for (let y = 0; y < hoogte; y++) {
    ruw[y * (breedte * 4 + 1)] = 0; // filter 0
    rgba.copy(ruw, y * (breedte * 4 + 1) + 1, y * breedte * 4, (y + 1) * breedte * 4);
  }

  const stuk = (type, inhoud) => {
    const kop = Buffer.alloc(8);
    kop.writeUInt32BE(inhoud.length, 0);
    kop.write(type, 4, 'ascii');
    const staart = Buffer.alloc(4);
    staart.writeUInt32BE(crc32(Buffer.concat([kop.subarray(4), inhoud])) >>> 0, 0);
    return Buffer.concat([kop, inhoud, staart]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breedte, 0);
  ihdr.writeUInt32BE(hoogte, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  writeFileSync(pad, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    stuk('IHDR', ihdr),
    stuk('IDAT', deflateSync(ruw, { level: 9 })),
    stuk('IEND', Buffer.alloc(0)),
  ]));
}

let crcTabel = null;
function crc32(buf) {
  if (!crcTabel) {
    crcTabel = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTabel[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTabel[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

// --- Icoon samenstellen ----------------------------------------------------

// Bilineair schalen: bij een icoon van 512 wordt het logo groter dan zijn eigen
// 162 pixels. Dat wordt wat zachter, maar een beginschermicoon wordt altijd
// kleiner getoond dan hij is, dus dat valt niet op.
function schaal(bron, nieuwBreedte, nieuwHoogte) {
  const uit = Buffer.alloc(nieuwBreedte * nieuwHoogte * 4);
  const schaalX = bron.breedte / nieuwBreedte;
  const schaalY = bron.hoogte / nieuwHoogte;

  for (let y = 0; y < nieuwHoogte; y++) {
    const by = Math.min(bron.hoogte - 1, (y + 0.5) * schaalY - 0.5);
    const y0 = Math.max(0, Math.floor(by));
    const y1 = Math.min(bron.hoogte - 1, y0 + 1);
    const fy = by - y0;

    for (let x = 0; x < nieuwBreedte; x++) {
      const bx = Math.min(bron.breedte - 1, (x + 0.5) * schaalX - 0.5);
      const x0 = Math.max(0, Math.floor(bx));
      const x1 = Math.min(bron.breedte - 1, x0 + 1);
      const fx = bx - x0;

      for (let k = 0; k < 4; k++) {
        const a = bron.rgba[(y0 * bron.breedte + x0) * 4 + k];
        const b = bron.rgba[(y0 * bron.breedte + x1) * 4 + k];
        const c = bron.rgba[(y1 * bron.breedte + x0) * 4 + k];
        const d = bron.rgba[(y1 * bron.breedte + x1) * 4 + k];
        const boven = a + (b - a) * fx;
        const onder = c + (d - c) * fx;
        uit[(y * nieuwBreedte + x) * 4 + k] = Math.round(boven + (onder - boven) * fy);
      }
    }
  }
  return { breedte: nieuwBreedte, hoogte: nieuwHoogte, rgba: uit };
}

function maakIcoon(logo, maat, logoDeelVanBreedte) {
  const vlak = Buffer.alloc(maat * maat * 4);
  for (let p = 0; p < maat * maat; p++) {
    vlak[p * 4] = ACHTERGROND[0];
    vlak[p * 4 + 1] = ACHTERGROND[1];
    vlak[p * 4 + 2] = ACHTERGROND[2];
    vlak[p * 4 + 3] = 255;
  }

  const logoBreedte = Math.round(maat * logoDeelVanBreedte);
  const logoHoogte = Math.round(logoBreedte * (logo.hoogte / logo.breedte));
  const geschaald = schaal(logo, logoBreedte, logoHoogte);
  const offsetX = Math.round((maat - logoBreedte) / 2);
  const offsetY = Math.round((maat - logoHoogte) / 2);

  for (let y = 0; y < logoHoogte; y++) {
    for (let x = 0; x < logoBreedte; x++) {
      const bron = (y * logoBreedte + x) * 4;
      const doel = ((y + offsetY) * maat + (x + offsetX)) * 4;
      const alpha = geschaald.rgba[bron + 3] / 255;
      if (alpha === 0) continue;
      for (let k = 0; k < 3; k++) {
        vlak[doel + k] = Math.round(geschaald.rgba[bron + k] * alpha + vlak[doel + k] * (1 - alpha));
      }
    }
  }

  return { breedte: maat, hoogte: maat, rgba: vlak };
}

// --- Uitvoeren -------------------------------------------------------------

const logo = leesPng(BRON);
console.log('bron: ' + BRON + ' (' + logo.breedte + 'x' + logo.hoogte + ')');

const iconen = [
  // Gewone iconen: het logo mag ruim in beeld staan.
  { pad: 'assets/icon-192.png', maat: 192, deel: 0.78 },
  { pad: 'assets/icon-512.png', maat: 512, deel: 0.78 },
  // iOS snijdt zelf de hoeken af, dus iets meer rand.
  { pad: 'assets/apple-touch-icon.png', maat: 180, deel: 0.72 },
  // Maskeerbaar: Android snijdt hier een cirkel uit. Alles buiten de veilige
  // zone van 80% kan wegvallen, dus het logo blijft klein en gecentreerd.
  { pad: 'assets/icon-maskable-512.png', maat: 512, deel: 0.56 },
  { pad: 'assets/favicon-32.png', maat: 32, deel: 0.86 },
];

for (const icoon of iconen) {
  const beeld = maakIcoon(logo, icoon.maat, icoon.deel);
  schrijfPng(icoon.pad, beeld.breedte, beeld.hoogte, beeld.rgba);
  console.log('  ' + icoon.pad + ' (' + icoon.maat + 'x' + icoon.maat + ')');
}

console.log('klaar: ' + iconen.length + ' iconen');
