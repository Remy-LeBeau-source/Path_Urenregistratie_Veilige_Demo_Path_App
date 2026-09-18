// Voorbeeld-/uitgangsgegevens van de vier genoemde testers (Marc, Stasjo, Brian,
// Shawn) -- bewust ECHT, op verzoek van Gio ("Alles wat erin staat is gebaseerd
// op realiteit"), niet verzonnen. Dat is precies waarom dit bestand een eigen
// leven leidt los van assets/app.js: het bevat financiële persoonsgegevens
// (uurtarief, contractvorm, bemiddelaargegevens, overeenkomst-/crediteur-
// /contractantnummer) die tot 18 sep gewoon in het publiek opgehaalde app.js
// stonden -- zonder inloggen leesbaar door iedereen op zowel TEST als PROD
// (gevonden door de herontwerp-sessie, bevestigd op productie).
//
// Route (besluit Gio 18 sep, optie c): dit bestand blijft op DEV/TEST/ACC net
// als de rest van de repository, maar wordt bij de PROD-uitrol expliciet
// uitgesloten (zelfde `git archive ... ':(exclude)'`-patroon als pilot/ al
// gebruikte, zie scripts/deploy-production-transip.sh), met een verificatie-
// stap die de deploy laat falen als het bestand daar toch in zou staan. Op
// PROD loggen medewerkers altijd echt in; hun werkelijke gegevens komen dan
// hoe dan ook van de server (server/api/bootstrap.php), nooit van hier -- dit
// bestand is puur de vulling voor de demo-modus en de eerste tekening vóór
// die server-data binnen is. Ontbreekt het (zoals op PROD), dan valt app.js
// terug op een lege medewerkerslijst tot de server heeft geantwoord.
//
// mailBody en mailRecipientRoutes staan hier bewust niet in: dat zijn generieke
// standaardwaarden (DEFAULT_INVOICE_MAIL_BODY, defaultMailRecipientRoutes()),
// geen persoonsgegevens, en assets/app.js voegt ze zelf toe bij het opbouwen
// van de starttoestand -- dan hoeft dit bestand niets van app.js te kennen en
// blijft de laadvolgorde (dit bestand eerst, dan app.js) net als bij avatars.js.
window.PATH_EMPLOYEES_SEED = [
  {
    id: 1,
    // Vaste seed-user-id (database/seed-demo-data.sql: employees.id 1-4
    // koppelt aan users.id 3-6) -- resolveLoginEmail() gebruikt dit veld
    // om de server-override (employeeEmailOverrides, gesleuteld op
    // users.id) op te zoeken. Zonder dit botste employees.id toevallig
    // met een ANDERE genoemde testers users.id (Brian's employees.id 3
    // = Marc's users.id 3), waardoor de snelkeuze bij Brian per ongeluk
    // Marc's echte adres invulde.
    dbUserId: 3,
    name: "Marc de Roon",
    email: "marc@example.invalid",
    active: true,
    // Gelijk aan employment_start_date op de server (database/
    // seed-demo-data.sql). Stond op 2026-01-01; vóór de bootstrap-
    // hydratatie liet setPeriod() daardoor maanden vóór de echte
    // indiensttreding door. Zie [DASH-N-030].
    startDate: "2026-05-01",
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    photo: "",
    role: "Testconsultant",
    client: "IND",
    broker: "ItaQ Consultancy",
    brokerEmail: "facturen-itaq@example.invalid",
    invoiceRecipientName: "Itaq",
    brokerInvoiceAddress: "Laan van ZuidHoorn 165\n2289 DD Rijswijk",
    invoiceProject: "IND",
    brokerMailEnabled: true,
    rate: 85,
    contract: "Midlance 70/30",
    weeklyHours: 40,
    projectCode: "IND",
    invoiceTemplate: "IND-{jaar}-{maand}",
    mailSubject: "IND - factuur en uren {medewerker} - {maand} {jaar}",
    brokerInvoiceAttachment: true,
    bookkeeperInvoiceAttachment: true,
    payrollInvoiceAttachment: false,
    customerTimesheetExpected: true,
    customerTimesheetDueWorkday: 5,
    customerTimesheetBrokerEnabled: true,
    customerTimesheetUseBrokerEmail: true,
    customerTimesheetBrokerEmail: "facturen-itaq@example.invalid",
    invoiceWithoutCustomerTimesheetAllowed: true
  },
  {
    id: 2,
    dbUserId: 4,
    name: "Stasjo van Bakel",
    email: "stasjo@example.invalid",
    active: true,
    startDate: "2026-05-01", // gelijk aan de server, zie Marc hierboven en [DASH-N-030]
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    photo: "",
    role: "Test Engineer",
    client: "IND",
    broker: "ItaQ Consultancy",
    brokerEmail: "facturen-itaq@example.invalid",
    invoiceRecipientName: "Itaq",
    brokerInvoiceAddress: "Laan van ZuidHoorn 165\n2289 DD Rijswijk",
    invoiceProject: "IND",
    brokerMailEnabled: true,
    rate: 80,
    contract: "Vast · 36 uur",
    weeklyHours: 36,
    projectCode: "IND-TST-2026",
    invoiceTemplate: "IND-StvB-{jaar}-{maand}",
    mailSubject: "Factuur en uren {medewerker} ({klant}) maand {maand} {jaar}",
    brokerInvoiceAttachment: true,
    bookkeeperInvoiceAttachment: true,
    payrollInvoiceAttachment: false,
    customerTimesheetExpected: true,
    customerTimesheetDueWorkday: 7,
    customerTimesheetBrokerEnabled: true,
    customerTimesheetUseBrokerEmail: false,
    customerTimesheetBrokerEmail: "urenstaten-itaq@example.invalid",
    invoiceWithoutCustomerTimesheetAllowed: true
  },
  {
    id: 3,
    dbUserId: 5,
    name: "Brian Hek",
    email: "brian@example.invalid",
    active: true,
    startDate: "2026-05-01", // gelijk aan de server, zie Marc hierboven en [DASH-N-030]
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    photo: "",
    role: "Test Engineer",
    client: "COA",
    broker: "ItaQ Consultancy",
    brokerEmail: "facturen-itaq@example.invalid",
    invoiceRecipientName: "Itaq",
    brokerInvoiceAddress: "Laan van ZuidHoorn 165\n2289 DD Rijswijk",
    invoiceProject: "COA",
    brokerMailEnabled: true,
    rate: 72.5,
    contract: "Vast · 36 uur",
    weeklyHours: 36,
    projectCode: "COA",
    invoiceTemplate: "COA-{jaar}-{maand}",
    mailSubject: "Factuur en uren {medewerker} ({klant}) maand {maand} {jaar}",
    brokerInvoiceAttachment: true,
    bookkeeperInvoiceAttachment: true,
    payrollInvoiceAttachment: false,
    customerTimesheetExpected: true,
    customerTimesheetDueWorkday: 5,
    customerTimesheetBrokerEnabled: true,
    customerTimesheetUseBrokerEmail: true,
    customerTimesheetBrokerEmail: "facturen-itaq@example.invalid",
    invoiceWithoutCustomerTimesheetAllowed: true
  },
  {
    id: 4,
    dbUserId: 6,
    name: "Shawn-Douglas Nahar",
    email: "shawn@example.invalid",
    active: true,
    startDate: "2026-07-01",
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    photo: "",
    role: "Test Automation Engineer",
    client: "Belastingdienst",
    broker: "Circle8",
    brokerEmail: "facturen-circle8@example.invalid",
    invoiceRecipientName: "circle8",
    brokerInvoiceAddress: "Plettenburg-West,\nFultonbaan 6,\n3439 NE Nieuwegein",
    invoiceProject: "belastingdienst",
    brokerMailEnabled: true,
    rate: 85.5,
    contract: "Midlance 75/25",
    weeklyHours: 40,
    projectCode: "202636991",
    agreementNumber: "202636991",
    creditorNumber: "622085",
    contractorNumber: "217744",
    invoiceTemplate: "Bel-Shawn-{jaar}-{maand}",
    mailSubject: "{factuurnummer} - {medewerker} - overeenkomst {overeenkomstnummer}",
    brokerInvoiceAttachment: true,
    bookkeeperInvoiceAttachment: true,
    payrollInvoiceAttachment: false,
    customerTimesheetExpected: true,
    customerTimesheetDueWorkday: 10,
    customerTimesheetBrokerEnabled: true,
    customerTimesheetUseBrokerEmail: false,
    customerTimesheetBrokerEmail: "urenstaten-circle8@example.invalid",
    invoiceWithoutCustomerTimesheetAllowed: true
  }
];
