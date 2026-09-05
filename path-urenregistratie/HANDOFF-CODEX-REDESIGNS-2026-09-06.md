# Handoff Codex — redesignbibliotheek en 1919-pilot

Bijgewerkt: 6 september 2026, Europe/Amsterdam.

## Uitgangspositie

- Branch: `main`.
- Claude heeft de losstaande 1919-medewerkerpilot gebouwd en gepusht.
- Actuele uitgangscommit tijdens deze handoff: `0465cb1` (`1919-pilot: hero-foto lost nu zacht op in de cream i.p.v. een harde kolomrand`).
- De echte app en de 1919-pilot zijn in deze Codex-ronde niet gewijzigd.

## Opgeleverd

Onder `design-mockups/` staan twintig nieuwe genummerde ontwerppakketten:

- `0101-path-panorama` t/m `2020-path-adaptive`;
- ieder pakket bevat `medewerker-dashboard.jpg`, `beheerder-maandoverzicht.jpg` en `README.md`;
- alle 40 JPG's zijn 1536×1024;
- `NIEUWE-REDESIGNS-0101-2020.md` is de inhoudelijke index;
- `PROMPTSET-0101-2020.md` legt de gedeelde randvoorwaarden en ontwerpgedachte per pakket vast.

Pakketten 0101–0606 blijven dichter bij de bestaande dashboardtaal. Pakketten 0707–2020 onderzoeken bewust andere interactiemodellen: orbit, command deck, kalendercanvas, kanban, inbox, dossierdesk, metro, bento, weekboek, mobile companion, constellation, brutalistische monolith, storyline en adaptive.

## Functionele ontwerpgrenzen

Alle concepten houden dezelfde functionele scheiding aan:

- medewerker ziet geen facturen;
- medewerker registreert en dient alleen de eigen uren in;
- medewerker uploadt de klanturenstaat of registreert dat deze rechtstreeks is gemaild;
- na indienen neemt Backoffice de verwerking over;
- beheerder ziet urencontrole, klanturenstaat, factuur en volgende actie;
- voorbeelden tonen september 2026.

De JPG's zijn ontwerpverkenningen en geen bewijs dat iedere afgebeelde interactie al bestaat.

## Open punt: zichtbare overgang in 1919

De gebruiker wees op `http://127.0.0.1:8000/pilot/1919-medewerker.html` aan dat de overgang niet goed zichtbaar is.

Huidige stand in `pilot/1919-medewerker.html`:

- de hero-afbeelding heeft een horizontaal CSS-masker en lost links zacht op in de cream achtergrond;
- de vier hoofdstukken eronder wisselen nog direct van cream naar navy, forest en dark;
- de linkse verhaallijn is statisch; er is nog geen scroll-sync, actieve hoofdstukovergang of motion tussen rail en content;
- daardoor is de overgang als gebruikerservaring nauwelijks voelbaar, ondanks de zachtere foto-overgang.

Concrete afwijkingen die op de actuele TEST-pagina nog zichtbaar zijn ten opzichte van het 1919-mockupdoel:

- rail en content voelen als twee losse kolommen in plaats van één verbonden verhaallijn;
- de groene aftakkingen eindigen bij de contentrand en lopen visueel niet door naar titel of processtap;
- bij scrollen verandert de actieve railstop niet mee met het zichtbare hoofdstuk;
- cream, navy, forest en dark beginnen als harde horizontale banen zonder overgangsdiepte;
- de hero-fade lost alleen links/rechts op en helpt niet bij de verticale overgang naar `Vul je uren in`;
- er ontbreekt een subtiele binnenkomst of focusverschuiving die duidelijk maakt dat een nieuw hoofdstuk begint.

Voorgestelde vervolgwijziging, alleen na hervatten:

1. voeg echte sectie-overgangen toe met overlappende gradients of `::before`-fades;
2. laat hoofdstukken subtiel binnenkomen met `IntersectionObserver` in een los same-origin JS-bestand;
3. synchroniseer de actieve stop en verbindingslijn in de linker rail met het zichtbare hoofdstuk;
4. respecteer `prefers-reduced-motion` en houd alle inhoud zonder JavaScript leesbaar;
5. breid `PILOT-H-001` en de bijbehorende feature uit met structurele assertions voor de overgang, actieve railstatus en reduced-motion fallback;
6. draai daarna de gerichte pilotcase en `npm run check` voordat opnieuw wordt gepusht.

## Samenwerking en werkboom

- De bestaande map `design-mockups/1919-medewerkers/` hoort bij Claude zijn pilotbron en is niet aan deze commit toegevoegd of gewijzigd.
- Losse `desktop.ini`-bestanden zijn Windows/Verkenner-metadata en worden bewust niet gestaged.
- Oude ontwerpcollecties blijven behouden.
- Geen deployment of PROD-actie uitvoeren vanuit deze handoff zonder nieuwe expliciete opdracht.
