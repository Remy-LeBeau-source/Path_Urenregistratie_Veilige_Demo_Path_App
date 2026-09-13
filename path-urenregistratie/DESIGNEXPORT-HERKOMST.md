# Herkomst van de designexports (handoff/)

`path-urenregistratie/handoff/` bevat de **referentie-vormgeving** die Gio exporteert vanuit zijn
Claude-designproject. Het zijn geen app-bestanden: ze worden niet gebouwd, niet meegedeployed en door
geen enkele test gebruikt.

## Waarom de map zelf niet in Git staat, maar dit bestand wel

`handoff/` staat in `.gitignore` met de toelichting "Design-overdracht: losse HTML/CSS die design
aanlevert; wordt handmatig in pilot/ verwerkt en hoort niet in Git". Die regel blijft staan: de
exports zijn gegenereerde bundels van ~190 kB die elke designronde opnieuw worden weggeschreven, en
dat is precies wat die regel wil weren.

Maar daarmee is niet meer na te trekken tegen welke versie is gebouwd, en dat is wél nodig -- zeker
omdat de herontwerp- en main-sessie één `.git` delen (aparte worktrees, gedeelde objects en
stash-stack) en een misgrepen `git stash pop` in de nacht van 12 op 13 september al eens werk heeft
verplaatst. Daarom staat de herkomst hier, in een gevolgd bestand, terwijl de bundels zelf ongevolgd
blijven.

Wordt de map alsnog nodig geacht in Git, dan is dat een bewuste wijziging van `.gitignore` plus de
toelichting in `HANDOFF-PILOT-DESIGN.md` punt 8 -- geen `git add -f` langs de regel heen.

## Werkwijze

Gio exporteert **na elke designwijziging opnieuw**. Haal daarom vóór het bouwen altijd de laatste
versie op en kijk in `github.md` (projectroot) welke ronde er is toegevoegd — daar staat per ronde
in één regel wat er is gewijzigd. Bewaar de oude versie eerst, zodat je de diff kunt tonen.

De exports zijn gebundelde artefacten (React in een base64-bundel). De leesbare bron zit als
geëscapete string in het `__bundler/template`-script; daaruit zijn het `:root`-tokenblok (licht én
donker) en alle inline stijlen te halen. Dat is nodig omdat Gio eist dat waarden **exact** worden
overgenomen en niet geïnterpreteerd of afgerond.

`medewerker-wild.bron.txt` is die uitgepakte, leesbare bron van `medewerker-wild.html`, bewaard zodat
elke overgenomen hex-, px- en rgba-waarde na te trekken is zonder de bundel opnieuw uit te pakken.

## Versie waartegen nu gebouwd wordt

Opgehaald 2026-09-13T10:30Z, sha256 (eerste 16 tekens):

| Bestand | sha256 |
| --- | --- |
| `handoff/medewerker-wild.html` | `a1433f7c1bc8060b` |
| `handoff/HANDOFF-MEDEWERKER-MOBIEL.md` | `09695ffab2f97044` |
| `github.md` | `d75d512a2a10a123` |

Wijzigt een export, werk dan deze tabel bij in dezelfde commit als het bouwwerk dat erop volgt.

## Wat hier (nog) niet ligt

`medewerker-gui.html`, de desktop/GUI-variant. Die is in ontwikkeling en komt als aparte opdracht;
in de ronde van 13 september is daar de hero-ring vervangen door een KPI-rij en het maandverloop van
een inklapbare accordeon naar een vaste horizontale stappenbalk.
