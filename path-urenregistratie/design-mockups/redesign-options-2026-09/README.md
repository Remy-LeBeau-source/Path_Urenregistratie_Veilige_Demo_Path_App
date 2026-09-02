# Redesignopties urenregistratie — september 2026

Tien visuele richtingen op basis van release 0.9.159 en de laatste handoff. Dit zijn conceptbeelden; ze wijzigen de applicatie niet.

## Medewerker

1. `01-medewerker-actie-dashboard.jpg` — eerstvolgende actie, maandvoortgang en drie processtatussen op één startscherm.
2. `02-medewerker-kalender-invoer.jpg` — uren invoeren als primaire werkruimte, met documenten en factuurstatus in een rechterzijbalk.
3. `03-medewerker-proces-tijdlijn.jpg` — de maand als vier duidelijke processtappen: invullen, indienen, goedkeuren en documenten compleet.
4. `04-medewerker-rustige-startpagina.jpg` — rustige start-van-de-maandbeleving met één grote actie en behulpzame lege statussen.
5. `05-medewerker-compact-power-user.jpg` — maximale informatiedichtheid voor veel uren-, verlof- en documentgegevens.

## Beheerder / Backoffice

6. `06-beheerder-command-center.jpg` — werkvoorraad en prioriteiten centraal, met één directe actie per rij.
7. `07-beheerder-statusmatrix.jpg` — alle medewerkers en processtatussen in één maandmatrix.
8. `08-beheerder-kanban-workflow.jpg` — dossiers per procesfase in vier kolommen.
9. `09-beheerder-aandachtspunten.jpg` — alleen uitzonderingen en blokkades, met contextpaneel voor de geselecteerde case.
10. `10-beheerder-dossier-split-view.jpg` — wachtrij links en volledig medewerkerdossier rechts, zonder steeds modals te openen.

## Aanbevolen combinatie

- Medewerker: combineer optie 1 als dashboard met optie 2 voor de daadwerkelijke ureninvoer. Gebruik de proceslijn uit optie 3 in compacte vorm.
- Beheerder: gebruik optie 7 als maandoverzicht en optie 10 voor het afhandelen van één dossier. Voeg het uitzonderingenfilter uit optie 9 toe.
- Vermijd optie 8 als primaire navigatie zolang dossiers niet werkelijk vrij tussen fasen mogen worden gesleept; anders suggereert het ontwerp gedrag dat functioneel niet bestaat.

## Promptset

Alle beelden zijn met de ingebouwde image-generationmodus gemaakt als `ui-mockup`: high-fidelity desktop SaaS, Nederlandse labels, september 2026, Path-navy en mint, amber voor actie, rood alleen voor blokkades. Beperkingen voor alle varianten: bestaande uren-/klanturenstaat-/factuurflow behouden, geen gradients, geen glassmorphism, geen watermerk en geen nieuwe businessmodules.
