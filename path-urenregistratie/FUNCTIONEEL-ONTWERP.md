# Functioneel Ontwerp — Path Uren & Facturatie

## 1. Doel en bron van waarheid

Dit document beschrijft de bedoelde productwerking. Features, GUI-smoke, regressietests en implementatie moeten hiermee overeenkomen. Bij verschil is dit ontwerp leidend totdat een bewuste productbeslissing het document én de tests tegelijk wijzigt.

De applicatie ondersteunt de maandketen van urenregistratie tot gecontroleerde factuur- en mailroutes. Een actie heeft steeds precies één eigenaar: de medewerker of Backoffice.

## 2. Omgevingen

| Omgeving | URL | Data | Snelle accountkeuze | Reset | Echte mail |
|---|---|---|---|---|---|
| LOCAL | `http://localhost:8000` | lokale/testdata | ja | beheerder | nee |
| TEST | `https://uren-test.pathconsultancy.nl` | aparte TEST-database | ja | beheerder | uitsluitend via test-allowlist |
| PROD | `https://uren.pathconsultancy.nl` | productiegegevens | nee | nee | uit, afgeschermde pilot-allowlist of expliciet live |

In de applicatiekop staat in LOCAL `LOKAAL`, in TEST `TESTOMGEVING` en in PROD geen testlabel. Productie toont nooit demoaccounts, testwachtwoorden of herstel van testgegevens.

## 3. Rollen en bevoegdheden

### Medewerker

- ziet uitsluitend de eigen uren, documenten, acties en meldingen;
- vult uren in, slaat concept op en dient de maand in;
- uploadt de officiële klanturenstaat als die voor de opdracht vereist is;
- verwerkt een correctieverzoek en dient opnieuw in;
- kan geen goedkeuring, facturatie, gebruikersbeheer of testreset uitvoeren.

### Beheerder / Backoffice

- ziet de volledige werkvoorraad van de eigen organisatie;
- controleert ingediende uren en klanturenstaten;
- vraagt correcties aan en keurt herindieningen goed;
- controleert factuur- en mailroutes;
- beheert medewerkers en beheerders;
- kan uitsluitend in LOCAL/TEST de gedeelde testbasis herstellen.

## 4. Werkvoorraad

De globale werkvoorraad is een serverleidende momentopname over alle relevante perioden en actieve medewerkers. De geselecteerde maand is alleen een navigatiefilter en verandert de globale werkvoorraad niet.

De volgende invarianten gelden altijd:

1. `alle acties = acties bij Backoffice + acties bij medewerkers`;
2. `alle acties = som van de getoonde maandtotalen`;
3. een taak staat nooit tegelijk bij Backoffice en medewerker;
4. wisselen van maand, scherm of rol creëert of verwijdert geen taak;
5. na een geslaagde mutatie is de vervolgtaak zonder F5 zichtbaar;
6. de werkvoorraad opent standaard ingeklapt en kan gericht op `alle`, `Backoffice` of `medewerkers` worden geopend.

Bij iedere nieuwe login opent de maandkiezer voor iedere rol op de actuele kalendermaand in
`Europe/Amsterdam`. Een maand die de gebruiker daarna kiest blijft in alle maandgebonden schermen
actief zolang die ingelogde sessie duurt. Gewone scherm- of dashboardnavigatie verandert die keuze
niet; na uitloggen en opnieuw inloggen wordt opnieuw de dan actuele maand gekozen. Ook een nog lege
actuele maand telt bij de medewerker als open werkmaand: uren indienen en, indien vereist, de
klanturenstaat aanleveren staan in dezelfde persoonlijke actielijst.

### Vaste demonstratiebasis na Herstel

LOCAL en TEST tonen na een beheerder-reset dezelfde functionele basis. Infrastructuur en
mailaflevering mogen verschillen, de bedrijfsstatussen niet.

| Periode | Alle acties | Backoffice | Medewerkers |
|---|---:|---:|---:|
| juni 2026 | 3 | 1 | 2 |
| juli 2026 | 5 | 3 | 2 |
| augustus 2026 | 4 | 3 | 1 |
| **Totaal** | **12** | **7** | **5** |

Na iedere echte statusovergang mogen deze aantallen veranderen. Maandnavigatie, een render, F5 of
een rolwissel mogen ze nooit op zichzelf veranderen.

Na LOCAL Herstel ziet Stasjo exact drie ongelezen algemene mededelingen. Belbadge,
mededelingenfilter en ongelezen kaarten tonen daarom alle drie `3`; urenstatusmeldingen uit de
herstelhistorie mogen dit acceptatieaantal niet verhogen.

## 5. Urenstaat-statusketen

| Beginstatus | Actie | Nieuwe status | Nieuwe eigenaar |
|---|---|---|---|
| concept/draft | medewerker dient in | ingediend/submitted | Backoffice |
| ingediend | beheerder vraagt correctie | correctie/correction | medewerker |
| correctie | medewerker dient opnieuw in | ingediend/submitted | Backoffice |
| ingediend | beheerder keurt goed | goedgekeurd/approved | Backoffice voor factuurcontrole |
| goedgekeurd | factuur wordt definitief | gefactureerd/invoiced | Backoffice voor verzending |
| ingediend/goedgekeurd/gefactureerd | medewerker probeert te wijzigen | geweigerd | ongewijzigd |

Een correctie toont de reden, de aanvrager en de betreffende periode. Een medewerker kan tijdens `correction` invoeren en opnieuw indienen. Na goedkeuring zijn invoervelden vergrendeld en is geen indienactie nodig.

Ook `submitted` is vergrendeld: de medewerker wacht op Backoffice en ziet geen actieve indienknop.
Alleen een expliciet correctieverzoek maakt de maand opnieuw bewerkbaar. Dubbel klikken, herladen of
een vertraagde eerdere read mag een nieuwere status niet terugzetten.

## 6. Klanturenstaat-statusketen

| Beginstatus | Actie | Nieuwe status | Nieuwe eigenaar |
|---|---|---|---|
| ontbreekt/concept | medewerker uploadt en dient in | ontvangen/received | Backoffice |
| ontvangen | beheerder vraagt nieuw document | opnieuw aanleveren/resubmit | medewerker |
| opnieuw aanleveren | medewerker dient nieuw document in | ontvangen/received | Backoffice |
| ontvangen | beheerder keurt goed | goedgekeurd/approved | Backoffice voor brokerroute |
| goedgekeurd | brokerroute gecontroleerd | verzonden/sent | afgerond |
| toegestaan alternatief | document wordt gemotiveerd overgeslagen | overgeslagen/skipped | volgens factuurbeleid |
| ontbreekt/concept | Backoffice legt externe goedkeuring met verplichte reden vast | extern bevestigd/skipped | afgerond voor documentcontrole |

Een geldige PDF blijft ongewijzigd; een geldige JPG of PNG wordt bij upload server-side naar PDF
omgezet. Een bestand met alleen een PDF-extensie maar zonder geldige PDF-opbouw wordt geweigerd.
Onleesbare of onveilig grote afbeeldingen worden eveneens geweigerd en een bestaand concept blijft
dan ongewijzigd. Het opgeslagen document blijft voor de medewerker en Backoffice via
**Klanturenstaat bekijken** inline als PDF controleerbaar, met een effectieve `.pdf`-bestandsnaam —
ook na herladen, opnieuw inloggen of wisselen van maand. Een historisch rauw afbeeldingsbestand kan
nog worden bekeken, maar moet opnieuw als PDF/JPG/PNG worden aangeleverd voordat Backoffice het kan
goedkeuren of mailen. Een factuur mag alleen zonder klanturenstaat verder als de opdracht dit
expliciet toestaat.

Als de klant geen apart urenstaatbestand levert maar de uren wel aantoonbaar per e-mail, in een
klantportaal of rechtstreeks aan Backoffice goedkeurt, kan Backoffice in het Documentarchief
**Extern bevestigd** kiezen. Een verplichte standaardreden of gemotiveerde optie **Anders** wordt
met gebruiker en tijdstip bewaard. De urenstaat telt daarna groen mee in de maandcontrole; Backoffice
kan de bevestiging terugdraaien, waarna het document opnieuw als ontbrekend blokkeert.
De registratie **Al rechtstreeks gemaild** door een medewerker is nadrukkelijk nog geen
Backoffice-bevestiging: die blijft oranje en blokkerend totdat Backoffice het bewijs controleert en
zelf **Extern bevestigd** vastlegt.

## 7. Factuur- en mailketen

Na goedgekeurde uren controleert Backoffice per medewerker en periode afzonderlijke routes:

- broker: factuur en, waar vereist, klanturenstaat;
- boekhouder: factuur;
- salarisadministratie: alleen medewerker, periode en goedgekeurde uren; geen bijlage;
- wachtwoordreset: eenmalige link, geen bijlage;
- eerste uitnodiging: eenmalige link om een wachtwoord te maken, geen bijlage.

Daarnaast kan Backoffice zelf ontvangers van het type **Overig** toevoegen. Die krijgen standaard
alleen ureninformatie, maar de factuur kan per medewerker worden meegestuurd met het vinkje
*Factuur meesturen*. De salarisadministratie is de enige route die nooit een factuur krijgt; daar
is dat vinkje uitgeschakeld met de reden erbij.

### Welke tekst een ontvanger krijgt

Eén regel, voor iedere ontvanger: **is er bij die ontvanger een eigen tekst ingevuld, dan die --
anders de standaardtekst van zijn soort.** Er is geen tussenlaag. De tekst die vroeger "de tekst bij
de opdracht" heette is de eigen tekst van de broker en wordt door niemand anders gelezen.

De vier standaardteksten (broker, boekhouding, salarisadministratie, overig) zijn aanpasbaar bij
Instellingen → Teksten. Laat je een veld leeg, of zet je het terug met *Terug naar de meegeleverde
tekst*, dan geldt weer wat er wordt meegeleverd -- en loop je mee met latere verbeteringen daaraan.

Onder elke mail komt automatisch de handtekening: ondersteuningsnaam, bedrijf, contactadres,
website en slogan uit Instellingen. Die hoort bij de afzender, niet bij de tekst, en staat daarom
ook onder een zelf geschreven bericht.

In onderwerp en tekst mag je tokens gebruiken die de server invult: onder meer `{medewerker}`,
`{klant}`, `{broker}`, `{periode}`, `{maand}`, `{jaar}`, `{uren}`, `{factuurnummer}`, `{bedrag}` en
`{overeenkomstnummer}`. `{broker}` wordt de handelsnaam (anders de statutaire naam) van de broker
bij de opdracht; staat er geen broker, dan blijft het leeg.

Eén afgeronde factuuractie maakt bij de standaardroute exact drie afzonderlijke berichten: broker,
boekhouding en salarisadministratie. Dit zijn drie queue-items en drie SMTP-afleveringen, niet één
bericht met CC/BCC. In TEST worden ze alle drie fysiek bij de vaste testontvanger afgeleverd, terwijl
de bedoelde productieroute zichtbaar blijft. De factuur en de officiële klanturenstaat zijn vóór
afronden afzonderlijk als PDF te controleren. Ook de losse acceptatieknoppen tonen iedere verwachte
PDF als een eigen link, zowel in de scenariolijst als in de bevestiging. De geopende PDF is exact het
serverdocument dat bij bevestiging als bijlage wordt verzonden; een scenario zonder bijlage toont
geen documentlink. Als er al een echte verzonden factuur is, hangt de acceptatiemail díe opgeslagen
factuur-PDF eraan (met een `ACCEPTATIETEST-`-bestandsnaam), zodat het scenario er identiek uitziet
als een echte factuur en het echte bijlagepad meetest; zonder verzonden factuur valt het terug op
een gegenereerd, branded NIET-BOEKEN-document.

LOCAL verstuurt nooit echte mail. Een beheerder kan daar de lokale mailpreview via Instellingen of
de statusbadge aan- en uitzetten om onderwerp, tekst, PDF-links en de verzendadministratie te
controleren. LOCAL toont daarbij naast iedere bedoelde productieroute expliciet de vaste
gesimuleerde TEST-aflevering `giovanno.maatsen@pathconsultancy.nl` met de melding dat niets wordt
verzonden. Deze bediening kan uitsluitend lokale previewregistraties maken en opent nooit SMTP.
TEST herschrijft alle functionele ontvangers naar de vastgelegde testontvanger Giovanno, voegt
Kenrich als vaste CC toe en markeert elk bericht als TEST-aflevering. Bij `Controle afronden` maakt
de server eerst de definitieve factuur-PDF
met Path-logo en zonder conceptwatermerk; daarna worden uitsluitend de zojuist aangemaakte broker-,
boekhoudings- en salarisitems direct verzonden. De broker ontvangt factuur plus goedgekeurde
klanturenstaat, Boekhouding alleen de factuur en Salarisadministratie geen bijlage. PROD gebruikt
uitsluitend de geconfigureerde zakelijke ontvangers en verwerkt de queue via de beheerworker. Een
mislukte verzending blijft zichtbaar in de verzendadministratie en mag niet als verzonden worden
getoond. Boekhouding en Salarisadministratie zijn vaste kernroutes: ze kunnen worden aangepast of
gedeactiveerd, maar alleen zelf toegevoegde routes mogen definitief worden verwijderd.

Dezelfde servergenerator verwerkt ieder geconfigureerd factuurnummerpatroon per medewerker en
periode, waaronder `IND-*`, `IND-StvB-*`, `COA-*` en `Bel-Shawn-*`. In het patroon worden
`{jaar}` en `{maand}` altijd ingevuld en `{klant}` de klantnaam, gestript tot letters en cijfers;
server en browser vullen dit identiek in, en een patroon zonder eigen invulling valt terug op
`INV-{jaar}-{maand}`. Twee medewerkers met hetzelfde patroon in dezelfde periode krijgen elk een
uniek nummer: het tweede krijgt een numerieke suffix (`-2`). De aparte knop
`Brokerroute controleren` verzendt de officiële, goedgekeurde klanturenstaat van exact dezelfde
medewerker en periode; op TEST gaat ook deze fysieke mail naar Giovanno met Kenrich in CC.

| Gebeurtenis | Eigenaar vóór | Resultaat | Eigenaar na |
|---|---|---|---|
| uren indienen/herindienen | medewerker | controle uren | Backoffice |
| correctie vragen | Backoffice | correctie met reden | medewerker |
| uren goedkeuren | Backoffice | factuur/documentcontrole | Backoffice |
| klanturenstaat indienen | medewerker | documentcontrole | Backoffice |
| nieuw document vragen | Backoffice | opnieuw aanleveren | medewerker |
| factuur definitief maken | Backoffice | afzonderlijke mailroutes | Backoffice |
| SMTP bevestigd | Backoffice | route afgerond en auditbaar | afgerond |
| SMTP mislukt | Backoffice | zichtbare mislukking/retry | Backoffice |

## 8. Gebruikersbeheer

- ieder e-mailadres is organisatiebreed uniek;
- een bestaand account wordt geopend voor aanpassing in plaats van technisch duplicaatfouten te tonen;
- de laatste actieve beheerder kan niet worden gedeactiveerd of verwijderd;
- deactiveren stopt toegang maar bewaart zakelijke en beveiligingshistorie;
- een beheerder kan voor een andere actieve medewerker of beheerder een persoonlijke, eenmalige
  resetlink laten versturen; het wachtwoord zelf blijft altijd onzichtbaar en het eigen account wordt
  via deze beheeractie niet aangepast;
- definitief verwijderen kan alleen bij een inactief account zonder uren, documenten, facturen, berichten, e-mail- of loginhistorie;
- bij bestaande historie blijft het account inactief bewaard en wordt de blokkeerreden begrijpelijk getoond.

## 9. Reset en testisolatie

Herstellen in TEST zet uitsluitend de aparte TEST-database terug naar de vaste demonstratiebasis. Productie wordt nooit geraakt. De resetactie:

1. vereist een ingelogde beheerder of medewerker, CSRF en expliciete bevestiging;
2. wist TEST-mutaties en TEST-mailhistorie;
3. herstelt op de publieke TEST-omgeving de zes demoaccounts met hun vaste rol, actieve status en
   vaste TEST-inloggegevens; lokaal en in CI blijven de tijdelijk gegenereerde testwachtwoorden behouden;
4. herstelt accounts, perioden, uren, klanturenstaten, facturen en taakverdeling als één transactie;
5. levert na afloop dezelfde aantallen en statussen als de vastgelegde baseline;
6. is alleen in de exacte afgeschermde TEST-sandbox beschikbaar en valt daarbuiten server-side dicht.

Een automatische TEST-deploy voert hetzelfde baselineherstel uit vóór de documentroot wordt
omgeschakeld. De reset is daar alleen toegestaan als host, origin, database én private opslag exact
de afgeschermde TEST-configuratie vormen; ook databasehost, poort en databasegebruiker moeten exact
overeenkomen. Na de reset worden alle zes demoaccounts gecontroleerd en beheerder en medewerker opnieuw via de
publieke loginroute gecontroleerd; een afwijkend account blokkeert de release vóór verdere promotie.

## 10. Acceptatieketens

Minimaal de volgende ketens zijn releaseblokkerend:

1. medewerker dient uren in → Backoffice ziet goedkeuringstaak → vraagt correctie → medewerker herstelt → Backoffice keurt goed;
2. medewerker dient klanturenstaat in → Backoffice controleert → brokerroute ontstaat;
3. goedgekeurde uren → factuurcontrole → afzonderlijke broker/boekhouder/salarisroutes;
4. reset → vaste baseline → taaktotalen blijven gelijk bij maandwissel;
5. rolwissel → volledige accountcatalogus en correcte testcredentials zonder F5;
6. TEST-mail → uitsluitend allowlistontvanger; LOCAL/PROD-blokkades blijven intact;
7. gebruikersbeheer → uniek e-mailadres, deactiveren, veilige verwijderblokkade en minimumbeheerder.

## 11. Fout- en herstelgedrag

- Validatiefouten blijven in het actieve formulier zichtbaar en sluiten de modal niet.
- Een unieke-emailconflict toont een begrijpelijke melding en opent waar mogelijk het bestaande
  account; ruwe SQL-fouten worden nooit aan de gebruiker getoond.
- Een mislukte write verandert geen teller, eigenaar of status in de UI.
- Een herhaalde write met dezelfde versie is idempotent of wordt met een duidelijke stale-version-
  melding geweigerd.
- Na netwerkherstel wordt de serverstatus opnieuw gelezen; een oudere response overschrijft nooit
  een nieuwere lokale mutatie.
- Herstel van TEST-data is transactioneel: alles wordt hersteld of niets.

## 12. Releaseblokkerende traceerbaarheid

| Bedrijfsregel | Primaire uitvoerbare tests |
|---|---|
| vaste basis, maandinvariant en eigenaarfilters als één keten | `business-workflows-e2e.spec.ts` (`E2E-H-001`) |
| rolwissel, credentials en herstelautorisatie zonder F5 | `business-workflows-e2e.spec.ts` (`E2E-H-002`) |
| correctie herindienen en taakoverdracht medewerker → Backoffice | `business-workflows-e2e.spec.ts` (`E2E-H-003`) |
| uren goedkeuren en vervolgactie factuurverzending | `business-workflows-e2e.spec.ts` (`E2E-H-004`) |
| klanturenstaat goedkeuren en vervolgactie brokerroute | `business-workflows-e2e.spec.ts` (`E2E-H-005`) |
| JPG/PNG worden valide, inline bekijkbare PDF's; corrupte/te grote afbeeldingen en nep-PDF's blijven fail-closed | `customer-timesheet-api.spec.ts` (`CTS-API-H-005`, `CTS-API-N-009`) |
| medewerker uploadt zichtbaar PDF/JPG/PNG en ziet de eigen klanturenstaat na nieuwe login en maandwissel | `customer-timesheet-api.spec.ts` (`CTS-API-H-006`) |
| wachtwoord instellen via eenmalige link en hergebruik blokkeren | `business-workflows-e2e.spec.ts` (`E2E-H-006`) |
| globale sommen en maandinvariant | `dashboard.spec.ts` (`DASH-H-012`, `DASH-H-017`) |
| iedere rol start bij login in de actuele maand; handmatige maandkeuze blijft tot de volgende login behouden | `dashboard.spec.ts` (`DASH-H-018`) |
| een actuele maand met niet-ingediende uren is geblokkeerd en wordt nooit als afgeronde maandcontrole getoond | `invoices.spec.ts` (`INV-N-019`) |
| Backoffice kan een ontbrekende urenstaat met reden extern bevestigen, groen laten meetellen en terugdraaien | `invoices.spec.ts` (`INV-H-020`) |
| goedgekeurde uren zonder bestaande factuurrij worden bij `Controle afronden` server-side tot factuur verwerkt | `invoices.spec.ts` (`INV-H-021`) |
| open medewerkeracties blijven leesbaar in licht en donker met minimaal 4,5:1 tekstcontrast | `dashboard.spec.ts` (`DASH-H-003`) |
| indienen/correctie/herindienen/goedkeuren | `timesheet-review-ui.spec.ts` (`TS-REV-UI-H-008`) |
| submitted/approved lock | `TS-REV-UI-H-009`, `TS-REV-UI-H-010` |
| goedkeuren na verouderde versie en refresh | `business-workflows-e2e.spec.ts` (`E2E-H-008`) |
| rolwissel zonder F5 | `auth.spec.ts` (`AUTH-H-010`) |
| reset alleen beheerder | dashboard/security- en end-to-endcases |
| veilige accountlevenscyclus | `user-management.spec.ts` |
| resetlink vanuit Teambeheer voor medewerker en beheerder, nooit voor het eigen account | `user-management.spec.ts` (`USR-H-011`) |
| mailredirect, allowlist en bijlagen | `email-queue.spec.ts`, password-reset- en mailpolicychecks |
| acceptatiebijlagen afzonderlijk openen vóór precies één verzending | `email-queue.spec.ts` (`EQ-H-016`) en `mail-acceptance-policy-check.php` |
| localhost-preview toont inhoud en PDF's zonder SMTP | `email-queue.spec.ts` (`EQ-H-025`) en `mail-acceptance-policy-check.php` |
| één factuuractie levert exact broker + boekhouding + salarisadministratie | `email-queue.spec.ts` (`EQ-H-022`) |
| serveruren blokkeren te vroege factuurverzending | `email-queue.spec.ts` (`EQ-N-021`) |
| alles gelezen blijft leidend bij een oudere notificatieresponse | `notifications.spec.ts` (`NOT-H-009`) |
| auth-login toont nooit eerst demo-aantallen; daarna lopen bel, filter en lijst per leesactie gelijk van 3 naar 0 | `notifications.spec.ts` (`NOT-H-011`) |
| bedrijfsgegevens uit het instellingenformulier blijven bewaard en komen op de factuur | `invoice-company-identity.spec.ts` (`INV-ID-H-006`) |
| wachtwoord-vergeten verraadt niet welke e-mailadressen bestaan | `password-reset.spec.ts` (`PWD-H-014`) |
| productie toont nooit dry-run-jargon of een plaatsvervangend token aan een gebruiker | `password-reset.spec.ts` (`PWD-N-016`) |
| het resetscherm neemt het inlogadres over, weigert een leeg adres en laat terugkeren | `password-reset.spec.ts` (`PWD-N-015`) |
| onderwerp en begeleidende tekst van een opdracht blijven na opslaan bewaard | `admin-writes.spec.ts` (`ADM-WR-H-013`) |
| een eigen tekst per ontvanger wordt bewaard; een leeg veld valt terug op de standaardtekst van dat soort | `admin-writes.spec.ts` (`ADM-WR-H-014`) |
| twee nieuw toegevoegde ontvangers krijgen allebei echt een factuurmail | `email-queue.spec.ts` (`E2E-H-009`, was `EQ-H-027`) |
| een aangepaste standaardtekst komt werkelijk in de mail en is terug te zetten | `email-queue.spec.ts` (`E2E-H-011`, was `EQ-H-030`) |
| opslaan zonder iets te wijzigen legt geen eigen standaardtekst vast | `email-queue.spec.ts` (`E2E-H-011`) |
| het vinkje Factuur meesturen bepaalt werkelijk of de bijlage meegaat | `email-queue.spec.ts` (`E2E-H-012`) |
| een nieuwe ontvanger komt bij andere medewerkers ongevinkt binnen | `admin-writes.spec.ts` (`ADM-WR-H-018`) |
| het instellingenscherm toont de tekst die de ontvanger werkelijk krijgt | `invoice-company-identity.spec.ts` (`INV-ID-H-010`) |
| mobiele hoofdketen | `mobile-ui.spec.ts` |
| iedere medewerker en beheerder ziet na inloggen de eigen naam, nooit die van een collega | `auth.spec.ts` (`AUTH-H-020`, `AUTH-H-021`) |
| één factuuractie maakt drie gescheiden mailroutes met het juiste bijlagenbeleid | `email-queue.spec.ts` (`EQ-H-022`) |
| een uitgenodigde collega kan op de telefoon een wachtwoord instellen en ziet de bevestiging | `mobile-ui.spec.ts` (`MOB-H-006`) |
| een lange mededeling is op de telefoon volledig leesbaar zonder zijwaarts scrollen | `mobile-ui.spec.ts` (`MOB-H-007`) |

Nieuwe productlogica krijgt in dezelfde wijziging een rij in deze tabel of een aantoonbare koppeling
naar een bestaande ketentest.

De leesbare overkoepelende specificatie staat in
`tests/playwright/features/end-to-end-workflows.feature`. De uitvoerbare bron blijft
`tests/playwright/business-workflows-e2e.spec.ts`; zo is de bedrijfsketen snel te controleren zonder
een tweede, afwijkende implementatie van dezelfde stappen te onderhouden.
# E-mailstatus per omgeving

- LOCAL blijft altijd controlemodus/dry-run en kan geen echte e-mail activeren. De statusbadge is
  daar een toetsenbordbedienbare schakelaar voor uitsluitend de lokale previewregistratie.
- TEST levert echte berichten uitsluitend af bij het vaste, servermatig toegestane opvangadres. Een beheerder kan deze al beveiligde TEST-route in Instellingen pauzeren en hervatten; ontvangers en SMTP-rechten zijn daar niet wijzigbaar.
- PROD toont de werkelijke serverstatus, maar heeft geen gewone GUI-schakelaar. Activeren of uitschakelen blijft een gecontroleerde beheerhandeling in de productieconfiguratie.
- De statusbadge in de kop toont daarom expliciet `Lokale mailpreview uit`, `Lokale mailpreview
  actief`, `TEST-mail actief`, `TEST-mail gepauzeerd`, `E-mail uitgeschakeld` of `E-mail actief`.

# Toegang voor een nieuwe collega

Er is geen zelfregistratie. Een beheerder maakt het account aan in Teambeheer en vinkt daarbij
`Persoonlijke uitnodiging per e-mail versturen` aan. De uitgenodigde persoon ontvangt een
uitnodigingsmail met een persoonlijke link die twee uur geldig is en eenmalig kan worden gebruikt.
Via die link stelt de persoon zelf een wachtwoord van minimaal twaalf tekens in en logt daarna in
met het eigen e-mailadres. Zolang er nog geen wachtwoord is ingesteld toont Teambeheer
`Toegang in afwachting`.

Na het instellen verschijnt een expliciete bevestiging met een knop `Nu inloggen`. Het scherm
schakelt niet meer vanzelf om: een leeg formulier was voorheen het enige zichtbare resultaat van een
geslaagde actie en las daardoor als "er gebeurde niets". Dezelfde bevestiging geldt voor beide
rollen; `PWD-H-013` doorloopt de volledige keten voor zowel een beheerder als een medewerker.

Is een link verlopen of kwijt, dan stuurt de beheerder een nieuwe via `Wachtwoord resetten` in
Teambeheer, of vraagt de persoon zelf een link aan via `Wachtwoord vergeten`. Elke nieuwe link maakt
de vorige ongeldig.

# Mededelingen

Een beheerder plaatst een mededeling voor iedereen, een klantgroep of geselecteerde medewerkers. Een
concept blijft uitsluitend bij beheerders en veroorzaakt geen melding of e-mail; alleen een concept
mag definitief worden verwijderd. Een verzonden mededeling kan uitsluitend met een verplichte reden
worden ingetrokken, en pas een ingetrokken mededeling kan bij medewerkers worden verborgen. Titel,
bericht en minimaal één ontvanger zijn verplicht bij verzenden. Medewerkers kunnen zelf geen
mededelingen versturen. De cases `ANN-H-001` tot en met `ANN-N-006` bewaken deze regels.
