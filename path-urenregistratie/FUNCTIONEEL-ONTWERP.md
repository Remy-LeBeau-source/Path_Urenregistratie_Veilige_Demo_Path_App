# Functioneel Ontwerp — Path Uren & Facturatie

## 1. Doel en bron van waarheid

Dit document beschrijft de bedoelde productwerking. Features, GUI-smoke, regressietests en implementatie moeten hiermee overeenkomen. Bij verschil is dit ontwerp leidend totdat een bewuste productbeslissing het document én de tests tegelijk wijzigt.

De applicatie ondersteunt de maandketen van urenregistratie tot gecontroleerde factuur- en mailroutes. Een actie heeft steeds precies één eigenaar: de medewerker of Backoffice.

## 2. Omgevingen

| Omgeving | URL | Data | Snelle accountkeuze | Reset | Echte mail |
|---|---|---|---|---|---|
| LOCAL | `http://localhost:8000` | lokale/testdata | ja | beheerder | nee |
| TEST | `https://uren-test.pathconsultancy.nl` | aparte TEST-database | ja | beheerder | uitsluitend via test-allowlist |
| PROD | `https://uren.pathconsultancy.nl` | productiegegevens | nee | nee | alleen na productieconfiguratie |

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

## 5. Urenstaat-statusketen

| Beginstatus | Actie | Nieuwe status | Nieuwe eigenaar |
|---|---|---|---|
| concept/draft | medewerker dient in | ingediend/submitted | Backoffice |
| ingediend | beheerder vraagt correctie | correctie/correction | medewerker |
| correctie | medewerker dient opnieuw in | ingediend/submitted | Backoffice |
| ingediend | beheerder keurt goed | goedgekeurd/approved | Backoffice voor factuurcontrole |
| goedgekeurd | factuur wordt definitief | gefactureerd/invoiced | Backoffice voor verzending |
| goedgekeurd/gefactureerd | medewerker probeert te wijzigen | geweigerd | ongewijzigd |

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

Een geüpload document blijft als PDF controleerbaar. Een factuur mag alleen zonder klanturenstaat verder als de opdracht dit expliciet toestaat.

## 7. Factuur- en mailketen

Na goedgekeurde uren controleert Backoffice per medewerker en periode afzonderlijke routes:

- broker: factuur en, waar vereist, klanturenstaat;
- boekhouder: factuur;
- salarisadministratie: alleen medewerker, periode en goedgekeurde uren; geen bijlage;
- wachtwoordreset: eenmalige link, geen bijlage;
- eerste uitnodiging: eenmalige link om een wachtwoord te maken, geen bijlage.

Eén afgeronde factuuractie maakt bij de standaardroute exact drie afzonderlijke berichten: broker,
boekhouding en salarisadministratie. Dit zijn drie queue-items en drie SMTP-afleveringen, niet één
bericht met CC/BCC. In TEST worden ze alle drie fysiek bij de vaste testontvanger afgeleverd, terwijl
de bedoelde productieroute zichtbaar blijft. De factuur en de officiële klanturenstaat zijn vóór
afronden afzonderlijk als PDF te controleren.

LOCAL verstuurt nooit echte mail. TEST herschrijft alle functionele ontvangers naar de vastgelegde testontvanger en markeert elk bericht als acceptatietest. PROD gebruikt uitsluitend de geconfigureerde zakelijke ontvangers. Een mislukte verzending blijft zichtbaar in de verzendadministratie en mag niet als verzonden worden getoond.

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

1. vereist een beheerder;
2. wist TEST-mutaties en TEST-mailhistorie;
3. herstelt accounts, perioden, uren, klanturenstaten, facturen en taakverdeling als één transactie;
4. levert na afloop dezelfde aantallen en statussen als de vastgelegde baseline;
5. is voor een medewerker niet zichtbaar en server-side verboden.

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
| wachtwoord instellen via eenmalige link en hergebruik blokkeren | `business-workflows-e2e.spec.ts` (`E2E-H-006`) |
| globale sommen en maandinvariant | `dashboard.spec.ts` (`DASH-H-012`, `DASH-H-017`) |
| indienen/correctie/herindienen/goedkeuren | `timesheet-review-ui.spec.ts` (`TS-REV-UI-H-008`) |
| submitted/approved lock | `TS-REV-UI-H-009`, `TS-REV-UI-H-010` |
| rolwissel zonder F5 | `auth.spec.ts` (`AUTH-H-010`) |
| reset alleen beheerder | dashboard/security- en end-to-endcases |
| veilige accountlevenscyclus | `user-management.spec.ts` |
| resetlink vanuit Teambeheer voor medewerker en beheerder, nooit voor het eigen account | `user-management.spec.ts` (`USR-H-011`) |
| mailredirect, allowlist en bijlagen | `email-queue.spec.ts`, password-reset- en mailpolicychecks |
| één factuuractie levert exact broker + boekhouding + salarisadministratie | `email-queue.spec.ts` (`EQ-H-022`) |
| serveruren blokkeren te vroege factuurverzending | `email-queue.spec.ts` (`EQ-N-021`) |
| mobiele hoofdketen | `mobile-ui.spec.ts` |

Nieuwe productlogica krijgt in dezelfde wijziging een rij in deze tabel of een aantoonbare koppeling
naar een bestaande ketentest.

De leesbare overkoepelende specificatie staat in
`tests/playwright/features/end-to-end-workflows.feature`. De uitvoerbare bron blijft
`tests/playwright/business-workflows-e2e.spec.ts`; zo is de bedrijfsketen snel te controleren zonder
een tweede, afwijkende implementatie van dezelfde stappen te onderhouden.
