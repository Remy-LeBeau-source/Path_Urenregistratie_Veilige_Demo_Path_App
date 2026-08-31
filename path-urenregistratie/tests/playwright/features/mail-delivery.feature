@regressie
@api
@fase:12
Feature: Mailroutering en aflevering

  # Native Playwright-uitvoering: tests/playwright/email-queue.spec.ts
  # Navigatiemapping: tests/playwright/steps/email-queue.steps.ts

  @happy
  Scenario: [EQ-H-001] factuurlock maakt queue-items aan met dry_run=true
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 5
    Given de admin heeft een factuur gelockt
    When de flow voor EQ-H-001 wordt uitgevoerd
    Then zijn er queue-items voor deze factuur met dry_run=true en status queued
    And cleanup

  @happy
  Scenario: [EQ-H-002] broker-channel stuurt alleen de factuur
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een gelockte factuur met broker_invoice_attachment=true
    When de queue wordt uitgelezen
    Then heeft de broker-channel attachment_policy=invoice
    And cleanup

  @happy
  Scenario: [EQ-H-003] EasySalary-channel heeft attachment_policy none
    # Testtechniek: Equivalentieklassen
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een gelockte factuur waar payroll_invoice_attachment=false
    When de queue-items voor deze factuur worden uitgelezen
    Then heeft elke EasySalary-item attachment_policy=none
    And cleanup

  @happy
  Scenario: [EQ-H-022] één factuuractie maakt drie gescheiden mailroutes met het juiste bijlagenbeleid
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 11
    Given één goedgekeurde urenstaat als factuur is afgerond
    When de drie functionele routes voor dezelfde factuur worden uitgelezen
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat één factuuractie maakt drie gescheiden mailroutes met het juiste bijlagenbeleid

  @happy
  Scenario: [EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een admin is ingelogd met een reeds gelockte factuur
    When action=enqueue wordt aangeroepen
    Then zijn de nieuwe items in de queue zichtbaar per invoiceId
    And cleanup

  @happy
  Scenario: [EQ-H-005] action=list response bevat verplichte velden
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 15
    Given een admin is ingelogd
    When de queue wordt uitgelezen
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat action=list response bevat verplichte velden

  @happy
  Scenario: [EQ-H-015] Backoffice ziet veilige verzendhistorie zonder berichtinhoud
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een beheerder is beveiligd ingelogd
    When de beheerder het verzendoverzicht in Instellingen opent
    Then zijn ontvanger, onderwerp, status, tijd en bijlagen zichtbaar zonder geheime inhoud
    And Vernieuwen haalt de actuele serverregistraties opnieuw op

  @happy
  Scenario: [EQ-H-031] mislukte mail blijft herstelbaar en verzonden mail heeft geen herhaalactie
    # Testtechniek: Toestandsovergang + herstelpad
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een mislukte en een reeds verzonden mail in de verzendadministratie staan
    When Backoffice de mislukte mail gemotiveerd opnieuw klaarzet
    Then blijft alleen de mislukte mail herstelbaar en krijgt verzonden mail geen herhaalactie

  @happy
  Scenario: [EQ-H-032] handmatige herstart na maximale pogingen is auditbaar en eenmalig
    # Testtechniek: Toestandsovergang + grenswaarde retries
    # Aantoonbare Playwright-assertions in deze case: 10
    Given een levering na het maximale aantal pogingen definitief is mislukt
    When Backoffice met de exacte bevestiging en een geldige reden herstart
    Then wordt dezelfde levering eenmaal opnieuw klaargezet en een tweede herstart geblokkeerd

  @happy
  Scenario: [EQ-H-033] queue-API pagineert en zoekt server-side
    # Testtechniek: Grenswaarde + API-contract
    # Aantoonbare Playwright-assertions in deze case: 11
    Given meerdere leveringen in de serverwachtrij staan
    When Backoffice per pagina navigeert en op factuurnummer zoekt
    Then levert de server het juiste bereik en uitsluitend passende resultaten

  @happy
  Scenario: [EQ-H-016] Backoffice verstuurt vanuit de acceptatieconsole precies één gekozen scenario
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 18
    Given de vijf losse mailacceptatiescenario’s zijn vrijgegeven voor vaste testontvangers
    When de beheerder alleen de brokerfactuur kiest en ontvanger en een bijlage bevestigt
    Then bevat de write exact één scenario met expliciete bevestiging en geen bulkopdracht

  @happy
  Scenario: [EQ-H-025] localhost schakelt een veilige mailpreview in en controleert inhoud en PDF’s zonder SMTP
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 33
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-H-025 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat localhost schakelt een veilige mailpreview in en controleert inhoud en PDF’s zonder SMTP

  @happy
  Scenario: [EQ-H-023] beheerder pauzeert en hervat uitsluitend de beveiligde TEST-mail
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 9
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-H-023 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat beheerder pauzeert en hervat uitsluitend de beveiligde TEST-mail

  @negative
  Scenario: [EQ-N-024] buiten de beveiligde TEST-sandbox is geen mailschakelaar beschikbaar
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-N-024 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat buiten de beveiligde TEST-sandbox is geen mailschakelaar beschikbaar

  @negative
  Scenario: [EQ-N-017] niet-beschikbare acceptatieconsole blijft volledig uit beeld
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 4
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-N-017 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat niet-beschikbare acceptatieconsole blijft volledig uit beeld

  @happy
  Scenario: [EQ-H-020] Backoffice finaliseert de branded serverfactuur en verzendt drie echte TEST-mails
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een goedgekeurde maar nog niet definitieve serverfactuur als Backoffice-taak klaarstaat
    When Backoffice de verzending één keer afrondt
    Then wordt eerst gelockt, niet te vroeg gequeued en verdwijnt de afgeronde vervolgtaak

  @happy
  Scenario: [EQ-H-026] Backoffice verzendt de juiste officiële klanturenstaat via TEST naar Giovanno
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 8
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-H-026 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat backoffice verzendt de juiste officiële klanturenstaat via TEST naar Giovanno

  @negative
  Scenario: [EQ-N-021] factuurverzending blijft dicht zolang de serveruren niet zijn goedgekeurd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given de lokale status verouderd is maar de serveruren nog ingediend zijn
    When de flow voor EQ-N-021 wordt uitgevoerd
    Then verschijnt geen factuurverzendtaak en wordt geen lock-write uitgevoerd

  @negative
  Scenario: [EQ-N-019] gesloten acceptatievenster toont waarom geen mail kan worden verstuurd
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-N-019 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat gesloten acceptatievenster toont waarom geen mail kan worden verstuurd

  @negative
  Scenario: [EQ-N-018] afgewezen acceptatiemail blijft nooit achter voor automatische herverzending
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 6
    Given het fail-closed retrybeleid voor acceptatiemail wordt uitgevoerd
    When de flow voor EQ-N-018 wordt uitgevoerd
    Then is een acceptatiefout single-shot en behoudt gewone mail begrensde retries

  @negative
  Scenario: [EQ-N-006] anonieme gebruiker krijgt 401 op list
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 2
    Given geen sessie
    When GET email-queue zonder sessie
    Then wordt met Playwright-assertions bevestigd dat anonieme gebruiker krijgt 401 op list

  @negative
  Scenario: [EQ-N-007] medewerker krijgt 403 op list
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given een ingelogde medewerker
    When de medewerker de queue opvraagt
    Then wordt met Playwright-assertions bevestigd dat medewerker krijgt 403 op list

  @negative
  Scenario: [EQ-N-008] action=enqueue zonder invoice_id geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When enqueue wordt aangeroepen zonder invoice_id
    Then wordt met Playwright-assertions bevestigd dat action=enqueue zonder invoice_id geeft 400

  @negative
  Scenario: [EQ-N-009] action=enqueue niet-bestaande factuur geeft 404
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When enqueue wordt aangeroepen met niet-bestaand invoice_id
    Then wordt met Playwright-assertions bevestigd dat action=enqueue niet-bestaande factuur geeft 404

  @negative
  Scenario: [EQ-N-010] action=enqueue niet-gelockte factuur geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een goedgekeurde-maar-niet-gelockte urenstaat
    When enqueue wordt aangeroepen voor een factuur die nog niet gelockt is
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat action=enqueue niet-gelockte factuur geeft 409

  @negative
  Scenario: [EQ-N-011] action=retry op queued item geeft 409
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 3
    Given een queued (niet-failed) delivery item
    When retry wordt aangeroepen op een queued item
    And cleanup
    Then wordt met Playwright-assertions bevestigd dat action=retry op queued item geeft 409

  @negative
  Scenario: [EQ-N-012] ongeldige status-filter geeft 400
    # Testtechniek: Toestandsovergang
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When status=invalid wordt meegestuurd
    Then wordt met Playwright-assertions bevestigd dat ongeldige status-filter geeft 400

  @negative
  Scenario: [EQ-N-013] anonieme enqueue geeft 401
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given geen sessie
    When POST email-queue zonder sessie
    Then wordt met Playwright-assertions bevestigd dat anonieme enqueue geeft 401

  @negative
  Scenario: [EQ-N-014] unknown action geeft 400
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 2
    Given een ingelogde admin
    When een onbekende action wordt verstuurd
    Then wordt met Playwright-assertions bevestigd dat unknown action geeft 400

  @negative
  Scenario: [EQ-N-015] localhost blijft preview-only en weigert POST zonder expliciete bevestiging
    # Testtechniek: Negatieve equivalentieklasse + error guessing
    # Aantoonbare Playwright-assertions in deze case: 9
    Given localhost uitsluitend lokale preview zonder echte aflevering vrijgeeft
    When een scenario zonder de exacte bevestiging wordt aangeboden
    Then wordt met Playwright-assertions bevestigd dat localhost blijft preview-only en weigert POST zonder expliciete bevestiging

  @negative
  Scenario: [EQ-N-016] medewerker krijgt geen toegang tot de mailacceptatieconsole
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 1
    Given mailroutering en aflevering is voorbereid
    When de flow voor EQ-N-016 wordt uitgevoerd
    Then wordt met Playwright-assertions bevestigd dat medewerker krijgt geen toegang tot de mailacceptatieconsole

  @happy
  Scenario: [E2E-H-009] twee nieuw toegevoegde ontvangers krijgen allebei echt een factuurmail
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 26
    Given twee nieuwe ontvangers op de opdracht staan
    When de volledige uren- en factuurketen wordt doorlopen
    Then blijft de uitzondering voor de salarisadministratie staan
    Then krijgt de nieuwe boekhoudingsontvanger een mail met de eigen tekst
    And krijgt ook de tweede nieuwe ontvanger een mail
    And staat in de verzonden mail exact wat er is ingevuld

  @happy
  Scenario: [E2E-H-010] nieuw account, eigen tekst, en die tekst komt terug in de verzonden mail
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 28
    Given een nieuwe beheerder is aangemaakt
    And een nieuwe medewerker met een eigen ontvanger, onderwerp en tekst
    And de medewerker stelt via de eenmalige link een wachtwoord in
    When de medewerker uren indient en Backoffice goedkeurt en factureert
    Then staat de zelf ingevoerde tekst letterlijk in de verzonden mail
    And opruimen: de aangemaakte accounts worden gedeactiveerd

  @happy
  Scenario: [EQ-H-029] elke ontvanger krijgt de handtekening, ook onder een eigen tekst
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 8
    Given een factuur is definitief gemaakt
    When de mails voor de ontvangers worden klaargezet
    Then draagt elke route dezelfde afsluiting
    And staat de afsluiting er ook bij een kanaal met een eigen tekst
    And cleanup

  @happy
  Scenario: [E2E-H-011] een aangepaste standaardtekst komt werkelijk in de mail en is terug te zetten
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 15
    Given opslaan zonder iets te wijzigen legt niets vast
    When de beheerder de standaardtekst voor de boekhouding aanpast
    Then geldt die tekst voortaan voor dat soort ontvanger
    And staat hij werkelijk in de verzonden mail
    And leeg opslaan zet de meegeleverde tekst terug

  @happy
  Scenario: [E2E-H-012] het vinkje Factuur meesturen bepaalt werkelijk of de bijlage meegaat
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 6
    Given een ontvanger van het type Overig met Factuur meesturen aan
    When de volledige keten tot en met de mail wordt doorlopen
    Then wordt met Playwright-assertions bevestigd dat het vinkje Factuur meesturen bepaalt werkelijk of de bijlage meegaat

  @happy
  Scenario: [E2E-H-013] een nieuwe medewerker houdt zijn gegevens en komt tot een factuur met de juiste mail
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 36
    Given een nieuwe medewerker met klant, broker, contract en een eigen ontvanger
    Then blijven zijn gegevens staan, ook het contract
    And krijgt hij toegang via de eenmalige link
    When hij zelf uren indient
    And verschijnt zijn urenstaat als werk voor Backoffice
    And levert goedkeuren een echte serverfactuur op
    And krijgt elke ontvanger de juiste mail, met de juiste bijlage
    And opruimen: het aangemaakte account wordt gedeactiveerd

  @happy
  Scenario: [E2E-H-014] een nieuwe beheerder logt zelf in en kan de keten afmaken
    # Testtechniek: API-contract + equivalentieklasse
    # Aantoonbare Playwright-assertions in deze case: 17
    Given een nieuwe beheerder met een eigen wachtwoord
    When hij zelf inlogt
    Then ziet hij dezelfde werkvoorraad als de bestaande beheerder
    And kan hij zelf goedkeuren en factureren
    And opruimen: het beheerdersaccount wordt gedeactiveerd

  @happy
  Scenario: [E2E-H-015] aanmaken, lezen, wijzigen en verwijderen van een medewerker houdt stand
    # Testtechniek: Beslissingstabel rollen en autorisatie
    # Aantoonbare Playwright-assertions in deze case: 18
    Given een nieuw aangemaakte medewerker
    When elk veld wordt gewijzigd
    Then staat elke wijziging er ook werkelijk
    And deactiveren haalt hem uit de actieve lijst zonder hem te wissen
    And definitief verwijderen laat niets achter
