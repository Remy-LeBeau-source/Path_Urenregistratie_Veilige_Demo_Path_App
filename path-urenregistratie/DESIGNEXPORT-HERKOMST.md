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

## Werkwijze per ontwerpwijziging (opdracht Gio, 13 september 2026)

Gio exporteert vaker dan hij meldt. Kijk daarom **aan het begin van elke werkbeurt** wat er in de
exports is veranderd, ook zonder aanleiding: haal ze opnieuw op, diff ze tegen de vorige versie en lees
de nieuwe regel in `github.md`.

Zijn opdracht is verder expliciet: **elke wijziging krijgt een testcase, hoe klein ook, en die gaat mee
in de regressie.** Dus per increment:

1. Ophalen en diffen; vaststellen wat er precies is gewijzigd.
2. Bouwen met de exacte waarden uit de bron -- niets afronden, niets "verbeteren".
3. Een Playwright-case schrijven die precies dat gedrag of die opmaak vastlegt, met een vrij
   `[CODE-X-000]`-id (eerst controleren met grep; dubbele id's worden door de living-docs-poort
   geweigerd en een `--grep` draait er dan stilletjes twee).
4. Aantonen dat de case discriminerend is: wijziging tijdelijk terugzetten, case moet falen; wijziging
   terug, case moet slagen. Een case die ook zonder de wijziging groen blijft bewaakt niets.
5. De regressie draaien op de projecten waar de wijziging actief is. Zit de wijziging achter een media
   query, draai dan de breedtes binnen én op de rand ervan -- alleen desktop draaien terwijl je een
   `max-width: 720px`-blok wijzigt, test het enige scherm waar hij niets doet.
6. `npm run docs:sync` draaien en de gegenereerde bestanden meecommitten.

## Eén link per ronde

Sinds de avond van 13 september loopt de overdracht via **één bestand**: `handoff/OPDRACHT.md`.
Daarin staan de vier doelpaden met verse links, wat elk bestand is, de eis om exact over te nemen,
de testcheck en wat niet aangeraakt mag worden. Gio plakt alleen die ene URL. De vaste route die
daarop volgt staat in `AGENTS.md` onder "Ontwerprondes medewerkerschermen"; hij hoeft niet per
ronde herhaald te worden.

## Versie waartegen nu gebouwd wordt

Opgehaald 2026-09-13T20:35Z (export gestempeld 2026-09-13T20:34:50.229Z),
sha256 (eerste 16 tekens):

| Bestand | sha256 |
| --- | --- |
| `handoff/OPDRACHT.md` | `58ea58c5ce4ec826` |
| `handoff/medewerker-wild.html` | `c21b7ff3e1cc6b40` |
| `handoff/medewerker-gui.html` | `8c8f46c7e4099059` |
| `handoff/HANDOFF-MEDEWERKER-MOBIEL.md` | `18bb27b9d862ca97` |
| `handoff/DESIGN-BESLUITEN.md` | `161242a8868d1714` |

Vorige ronde (2026-09-13T19:01Z), bewaard om de diff te kunnen navertellen:
`OPDRACHT.md f8ce19acb0d1af85`, `medewerker-wild.html fa68d0690e5d79a0`,
`medewerker-gui.html 6c1697e8397366d9`,
`HANDOFF-MEDEWERKER-MOBIEL.md 5c3918cabca7459f`,
`DESIGN-BESLUITEN.md b21d30835eaf178c`.

`OPDRACHT.md` draagt sinds deze ronde zelf een exportstempel op regel 3. Dat is
handiger dan de sha256 voor de vraag "is dit de laatste versie": staat er een
oudere tijd dan wat Gio net stuurde, dan is de link niet opnieuw opgehaald.

Wijzigt een export, werk dan deze tabel bij in dezelfde commit als het bouwwerk dat erop volgt.
Wat er in deze ronde precies veranderd is, staat per punt in `github.md` onder "Last sync".

## Wat hier (nog) niet ligt

`medewerker-gui.html` ligt er nu wél, maar wordt nog niet nagebouwd: de opdracht zegt expliciet dat
de Klassiek-variant voor desktop/GUI in een aparte ronde komt.

`handoff/DESIGN-BESLUITEN.md` is de export van het `CLAUDE.md` uit het designproject — het volledige
designcontract. Niet te verwarren met een `CLAUDE.md` in deze repo; die is er niet.
