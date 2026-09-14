# Overdracht aan Codex — medewerker Klassiek (14 september 2026, avond)

Vervangt de eerdere versie van dit bestand. Zelfstandig leesbaar.

## Stand

- Branch `herontwerp`, werkmap `C:\Path-herontwerp-actief\path-urenregistratie`.
- Gepusht: `132a1fbe` (**2.0.68**). CI-run `34869007628` op die commit: 7 shards groen, shard 1 rood op
  `CTS-API-H-006` (zie hieronder, al gerepareerd maar nog niet gepusht).
- Lokaal gecommit, **nog niet gepusht**: `7c75e0e4` en `eb2caf90` (**2.0.69**), plus een ongecommitte
  regelwijziging in `tests/playwright/customer-timesheet-api.spec.ts` (fix CTS-API-H-006). Deze overdracht
  wordt samen daarmee gecommit en gepusht.
- Lokale server van Gio: `start-path-app.ps1 -Mode desktop` op http://localhost:8000/. Lokale Playwright
  kan ernaast op een andere poort: `PATH_APP_BASE_URL=http://127.0.0.1:8010 node scripts/run-playwright-e2e.mjs ...`
  (let op: dezelfde testdatabase, dus lokale uitslagen kunnen verstoord zijn als Gio tegelijk klikt).

## Werkwijze (vastgelegd door Gio — volgen)

1. **Volledige regressie alleen via CI.** Lokaal nooit een suite over meerdere spec-bestanden.
2. Vóór elke push: alleen de geraakte cases lokaal (`-g '"ID|ID"'` met dubbele aanhalingstekens binnen
   enkele, anders breekt Windows de `|`), op desktop-chromium en mobile-chrome waar relevant.
3. **Tegenproef** per nieuwe/gewijzigde assertion: verwachting in de test omdraaien (niet `app.js`), rood
   zien, terugzetten, controleren op achtergebleven `TEGENPROEF`.
4. Goedkope poorten: `node --check assets/app.js`, `npm run test:design`, `npm run test:bdd:design`,
   `node scripts/contrast-licht-donker.mjs`, `npm run docs:sync` (gegenereerde bestanden meecommitten),
   `npm run version:check`. Nieuwe case = scenario in `tests/playwright/features/*.feature` + stappen in
   `tests/playwright/steps/*.steps.ts`, anders faalt de design-audit in shard 1.
5. **Versienummer ophogen bij elke bundel die Gio bekijkt**, ook lokaal: `npm run version:set -- 2.0.70`.
6. Niet pushen terwijl een CI-run loopt als het kan wachten: elke push breekt de lopende run af.
7. CI-fouten ophalen: `gh api --allow-escape-sequences repos/{owner}/{repo}/actions/jobs/<id>/logs`, filteren op
   `N) [` en `Error:`. Geen `gh run watch`.
8. Geen `git stash` (gedeelde .git met andere sessies). `node_modules` staat in git en is lokaal gewijzigd:
   niet committen. `handoff/` staat in `.gitignore`.
9. Modern (`styles-new.css`) niet aanraken. Niet naar main mergen of PROD promoten zonder Gio.
10. Gio's woord gaat voor documenten. Bij twijfel vragen.

## Designbron

`handoff/OPDRACHT.md`, `handoff/DESIGN-BESLUITEN.md`, `handoff/medewerker-gui.html` (desktop, leidend voor kop en
Mijn uren) en `handoff/medewerker-wild.html` (telefoon). Leesbare bron uitpakken met
`node <scratchpad>/uitpakken.mjs handoff/medewerker-gui.html handoff/medewerker-gui.bron.txt` (script: haalt de
string uit `<script type="__bundler/template">` en ontsnapt `\n`, `\"`). Waarden 1-op-1 overnemen.
Export 16:26 + gui-herexport daarna (salie-palet in `pas()` gecorrigeerd naar doorschijnend) staan in `handoff/`.

## Wat er deze ronde gebouwd is (2.0.63 – 2.0.69)

- **Menubalk (desktop ≥821, medewerker Klassiek licht én donker):** horizontaal; testknoppen als pictogrammen
  in `#testbalk` (plaatsTestknoppen); bel + profielmenu verhuisd naar rechts in de menubalk
  (`plaatsKopBediening`); topbalk (`.topbar`) verborgen bij de medewerker; alleen de menubalk plakt.
  `body.dataset.scherm` (niet `data-view`: botste met `[data-view]`-selectors in admin-tests).
- **Maandkiezer:** de echte `#global-period-control` verhuist als pil in de kopkaart (Vandaag) of naast de
  schermtitel (`.view-heading`) op andere schermen. Geen dubbele titel of avatar.
- **Vandaag, kop variant 5c:** `vandaagKopWaarden`, `vandaagWekenHtml`, `vandaagDagvakHtml` in `app.js`; weekvlakken
  met dagvakjes (mint gevuld / amber leeg ademend / laag weekend). Dagvakje → Mijn uren met focus in dat vak;
  weekvlak → die week; op telefoon (≤820) zijn vakjes `pointer-events:none`. Tokens `--weekvlak`,
  `--dag-leeg`, `--dag-leeg-ink` (licht en donker).
- **Kaarten doorschijnend:** `--surface rgba(255,255,255,.78)`, `--surface-muted .46`, body `#cfe1d8` +
  vast veldverloop (desktop); telefoon volgens wild `:root` (`.66`, `#dfe9e4`).
- **Mijn uren desktop (gui r319-371):** één kaart, weeknummers in de segmentknop, "36 OPEN" per rij, lege dag "–",
  voetregel "Automatisch opgeslagen. Nog N werkdagen niet ingevuld." (oranje blok met dagchips weg),
  statuspil blijft zichtbaar (elf E2E-cases van main wachten erop — op de lijst voor main).
  Maand indienen verschijnt ook in weekweergave zodra de maand vol is. Pijl links/rechts in de weekkeuze,
  Tab op vrijdagveld → volgende week, vegen 55px (`stapUrenPeriode`). Dagen buiten de maand: datum +
  gedempt, niet invulbaar veld (`.hours-buiten-veld`), tekst `--muted`. Focus blijft in urenvak na hertekenen.
- **Klanturenstaatpaneel:** van Mijn uren naar het eigen scherm `#view-customer-timesheet`
  (`restoreCustomerTimesheetPanelHome` kiest in Klassiek dat anker). Ingang: "Andere maand of concept
  opslaan →" op de kaart op Vandaag.
- **Voettekst** links bij elkaar binnen `--pagina`.
- Nieuwe/aangepaste cases: DASH-H-032, -045 t/m -051, SKIN-H-025, -037, MOB-H-002, CTS-API-H-006/-016,
  GUI-smoke in dashboard.spec.

## Eerstvolgende taak: Maanden als uitklaplijst (besluit Gio, 14 sep)

Bron: gui r377-420 (markup) en r1194-1270 (`maanden`-logica); DESIGN-BESLUITEN.
- Kop: label "MIJN MAANDEN", titel "N urenstaten", maandpil, pil "‹ Terug naar dashboard".
- Per maand een kaart (radius 15, rand `--line-zacht`, open = rand `--mint`), dicht bij openen; klik klapt open
  (één tegelijk). Rij: naam (15.5px kop), uren, **één statuspil** die de stap noemt waar het op wacht
  ("Uren open", "Correctie gevraagd", "Ingediend", "Urenstaat open", "Afgerond" …; nooit "in behandeling").
  Pilkleuren: afgerond mint `rgba(58,189,157,.16)`/`--mint-tekst`; wacht op medewerker amber
  `rgba(187,118,35,.14)`/`--warning-tekst`; anders `--surface-muted`/`--muted`.
- Uitgeklapt: uren per week, de vijf verloopstappen (gebruik `statusKetenStappen`), één hoofdknop per stand
  (Uren invullen / Correctie doorvoeren / Klanturenstaat aanleveren), en **alleen bij afgerond** de knop
  "PDF Urenoverzicht" met eronder exact: "Dezelfde PDF die je per mail kreeg — je uren per week."
  Geen geldbedragen, geen woord "bedragen". De PDF bestaat al: `buildTimesheetReceiptPdfBase64(employee, period,
  record)` in `app.js` (r2071); downloadhelper rond r12660 (bestand afleveren zonder weg te navigeren).
- De Klanturenstaat-kolom vervalt. **DASH-H-025** verhuist naar de pil; **DASH-H-031** (verloop openklappen
  in Mijn maanden) aanpassen. Bestaande code: `renderEmployeeHistory`-blok rond `app.js` r6700-6770,
  toggles `[data-history-verloop]` / `state.historyVerloopOpen`, `[data-history-period]`.
  Let op andere cases die `#employee-history .employee-history-row` gebruiken (DASH-N-024, DASH-H-007,
  DASH-H-038, TS-REV-UI) — grep vóór bouwen.

## Stil houden / op de lijst

- **Berichten** niet aanraken tot Gio de tabs (Alles / Ongelezen / Ingetrokken) heeft nagelopen.
- **"Hulp & contact"** zweeft over de inhoud: echte fout, maar main-tests klikken erop — laten staan tot main.
- **Statuspil op Mijn uren**: weghalen zodra main die elf E2E-cases aanpast.
- Donker thema is deze ronde niet herontworpen, alleen de menubalk loopt mee.
- Afwijking `--muted` i.p.v. `--line` voor dagen buiten de maand is door Gio goedgekeurd en in de referentie
  overgenomen.
