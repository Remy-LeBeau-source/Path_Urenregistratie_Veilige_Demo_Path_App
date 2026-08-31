@regressie
@integration
@ui
@desktop
@fase:16
Feature: Bedrijfsketens van medewerker tot Backoffice

  # Native Playwright-uitvoering: tests/playwright/business-workflows-*.spec.ts
  # Navigatiemapping: tests/playwright/steps/end-to-end-workflows.steps.ts

  @happy
  Scenario: [E2E-H-018] iedere beloofde factuurbijlage bestaat werkelijk als geldige en te openen PDF
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 25
    Given een goedgekeurde urenstaat klaarstaat voor facturatie
    When Backoffice de factuur definitief maakt
    Then levert de factuurbijlage een echte, geldige PDF met veilige headers
    And blijft dezelfde bijlage na een verversing byte voor byte gelijk
    And belooft geen enkele delivery een bijlage zonder werkelijk bestand

  @negative
  Scenario: [E2E-N-020] een medewerker kan de Backoffice-keten niet uitvoeren en een weigering verandert niets
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 26
    Given een ingediende urenstaat als controle bij Backoffice staat
    Then zijn Teambeheer, goedkeuren, factureren en mailbeheer niet bedienbaar
    When de medewerker met geldige CSRF timesheets.php action approve probeert
    And weigert de server ook de overige Backoffice-eindpunten
    And blijven status, versie en eigenaar exact ongewijzigd
    And ontstaan geen factuur, audit-succes of maildelivery door de poging

  @negative
  Scenario: [E2E-N-018] documentlinks accepteren geen ongeautoriseerde gebruiker, clientpad of vrije bestandsnaam
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 19
    Given een geldige factuurbijlage voor Backoffice bestaat
    When een uitgelogde browser dezelfde documentroute probeert
    And kan geen clientpad of vrije bestandsnaam worden afgedwongen
    And kan een medewerker niet bij de factuur van een ander
    Then zijn de originele bytes en het opslagbestand ongewijzigd

  @happy
  Scenario: [E2E-H-001] herstelbasis houdt globale werkvoorraad stabiel bij maand- en filterwissels
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 11
    Given Backoffice de vaste herstelbasis met twaalf open acties opent
    When Backoffice van augustus naar juli en terug naar augustus wisselt
    Then blijven totaal, eigenaarschap en taakidentiteiten ongewijzigd
    And de eigenaarfilters tonen uitsluitend hun zeven en vijf concrete acties

  @happy
  Scenario: [E2E-H-002] rolwissel werkt zonder F5 en herstel blijft beschikbaar voor iedere rol op LOCAL/TEST
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 11
    Given de TEST-login met accountkeuzes zichtbaar is
    When Stasjo via de medewerkerskeuze wordt geselecteerd
    Then staan zijn testcredentials direct klaar en blijft Herstel ook voor hem beschikbaar op LOCAL/TEST
    When naar Joyce als beheerder wordt gewisseld zonder pagina-herlaad
    Then wisselen de credentials direct en krijgt Backoffice de herstelbediening

  @happy
  Scenario: [E2E-H-003] herindiening verplaatst dezelfde actie van medewerker naar Backoffice
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de herstelbasis Stasjo een correctieactie en Backoffice zeven acties geeft
    When Stasjo zijn correctie opent en opnieuw indient
    Then krijgt Backoffice direct de vervolgcontrole zonder verlies van het globale totaal

  @happy
  Scenario: [E2E-H-004] goedkeuring vervangt urencontrole door factuurverzending voor hetzelfde dossier
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 5
    Given Backoffice een ingediende urenstaat uit de vaste herstelbasis opent
    When Backoffice die urenstaat goedkeurt
    Then verdwijnt alleen de urencontrole en verschijnt een factuuractie voor hetzelfde dossier

  @happy
  Scenario: [E2E-H-005] klanturenstaatcontrole wordt een brokeractie zonder taakverlies
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given Backoffice een ontvangen klanturenstaat in de vaste herstelbasis heeft
    When Backoffice het ontvangen klantdocument goedkeurt
    Then staat hetzelfde dossier klaar voor de broker en blijft het globale totaal stabiel

  @happy
  Scenario: [E2E-H-006] eenmalige wachtwoordlink geeft toegang en blokkeert hergebruik
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 13
    Given een eigen wegwerpmedewerker een resetlink aanvraagt
    When de medewerker via de link een sterk nieuw wachtwoord instelt
    Then werkt het nieuwe wachtwoord en is dezelfde link niet opnieuw bruikbaar
    And het gedeelde demo-account is niet aangeraakt

  @happy
  Scenario: [E2E-H-007] taakgestuurde goedkeuring blijft na serververversing afgerond
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given een servergestuurde urencontrole in de Backoffice-werkvoorraad staat
    When Backoffice via de taakmodal goedkeurt
    Then blijft de controle na volledige server-readback weg en staat de factuurtaak open

  @happy
  Scenario: [E2E-H-008] urencontrole vraagt na oude versie opnieuw op en maakt daarna toch goedkeuren af
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 4
    Given een urencontrole eerst met een oude lokale versie opent
    When Backoffice de confirm drukt na het vrijgeven van de versieverversing
    Then wordt de urencontrole goedgekeurd en verdwijnt de taak

  @negative
  Scenario: [E2E-N-019] een mislukte factuurpoging laat niets half achter en opnieuw proberen levert één factuur
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 19
    Given een goedgekeurde urenstaat en de voorstatus is vastgelegd
    When de eerste factuurpoging gecontroleerd faalt
    Then blijven taak, status, versie, factuur en deliveries onaangeroerd
    When Backoffice het opnieuw probeert, ontstaat precies één factuur
    And ontstaat per ontvanger precies één bericht zonder dubbele bijlage

  @happy
  Scenario: [E2E-H-016] ieder wijzigbaar Teambeheerveld heeft een aantoonbaar opslag- of uitzonderingscontract
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 32
    Given Backoffice elk veld van het medewerkersformulier zichtbaar invult
    When de flow voor E2E-H-016 wordt uitgevoerd
    Then bevat de verstuurde write elke ingevulde waarde
    And geeft de server elke waarde ongeschonden terug
    And staat elke waarde na een echte herlading weer in het formulier
    And is elk niet-bewaard veld een genoteerd besluit
    And opruimen: het aangemaakte account verdwijnt volledig

  @happy
  Scenario: [E2E-H-019] dubbel klikken maakt nooit dubbele statussen, facturen of mails
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 23
    Given de eerste submitwrite gecontroleerd wordt vertraagd
    When de medewerker twee keer snel achter elkaar indient
    Then bestaat er precies één urenstaat met één statusmutatie
    And levert dubbel goedkeuren en dubbel factureren één factuur op
    And bestaat per ontvanger precies één delivery zonder dubbele mail
    And is de dubbele klik werkelijk uitgevoerd

  @happy
  Scenario: [E2E-H-022] iedere case laat database en private opslag aantoonbaar schoon achter
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 20
    Given een schone _test-baseline zonder marker, wezen of losse documenten
    When Backoffice via de zichtbare GUI gemarkeerde account-, medewerker- en opdrachtdata opslaat
    Then zijn GUI-readback en gekoppelde databaserijen exact aantoonbaar
    And de automatische teardown bewijst hierna baseline, nul markers en nul losse PDF-bestanden

  @negative
  Scenario: [E2E-N-017] submitted, approved en invoiced blokkeren iedere verboden medewerkerwrite
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 30
    Given een medewerker zijn urenstaat indient
    Then blokkeert submitted iedere medewerkerwrite
    When Backoffice goedkeurt, blokkeert approved die write opnieuw
    When Backoffice de factuur vergrendelt, blokkeert invoiced die write ook
    And is elke status werkelijk beproefd en heeft geen poging iets achtergelaten

  @happy
  Scenario: [E2E-H-026] de definitieve factuur-PDF bevat de juiste bedragen en identiteit en geen conceptwatermerk
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 16
    Given bedrijfsketens van medewerker tot Backoffice is voorbereid
    When de flow voor E2E-H-026 wordt uitgevoerd
    Then staan factuurnummer, identiteit en betaalregel letterlijk in de PDF
    And kloppen de bedragen op de factuur met de vastgelegde waarden
    And staat er geen conceptwatermerk op de definitieve factuur

  @happy
  Scenario: [E2E-H-027] elk kanaal krijgt de standaardtekst van de server en geen enkele mail verlaat de machine
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 19
    Given bedrijfsketens van medewerker tot Backoffice is voorbereid
    When de flow voor E2E-H-027 wordt uitgevoerd
    Then draagt geen enkele delivery een onvervangen veld of lege tekst
    And dragen boekhouding en salaris exact de standaardtekst van de server
    And is elke delivery als dry-run vastgelegd: lokaal verlaat geen mail de machine
    And krijgt de salarisadministratie categorisch geen factuur mee

  @happy
  Scenario: [E2E-H-023] twee nieuw toegevoegde ontvangers krijgen via de volledige GUI-keten ieder hun eigen factuurmail
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 12
    Given Backoffice via Teambeheer een eigen ontvanger met eigen tekst toevoegt
    Then blijft de ontvanger na een echte herlading zichtbaar met zijn eigen instellingen
    When de volledige uren- en factuurketen via de GUI wordt doorlopen

  @happy
  Scenario: [E2E-H-024] een nieuw account krijgt via de GUI toegang en zijn eigen tekst komt letterlijk in de verzonden mail
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 18
    Given Backoffice via de GUI een nieuw account met eigen onderwerp en tekst aanmaakt
    When de nieuwe medewerker via de eenmalige link zelf inlogt en uren indient
    Then staat zijn eigen tekst letterlijk en eenmaal in de brokermail

  @happy
  Scenario: [E2E-H-025] een aangepaste standaardtekst werkt in de echte mail en is via de GUI terug te zetten
    # Testtechniek: End-to-end use-case + visuele contractasserties
    # Aantoonbare Playwright-assertions in deze case: 15
    Given Backoffice de standaardtekst voor Boekhouding opent
    When Backoffice zonder wijziging opslaat, is er geen eigen tekst vastgelegd
    When Backoffice een eigen standaardtekst invoert en de keten afrondt
    Then zet Terug naar de meegeleverde tekst de eigen tekst weer weg

  @negative
  Scenario: [E2E-N-021] een gedeactiveerd account met historie blijft veilig bewaard en legt de blokkeerreden uit
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 20
    Given een medewerker met echte uren-, login- en auditgeschiedenis
    When Backoffice de medewerker deactiveert
    Then kan het account niet meer inloggen en staat het niet in de actieve lijst
    And weigert definitief verwijderen met een begrijpelijke reden
    And blijven profiel, opdracht en urenhistorie volledig intact
    And staat het account na refresh precies eenmaal als inactief vermeld

  @happy
  Scenario: [E2E-H-017] de volledige toegestane urenstatusketen bewaakt na iedere write status, eigenaar en taak
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een medewerker met een openstaande urenstaat
    When de medewerker zijn uren indient
    Then staat de urenstaat op ingediend en is Backoffice eigenaar
    And weigert de server iedere wijziging door de medewerker
    And keurt Backoffice goed, waarna de medewerker nog steeds niets kan wijzigen
