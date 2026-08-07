# Lokale voorbereiding en placeholders - versie 0.9.14

Deze versie bevat de aangeleverde medewerkers, klanten, brokers, tarieven en factuurgegevens. Alleen e-mailadressen zijn bewust vervangen door onbestelbare placeholders.

## Veiligheidsregels

- De standaard account-, broker-, boekhouder-, salaris- en afzenderadressen eindigen op `@example.invalid`.
- Een beheerder mag zelf ieder syntactisch geldig e-mailadres invoeren, waaronder interne `@pathconsultancy.nl`-adressen.
- Ingevoerde adressen worden alleen in de lokale browser bewaard; deze versie bevat technisch geen echte verzendkoppeling.
- Alleen de handmatige hulplink gebruikt het bevestigde adres `backoffice@pathconsultancy.nl`; de app verstuurt daar nooit automatisch iets naartoe.
- Alleen tekst die geen syntactisch geldig e-mailadres is, wordt geweigerd.
- Er bestaat geen Gmail- of andere verzendkoppeling.
- De knop voor verzending voert uitsluitend een lokale verzendcontrole uit.
- KvK, btw, IBAN, adres, medewerkers, klanten, brokers en tarieven zijn overgenomen uit de aangeleverde gegevens.
- Wijzigingen worden alleen in de lokale browser opgeslagen.
- Met **Voorbeeldgegevens herstellen** worden alle lokale wijzigingen verwijderd.
- Een medewerker of beheerder wordt gedeactiveerd en nooit hard verwijderd; historie blijft zichtbaar en herstelbaar.

## Medewerkers

De voorbeeldomgeving gebruikt Marc de Roon, Stasjo van Bakel, Brian Hek en Shawn-Douglas Nahar. Iedere medewerker heeft afzonderlijk:

- klant en projectcode;
- broker en onbestelbaar brokeradres;
- factuurtarief;
- onderwerpregel;
- begeleidende brokertekst.

## Maanden en jaren

Iedere maand en ieder viercijferig jaar kan rechtstreeks worden gekozen. De maand opent in een eigen venster met twaalf gewone knoppen; er wordt geen native browserdropdown of ingebouwde browserkalender gebruikt. Daardoor blijft de keuze ook in de Cloud Browser en op mobiel bedienbaar. Een nog niet gebruikte periode krijgt automatisch een eigen lege urenregistratie, status en factuurnummer volgens het ingestelde patroon. De gekozen periode geldt voor zowel de beheerders- als medewerkersweergave en wordt in alle relevante menu's gebruikt.

Het verschil tussen declarabele uren en contracturen is uitsluitend informatief. Zowel meer als minder uren kunnen worden ingediend. Een indienactie geldt altijd voor precies één geselecteerde maand. Het menu Goedkeuringen toont daarentegen alle openstaande maanden in één overzicht.

Goedkeuringen opent vanuit het hoofdmenu altijd op **Alle openstaande**. De algemene maandkiezer is op dat scherm verborgen. Naast het totaalfilter verschijnen alleen maanden waarin werkelijk een ingediende urenstaat op controle wacht, met het actuele aantal per maand. Een maand zonder open goedkeuring krijgt geen leeg filter.

Op het dashboard opent **Bekijk teamstatus** een filter binnen hetzelfde scherm. Alleen medewerkers die nog moeten invullen of corrigeren worden dan getoond. **Details bekijken** is voor beheerders altijd alleen-lezen; alleen de medewerker kan via **Mijn uren** invoeren.

De klanturenstaat is het officiële bestand dat een medewerker van de klant ontvangt. De medewerker kiest zelf maand en jaar en kan PDF, JPG of PNG kiezen; JPG en PNG worden automatisch als PDF opgeslagen. Een concept blijft buiten de controle van Backoffice. Pas na **Indienen bij Backoffice** verschijnt de inzending bij de beheerder, inclusief het onderwerp en de tekst van de medewerker. De beheerder controleert eerst het document. Alleen na goedkeuring wordt de aparte route **Backoffice naar broker** beschikbaar. Voor beide e-mails zijn onderwerp en tekst als organisatiestandaard instelbaar; de medewerker kan zijn eigen bericht vóór indienen per maand aanpassen. Per medewerker zijn deadline, herinnering, standaard/afwijkend brokeradres en de regel ‘factuur mag zonder klanturenstaat’ instelbaar.

Op **Mijn overzicht** staat de klanturenstaat als afzonderlijke maandstatus, zodat goedgekeurde uren een ontbrekend klantdocument niet verhullen. Heeft de medewerker het document al buiten de app naar Path Backoffice gestuurd, dan kan diegene **Al rechtstreeks gemaild** kiezen. De reden is verplicht en wordt samen met naam en tijdstip opgeslagen. Backoffice kan dit in de details terugzien. De status geldt als afgehandeld voor de open werkvoorraad, maar blijft in de maandhistorie staan en kan via **Alsnog uploaden** worden teruggedraaid.

Openstaande klanturenstaten blijven samen met urencontroles, brokercontroles en verzendcontroles zichtbaar in **Mijn open taken** op het beheerdersdashboard. **Nu afhandelen** bevat uitsluitend werk dat Backoffice direct kan uitvoeren; **Wacht op medewerker** telt concepten, correcties en ontbrekende documenten apart. Iedere taak toont de medewerker en maand en opent de juiste controle rechtstreeks, zonder de gekozen detailmaand te wijzigen. **Start met oudste taak** pakt de oudste directe actie. De compacte **Samenvatting per maand** blijft beschikbaar voor het totaalbeeld.

Het dashboard gebruikt drie bewust verschillende tellingen. **Open taken** is het totaal over alle maanden. **Nu afhandelen** en **Wacht op medewerker** splitsen dat totaal uit. **Uren wachten op medewerker** telt alleen de medewerkers met concepturen of een correctie in de geselecteerde maand. De maandsamenvatting toont daarom ook per maand een expliciet taaktotaal. De voortgangscirkel meet alleen het vierstappen-factuurproces; open klanturenstaten worden er afzonderlijk naast vermeld.

## Lokale accountkeuze en toetsenbord

In het lokale beginscherm kan de beheerder of één van de vier medewerkers worden gekozen. Iedere medewerker komt in de eigen urenregistratie terecht en ziet geen beheerfuncties. Er is bewust geen wachtwoord of standaardwachtwoord: bij productie wordt dit hele scherm vervangen door Google Workspace-authenticatie, waarna account en rol automatisch worden bepaald.

Enter slaat een urenveld tussentijds op en gaat naar het volgende veld. In instellingen en korte bewerkvelden betekent Enter lokaal opslaan. In een meerregelig tekstvak blijft Enter een nieuwe regel en wordt `Ctrl+Enter` gebruikt om op te slaan. Indienen, goedkeuren en de verzendcontrole vereisen bewust een aparte klik.

## Profiel, meldingen en hulp

Iedere gekozen gebruiker krijgt eigen initialen, een rolgebonden dashboard en een tijdsafhankelijke begroeting. Een lokale profielfoto en de keuze Automatisch, Licht of Donker worden alleen in deze browser bewaard.

De bel toont uitsluitend nieuwe meldingen voor de ingelogde rol en medewerker. Als er niets nieuws is, blijft het venster openen met de tekst dat er geen nieuwe meldingen zijn. De bel bevat geen knoppen voor kunstmatige meldingen; e-mailverzending en automatische planning staan uit.

Onder **Mededelingen** kan een beheerder bijvoorbeeld een app-update of belangrijke wijziging sturen naar alle actieve medewerkers, één klantgroep of zelf gekozen medewerkers. Iedere ontvanger krijgt altijd een eigen melding in de app. Optioneel krijgt iedere ontvanger afzonderlijk een e-mail dat er een nieuwe melding klaarstaat, maar alleen als die medewerker e-mailmeldingen aan heeft. CC en BCC worden niet gebruikt. Bij een wijziging verdwijnt de vorige versie bij medewerkers uit de bel en uit hun archief. Zij zien alleen de nieuwste tekst als gewone mededeling. De oude versie blijft uitsluitend intern voor beheerders bewaard.

Een nieuw bericht kan eerst als concept worden opgeslagen. Concepten zijn alleen zichtbaar voor beheerders en maken geen melding of e-mailactie. Een nooit geplaatst concept mag worden verwijderd. Intrekken vereist een eigen reden: de oorspronkelijke tekst verdwijnt bij medewerkers volledig uit de bel en het archief; dezelfde ontvangers krijgen alleen één algemene intrekkingsmelding met de reden. Een ingetrokken bericht kan worden bewerkt, waarbij vorige waarden en de beheerder intern worden bewaard. Met **Bij medewerkers verwijderen** verdwijnt ook de intrekkingsmelding bij medewerkers. Een reeds verzonden e-mail kan niet worden teruggehaald.

Iedere medewerker heeft onder **Mededelingen** een eigen archief. Dat toont uitsluitend de actuele berichten waarvoor die medewerker ontvanger was en bevat filters voor alles, ongelezen mededelingen en intrekkingen. De bel telt daarnaast ook urenstatussen, correcties en herinneringen; de twee ongelezen aantallen mogen daarom verschillen. Interne versiehistorie, correctielabels en berichtnummers zijn voor medewerkers verborgen.

De hulpbot geeft vaste uitleg over alle aanwezige functies. Korte of onvolledige zoekwoorden, zoals `mede`, geven eerst passende keuzes zoals Mededelingen sturen, Medewerker aanpassen en Medewerker toevoegen. Bij een eerste onbekende vraag vraagt de bot om één duidelijkere formulering. Alleen als ook de tweede poging onbekend blijft, maakt hij een vooraf ingevuld Gmail-concept, een link voor Outlook/de standaard mailapp en een kopieerbare mailtekst voor Path Backoffice. Beide formuleringen worden in het concept opgenomen. De gebruiker moet die mail altijd zelf controleren en verzenden. Een lokale mailapp kan vanuit de cloudbrowser niet worden gestart, maar werkt op een eigen apparaat als die als standaard mailapp is ingesteld. Het hulpgesprek wordt niet blijvend opgeslagen: het blijft alleen tijdens de huidige sessie zichtbaar en kan met **Gesprek wissen** direct worden leeggemaakt.

## Correcties op uren

Op iedere open urenkaart staat direct **Correctie vragen**. Een beheerder kan ingediende uren niet zonder uitleg terugsturen. Het veld **Reden voor correctie** is verplicht. De medewerker ziet de volledige toelichting in de melding, op het dashboard en boven de betreffende urenstaat. Naam van de beheerder, datum, tijd, tekst en het moment van opnieuw indienen blijven lokaal in de historie bewaard.

## Vooraf klaargezette voorbeelden

- Juni 2026: alle uren goedgekeurd en alle verzendcontroles afgerond.
- Juli 2026: precies 4 directe beheertaken — Brians uren controleren, Stasjo's klanturenstaat controleren en de verzendroutes van Marc en Shawn controleren. Daarnaast wacht 1 taak op een medewerker.
- Augustus 2026: precies 6 directe beheertaken — Shawns uren controleren, drie klanturenstaten controleren, Brians brokerroute controleren en Brians verzending controleren. Daarnaast wachten 2 taken op medewerkers.
- Klanturenstaten: ontbrekend, privéconcept, ingediend, opnieuw uploaden, goedgekeurd en brokerroute gecontroleerd zijn vooraf vertegenwoordigd. De vooringevulde bestandsnamen beginnen zichtbaar met `Voorbeeld_` en openen een echte neutrale voorbeeld-PDF; ze kunnen niet met echte klantdocumenten worden verward.
- Mededelingen: een geplaatst algemeen bericht, een intern bewaarde eerdere versie, de nieuwste medewerkerstekst, een concept en een volledig ingetrokken voorbeeld staan vooraf klaar.
- **Alle openstaande uren** combineert de controles uit verschillende maanden in één beheerderslijst; het maandfilter toont alleen de gekozen periode.
- **Mijn open taken** combineert alle direct afhandelbare controles over de maanden heen. **Wacht op medewerker** staat apart; de maandsamenvatting is alleen aanvullend overzicht.
- Mijn uren bevat **Hele maand** en afzonderlijke weekfilters. Op mobiel opent één week, terwijl week- en maandtotalen zichtbaar blijven. Iedere wijziging wordt tussentijds opgeslagen en alleen de volledige maand wordt ingediend.
- De herinneringsplanning is instelbaar. De standaard is vrijdag 15:00 voor een onvolledige week, laatste werkdag 15:00 voor maandafsluiting, eerste werkdag 09:00 voor achterstand en eerste werkdag 10:00 voor wachtende goedkeuring.
- Dag, tijdstip en het moment van de laatste klanturenstaatherinnering worden gekozen via eigen uitklapmenu's; native browserdropdowns zijn voor dit blok niet zichtbaar. De samenvatting onder de regels wordt direct bijgewerkt. **Voorbeeldmelding maken** plant of verstuurt lokaal niets automatisch.
- Dezelfde browseronafhankelijke keuzebediening wordt gebruikt voor betalingstermijn, voorkeuren, doelgroepen, ontvangertypen en klanturenstaatdeadlines. Het instellingenmenu springt rechtstreeks naar de zes hoofdonderdelen.

Met **Voorbeeldgegevens herstellen** worden deze uitgangssituaties opnieuw geladen.

## Besloten verzendroutes

- Er worden geen verschillende ontvangers via CC of BCC in één bericht gecombineerd.
- Per medewerker maakt één actie een afzonderlijk bericht voor de broker en iedere aangevinkte centrale ontvanger.
- Boekhouder, salarisadministratie en extra ontvangers worden centraal bewaard. Een eigen naam of kopje, zoals **Salarisadministratie**, **EasySalary** of **Salarisadmin**, kan direct tijdens **Medewerker toevoegen** worden ingevuld of later onder **Instellingen** worden beheerd. Daarna wordt per medewerker aangevinkt wie de mail krijgt.
- Een nieuw aangemaakte ontvanger staat standaard uit bij bestaande en nieuwe medewerkers, totdat een beheerder hem bewust aanvinkt.
- Zelf aangemaakte extra ontvangers kunnen definitief worden verwijderd. Als ze bij medewerkers zijn aangevinkt, waarschuwt de app en verwijdert hij alleen die routeringskeuzes; uren en facturen blijven staan. De vaste systeemrollen Boekhouder en EasySalary kunnen wel worden gedeactiveerd, maar niet per ongeluk worden verwijderd.
- Alle ontvangers gebruiken dezelfde begeleidende basistekst met medewerker, maand en het daadwerkelijke goedgekeurde urentotaal.
- Standaard krijgt de broker de factuur, krijgt de boekhouder de factuur en krijgt EasySalary geen bijlage.
- Per medewerker en ontvanger kan een beheerder afzonderlijk aan- of uitzetten of de route actief is en of de factuur als PDF wordt toegevoegd.
- Een urenstaat wordt aan geen van de drie routes toegevoegd; het urentotaal staat in de tekst.
- Tarief, klant, broker, verlof- en ziektegegevens worden niet in het EasySalary-overzicht opgenomen.
- Een Excel- of CSV-bestand wordt alleen toegevoegd als EasySalary later expliciet een vaste importindeling verplicht stelt.
- Met één knop **Maandverzending controleren** worden alle geselecteerde routes samen gecontroleerd. Zolang een urenstaat van de gekozen maand nog openstaat, toont de knop het aantal en wordt de controle geblokkeerd. Daarna wordt uitsluitend de verzendcontrole afgerond; de app maakt intern per medewerker en per ontvanger afzonderlijke berichten.
- De factuuractie heet zowel voor als na controle **Mailvoorbeeld**. De aparte status **Verzending gecontroleerd** voorkomt dat een lange technische knoptekst nodig is.
- EasySalary staat niet als apart hoofdmenu-item en heeft geen aparte bulkknop; controle en maandverzending starten vanuit **Facturen**.

De standaard begeleidende tekst is:

```text
Middag,

Hierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.

Daadwerkelijk gewerkte uren: {uren} uur.
```

## Factuurvoorbeeld en PDF

- Een goedgekeurde urenstaat zet een conceptfactuur klaar.
- De beheerder kan de factuur in de app bekijken en als PDF downloaden.
- Alle facturen gebruiken dezelfde Path-kleuren en hetzelfde Path-logo, terwijl **QSI Consultancy** duidelijk als facturerende onderneming blijft staan.
- Het voorbeeld bevat bedrijfsgegevens, factuurnummer, datum, medewerker, maand, uren, tarief, btw en totaal.
- Het bevestigde ItaQ-factuuradres staat exact als op de bronfacturen: **Laan van ZuidHoorn 165, 2289 DD Rijswijk**.
- Het bevestigde Circle8-factuuradres staat exact als op Shawns bronfactuur: **Plettenburg-West, Fultonbaan 6, 3439 NE Nieuwegein**.
- Alleen voor Shawn staan ook **overeenkomstnummer 202636991**, **crediteurennummer 622085** en **nummer opdrachtuitvoerder 217744** op de factuur, omdat Circle8 deze aanvullende regels vereist.
- Alleen bij een later toegevoegde broker zonder volledig adres staat **Factuuradres: nog definitief bevestigen**.
- Iedere concept-PDF draagt het watermerk **CONCEPTVOORBEELD - NIET VERZONDEN**.
- In productie worden definitieve PDF's server-side gegenereerd, opgeslagen, vergrendeld en in de auditlog opgenomen.

## Factuurnummering

**Factuurnummer: [nummer]** staat als één witte regel in de factuurkop. De nummers bevatten koppeltekens en geen spaties. Path heeft bevestigd dat geen afzonderlijke doorlopende teller nodig is. Per medewerker blijft het patroon gelijk; alleen maand en jaar worden automatisch bijgewerkt:

- Marc: `IND-{jaar}-{maand}`
- Stasjo: `IND-StvB-{jaar}-{maand}`
- Brian: `COA-{jaar}-{maand}`
- Shawn: `Bel-Shawn-{jaar}-{maand}`

Voorbeeld: `Bel-Shawn-2026-juli` wordt in augustus `Bel-Shawn-2026-augustus` en in januari van het volgende jaar `Bel-Shawn-2027-januari`.

## Nog door Path definitief te bevestigen

De ontvangen facturen, medewerkers, tarieven, klantgegevens, bestaande factuurnummervoorbeelden en voorlopige mailteksten zijn al verwerkt en hoeven niet opnieuw te worden aangeleverd. Alleen dit ontbreekt nog:

1. Alleen melden als nieuwe facturen niet langer op naam van QSI Consultancy maar op naam van Path Consultancy B.V. moeten komen; zonder wijziging blijft QSI de standaard uit de ontvangen facturen.
2. Alleen nog de Circle8-aanleverroute: bevestigen of dit per e-mail of via een portaal loopt. Het factuuradres is al bevestigd.
3. Naam en e-mailadres van de boekhouder. De app zet binnen dezelfde actie per medewerker een afzonderlijk boekhoudersbericht klaar.
4. De productieaccountadressen van Gio, Joyce en de medewerkers, uiterlijk bij het aansluiten van Google Workspace.
5. Het definitieve EasySalary-adres en bevestiging dat de afzonderlijke tekstmail zonder Excel/CSV voldoende is.
6. Goedkeuring van de voorgestelde herinneringsmomenten of eigen momenten.

Een afwijkende brokerroute of andere mailtekst hoeft alleen te worden doorgegeven als die afwijkt van de reeds ingevoerde standaard.

Totdat deze punten zijn bevestigd, blijven de bijbehorende waarden voorlopige voorbeeldgegevens of veilige placeholders en wordt niets automatisch verstuurd.

## Productiegegevens

Echte e-mailadressen worden pas later via een afgeschermde productieconfiguratie toegevoegd. Ze horen niet in deze lokale broncode. De overige aangeleverde bedrijfs- en opdrachtgegevens zijn al zichtbaar.
