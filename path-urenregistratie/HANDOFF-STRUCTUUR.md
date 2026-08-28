# Handoff — meer structuur in formulieren en Instellingen

Bijgewerkt: 29 augustus 2026. Aangevraagd door Gio na de dashboard-herindeling (0.9.153).
Volgt op `CLAUDE_CODE_HANDOFF.md`.

## Doel

Lange, platte formulieren opdelen in herkenbare secties met koppen, zodat je bij het
scannen weet waar je bent. **Geen enkele functie of veld verdwijnt** — alleen groepering,
koppen en witruimte. Zelfde regel als bij het dashboard: functionele tests
(klikken, opslaan, validatie, rolafscherming) blijven ongemoeid; alleen tests die op de
oude *opmaak* leunen worden meegemigreerd.

## Uitgangspositie

Wat al goed zit:

- `#view-settings` heeft een sprongmenu (`.settings-section-nav`) en per onderdeel een
  `.panel.settings-card` met een `.email-template-heading` (section-label + `h3` + status-pill).
- De view-koppen (`.view-heading`: section-label + `h2` + uitleg + `.heading-actions`) zijn
  consistent over Mijn uren / Goedkeuringen / Facturen / Mededelingen / Medewerkers / Instellingen.
- Tokens (`--line`, `.panel`, `.section-label`, knopvarianten) zijn overal hetzelfde, dus
  kleur/typografie is al consistent — wat mist is *interne* groepering van velden.

## Bevindingen per scherm

### 1. Instellingen (`#view-settings`) — grootste winst

| Kaart | Nu | Voorstel |
|---|---|---|
| **Facturatie** (`#settings-invoicing`) | 11 velden in één platte `.form-grid` | 4 subgroepen met een `<h4>`/legenda: **Namen** (handelsnaam, juridische naam, naamweergave) · **Registratie** (KvK, BTW, IBAN) · **Adres & contact** (adres, postcode+plaats, telefoon, factuur-e-mail) · **Voorwaarden** (betalingstermijn). De live-preview blijft onderaan. |
| **E-mail & ontvangers** (`#settings-routing`) | Eén kaart met dríe dingen: afzender/modus, ontvangerroutes (broker + vaste), acceptatieconsole, verzendadministratie | Splitsen in **drie kaarten**: `Verzendinstellingen`, `Ontvangers & routes`, `Verzendcontrole & administratie`. Elk krijgt een eigen `settings-section-nav`-knop. |
| **Teksten** (`#settings-texts`) | Klanturenstaat-teksten (2 subkaarten) + per-soort-ontvanger-lijst in één kaart; daarnaast een losse full-width kaart "Per medewerker · factuur- en brokerteksten" | De losse "Per medewerker"-kaart een expliciete `settings-section-nav`-knop geven; binnen `#settings-texts` een duidelijke `<h4>`-scheiding tussen "Klanturenstaat" en "Per soort ontvanger" (staat er half). |
| **Veiligheid** (`#settings-safety`) | Bare `<h3>` zonder section-label of status-pill — wijkt af van de andere kaarten | Zelfde `.email-template-heading`-kop geven (section-label "Vast" + `h3` + pill "Altijd aan"). |
| **Sprongmenu** (`.settings-section-nav`) | Ankers; je scrolt de hele lange pagina | Overwegen: echte tabs (één onderdeel tegelijk). Grotere ingreep — raakt `smoke-test.mjs` (`#settings-organization`/`#settings-invoicing` moeten dan `hidden` kunnen zijn) en `SETTINGS-*`/`ADM-WR-*`-specs. Apart inplannen, niet in de eerste pass. |

### 2. Medewerker bewerken (modal, `assets/app.js` ~8931) — tweede grootste

Eén `.modal-form` met ~30 velden, alleen gescheiden door `<p class="full form-help">`-tussenkopjes
("Account en contract", "Opdracht en factuurroute", …). Voorstel:

- Elke groep in een `<section class="modal-form-section">` met een echte `<h4>`:
  **Account & contract** · **Opdracht & factuur** · **Mailroutes** · **Klanturenstaat** · **Meldingen**.
- De `<p class="form-help">`-pseudokoppen vervallen; de uitleg-`<p>`'s die echt uitleg zijn blijven.
- CSS: `.modal-form-section + .modal-form-section { border-top: 1px solid var(--line); padding-top: 14px; }`
- Testkoppeling: `smoke-test.mjs` (ADM-WR-region), `admin-writes.spec.ts`, `mobile-ui.spec.ts`
  (`MOB-H-005`), `user-management.spec.ts` lezen veel `#edit-*`-velden op tekst/waarde — die
  blijven werken zolang de id's blijven. Alleen als een test `.modal-form > label:nth-child(n)`
  of de pseudokop-`<p>`-tekst gebruikt, meemigreren. (Grep vooraf: `grep -rn "form-help" tests/`.)

### 3. Beheerder bewerken (modal, `assets/app.js` ~9198)

Klein (naam, e-mail, meldingen-checkbox). Geen actie nodig.

### 4. Overige views

- **Mijn uren** (`#view-timesheet`): urenraster + klanturenstaat-uploadpaneel. Structuur is
  oké; eventueel de toolbar (`.hours-view-toolbar`) compacter, geen prioriteit.
- **Goedkeuringen / Facturen / Mededelingen / Medewerkers**: lijst-/kaartschermen, geen lange
  formulieren. Laag.
- **Mijn profiel / Wachtwoord wijzigen** (modals): al kort en gegroepeerd. Geen actie.

## Voorgestelde volgorde (elk een eigen versie, apart terug te draaien)

1. **0.9.154** — Instellingen: Facturatie-kaart in 4 subgroepen + Veiligheid-kaart een nette kop.
   Puur `index.html` + `styles.css`. Laagste risico, meteen zichtbaar.
2. **0.9.155** — Medewerker-bewerken-modal in 5 secties (`assets/app.js` + `styles.css`).
   Testmigratie beperkt tot pseudokop-checks.
3. **0.9.156** — `#settings-routing` splitsen in 3 kaarten + 3 sprongmenu-knoppen.
   Meer HTML-herschikking; `email-queue.spec.ts` / `mail-acceptance`-refs nalopen.
4. **Later / apart** — sprongmenu → echte tabs. Grotere interactie- en testwijziging.

## Wat NIET verandert

- Geen veld weg, geen id weg, geen knop weg, geen validatie of opslag-gedrag.
- Geen kleur-/typografiewijziging (tokens blijven).
- Rolafscherming, CSRF, serverkant: onaangeroerd.

## Status

- [~] Dashboard-herindeling (0.9.150–0.9.153) is op verzoek van Gio **teruggedraaid** naar de
  0.9.149-opmaak (commit `31b99dc`). Behouden: de `.htaccess` cache-fix, de 7 nieuwe
  remote-testcases, vite `open: true`. De uitgewerkte voorstellen staan nog als artifacts
  (`dashboard-drie-looks`, `dashboard-mix-voorbeeld`, `path-uren-compacter`) voor als het later
  weer opgepakt wordt.
- [x] Deze inventarisatie + plan (geldt nog steeds — is opmaak-onafhankelijk).
- [ ] 0.9.154 e.v. — nog niet begonnen.
