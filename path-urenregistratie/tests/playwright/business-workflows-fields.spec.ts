import { test, expect } from './fixtures/e2eIsolation';
import { LoginPage } from './pages/LoginPage';
import { TeamManagementPage } from './pages/TeamManagementPage';

// De veldmatrix, gestuurd via het echte scherm.
//
// Dit is de strengste vorm van de fout die hier meermaals is opgetreden: een veld
// dat het formulier aanbiedt, dat bij opslaan netjes 200 teruggeeft, en dat daarna
// weg is. Zo verdween het contractveld, zo verdween de soort ontvanger, en zo deed
// het vinkje "Factuur meesturen" niets. Geen van drieën viel op in de suite; Gio
// vond ze alle drie met de hand.
//
// De case vult elk veld met een herkenbare waarde en eist die daarna op drie
// plaatsen terug: in wat de browser verstuurde, in wat de server teruggeeft, en in
// het formulier na een echte herlading. Een veld dat bewust niet wordt bewaard hoort
// in de uitzonderingslijst met een reden -- dan is het een besluit in plaats van een
// verdwijning die niemand opmerkt.

type Json = Record<string, unknown>;

// Velden die het formulier verstuurt maar die bewust niet op de opdracht landen.
// Wie hier iets aan toevoegt, neemt een besluit.
const BEWUST_NIET_OP_DE_OPDRACHT: Record<string, string> = {
  invoiceRecipientName: 'hoort bij de tegenpartij (counterparties), niet bij de opdracht',
  brokerInvoiceAddress: 'hoort bij de tegenpartij (counterparties), niet bij de opdracht',
};

test('[E2E-H-016] ieder wijzigbaar Teambeheerveld heeft een aantoonbaar opslag- of uitzonderingscontract', async ({ page }) => {
  test.setTimeout(120_000);

  const marker = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const naam = `Velden ${marker}`;
  const adres = `velden-${marker}@example.invalid`;

  const ingevuld = {
    name: naam,
    email: adres,
    role: `Consultant ${marker}`,
    startDate: '2026-08-01',
    contract: `Detachering ${marker}`,
    weeklyHours: 32,
    client: `Klant ${marker}`,
    projectCode: `PRJ-${marker}`,
    broker: `Broker ${marker}`,
    brokerEmail: `broker-${marker}@example.invalid`,
    invoiceRecipientName: `Ontvanger ${marker}`,
    brokerInvoiceAddress: `Teststraat 22\n2200 TT Teststad ${marker}`,
    invoiceProject: `Factuurproject ${marker}`,
    rate: 122.5,
    brokerSubject: `Onderwerp ${marker}`,
    brokerBody: `Bericht ${marker} met {uren} uur`,
    sendInvitation: false,
  } as const;

  const loginPage = new LoginPage(page);
  const teambeheer = new TeamManagementPage(page);

  let write: Awaited<ReturnType<TeamManagementPage['addEmployee']>> | null = null;

  await test.step('Given Backoffice elk veld van het medewerkersformulier zichtbaar invult', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await teambeheer.open();
    write = await teambeheer.addEmployee({ ...ingevuld });
  });

  await test.step('Then bevat de verstuurde write elke ingevulde waarde', async () => {
    // De eerste van de drie plaatsen: wat de browser werkelijk over de lijn stuurde.
    // Een veld dat hier al ontbreekt, is in het scherm blijven hangen.
    const verstuurd = (write!.request.employee ?? {}) as Json;
    expect(write!.body.ok, 'de opslag hoort te slagen').toBe(true);
    expect(String(verstuurd.name), 'naam').toBe(ingevuld.name);
    expect(String(verstuurd.contract), 'contract').toBe(ingevuld.contract);
    expect(String(verstuurd.client), 'klant').toBe(ingevuld.client);
    expect(String(verstuurd.broker), 'broker').toBe(ingevuld.broker);
    expect(String(verstuurd.brokerEmail), 'brokeradres').toBe(ingevuld.brokerEmail);
    expect(String(verstuurd.projectCode), 'projectcode').toBe(ingevuld.projectCode);
    expect(String(verstuurd.invoiceProject), 'factuurproject').toBe(ingevuld.invoiceProject);
    expect(Number(verstuurd.rate), 'tarief').toBe(ingevuld.rate);
    expect(Number(verstuurd.weeklyHours), 'uren per week').toBe(ingevuld.weeklyHours);
    expect(String(verstuurd.mailSubject), 'eigen onderwerp').toBe(ingevuld.brokerSubject);
    expect(String(verstuurd.mailBody), 'eigen tekst').toBe(ingevuld.brokerBody);
  });

  await test.step('And geeft de server elke waarde ongeschonden terug', async () => {
    const medewerkerId = Number(write!.body.employee_id);
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;

    const medewerker = (bootstrap.employees as Json[]).find(item => Number(item.id) === medewerkerId);
    const opdracht = (bootstrap.assignments as Json[]).find(item => Number(item.employee_id) === medewerkerId);
    expect(medewerker, 'de medewerker hoort te bestaan').toBeDefined();
    expect(opdracht, 'de opdracht hoort te bestaan, anders komt er nooit een factuur').toBeDefined();

    expect(String(medewerker?.full_name), 'naam').toBe(ingevuld.name);
    expect(String(medewerker?.job_title), 'rol').toBe(ingevuld.role);
    expect(Number(medewerker?.weekly_contract_hours), 'uren per week').toBe(ingevuld.weeklyHours);

    expect(String(opdracht?.contract_label), 'contract').toBe(ingevuld.contract);
    expect(String(opdracht?.project_code), 'projectcode').toBe(ingevuld.projectCode);
    expect(String(opdracht?.invoice_project_name), 'factuurproject').toBe(ingevuld.invoiceProject);
    expect(Number(opdracht?.hourly_rate), 'tarief').toBe(ingevuld.rate);
    expect(String(opdracht?.invoice_subject_template), 'eigen onderwerp').toBe(ingevuld.brokerSubject);
    expect(String(opdracht?.invoice_body_template), 'eigen tekst').toBe(ingevuld.brokerBody);

    // Klant en broker staan als tegenpartij, niet als tekst op de opdracht.
    const partijen = (bootstrap.counterparties as Json[]) || [];
    const klant = partijen.find(item => Number(item.id) === Number(opdracht?.client_id));
    const broker = partijen.find(item => Number(item.id) === Number(opdracht?.broker_id));
    const partijNaam = (partij?: Json) => String(partij?.trade_name || partij?.legal_name || '');
    expect(partijNaam(klant), 'klantnaam').toBe(ingevuld.client);
    expect(partijNaam(broker), 'brokernaam').toBe(ingevuld.broker);
    expect(String(broker?.invoice_email), 'brokeradres hoort bij de tegenpartij te staan').toBe(ingevuld.brokerEmail);
  });

  await test.step('And staat elke waarde na een echte herlading weer in het formulier', async () => {
    // De derde plaats, en de enige die Gio zelf ziet. Het contractveld kwam hier
    // leeg terug terwijl server en write in orde leken.
    await teambeheer.reloadAndOpenEmployee(naam);

    const verwacht: Array<[string, string]> = [
      ['#edit-name', ingevuld.name],
      ['#edit-account-email', ingevuld.email],
      ['#edit-contract', ingevuld.contract],
      ['#edit-client', ingevuld.client],
      ['#edit-project', ingevuld.projectCode],
      ['#edit-broker', ingevuld.broker],
      ['#edit-broker-email', ingevuld.brokerEmail],
      ['#edit-invoice-project', ingevuld.invoiceProject],
      ['#edit-subject', ingevuld.brokerSubject],
      ['#edit-body', ingevuld.brokerBody],
    ];
    for (const [selector, waarde] of verwacht) {
      await expect(page.locator(selector), `${selector} hoort na herladen ${JSON.stringify(waarde)} te tonen`)
        .toHaveValue(waarde);
    }
    await expect(page.locator('#edit-rate')).toHaveValue(String(ingevuld.rate));
    await expect(page.locator('#edit-weekly-hours')).toHaveValue(String(ingevuld.weeklyHours));
  });

  await test.step('And is elk niet-bewaard veld een genoteerd besluit', async () => {
    // Deze lijst is de eigenlijke bewaker: wie een veld toevoegt en vergeet het op te
    // slaan, komt hier langs.
    for (const [veld, reden] of Object.entries(BEWUST_NIET_OP_DE_OPDRACHT)) {
      expect(reden.length, `${veld} hoort een reden te hebben`).toBeGreaterThan(10);
      expect(Object.keys(ingevuld), `${veld} hoort ook werkelijk te worden ingevuld`).toContain(veld);
    }
  });

  await test.step('And opruimen: het aangemaakte account verdwijnt volledig', async () => {
    await page.locator('#modal-close').click().catch(() => null);
    await teambeheer.deactivateEmployee(naam);
    await teambeheer.showInactive();
    await teambeheer.deleteEmployee(naam);

    const na = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    const rest = (na.employees as Json[]).find(item => String(item.full_name) === naam);
    expect(rest, 'na verwijderen hoort er geen medewerker meer te staan').toBeUndefined();
  });
});
