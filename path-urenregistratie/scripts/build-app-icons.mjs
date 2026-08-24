/*
 * Maakt het merkbeeld voor de app uit assets/path-logo-bron.png.
 *
 * Dat bronbestand is het aangeleverde logo: 1241x857 met transparantie, en
 * gestapeld opgebouwd -- symbool boven, daaronder "Path", daaronder
 * "Consultancy". Het vorige bronbestand was 162x54, en daaruit een icoon van
 * 512 maken betekende acht keer vergroten. Dat werd blokkerig.
 *
 * Er komen twee vormen uit:
 *
 *   - assets/path-logo.png   liggend, voor de koptekst en het loginscherm. Daar
 *                            is de ruimte breed en laag, dus staat het symbool
 *                            links en de naam ernaast. De verhouding blijft
 *                            ongeveer 3:1, zoals het bestand dat het vervangt,
 *                            zodat de opmaak niet verschuift.
 *   - de vijf app-iconen     gestapeld, want een icoon is vierkant. Zonder
 *                            "Consultancy": op een beginscherm wordt dat rond
 *                            de vijf pixels hoog en dus onleesbaar, terwijl het
 *                            de rest wel kleiner maakt.
 *
 * Draai met: node scripts/build-app-icons.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const BRON = 'assets/path-logo-bron.png';
const ACHTERGROND = [0x0d, 0x1b, 0x38]; // --navy

// --- PNG lezen -------------------------------------------------------------

function leesPng(pad) {
  const buf = readFileSync(pad);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('geen PNG: ' + pad);

  const breedte = buf.readUInt32BE(16);
  const hoogte = buf.readUInt32BE(20);
  if (buf[24] !== 8) throw new Error('alleen 8 bit per kanaal wordt ondersteund');
  const kleurtype = buf[25];

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

  const rgba = Buffer.alloc(breedte * hoogte * 4);
  for (let p = 0; p < breedte * hoogte; p++) {
    let r; let g; let b; let a = 255;
    if (kleurtype === 3) {
      const index = vlak[p];
      r = palet[index * 3]; g = palet[index * 3 + 1]; b = palet[index * 3 + 2];
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

function schrijfPng(pad, beeld) {
  const { breedte, hoogte, rgba } = beeld;
  const ruw = Buffer.alloc(hoogte * (breedte * 4 + 1));
  for (let y = 0; y < hoogte; y++) {
    ruw[y * (breedte * 4 + 1)] = 0;
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
  ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(pad, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    stuk('IHDR', ihdr),
    stuk('IDAT', deflateSync(ruw, { level: 9 })),
    stuk('IEND', Buffer.alloc(0)),
  ]));
}

// --- Bewerkingen -----------------------------------------------------------

function knipUit(beeld, x0, y0, breedte, hoogte) {
  const rgba = Buffer.alloc(breedte * hoogte * 4);
  for (let y = 0; y < hoogte; y++) {
    for (let x = 0; x < breedte; x++) {
      const bron = ((y + y0) * beeld.breedte + (x + x0)) * 4;
      const doel = (y * breedte + x) * 4;
      for (let k = 0; k < 4; k++) rgba[doel + k] = beeld.rgba[bron + k];
    }
  }
  return { breedte, hoogte, rgba };
}

// Lege randen weghalen: op een icoon telt elke pixel.
function randenWeg(beeld, drempel = 140) {
  const vol = (x, y) => beeld.rgba[(y * beeld.breedte + x) * 4 + 3] > drempel;
  let links = 0;
  let rechts = beeld.breedte - 1;
  let boven = 0;
  let onder = beeld.hoogte - 1;
  const kolomLeeg = (x) => { for (let y = 0; y < beeld.hoogte; y++) if (vol(x, y)) return false; return true; };
  const rijLeeg = (y) => { for (let x = 0; x < beeld.breedte; x++) if (vol(x, y)) return false; return true; };
  while (links < rechts && kolomLeeg(links)) links++;
  while (rechts > links && kolomLeeg(rechts)) rechts--;
  while (boven < onder && rijLeeg(boven)) boven++;
  while (onder > boven && rijLeeg(onder)) onder--;
  return knipUit(beeld, links, boven, rechts - links + 1, onder - boven + 1);
}

// Het bronlogo is gestapeld: symbool, dan "Path", dan "Consultancy", met lege
// rijen ertussen. Die scheidingen zoeken we op in plaats van ze te schatten,
// zodat een ander logobestand ook werkt.
function splitsGestapeld(beeld) {
  const gevuld = [];
  for (let y = 0; y < beeld.hoogte; y++) {
    let aantal = 0;
    for (let x = 0; x < beeld.breedte; x++) {
      if (beeld.rgba[(y * beeld.breedte + x) * 4 + 3] > 140) aantal++;
    }
    gevuld.push(aantal);
  }

  const blokken = [];
  let start = -1;
  for (let y = 0; y < beeld.hoogte; y++) {
    if (gevuld[y] > 0 && start < 0) start = y;
    if (gevuld[y] === 0 && start >= 0) {
      blokken.push([start, y - 1]);
      start = -1;
    }
  }
  if (start >= 0) blokken.push([start, beeld.hoogte - 1]);

  if (blokken.length < 2) {
    throw new Error('kon de onderdelen niet scheiden: ' + blokken.length + ' blok(ken) gevonden');
  }

  const pak = ([van, tot]) => randenWeg(knipUit(beeld, 0, van, beeld.breedte, tot - van + 1));
  return {
    symbool: pak(blokken[0]),
    woordPath: pak(blokken[1]),
    woordConsultancy: blokken[2] ? pak(blokken[2]) : null,
  };
}

function schaal(bron, nieuweBreedte, nieuweHoogte) {
  const uit = Buffer.alloc(nieuweBreedte * nieuweHoogte * 4);
  const schaalX = bron.breedte / nieuweBreedte;
  const schaalY = bron.hoogte / nieuweHoogte;
  for (let y = 0; y < nieuweHoogte; y++) {
    const by = Math.min(bron.hoogte - 1, (y + 0.5) * schaalY - 0.5);
    const y0 = Math.max(0, Math.floor(by));
    const y1 = Math.min(bron.hoogte - 1, y0 + 1);
    const fy = by - y0;
    for (let x = 0; x < nieuweBreedte; x++) {
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
        uit[(y * nieuweBreedte + x) * 4 + k] = Math.round(boven + (onder - boven) * fy);
      }
    }
  }
  return { breedte: nieuweBreedte, hoogte: nieuweHoogte, rgba: uit };
}

function leegVlak(breedte, hoogte, kleur) {
  const rgba = Buffer.alloc(breedte * hoogte * 4);
  if (kleur) {
    for (let p = 0; p < breedte * hoogte; p++) {
      rgba[p * 4] = kleur[0];
      rgba[p * 4 + 1] = kleur[1];
      rgba[p * 4 + 2] = kleur[2];
      rgba[p * 4 + 3] = 255;
    }
  }
  return { breedte, hoogte, rgba };
}

function plak(doel, bron, x0, y0) {
  for (let y = 0; y < bron.hoogte; y++) {
    for (let x = 0; x < bron.breedte; x++) {
      const b = (y * bron.breedte + x) * 4;
      const alpha = bron.rgba[b + 3] / 255;
      if (alpha < 0.004) continue;
      const dx = x + x0;
      const dy = y + y0;
      if (dx < 0 || dy < 0 || dx >= doel.breedte || dy >= doel.hoogte) continue;
      const d = (dy * doel.breedte + dx) * 4;
      const bestaand = doel.rgba[d + 3] / 255;
      const samen = alpha + bestaand * (1 - alpha);
      for (let k = 0; k < 3; k++) {
        doel.rgba[d + k] = Math.round(
          (bron.rgba[b + k] * alpha + doel.rgba[d + k] * bestaand * (1 - alpha)) / (samen || 1),
        );
      }
      doel.rgba[d + 3] = Math.round(samen * 255);
    }
  }
}

// --- Uitvoeren -------------------------------------------------------------

const bron = leesPng(BRON);
const delen = splitsGestapeld(randenWeg(bron));
console.log('bron: ' + BRON + ' (' + bron.breedte + 'x' + bron.hoogte + ')');
console.log('  symbool: ' + delen.symbool.breedte + 'x' + delen.symbool.hoogte);
console.log('  Path: ' + delen.woordPath.breedte + 'x' + delen.woordPath.hoogte);
console.log('  Consultancy: ' + (delen.woordConsultancy
  ? delen.woordConsultancy.breedte + 'x' + delen.woordConsultancy.hoogte
  : 'niet gevonden'));

// 1. Liggend logo voor de koptekst en het loginscherm.
{
  const hoogte = 216;
  const symHoogte = Math.round(hoogte * 0.86);
  const symBreedte = Math.round(symHoogte * (delen.symbool.breedte / delen.symbool.hoogte));
  const tussen = Math.round(hoogte * 0.12);

  const pathHoogte = Math.round(hoogte * 0.42);
  const pathBreedte = Math.round(pathHoogte * (delen.woordPath.breedte / delen.woordPath.hoogte));

  let consHoogte = 0;
  let consBreedte = 0;
  if (delen.woordConsultancy) {
    consBreedte = pathBreedte;
    consHoogte = Math.round(consBreedte * (delen.woordConsultancy.hoogte / delen.woordConsultancy.breedte));
  }

  const kier = Math.round(hoogte * 0.05);
  const woordHoogte = pathHoogte + (consHoogte ? kier + consHoogte : 0);
  const breedte = symBreedte + tussen + Math.max(pathBreedte, consBreedte);

  const vlak = leegVlak(breedte, hoogte, null);
  plak(vlak, schaal(delen.symbool, symBreedte, symHoogte), 0, Math.round((hoogte - symHoogte) / 2));

  const woordTop = Math.round((hoogte - woordHoogte) / 2);
  plak(vlak, schaal(delen.woordPath, pathBreedte, pathHoogte), symBreedte + tussen, woordTop);
  if (delen.woordConsultancy) {
    plak(vlak, schaal(delen.woordConsultancy, consBreedte, consHoogte),
      symBreedte + tussen, woordTop + pathHoogte + kier);
  }

  schrijfPng('assets/path-logo.png', vlak);
  console.log('  assets/path-logo.png (' + breedte + 'x' + hoogte + ', liggend)');
}

// 2. De app-iconen: gestapeld op het huisstijlblauw, zonder "Consultancy".
//
//    `deel` bepaalt hoe groot het geheel mag staan. Voor het maskeerbare icoon
//    kleiner, want Android snijdt daar een cirkel uit met een doorsnede van 80
//    procent -- en een gestapelde vorm is bijna vierkant, dus de hoekpunten
//    liggen verder van het midden dan bij een liggend logo. Bij 0,72 komt het
//    verste punt op 79 procent uit; bij 0,74 al op 81 en valt het eruit.
//    Nagemeten op het gemaakte bestand, niet geschat.
// Het woordmerk in het logobestand is donkerblauw, gemaakt voor een lichte
// ondergrond. Op het huisstijlblauw van het icoon valt het daardoor weg. Wit
// kleuren is hier geen vrijheid: het vorige logobestand had het woordmerk al
// wit, juist voor donkere ondergronden.
function witMaken(beeld) {
  const rgba = Buffer.from(beeld.rgba);
  for (let p = 0; p < beeld.breedte * beeld.hoogte; p++) {
    rgba[p * 4] = 255;
    rgba[p * 4 + 1] = 255;
    rgba[p * 4 + 2] = 255;
  }
  return { breedte: beeld.breedte, hoogte: beeld.hoogte, rgba };
}

function maakIcoon(maat, deel) {
  const vlak = leegVlak(maat, maat, ACHTERGROND);

  const symBreedte = Math.round(maat * deel * 0.46);
  const symHoogte = Math.round(symBreedte * (delen.symbool.hoogte / delen.symbool.breedte));
  const woordBreedte = Math.round(maat * deel * 0.72);
  const woordHoogte = Math.round(woordBreedte * (delen.woordPath.hoogte / delen.woordPath.breedte));
  const tussen = Math.round(maat * 0.05);

  const totaal = symHoogte + tussen + woordHoogte;
  const top = Math.round((maat - totaal) / 2);

  plak(vlak, schaal(delen.symbool, symBreedte, symHoogte), Math.round((maat - symBreedte) / 2), top);
  plak(vlak, schaal(witMaken(delen.woordPath), woordBreedte, woordHoogte),
    Math.round((maat - woordBreedte) / 2), top + symHoogte + tussen);

  return vlak;
}

const iconen = [
  { pad: 'assets/icon-192.png', maat: 192, deel: 1.0 },
  { pad: 'assets/icon-512.png', maat: 512, deel: 1.0 },
  { pad: 'assets/apple-touch-icon.png', maat: 180, deel: 0.94 },
  { pad: 'assets/icon-maskable-512.png', maat: 512, deel: 0.72 },
  { pad: 'assets/favicon-32.png', maat: 32, deel: 1.0 },
];

for (const icoon of iconen) {
  schrijfPng(icoon.pad, maakIcoon(icoon.maat, icoon.deel));
  console.log('  ' + icoon.pad + ' (' + icoon.maat + 'x' + icoon.maat + ')');
}

console.log('klaar');
