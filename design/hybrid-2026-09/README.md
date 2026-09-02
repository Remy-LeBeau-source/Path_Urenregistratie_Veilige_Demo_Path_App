# Path Uren — hybride herontwerp (parkeerkopie, sep 2026)

Backup van het hybride ontwerpvoorstel, gemaakt uit drie eerdere mockups.
**Nog niet geïmplementeerd** — bewaard voor "ooit een keer".

## Wat het is

10 schermen als één ontwerp-canvas:
Login · Dashboard (beheerder) · Urenoverzicht (medewerker) · Goedkeuringen ·
Facturen · Documentarchief-modal · Klanturenstaten · Mededelingen ·
Medewerkers (Teambeheer) · Instellingen.

Gebaseerd op de echte app-tokens (navy `#0d1b38`, Path-groen `#3abd9d`/`#169276`,
Roboto Slab serif-koppen, de bestaande pill-/tabel-/stepper-onderdelen) op een
warmer crème vlak. Overgenomen uit de mockups: de "Actuele maand bij inloggen"-pill,
groen/oranje/grijs-legenda, KPI-rij met aantal + %, zoeken + paginering, en het
Documentarchief-modal met statusstepper bovenaan + Factuur/Urenstaat-kaarten naast
elkaar + omkaderde "Externe bevestiging terugdraaien".

## Bestanden

- `build.mjs` — generator die de artboards schrijft (`node build.mjs`)
- `*.dc.html` — de 10 artboards (Design Components-formaat)
- `canvas.json` — canvas-indeling

## Live kopie

Ook opgeslagen als Artifact op het Claude-account (via `/artifacts` of
claude.ai/code/artifacts). Die versie is bewerkbaar en exporteerbaar naar PNG/PDF.
