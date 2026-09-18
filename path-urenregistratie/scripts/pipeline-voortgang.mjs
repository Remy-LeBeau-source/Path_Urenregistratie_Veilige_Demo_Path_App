#!/usr/bin/env node

// Meldt aan de kwaliteitsstraat hoe ver een wens in de straat staat, zodat de
// pagina meebeweegt terwijl er gewerkt wordt in plaats van pas na een push.
//
//   node scripts/pipeline-voortgang.mjs PATH-201 2 "Zephyr-case geschreven"
//   node scripts/pipeline-voortgang.mjs PATH-201 0            (weer vrijgeven)
//
// De vier stappen komen overeen met de balk op de pagina:
//   1 Ticket & scenario   2 Zephyr-testcase   3 Automatische test   4 TEST & Living Doc
//   0 betekent: niet (meer) onderhanden.
//
// Waar het heen gaat en waarmee het zich meldt:
//   PATH_KWALITEITSSTRAAT_URL     standaard http://127.0.0.1:8000
//   PATH_AGENT_SLEUTEL            dezelfde waarde als `kwaliteitsstraat.agent_sleutel`
//                                 in server/config.local.php
//
// Zonder sleutel weigert de server, en dat is de bedoeling: voortgang melden
// verandert wat de pagina beweert over lopend werk. Zou iedereen dat mogen, dan
// kan iedereen laten zien dat iets "op TEST staat" terwijl dat niet zo is.
//
// Dit script faalt met opzet zacht: lukt het melden niet, dan is dat hooguit
// jammer voor het scherm en mag het nooit een lopende opdracht afbreken.

const [sleutel, faseRuw, ...rest] = process.argv.slice(2);
const toelichting = rest.join(" ").trim();

if (!sleutel || faseRuw === undefined) {
  console.error('Gebruik: node scripts/pipeline-voortgang.mjs <SLEUTEL> <0-4> ["toelichting"]');
  process.exit(1);
}

const fase = Number(faseRuw);
if (!Number.isInteger(fase) || fase < 0 || fase > 4) {
  console.error(`"${faseRuw}" is geen fase; verwacht een heel getal van 0 tot en met 4.`);
  process.exit(1);
}

const basis = (process.env.PATH_KWALITEITSSTRAAT_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const agentSleutel = process.env.PATH_AGENT_SLEUTEL || "";

const antwoord = await fetch(`${basis}/pilot/path-kwaliteitsstraat-store.php`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(agentSleutel ? { "X-Path-Agent": agentSleutel } : {}),
  },
  body: JSON.stringify({ action: "voortgang", key: sleutel, fase, toelichting }),
}).catch(fout => ({ ok: false, status: 0, tekst: fout.message }));

if (!antwoord.ok) {
  const detail = antwoord.status === 401
    ? "niet geaccepteerd; staat PATH_AGENT_SLEUTEL gelijk aan kwaliteitsstraat.agent_sleutel op de server?"
    : `HTTP ${antwoord.status || "geen verbinding"}`;
  console.error(`Voortgang niet gemeld (${detail}). Het werk zelf gaat gewoon door.`);
  process.exit(0);
}

console.log(`Voortgang gemeld: ${sleutel} staat op stap ${fase}${toelichting ? ` (${toelichting})` : ""}.`);
