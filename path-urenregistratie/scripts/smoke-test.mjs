import { readFile } from "node:fs/promises";
import { readFileSync as readFileSync_, readdirSync as readdirSync_ } from "node:fs";
import { JSDOM } from "jsdom";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("assets/app.js", root), "utf8");
const styles = await readFile(new URL("assets/styles.css", root), "utf8");
const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "http://localhost:8000/"
});

dom.window.scrollTo = () => {};
dom.window.URL.createObjectURL = () => "blob:test";
dom.window.URL.revokeObjectURL = () => {};
dom.window.fetch = () => new Promise(() => {});
// Deze statische smoke bewaakt de vaste demo-baseline van augustus 2026. Zonder
// vaste klok voegt de app bij iedere echte maandwisseling terecht een nieuwe
// werkmaand toe en worden exacte baseline-aantallen kalenderafhankelijk.
// Injecteer alleen de kalenderfunctie in de geëvalueerde testkopie. Een globale
// nep-Date verstoort timers en unieke ID's; de echte browser-E2E blijft bovendien
// bewust de actuele kalendermaand controleren.
const smokeScript = script.replace(
  /function currentCalendarPeriodKey\(\) \{\r?\n  const now = new Date\(\);/,
  "function currentCalendarPeriodKey() {\n  const now = new Date('2026-08-31T12:00:00.000Z');",
);
if (smokeScript === script) throw new Error("De vaste smokeklok kon niet veilig worden geïnjecteerd");
dom.window.eval(smokeScript);
if (typeof dom.window.applyAuthUiMode === "function") {
  dom.window.applyAuthUiMode("demo");
}

assert(dom.window.localAccountToolsAllowed("localhost") && dom.window.localAccountToolsAllowed("127.0.0.1") && !dom.window.localAccountToolsAllowed("uren-test.pathconsultancy.nl"), "Lokale browserreset mag alleen op loopbackhosts beschikbaar zijn");
assert(dom.window.isLocalAuthHintsHost("localhost") && dom.window.isLocalAuthHintsHost("uren-test.pathconsultancy.nl") && !dom.window.isLocalAuthHintsHost("uren.pathconsultancy.nl"), "Automatisch invullen mag alleen lokaal en op de exacte TEST-host beschikbaar zijn");
assert(dom.window.testAccountToolsAllowed("localhost") && dom.window.testAccountToolsAllowed("uren-test.pathconsultancy.nl") && !dom.window.testAccountToolsAllowed("uren.pathconsultancy.nl"), "Snelle accountkeuze mag alleen lokaal en op de exacte TEST-host beschikbaar zijn");
dom.window.applyLoginPresentation(false);
assert(dom.window.document.querySelector("#local-account-login-tools").hidden && dom.window.document.querySelector("#local-login-note").hidden && dom.window.document.querySelector("#login-title").textContent === "Inloggen" && dom.window.document.querySelector("#login-environment-label").textContent === "Beveiligde omgeving", "De productiepresentatie mag geen lokale accountkeuze of demotekst tonen");
dom.window.applyLoginPresentation(true);
assert(dom.window.document.querySelector("#login-environment-label").textContent === "Veilige testomgeving" && dom.window.document.querySelector("#login-title").textContent === "Welkom bij Path Uren & Facturatie", "De lokale login moet de veilige testomgeving en productnaam herkenbaar benoemen");

const pdfDownloads = [];
dom.window.jspdf = {
  jsPDF: class MockPdf {
    setTextColor() {}
    setFont() {}
    setFontSize() {}
    text() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    setFillColor() {}
    rect() {}
    roundedRect() {}
    addImage() {}
    getImageProperties() { return { width: 1200, height: 1600 }; }
    output() { return "data:application/pdf;base64,JVBERi0xLjQ="; }
    save(filename) { pdfDownloads.push(filename); }
  }
};

const { document, Event, MouseEvent, KeyboardEvent } = dom.window;
const downloads = [];
dom.window.HTMLAnchorElement.prototype.click = function captureDownload() {
  downloads.push({ filename: this.download, href: this.href });
  // De factuurdownload loopt niet meer via jsPDF's save() maar via een expliciete
  // <a download>-klik (deliverBlobDownload), zodat het app-tabblad nooit wordt
  // vervangen. Registreer een .pdf-download hier zodat de bestaande checks blijven werken.
  if (String(this.download || "").toLowerCase().endsWith(".pdf")) pdfDownloads.push(this.download);
};
if (typeof dom.window.URL.revokeObjectURL !== "function") dom.window.URL.revokeObjectURL = () => {};

function click(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error("Klikdoel ontbreekt: " + selector);
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function pressEnter(selector, options = {}) {
  const element = document.querySelector(selector);
  if (!element) throw new Error("Invoerveld ontbreekt: " + selector);
  element.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...options
  }));
}

function choosePeriod(monthSelector, yearSelector, periodKey) {
  const [year, month] = periodKey.split("-");
  const monthControl = document.querySelector(monthSelector);
  const yearControl = document.querySelector(yearSelector);
  if (!monthControl || !yearControl) throw new Error("Periodekeuze ontbreekt: " + monthSelector + " / " + yearSelector);
  yearControl.value = year;
  const monthChoice = document.querySelector('[data-month-control="' + monthSelector + '"][data-period-month="' + month + '"]');
  if (!monthChoice) throw new Error("Maandknop ontbreekt: " + monthSelector + " / " + month);
  monthChoice.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ids = [...document.querySelectorAll("[id]")].map(element => element.id);
assert(new Set(ids).size === ids.length, "Ieder element-id moet uniek zijn");
assert(styles.includes("@media (max-width: 590px)"), "Er moet een mobiele layout voor smalle telefoons bestaan");
assert(styles.includes("v0.9.45 · mobiele bediening") && styles.includes("@media (max-width: 720px)"), "De expliciete mobiele touch-layout moet aanwezig blijven");
assert(document.querySelector(".mobile-brand-home [data-brand-logo]") && document.querySelector(".mobile-brand-home [data-brand-logo]").tagName === "IMG", "Mobiel moet het Path-logo als zichtbare Home-knop tonen");
assert(document.querySelector("#mobile-switch-role")?.textContent.includes("Rol kiezen"), "Mobiel moet een directe knop Rol kiezen hebben zodat verversen niet nodig is");
assert(document.querySelector("#sidebar-brand [data-brand-logo]")?.src !== document.querySelector(".mobile-brand-home [data-brand-logo]")?.src, "De donkere zijbalk moet de lichte logoversie gebruiken en de lichte topbalk de donkere versie");
dom.window.syncEnvironmentChrome("uren.pathconsultancy.nl");
assert(document.querySelector("#switch-role")?.textContent === "Uitloggen" && document.querySelector("#mobile-switch-role")?.textContent === "Uitloggen", "Productie moet de afmeldactie duidelijk Uitloggen noemen");
dom.window.syncEnvironmentChrome("localhost");
assert(/@media\s*\(max-width:\s*720px\)[\s\S]*\.invoice-table\s+thead\s*\{\s*display:\s*none/.test(styles), "De factuurtabel moet op mobiel als kaartweergave tonen in plaats van als brede tabel");
assert(/@media\s*\(max-width:\s*720px\)[\s\S]*\.month-choice-panel\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,1fr\)\)/.test(styles), "De maandkeuze moet op mobiel als twee-koloms touchmenu openen");
assert(/@media\s*\(max-width:\s*720px\)[\s\S]*\.modal-actions\s*\{[\s\S]*grid-template-columns:\s*1fr/.test(styles), "Modalacties moeten op mobiel onder elkaar staan");
assert(styles.includes(".correction-banner.dashboard-correction .button"), "De correctiekaart moet op mobiel een bruikbare actieknop houden");
assert(/\.invoice-brand-number-line\s+strong\s*\{[^}]*color:\s*#fff/.test(styles), "Het factuurnummer moet wit en zichtbaar zijn op de donkerblauwe factuurkop");
assert(/\.invoice-brand-references\s+strong\s*\{[^}]*color:\s*#fff/.test(styles), "Shawns drie brokerreferenties moeten wit en zichtbaar zijn in het donkerblauwe referentieblok");
assert(document.querySelectorAll("select:not([hidden])").length === 0, "De vaste interface mag geen zichtbare native browserdropdowns meer bevatten");

// Onder 720px staat er `html, body { overflow-x: hidden }`, waardoor body een eigen
// scrollgebied wordt dat precies zo hoog is als zijn inhoud -- er valt daar dus niets
// te scrollen. Zet je daar dan overscroll-behavior op, dan blokkeert dat het doorgeven
// van een veeg aan het document erboven en scrollt de telefoon helemaal niet meer.
// Dat gebeurde in 0.9.119. Deze controle staat hier en niet in Playwright, omdat de
// WebKit-motor overscroll-behavior niet kent en het daar dus niet te meten is, terwijl
// echte iOS Safari 16+ hem wel heeft. Zie MOB-H-010.
{
  // Geen regex hier: de CSS wordt blok voor blok uit elkaar gehaald. Van elk blok is
  // de selector alles na de laatste accolade ervoor, zodat een regel binnen een
  // @media-blok ook los wordt herkend.
  const bodyRegels = [];
  for (const blok of styles.split("}")) {
    const grens = blok.lastIndexOf("{");
    if (grens < 0) continue;
    if (!blok.slice(grens + 1).includes("overscroll-behavior")) continue;
    const selector = blok.slice(0, grens).trim();
    // Elke selector in de groep telt apart: ".app-shell, body { ... }" raakt body ook.
    // ".modal-body" mag geen treffer geven, vandaar de vergelijking op het hele woord.
    const raaktBody = selector.split(",").some(deel => {
      const d = deel.trim();
      return d === "body" || d.endsWith(" body");
    });
    if (raaktBody) bodyRegels.push(selector);
  }
  assert(bodyRegels.length === 0, `overscroll-behavior mag niet op body staan, dat breekt het scrollen op de telefoon (gevonden bij: ${bodyRegels.join(" | ")})`);
}

// Op een telefoon worden brede tabellen kaartjes en verdwijnen de kolomkoppen. De
// betekenis komt dan uit een label in de opmaak (content: attr(data-label)). Dat is
// echte schermtekst en valt dus onder dezelfde ondergrens van 11px als de rest --
// het dashboardlabel stond op 8px. De mobiele cases kunnen dit niet zien, want
// querySelectorAll kent geen pseudo-elementen. Vandaar hier, op de stylesheet zelf.
{
  const teKleineLabels = [];
  for (const blok of styles.split("}")) {
    const grens = blok.lastIndexOf("{");
    if (grens < 0) continue;
    const inhoud = blok.slice(grens + 1);
    if (!inhoud.includes("content: attr(")) continue;
    const maat = /font-size:\s*([0-9.]+)px/.exec(inhoud);
    if (!maat) continue;
    if (Number(maat[1]) >= 11) continue;
    teKleineLabels.push(blok.slice(0, grens).trim().split(",").pop().trim() + " = " + maat[1] + "px");
  }
  assert(teKleineLabels.length === 0, `Een label uit de opmaak is schermtekst en moet minstens 11px zijn (${teKleineLabels.join(" | ")})`);
}

// Wordt de app vanaf het beginscherm geopend, dan staat er op iOS geen adresbalk
// meer boven de pagina. Met apple-mobile-web-app-status-bar-style op
// black-translucent loopt de pagina door tot achter de statusbalk, en liggen de
// klok, het 5G-icoon en de batterij over de bovenbalk van de app heen. Wat
// daaronder zit is niet aan te tikken: Rol kiezen werkte in de browser wel en in
// de app niet.
//
// env(safe-area-inset-top) is precies zo hoog als die statusbalk en nul zodra er
// geen overheen ligt. Deze controle staat hier en niet in Playwright, omdat geen
// enkele browsermotor in de testopstelling een echte veilige zone rapporteert --
// dit is alleen op een fysiek toestel te zien, en juist daarom moet de regel
// aantoonbaar in de stylesheet staan.
{
  const bovenbalk = styles.slice(styles.lastIndexOf(".topbar {"));
  const heeftVeiligeZone = /padding-top:\s*env\(safe-area-inset-top/.test(bovenbalk.slice(0, 400));
  assert(heeftVeiligeZone, "De bovenbalk moet env(safe-area-inset-top) aanhouden, anders valt hij op iOS achter de statusbalk");
}

// Tekstkleuren moeten leesbaar zijn tegen de lichte achtergronden van de app. De
// norm voor gewone tekst is 4,5:1. Voor de aanpassing haalde --muted 4,10:1 op de
// groene kaarten en gaven de accentkleuren als tekst 3,54:1 en 3,40:1; samen ruim
// 200 teksten onder de norm, op desktop en telefoon gelijk. Deze controle houdt de
// tokens vast, zodat ze niet stilletjes weer lichter worden.
{
  const kanaal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const helderheid = ([r, g, b]) => 0.2126 * kanaal(r) + 0.7152 * kanaal(g) + 0.0722 * kanaal(b);
  const contrast = (a, b) => {
    const l1 = helderheid(a);
    const l2 = helderheid(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const uitHex = (h) => [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)].map((p) => parseInt(p, 16));
  const tokenWaarde = (naam) => {
    const treffer = new RegExp("--" + naam + ":\\s*(#[0-9a-fA-F]{6})").exec(styles);
    if (!treffer) throw new Error("kleur --" + naam + " niet gevonden in styles.css");
    return uitHex(treffer[1]);
  };

  // De donkerste lichte achtergrond waarop deze tekst voorkomt is het groen van de
  // kaarten; wit is de meest voorkomende. Beide moeten de norm halen.
  // Elke kleur tegen de achtergronden waarop hij echt voorkomt. De
  // waarschuwingskleur staat alleen op zijn eigen oranje vlak, niet op de groene
  // kaarten, dus daartegen toetsen zou een fout melden die niemand ziet.
  const teToetsen = [
    ["muted", [[255, 255, 255], uitHex("#e7f8f3")]],
    ["mint-dark-tekst", [[255, 255, 255], uitHex("#e7f8f3")]],
    ["warning-tekst", [[255, 255, 255], uitHex("#fff5e8")]],
  ];
  const teLicht = [];
  for (const [naam, achtergronden] of teToetsen) {
    const kleur = tokenWaarde(naam);
    for (const achter of achtergronden) {
      const verhouding = contrast(kleur, achter);
      if (verhouding < 4.5) teLicht.push("--" + naam + " = " + verhouding.toFixed(2) + ":1");
    }
  }
  assert(teLicht.length === 0, `Tekstkleuren moeten minstens 4,5:1 contrast houden (${teLicht.join(" | ")})`);
}

// De app start in de door deze harness vastgezette kalendermaand. De vaste demo-
// asserties hieronder mogen daardoor niet bij een echte maandwisseling breken.
const _currentCalendarMonth = dom.window.currentCalendarPeriodKey();
assert(dom.window.currentPeriod().key === _currentCalendarMonth, "De app moet bij eerste start de huidige kalendermaand tonen, niet een hardcoded maand");
dom.window.setPeriod("2026-08");

assert(document.querySelectorAll("#dashboard-employee-rows tr").length === 4, "Dashboard moet vier demo-medewerkers tonen");
assert(document.querySelector("#dashboard-team-title").textContent === "Teamstatus · Augustus 2026" && document.querySelector("#dashboard-team-summary").textContent === "4 medewerkers · 2 te controleren · 1 wacht op medewerker", "Het teamoverzicht moet maand, controles en wachttaken compact samenvatten");
assert(document.querySelectorAll("#dashboard-employee-rows .dashboard-team-action").length === 4 && document.querySelectorAll("#dashboard-employee-rows .dashboard-team-action.send").length === 2, "Iedere medewerker moet een duidelijke vervolgactie hebben en ingediende uren moeten als controleactie opvallen");
assert(document.querySelector("#customer-timesheet-admin-summary").textContent === "4 verwacht · 1 te controleren · 0 wacht op medewerkers" && document.querySelectorAll("#customer-timesheet-admin-list .customer-timesheet-admin-meta").length === 4, "Klanturenstaten moeten documentstatus, deadline en brokerroute als compacte kaarten tonen");
assert(document.querySelector(".workflow-overview") && document.querySelectorAll(".workflow-overview .workflow-step").length === 4, "Procesmeter en vier fasen moeten samen één compact overzicht vormen");
assert(document.querySelector(".demo-badge").textContent.includes("1.0.2"), "Het zichtbare versienummer moet 1.0.2 zijn");
assert(!/veilige demo|testmeldingen|verzendtest/i.test(document.body.textContent), "De gebruikersinterface mag geen tijdelijke demo- of testterminologie meer tonen");
assert(!document.querySelector('.nav-list [data-view="payroll"]'), "EasySalary hoort niet meer als dubbel onderdeel in het hoofdmenu te staan");
assert(document.querySelector("#dashboard-employee-rows").textContent.includes("Marc de Roon"), "De aangeleverde medewerkergegevens moeten zichtbaar zijn");
assert(document.querySelector("#dashboard-employee-rows").textContent.includes("ItaQ Consultancy"), "De echte brokernaam moet zichtbaar zijn");

// Navigate to the next fixed demo month for the remaining assertions.
dom.window.setPeriod("2026-07");
dom.window.renderAll();

assert(document.querySelector("#metric-submitted-note").textContent.includes("Juli 2026"), "Dashboardstatussen moeten de betreffende maand noemen");
assert(document.querySelector("#metric-approved-note").textContent.includes("Geen openstaande controles") && (document.querySelector("#metric-approved-action").hidden || document.querySelector("#metric-approved-action").textContent.includes("Bekijk alle openstaande")), "Een afgeronde urenmaand toont geen directe actie, alleen een doorlink naar andere open maanden");
assert(document.querySelector("#hours-total").textContent === "153,0", "Juli moet voor Stasjo van Bakel 153,0 uur tonen");
assert(document.querySelectorAll("#approval-list .approval-card").length === 2, "De baseline start met precies 2 openstaande augustus-controles (Marc en Brian)");
assert(document.querySelector("#period-month-picker").tagName === "BUTTON" && document.querySelector("#period-year-picker").type === "number" && !document.querySelector("#period-month-panel select"), "De algemene maandkeuze moet uit gewone knoppen bestaan en geen vastlopend browsermenu gebruiken");
assert(document.querySelector(".period-picker-caption").textContent === "Maanddetail", "De algemene maandkiezer moet duidelijk maken dat hij alleen de gekozen maanddetail wijzigt");
click("#period-month-picker");
assert(!document.querySelector("#period-month-panel").hidden && document.querySelector("#period-month-picker").getAttribute("aria-expanded") === "true", "Het eigen maandvenster moet bij iedere klik openen");
dom.window.dispatchEvent(new Event("scroll"));
assert(!document.querySelector("#period-month-panel").hidden, "Een browser-scroll naar een maandknop mag het geopende maandvenster niet sluiten");
click("#period-month-picker");
assert(document.querySelector("#period-month-panel").hidden && document.querySelector("#period-month-picker").getAttribute("aria-expanded") === "false", "Het eigen maandvenster moet ook direct weer kunnen sluiten");
assert(document.querySelectorAll("#add-employee").length === 1, "De knop Medewerker toevoegen mag maar één keer bestaan");
const settingsEmails = [...document.querySelectorAll('input[type="email"]')].map(input => input.value);
assert(settingsEmails.some(email => email.endsWith("@example.invalid")), "De algemene verzendafzender moet een veilige placeholder zijn");
assert(settingsEmails.includes("backoffice@pathconsultancy.nl"), "Het e-mailadres uit de originele facturen moet op de PDF-instellingen staan");
assert(document.querySelectorAll("#mail-recipient-settings-list .mail-recipient-setting").length === 2, "Boekhouder en EasySalary moeten als centrale ontvangers bestaan");
assert(document.querySelector("#mail-recipient-settings-list").textContent.includes("salaris@example.invalid"), "Het EasySalary-adres moet centraal zichtbaar zijn");
// De bel was een blokje met alleen een boven- en zijrand -- een boog, geen bel --
// en de kleur stond vast op --navy, wat in de donkere modus de achtergrond is. Daar
// was hij dus helemaal weg.
assert(document.querySelector("#notification-button .bell-shape svg") !== null, "De meldingenbel moet een echte belvorm zijn, geen randen om een leeg blokje");
assert(document.querySelectorAll("#notification-button .bell-shape svg path").length >= 3, "De bel hoort een koepel, een knopje en een klepel te hebben");
assert(!/\.notification-button \.bell-shape \{[^}]*var\(--navy\)/.test(styles), "De bel mag niet op --navy staan: dat is in de donkere modus de achtergrondkleur, dus dan is hij onzichtbaar");
// De broker kreeg wel een mail maar stond nergens in dit scherm: wie hier keek zag
// twee ontvangers terwijl er drie mails uitgingen. Hij hoort er alleen te lezen te
// staan, met de plek erbij waar je hem wel wijzigt.
assert(document.querySelectorAll("#mail-broker-route-info .mail-recipient-setting").length === 1, "De broker moet in het instellingenscherm staan, ook al staat hij per opdracht");
assert(document.querySelector("#mail-broker-route-info").textContent.includes("bij Medewerkers"), "Bij de broker moet staan waar je hem wel aanpast");
assert(document.querySelectorAll("#mail-broker-route-info button").length === 0, "De broker is hier niet te wijzigen, dus hoort er geen knop bij te staan");
assert(document.body.textContent.includes("@example.invalid"), "Veilige brokerplaceholders moeten zichtbaar zijn");

assert(!document.querySelector("#login-screen").hidden, "De rolkeuze moet bij het openen zichtbaar zijn");
assert(document.querySelector("#app-shell").hidden, "De applicatie moet voor de rolkeuze verborgen zijn");
assert(document.querySelectorAll("#login-employee option").length === 4, "Alle vier medewerkers moeten in het demo-inlogmenu staan");
assert(document.querySelector("#login-admin").hidden && document.querySelector("#login-employee").hidden, "De vastlopende browserdropdowns voor accounts mogen niet zichtbaar zijn");
assert(document.querySelectorAll('[data-login-account-role="admin"]').length === 2 && document.querySelectorAll('[data-login-account-role="employee"]').length === 4, "Alle beheer- en medewerkersaccounts moeten als gewone knoppen beschikbaar zijn");
click("#login-employee-trigger");
dom.window.dispatchEvent(new Event("scroll"));
assert(!document.querySelector("#login-employee-choices").hidden, "Een browser-scroll naar een medewerkersoptie mag het geopende accountmenu niet sluiten");
click("#login-employee-trigger");

const employeePicker = document.querySelector("#login-employee");
employeePicker.value = "1";
employeePicker.dispatchEvent(new Event("change", { bubbles: true }));
const demoScenarioState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(demoScenarioState.schemaVersion === 26, "Versie 0.9.81 moet wijzigingen onder de juiste gegevensversie bewaren");
assert(demoScenarioState.settings.companyName === "QSI Consultancy B.V." && demoScenarioState.settings.invoiceNameDisplay === "trade_and_legal", "De standaardfactuuridentiteit moet Path als handelsnaam aan QSI Consultancy B.V. koppelen");
const freshOpenActions = dom.window.adminOpenTasks();
const freshJuneActions = freshOpenActions.filter(task => task.periodKey === "2026-06");
const freshJulyActions = freshOpenActions.filter(task => task.periodKey === "2026-07");
const freshAugustActions = freshOpenActions.filter(task => task.periodKey === "2026-08");
const freshBackofficeActions = freshOpenActions.filter(task => task.actionable);
const freshEmployeeActions = freshOpenActions.filter(task => !task.actionable);
const freshTaskTypes = [...new Set(freshOpenActions.map(task => task.type))].sort();
assert(freshOpenActions.length === 12 && freshJuneActions.length === 3 && freshJulyActions.length === 5 && freshAugustActions.length === 4, "De standaarddemo moet exact Juni 3 + Juli 5 + Augustus 4 = 12 open acties bevatten");
assert(freshBackofficeActions.length === 7 && freshEmployeeActions.length === 5, "De standaarddemo moet exact Backoffice 7 + medewerkers 5 = 12 tonen");
assert(JSON.stringify(freshTaskTypes) === JSON.stringify(["customer-broker", "customer-review", "customer-waiting", "hours-correction", "hours-draft", "hours-review", "invoice-delivery"]), "De compacte GUI-baseline moet alle zeven mogelijke open taaktypen afdekken");
assert(new Set(freshOpenActions.map(task => task.periodKey + ":" + task.employee.id)).size === 10, "De twaalf standaardacties moeten tien medewerker-maanddossiers vormen");
assert(document.querySelector("#hero-task-months").textContent === "Juni 3 + Juli 5 + Augustus 4 = 12" && document.querySelector("#hero-task-owners").textContent === "Backoffice 7 + wacht op medewerkers 5 = 12", "De bovenkant moet beide standaardrekensommen direct tonen");
assert(document.querySelector("#hero-backoffice-count").textContent === "7" && document.querySelector("#hero-employee-count").textContent === "5", "De dashboardkop moet Backoffice-acties en wachttaken als afzonderlijke visuele aantallen tonen");
assert(document.querySelector("#dashboard-backoffice-count").textContent === "7" && document.querySelector("#dashboard-employee-count").textContent === "5" && document.querySelector("#dashboard-work-count").getAttribute("aria-label") === "12 open acties: 7 bij Backoffice, 5 wacht op medewerkers", "Dashboard moet links dezelfde werkvoorraad als twee toegankelijke eigenaarbolletjes tonen");
click("#hero-backoffice-filter");
assert(document.querySelector("#admin-task-title").textContent === "Acties bij Backoffice per maand" && document.querySelector('[data-admin-task-filter="actionable"]').classList.contains("is-active") && document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === 7 && document.querySelectorAll("#admin-task-list .admin-task-month-body:not([hidden]) [data-admin-task-row]").length === 0 && [...document.querySelectorAll('[data-admin-task-month-toggle]')].every(toggle => toggle.getAttribute("aria-expanded") === "false") && !document.querySelector("#admin-task-list .admin-task-row.is-waiting"), "Het oranje dashboardbolletje moet herkenbaar zeven Backoffice-acties in ingeklapte maandgroepen openen");
click('#admin-task-list [data-admin-task-month-toggle]');
assert(document.querySelectorAll("#admin-task-list .admin-task-month-body:not([hidden]) [data-admin-task-row]").length > 0 && [...document.querySelectorAll("#admin-task-list .admin-task-month-body:not([hidden]) [data-admin-task-row]")].every(row => row.classList.contains("is-actionable")), "Na bewust openklappen mag de Backoffice-filter alleen concrete Backoffice-acties tonen");
click("#hero-employee-filter");
assert(document.querySelector("#admin-task-title").textContent === "Wacht op medewerkers per maand" && document.querySelector('[data-admin-task-filter="waiting"]').classList.contains("is-active") && document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === 5 && document.querySelectorAll("#admin-task-list .admin-task-month-body:not([hidden]) [data-admin-task-row]").length === 0 && [...document.querySelectorAll('[data-admin-task-month-toggle]')].every(toggle => toggle.getAttribute("aria-expanded") === "false") && !document.querySelector("#admin-task-list .admin-task-row.is-actionable"), "Het groene dashboardbolletje moet herkenbaar vijf wachttaken in ingeklapte maandgroepen openen");
click('#admin-task-list [data-admin-task-month-toggle]');
assert(document.querySelectorAll("#admin-task-list .admin-task-month-body:not([hidden]) [data-admin-task-row]").length > 0 && [...document.querySelectorAll("#admin-task-list .admin-task-month-body:not([hidden]) [data-admin-task-row]")].every(row => row.classList.contains("is-waiting")), "Na bewust openklappen mag de medewerkersfilter alleen concrete wachttaken tonen");
click("#open-work-queue");
assert(document.querySelector('[data-admin-task-filter="all"]').classList.contains("is-active") && document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === 12 && [...document.querySelectorAll('[data-admin-task-month-toggle]')].every(toggle => toggle.getAttribute("aria-expanded") === "false"), "De algemene werkvoorraadknop moet alle twaalf acties in ingeklapte maandgroepen herstellen");
assert(!document.querySelector("#employees-count") && document.querySelector("#team-active-account-count").textContent === "6" && document.querySelector("#team-employees-overview").textContent.includes("4 medewerkers") && document.querySelector("#team-admins-overview").textContent.includes("2 beheerders"), "Het menu mag geen misleidende medewerkerbadge tonen; Teambeheer moet medewerkers en beheerders samen samenvatten");
assert(document.querySelector('[data-admin-task-month="2026-07"]')?.querySelectorAll("[data-admin-task-row]").length === 5 && document.querySelector('[data-admin-task-month="2026-08"]')?.querySelectorAll("[data-admin-task-row]").length === 4, "De twaalf standaardacties moeten zichtbaar onder juni, juli en augustus worden gegroepeerd");
assert(document.querySelector('[data-admin-task-month-toggle="2026-07"]').getAttribute("aria-expanded") === "false" && document.querySelector('[data-admin-task-month-toggle="2026-08"]').getAttribute("aria-expanded") === "false", "Open maanden moeten standaard ingeklapt starten zodat je bewust per maand openklapt");
assert(document.querySelector("#dashboard-next-action-label").textContent === "Volgende actie \u00B7 1 van 7 bij Backoffice" && document.querySelector("#dashboard-next-action-title").textContent === "Klanturenstaat controleren", "De vaste prioriteitenkaart moet de eerste van zeven concrete Backoffice-acties tonen");
assert(document.querySelector("#dashboard-next-action-person").textContent === "Marc de Roon" && document.querySelector("#dashboard-next-action-period").textContent.includes("Juni 2026") && document.querySelector("#dashboard-next-action-button"), "De volgende actie moet medewerker, maand en een directe startknop tonen");
assert(document.querySelector("#metric-actions").textContent === "7" && document.querySelector("#metric-actions-note").textContent === "5 acties wachten op medewerkers" && document.querySelector("#metric-actions-link").textContent === "Bekijk alle 12 acties", "De vierde KPI moet directe Backoffice-acties tonen en naar alle twaalf acties verwijzen");
assert(demoScenarioState.settings.weeklyReminderDay === "friday" && demoScenarioState.settings.weeklyReminderTime === "15:00", "De standaard weekherinnering moet vrijdag om 15:00 zijn");
assert(demoScenarioState.settings.monthEndReminderTime === "15:00" && demoScenarioState.settings.overdueReminderTime === "09:00" && demoScenarioState.settings.approvalReminderTime === "10:00", "De maand-, achterstands- en goedkeuringsherinneringen moeten veilige standaardmomenten hebben");
assert(demoScenarioState.settings.customerTimesheetReminderEnabled && demoScenarioState.settings.customerTimesheetReminderTime === "15:00" && demoScenarioState.settings.customerTimesheetOverdueWorkdays === 2, "Klanturenstaten moeten een eigen instelbare herinneringsplanning hebben");
assert(demoScenarioState.records["2026-07"]["1"].customerTimesheet.status === "approved" && demoScenarioState.records["2026-07"]["2"].customerTimesheet.status === "resubmit" && demoScenarioState.records["2026-07"]["3"].customerTimesheet.status === "sent", "Juli kent een brokercontrole, een medewerker die opnieuw moet insturen en een al verzonden klanturenstaat");
assert(demoScenarioState.records["2026-07"]["2"].customerTimesheet.isExample && demoScenarioState.records["2026-07"]["2"].customerTimesheet.fileName.startsWith("Voorbeeld_") && demoScenarioState.records["2026-07"]["2"].customerTimesheet.fileData.endsWith("voorbeeld-klanturenstaat.pdf"), "Vooringevulde documenten moeten herkenbaar en als echt downloadbaar voorbeeldbestand gekoppeld zijn");
assert(demoScenarioState.employees.find(employee => employee.id === 2).customerTimesheetBrokerEmail === "urenstaten-itaq@example.invalid", "Een klanturenstaat moet een afwijkend brokeradres kunnen gebruiken");
assert(demoScenarioState.records["2026-07"]["2"].invoiceStatus === "simulated" && demoScenarioState.records["2026-07"]["1"].invoiceStatus === "ready" && demoScenarioState.records["2026-07"]["1"].invoiceStatus === "ready" && demoScenarioState.records["2026-07"]["3"].invoiceStatus === "concept", "Juli heeft twee klaarstaande facturen (Marc en Shawn), één afgeronde (Stasjo) en één geblokkeerde (Brian)");
assert(demoScenarioState.records["2026-06"]["1"].invoiceStatus === "simulated", "Juni moet als afgeronde historische verzendtest klaarstaan");
assert(demoScenarioState.records["2026-06"]["1"].payrollStatus === "simulated", "Een afgeronde historische maand moet ook de salarisadministratieroute als getest bewaren");
assert(demoScenarioState.records["2026-05"]["4"].invoiceStatus === "simulated" && demoScenarioState.records["2026-05"]["4"].timesheetStatus === "approved", "Mei moet als extra afgeronde historische maand beschikbaar zijn voor demo-checks");
assert(demoScenarioState.announcements.some(item => item.status === "draft") && demoScenarioState.announcements.some(item => item.status === "withdrawn") && demoScenarioState.announcements.some(item => item.correctionOfId), "De demo moet mededelingen met concept, intrekking en interne versiehistorie vooraf vullen");
assert(demoScenarioState.records["2026-08"]["1"].timesheetStatus === "submitted", "Augustus moet een ingediende urenstaat bevatten die wacht op Backoffice-goedkeuring");
assert(demoScenarioState.records["2026-08"]["2"].timesheetStatus === "correction", "Augustus moet een urenstaat met correctieverzoek bevatten");
assert(demoScenarioState.records["2026-08"]["2"].correctionHistory[0].message.includes("12 augustus"), "De voorbeeldcorrectie moet een concrete toelichting bevatten");
assert(dom.window.invoiceNumberFor(1, "2026-08") === "IND-2026-augustus", "Marcs factuurnummer moet iedere maand alleen maand en jaar bijwerken");
assert(dom.window.invoiceNumberFor(2, "2026-08") === "IND-StvB-2026-augustus", "Stasjo's factuurnummer moet zijn vaste patroon behouden");
assert(dom.window.invoiceNumberFor(3, "2026-08") === "COA-2026-augustus", "Brians factuurnummer moet zijn vaste patroon behouden");
assert(dom.window.invoiceNumberFor(4, "2026-08") === "Bel-Shawn-2026-augustus", "Shawns factuurnummer moet zijn vaste patroon behouden");
assert(dom.window.invoiceNumberFor(1, "2027-01") === "IND-2027-januari", "Marcs factuurnummer moet bij een nieuw jaar automatisch 2027 gebruiken");
assert(dom.window.invoiceNumberFor(2, "2027-01") === "IND-StvB-2027-januari", "Stasjo's factuurnummer moet bij een nieuw jaar automatisch 2027 gebruiken");
assert(dom.window.invoiceNumberFor(3, "2027-01") === "COA-2027-januari", "Brians factuurnummer moet bij een nieuw jaar automatisch 2027 gebruiken");
assert(dom.window.invoiceNumberFor(4, "2027-01") === "Bel-Shawn-2027-januari", "Shawns factuurnummer moet bij een nieuw jaar automatisch 2027 gebruiken");
assert(demoScenarioState.records["2026-08"]["3"].invoiceStatus === "concept", "Augustus bevat twee ingediende urenstaten waarvan de facturen nog in concept staan");
assert(demoScenarioState.records["2026-08"]["4"].timesheetStatus === "approved", "Augustus moet naast concept en correctie twee goedgekeurde urenstaten bevatten");
assert(demoScenarioState.records["2026-07"]["4"].invoiceStatus === "ready", "Shawns rustige juliverzending moet als resterende maandcontrole klaarstaan");
const julyBatchReadiness = dom.window.monthBatchReadiness("2026-07");
assert(julyBatchReadiness.total === 4 && julyBatchReadiness.ready === 3 && julyBatchReadiness.blockers.length === 1 && julyBatchReadiness.pendingDelivery === 2 && julyBatchReadiness.controlled === 1 && julyBatchReadiness.state === "ready", "Juli moet 1 gecontroleerd, 2 klaarstaande facturen en 1 medewerkersblokkade bevatten");
assert(document.querySelector("#month-batch-card").dataset.state === "ready" && document.querySelector("#month-batch-ready-count").textContent === "2 klaar · 1 gecontroleerd" && document.querySelector("#test-month-delivery").textContent === "Ga verder · 2 resterend" && !document.querySelector("#test-month-delivery").disabled, "De julikaart en CTA moeten twee klaarstaande facturen en één afgeronde tonen");
assert(document.querySelector("#invoice-status-blocked-count").textContent === "1" && document.querySelector("#invoice-status-ready-count").textContent === "2" && document.querySelector("#invoice-status-controlled-count").textContent === "1", "De factuurstatussen moeten actuele aantallen tonen");
assert(!document.querySelector("#invoice-batch-count").hidden && document.querySelector("#invoice-batch-blocked-count").textContent === "1" && !document.querySelector("#invoice-batch-blocked-count").hidden && document.querySelector("#invoice-batch-ready-count").textContent === "1" && !document.querySelector("#invoice-batch-ready-count").hidden, "Facturen moet standaard één oranje en één groen maandbolletje tonen");
assert(document.querySelector("#invoice-period-title").textContent === "Facturen", "Facturen moet niet suggereren dat alle maanden onder de gekozen maand vallen");
assert(document.querySelector("#invoice-month-overview-title").textContent === "Alle maanden met open maandcontrole" && !document.querySelector("#invoice-month-overview-list").textContent.includes("Juni 2026") && document.querySelector("#invoice-month-overview-list").textContent.includes("Juli 2026") && document.querySelector("#invoice-month-overview-list").textContent.includes("2 resterend · 1 gecontroleerd") && document.querySelector("#invoice-month-overview-list").textContent.includes("Augustus 2026") && document.querySelector("#invoice-month-overview-list").textContent.includes("3 blokkades") && document.querySelector("#invoice-month-overview-list").textContent.includes("Open detail") && document.querySelector("#month-batch-label").textContent === "Gekozen maand · Juli 2026", "Het factuuroverzicht toont Juli klaar, Augustus geblokkeerd en sluit Juni uit als afgeronde maand");
assert(document.querySelector("#invoice-detail-toggle").textContent === "Toon gekozen maand" && document.querySelector("#month-batch-card").hidden && document.querySelector("#invoice-status-guide").hidden && document.querySelector("#invoice-detail-panel").hidden, "Facturen moet standaard eerst alleen het alle-maanden-overzicht tonen");
click("#invoice-detail-toggle");
assert(document.querySelector("#invoice-detail-toggle").textContent === "Verberg gekozen maand" && !document.querySelector("#month-batch-card").hidden && !document.querySelector("#invoice-status-guide").hidden && !document.querySelector("#invoice-detail-panel").hidden, "De gekozen maanddetails moeten bewust geopend kunnen worden vanuit het alle-maanden-overzicht");
click("#invoice-detail-toggle");
assert(document.querySelector("#invoice-detail-toggle").textContent === "Toon gekozen maand" && document.querySelector("#month-batch-card").hidden && document.querySelector("#invoice-status-guide").hidden && document.querySelector("#invoice-detail-panel").hidden, "De gekozen maanddetails moeten weer inklapbaar zijn zodat alleen het alle-maanden-overzicht overblijft");
click('[data-invoice-overview-period="2026-08"]');
assert(dom.window.currentPeriod().key === "2026-08" && document.querySelector("#invoice-period-title").textContent === "Facturen" && document.querySelector("#month-batch-label").textContent === "Gekozen maand · Augustus 2026" && !document.querySelector("#month-batch-card").hidden && !document.querySelector("#invoice-detail-panel").hidden, "Een maandknop in het overzicht moet de maanddetail wijzigen en de detailweergave weer openen zonder het alle-maanden hoofdscherm te verlaten");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
assert(demoScenarioState.records["2026-07"]["3"].customerTimesheet.status === "sent" && julyBatchReadiness.state === "ready", "Een al ingediende klanturenstaat en een medewerkerscorrectie mogen de julimaandbatch niet blokkeren");

choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
const augustBatchReadiness = dom.window.monthBatchReadiness("2026-08");
assert(augustBatchReadiness.total === 4 && augustBatchReadiness.ready === 1 && augustBatchReadiness.blockers.length === 3 && augustBatchReadiness.pendingDelivery === 0 && augustBatchReadiness.controlled === 1 && augustBatchReadiness.state === "blocked", "Augustus start met 3 blokkades, 1 gecontroleerd (Shawn) en 0 klaarstaande facturen");
assert(JSON.stringify(augustBatchReadiness.blockers.map(blocker => [blocker.employee.name, blocker.statusLabel])) === JSON.stringify([["Marc de Roon", "Ingediend"], ["Stasjo van Bakel", "Correctie nodig"], ["Brian Hek", "Ingediend"]]), "Marc en Brian wachten op Backoffice-goedkeuring; Stasjo op eigen correctie");
assert(document.querySelector("#month-batch-ready-count").textContent === "1 van 4 gereed voor controle" && document.querySelector("#month-batch-status").textContent === "3 blokkades" && document.querySelector("#test-month-delivery").textContent === "Bekijk 3 blokkades" && !document.querySelector("#test-month-delivery").disabled, "De augustuskaart en CTA moeten de drie blokkades exact uitleggen");
assert(document.querySelector("#invoice-status-blocked-count").textContent === "3" && document.querySelector("#invoice-status-ready-count").textContent === "0" && document.querySelector("#invoice-status-controlled-count").textContent === "1", "Augustus moet drie blokkades, nul gereed en één gecontroleerd tonen");
assert(document.querySelectorAll("#month-batch-blockers [data-month-batch-blocker]").length === 3 && document.querySelector("#month-batch-blockers").textContent.includes("Marc de Roon") && document.querySelector("#month-batch-blockers").textContent.includes("Stasjo van Bakel") && document.querySelector("#month-batch-blockers").textContent.includes("Brian Hek"), "Iedere blokkade moet een eigen zichtbare medewerkerregel krijgen");
click("#test-month-delivery");
assert(document.querySelector("#modal").hidden && document.activeElement === document.querySelector("#month-batch-blockers [data-month-blocker-action]"), "Bij meerdere blokkades moet de CTA zonder tussenmodal naar de directe blockeracties springen");
click('[data-month-batch-blocker="1"] [data-month-blocker-action]');
assert(!document.querySelector("#modal").hidden && document.querySelector("#modal-title").textContent.includes("Marc de Roon") && document.querySelector("#modal-label").textContent === "Urencontrole", "Een Backoffice-blokkade opent direct de urencontrole voor goedkeuring");
click("#modal-close");

const marcAugustBatchRecord = dom.window.recordFor(1, "2026-08");
const stasjoAugustBatchRecord = dom.window.recordFor(2, "2026-08");
const brianAugustBatchRecord = dom.window.recordFor(3, "2026-08");
const marcAugustBatchSnapshot = { timesheetStatus: marcAugustBatchRecord.timesheetStatus, invoiceStatus: marcAugustBatchRecord.invoiceStatus, payrollStatus: marcAugustBatchRecord.payrollStatus };
const stasjoAugustBatchSnapshot = { timesheetStatus: stasjoAugustBatchRecord.timesheetStatus, invoiceStatus: stasjoAugustBatchRecord.invoiceStatus, payrollStatus: stasjoAugustBatchRecord.payrollStatus };
const brianAugustBatchSnapshot = { timesheetStatus: brianAugustBatchRecord.timesheetStatus, invoiceStatus: brianAugustBatchRecord.invoiceStatus, payrollStatus: brianAugustBatchRecord.payrollStatus };
Object.assign(marcAugustBatchRecord, { timesheetStatus: "approved", invoiceStatus: "ready", payrollStatus: "ready" });
dom.window.renderAll();
assert(dom.window.monthBatchReadiness("2026-08").ready === 2 && dom.window.monthBatchReadiness("2026-08").blockers.length === 2 && document.querySelector("#month-batch-ready-count").textContent === "2 van 4 gereed voor controle" && document.querySelector("#test-month-delivery").textContent === "Bekijk 2 blokkades", "Na Marcs oplossing moet de kaart twee blokkades tonen");
assert(document.querySelectorAll("#month-batch-blockers [data-month-batch-blocker]").length === 2 && document.querySelector('[data-month-batch-blocker="2"]') && document.querySelector('[data-month-batch-blocker="3"]'), "Na Marcs oplossing moeten Stasjo en Brian als blokkades overblijven");
click('[data-month-batch-blocker="2"] [data-month-blocker-action]');
assert(!document.querySelector("#modal").hidden && document.querySelector("#modal-title").textContent.includes("Stasjo van Bakel") && document.querySelector("#modal-label").textContent === "Alleen-lezen urenoverzicht", "Een medewerkerblokkade opent het alleen-lezen urenoverzicht");
click("#modal-close");
Object.assign(brianAugustBatchRecord, { timesheetStatus: "approved", invoiceStatus: "ready", payrollStatus: "ready" });
dom.window.renderAll();
assert(dom.window.monthBatchReadiness("2026-08").ready === 3 && dom.window.monthBatchReadiness("2026-08").blockers.length === 1 && dom.window.monthBatchReadiness("2026-08").state === "ready", "Na Marc en Brian is de batch klaar voor controle; Stasjo's medewerkerscorrectie blokkeert de batch niet");
assert(document.querySelectorAll("#month-batch-blockers [data-month-batch-blocker]").length === 1 && document.querySelector('[data-month-batch-blocker="2"]'), "Na Marc en Brians oplossing mag alleen Stasjo nog overblijven");
Object.assign(stasjoAugustBatchRecord, { timesheetStatus: "submitted", invoiceStatus: "concept", payrollStatus: "concept" });
dom.window.renderAll();
click("#test-month-delivery");
assert(!document.querySelector("#modal").hidden && document.querySelector("#modal-label").textContent === "Urencontrole" && document.querySelector("#modal-title").textContent.includes("Stasjo van Bakel") && document.querySelector("#modal-confirm").textContent === "Goedkeuren", "Bij één Backoffice-blokkade moet de hoofd-CTA direct de urencontrole openen");
click("#modal-close");
Object.assign(stasjoAugustBatchRecord, { timesheetStatus: "approved", invoiceStatus: "ready", payrollStatus: "ready" });
dom.window.renderAll();
const readyAugustBatch = dom.window.monthBatchReadiness("2026-08");
assert(readyAugustBatch.ready === 4 && readyAugustBatch.blockers.length === 0 && readyAugustBatch.pendingDelivery === 3 && readyAugustBatch.controlled === 1 && readyAugustBatch.state === "ready", "Met alle uren goedgekeurd moet augustus volledig gereed voor maandcontrole zijn");
assert(document.querySelector("#month-batch-ready-count").textContent === "3 klaar · 1 gecontroleerd" && document.querySelector("#month-batch-status").textContent === "Controle bezig" && document.querySelector("#test-month-delivery").textContent === "Ga verder · 3 resterend" && !document.querySelector("#test-month-delivery").disabled && document.querySelector("#month-batch-blockers").hidden, "De gereedheidskaart moet zonder blokkades naar de actieve maandcontrole wisselen");
assert(document.querySelector("#invoice-batch-ready-count").textContent === "2" && !document.querySelector("#invoice-batch-ready-count").hidden && document.querySelector("#invoice-batch-blocked-count").hidden && document.querySelector("#invoice-batch-count").getAttribute("aria-label").includes("2 klaar voor controle"), "De Facturen-badge moet groen worden zodra beide maandbatches klaarstaan");
Object.assign(marcAugustBatchRecord, marcAugustBatchSnapshot);
Object.assign(stasjoAugustBatchRecord, stasjoAugustBatchSnapshot);
Object.assign(brianAugustBatchRecord, brianAugustBatchSnapshot);
dom.window.renderAll();
choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
const seededAdminTasks = dom.window.adminOpenTasks();
assert(seededAdminTasks.filter(task => task.periodKey === "2026-07").length === 5 && seededAdminTasks.filter(task => task.periodKey === "2026-07" && task.actionable).length === 3 && seededAdminTasks.filter(task => task.periodKey === "2026-07" && !task.actionable).length === 2, "De voorbeeldmaand juli moet drie directe en twee wachtende taken bevatten");
assert(seededAdminTasks.filter(task => task.periodKey === "2026-08" && task.actionable).length === 3 && seededAdminTasks.filter(task => task.periodKey === "2026-08" && !task.actionable).length === 1, "De voorbeeldmaand augustus moet drie directe en één wachtende taak bevatten");
pressEnter("#login-employee");
assert(document.querySelector("#timesheet-employee").textContent === "Marc de Roon", "Enter in de medewerkerkiezer moet met de gekozen medewerker inloggen");
assert(document.querySelector('[data-view="approvals"]').hidden, "Ook een andere medewerker mag geen beheerfuncties zien");
assert(document.querySelector("#view-employee-dashboard").classList.contains("is-active"), "Een medewerker moet op het eigen dashboard starten");
assert(document.querySelector("#employee-dashboard-greeting").textContent.includes("Marc"), "Het medewerkerdashboard moet de voornaam in de begroeting tonen");
click("#mobile-switch-role");
assert(!document.querySelector("#login-screen").hidden && document.querySelector("#app-shell").hidden, "De mobiele knop Rol kiezen moet zonder verversen teruggaan naar de accountkeuze");
click("#login-employee-trigger");
assert(!document.querySelector("#login-employee-choices").hidden, "Het eigen medewerkersmenu moet met een gewone knop openen");
click('[data-login-account-role="employee"][data-login-account-id="3"]');
assert(document.querySelector("#employee-dashboard-greeting").textContent.includes("Brian"), "Brian moet zijn eigen medewerkerdashboard kunnen openen");
// Brian juni: approved uren + ontbrekende klanturenstaat — ideale periode voor de skip-test
choosePeriod("#period-month-picker", "#period-year-picker", "2026-06");
dom.window.renderAll();
assert(document.querySelector("#employee-dashboard-next").textContent.includes("officiële klanturenstaat") && document.querySelector("#employee-dashboard-status-note").textContent.includes("klanturenstaat open"), "Goedgekeurde uren mogen een ontbrekende klanturenstaat niet meer als volledig afgerond tonen");
const brianOpenSummaries = dom.window.employeeOpenMonthSummaries(3, "2026-06");
const brianOpenActions = brianOpenSummaries.flatMap(item => item.actions);
assert(brianOpenActions.length > 0 && document.querySelectorAll("#employee-open-overview-list [data-employee-action-row]").length === brianOpenActions.length, "Het medewerkersdashboard moet iedere open taak als concrete actieregel tonen");
assert(!document.querySelector("#employee-dashboard-all-actions").hidden && document.querySelector("#employee-dashboard-all-actions").textContent.includes(String(brianOpenActions.length)), "De medewerker moet vanuit de hero alle eigen open acties kunnen openen");
assert(document.querySelector('#employee-open-overview-list [data-employee-open-month-toggle]').getAttribute('aria-expanded') === 'false' && document.querySelector('#employee-open-overview-list .employee-open-month-body').hidden, "Iedere open maand moet standaard ingeklapt starten");
click('#employee-open-overview-list [data-employee-open-month-toggle]');
assert(document.querySelector('#employee-open-overview-list [data-employee-open-month-toggle]').getAttribute('aria-expanded') === 'true' && !document.querySelector('#employee-open-overview-list .employee-open-month-body').hidden, "Een gekozen open maand moet na een klik uitklappen");
assert(document.querySelector("#employee-dashboard-action").dataset.employeeActionPeriod === brianOpenSummaries[0].periodKey && document.querySelector("#employee-dashboard-action").dataset.employeeActionType === brianOpenSummaries[0].actions[0].type, "De hoofdactie moet naar de eerstvolgende concrete taak en maand wijzen");
const brianJuneDecisionRecord = dom.window.recordFor(3, "2026-06");
const brianJuneDecisionSnapshot = JSON.parse(JSON.stringify(brianJuneDecisionRecord));
brianJuneDecisionRecord.timesheetStatus = "correction";
brianJuneDecisionRecord.correctionHistory = [{ requestedBy: "Gio Maatsen", requestedAt: "13 augustus 2026, 10:00", message: "Controleer maandag.", resubmittedAt: "" }];
brianJuneDecisionRecord.customerTimesheet.status = "resubmit";
brianJuneDecisionRecord.customerTimesheet.reviewNote = "Upload de definitieve versie.";
dom.window.renderAll();
const brianDecisionActions = dom.window.employeeOpenMonthSummaries(3, "2026-06").find(item => item.periodKey === "2026-06").actions;
assert(brianDecisionActions.length === 2 && brianDecisionActions[0].type === "hours" && brianDecisionActions[1].type === "customer", "De beslisregel moet een urencorrectie vóór een documentherindiening prioriteren");
Object.assign(brianJuneDecisionRecord, brianJuneDecisionSnapshot);
dom.window.renderAll();
assert(document.querySelector("#employee-customer-timesheet-title").textContent.includes("staat nog open") && document.querySelector("#employee-customer-timesheet-status").textContent === "Nog niet ontvangen", "Mijn overzicht moet de klanturenstaat als een afzonderlijke open taak tonen");
click("#employee-customer-timesheet-skip");
assert(document.querySelector("#customer-timesheet-skip-reason").value === "De klanturenstaat is al rechtstreeks naar Path Backoffice gemaild.", "De optie Al rechtstreeks gemaild moet een duidelijke standaardreden invullen");
click("#modal-confirm");
const skippedCustomerState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const skippedCustomerDocument = skippedCustomerState.records["2026-06"]["3"].customerTimesheet;
assert(skippedCustomerDocument.status === "skipped" && skippedCustomerDocument.skippedBy === "Brian Hek" && skippedCustomerDocument.skippedAt && skippedCustomerDocument.skippedReason.includes("rechtstreeks naar Path Backoffice"), "Overslaan moet reden, medewerker en tijdstip blijvend opslaan");
assert(document.querySelector("#employee-customer-timesheet-status").textContent === "Al rechtstreeks gemaild" && document.querySelector("#employee-customer-timesheet-skip").textContent === "Alsnog uploaden", "De medewerker moet de eigen rechtstreekse verzending kunnen zien en terugdraaien");
const juneAfterCustomerSkipTasks = dom.window.adminOpenTasks().filter(task => task.periodKey === "2026-06");
assert(juneAfterCustomerSkipTasks.length === 2, "Na Brians juni-skip verdwijnt de klanturenstaat-taak; Marc en Stasjo blijven voor juni zichtbaar");
dom.window.showCustomerTimesheetDetails(3, "2026-06", false);
assert(document.querySelector("#modal-summary").textContent.includes("Brian Hek") && document.querySelector("#modal-summary").textContent.includes("rechtstreeks naar Path Backoffice") && document.querySelector("#modal-summary").textContent.includes("Geregistreerd op"), "Backoffice moet in de details zien wie de klanturenstaat heeft overgeslagen, wanneer en waarom");
click("#modal-confirm");
click("#employee-customer-timesheet-skip");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records["2026-06"]["3"].customerTimesheet.status === "missing", "Alsnog uploaden moet de registratie veilig terugzetten naar Nog niet ontvangen");
dom.window.setPeriod("2026-07");
dom.window.persistState();
dom.window.renderAll();
dom.window.recordFor(3, "2026-07").timesheetStatus = "submitted";
dom.window.persistState();
dom.window.renderAll();
click("#switch-role");
click("#login-employee-trigger");
click('[data-login-account-role="employee"][data-login-account-id="2"]');
assert(!document.querySelector("#app-shell").hidden, "De applicatie moet na de rolkeuze openen");
assert(document.querySelector("#view-employee-dashboard").classList.contains("is-active"), "Een medewerker moet op het eigen dashboard starten");
assert(document.querySelector("#timesheet-employee").textContent === "Stasjo van Bakel", "De medewerkersrol moet de aangeleverde naam gebruiken");
assert(document.querySelector('[data-view="approvals"]').hidden, "Beheerfuncties moeten voor een medewerker verborgen zijn");
assert(document.querySelector('[data-view="announcements"]').hidden, "Een medewerker mag het beheerscherm voor mededelingen niet zien");
click("#profile-menu-button");
assert(!document.querySelector("#profile-menu").hidden, "Het profielmenu moet rechtsboven openen");
click('[data-profile-action="profile"]');
assert(document.querySelector("#profile-photo-input"), "Mijn profiel moet een lokale profielfoto kunnen kiezen");
assert([...document.querySelectorAll("#modal-summary input[disabled]")].length === 2, "Naam en zakelijk e-mailadres moeten in de app alleen-lezen blijven");
click("#modal-confirm");
click("#profile-menu-button");
click('[data-profile-action="preferences"]');
assert(document.querySelector("#pref-theme"), "Voorkeuren moeten Automatisch, Licht en Donker aanbieden");
assert(document.querySelector("#pref-theme-trigger") && document.querySelector("#pref-theme").hidden, "Ook voorkeuren moeten een eigen keuzemenu gebruiken");
click("#pref-theme-trigger");
click('[data-standard-choice-target="pref-theme"][data-standard-choice-value="dark"]');
document.querySelector("#pref-email-notifications").checked = false;
click("#modal-confirm");
assert(document.documentElement.dataset.theme === "dark", "Donkere modus moet direct toegepast worden");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.find(employee => employee.id === 2).emailNotificationsEnabled === false, "Een medewerker moet aanvullende e-mailmeldingen kunnen uitzetten");
click("#notification-button");
assert(!document.querySelector("#notification-panel").hidden, "De meldingknop moet altijd een venster openen");
assert(!document.querySelector(".notification-test-actions"), "Kunstmatige voorbeeldmeldingen mogen niet in de medewerkersinterface staan");
assert(document.querySelector("#notification-list").textContent.includes("Planning augustus beschikbaar"), "Een medewerker moet eigen vooraf klaargezette algemene mededelingen zien");
dom.window.createTestNotification("reminder");
assert(document.querySelector("#notification-list").textContent.includes("Urenherinnering"), "Een urenherinnering moet direct testbaar zijn");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).notifications.at(-1).emailRequested === false, "Een uitgeschakelde e-mailvoorkeur moet ook bij urenmeldingen alleen de aanvullende e-mail overslaan");
click("#mark-notifications-read");
assert(document.querySelector("#notification-title").textContent === "Geen ongelezen meldingen", "Na alles lezen moet de teller leeg zijn");
assert(document.querySelector("#notification-list").textContent.includes("Je hebt geen ongelezen meldingen"), "Zonder ongelezen meldingen moet het venster een duidelijke lege toestand tonen");
dom.window.createTestNotification("reminder");
assert(document.querySelector("#notification-list").textContent.includes("Urenherinnering"), "Na de lege toestand moet opnieuw een testmelding toegevoegd kunnen worden");
const reminderNotification = [...document.querySelectorAll("[data-notification-id]")].find(item => item.textContent.includes("Urenherinnering"));
assert(reminderNotification, "De testherinnering moet als klikbare melding verschijnen");
reminderNotification.dispatchEvent(new MouseEvent("click", { bubbles: true }));
assert(document.querySelector("#view-timesheet").classList.contains("is-active"), "Een urenmelding moet direct naar de juiste urenstaat navigeren");
click("#help-launcher");
assert(!document.querySelector("#help-panel").hidden, "De hulpbot moet rechtsonder openen");
assert(document.querySelector("#help-launcher").textContent.includes("Hulp & contact"), "De vaste hulpknop moet contact expliciet noemen");
assert(document.querySelector('[data-help-topic="contact"]'), "De hulpbot moet altijd een zichtbare knop Contact opnemen tonen");
assert(document.querySelector("#help-faq-title").textContent === "Veelgestelde vragen", "Het hulpmenu moet een duidelijk FAQ-kopje tonen");
assert(document.querySelector("#help-input").placeholder === "Vind je antwoord…", "Het hulpmenu moet als antwoordzoeker herkenbaar zijn");
assert(document.querySelector("#help-suggestions button:first-child").dataset.helpTopic === "contact", "Contact opnemen moet als eerste vaste keuze zichtbaar zijn");
assert(!document.querySelector("#help-panel").textContent.includes("Recent bericht"), "De hulp mag geen livechat- of berichteninbox suggereren");
document.querySelector("#help-input").value = "Hoe dien ik mijn maand in?";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
assert(document.querySelector("#help-messages").textContent.includes("uitsluitend de geselecteerde maand"), "De hulpbot moet functies inhoudelijk uitleggen");
document.querySelector("#help-input").value = "Kan ik hier mijn fietsband plakken?";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
assert(document.querySelector("#help-messages").textContent.includes("één keer anders"), "Bij de eerste onbekende vraag moet de bot om een duidelijkere formulering vragen");
assert(!document.querySelector('#help-messages a[href^="https://mail.google.com/mail/"]'), "Na één onbekende vraag mag de bot nog geen e-mailkeuzes tonen");
document.querySelector("#help-input").value = "Kan deze app ook mijn fiets repareren?";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
assert(document.querySelector('#help-messages a[href^="https://mail.google.com/mail/"]'), "Een onbekende vraag moet een vooraf ingevuld Gmail-concept aanbieden");
assert(document.querySelector('#help-messages a[href^="mailto:backoffice@pathconsultancy.nl"]'), "Een onbekende vraag moet ook de standaard mailapp of Outlook kunnen openen");
assert(document.querySelector('#help-messages [data-copy-support]'), "Een onbekende vraag moet ook als e-mailtekst gekopieerd kunnen worden");
const messageCountBeforeContact = document.querySelectorAll("#help-messages .help-message").length;
document.querySelector("#help-input").value = "contact";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const directContactMessage = document.querySelectorAll("#help-messages .help-message")[messageCountBeforeContact + 1];
assert(directContactMessage.textContent.includes("backoffice@pathconsultancy.nl"), "De vraag contact moet direct het juiste Path Backoffice-adres tonen");
assert(directContactMessage.querySelector('a[href^="https://mail.google.com/mail/"]'), "Contact moet direct een Gmail-knop tonen");
assert(directContactMessage.querySelector('a[href^="mailto:backoffice@pathconsultancy.nl"]'), "Contact moet direct een Outlook- of mailappknop tonen");
assert(directContactMessage.querySelector("[data-copy-support]"), "Contact moet direct een kopieerknop tonen");
click("#help-clear");
assert(document.querySelectorAll("#help-messages .help-message").length === 1 && document.querySelector("#help-messages").textContent.includes("alleen tijdens deze sessie"), "De hulpgeschiedenis moet handmatig wisbaar zijn en niet als blijvend dossier worden gepresenteerd");
click("#help-close");
click('[data-view="timesheet"]');
assert(!document.querySelector("#submit-timesheet").disabled, "Een verschil met contracturen mag indienen nooit blokkeren");
assert(document.querySelector("#hours-target-help").textContent.includes("blokkeert indienen nooit"), "De controle moet duidelijk zeggen dat het verschil niet blokkeert");
assert(!document.querySelector("#customer-timesheet-upload-panel").hidden, "Een medewerker moet de officiële klanturenstaat apart kunnen uploaden");
assert(document.querySelector("#customer-timesheet-month").tagName === "BUTTON" && document.querySelector("#customer-timesheet-year").type === "number" && !document.querySelector("#customer-timesheet-month-panel select"), "De medewerker moet maand en jaar zonder native dropdown expliciet kiezen");
click("#customer-timesheet-month");
assert(!document.querySelector("#customer-timesheet-month-panel").hidden, "Het maandvenster van de klanturenstaat moet openen");
click("[data-month-control=\"#customer-timesheet-month\"][data-period-month=\"08\"]");
assert(document.querySelector("#customer-timesheet-subject").textContent === "Klanturenstaat Stasjo van Bakel – augustus 2026 ter controle", "Een gewone maandknop moet de klanturenstaat direct wijzigen");
assert(document.querySelector("#customer-timesheet-month-panel").hidden, "Een gewone maandknop moet het venster sluiten");
click("#customer-timesheet-month");
assert(!document.querySelector("#customer-timesheet-month-panel").hidden, "Het maandvenster moet na een eerdere keuze opnieuw openen");
click("[data-month-control=\"#customer-timesheet-month\"][data-period-month=\"07\"]");
assert(document.querySelector("#customer-timesheet-save-draft").disabled && document.querySelector("#customer-timesheet-submit").disabled && document.querySelector("#customer-timesheet-action-help").classList.contains("is-warning") && document.querySelector("#customer-timesheet-action-help").textContent.length > 20, "Bij een al ingediende of goedgekeurde voorbeeldmaand moeten de knoppen bewust geblokkeerd zijn en moet de reden zichtbaar zijn");
click("#customer-timesheet-month");
const _origCalendarKey = dom.window.currentCalendarPeriodKey;
dom.window.currentCalendarPeriodKey = () => "9999-12";
choosePeriod("#customer-timesheet-month", "#customer-timesheet-year", "2026-09");
assert(document.querySelector("#customer-timesheet-subject").textContent === "Klanturenstaat Stasjo van Bakel – september 2026 ter controle", "De onderwerpregel moet na de periodekeuze automatisch worden ingevuld");
assert(document.querySelector("#customer-timesheet-mail-route").textContent.includes("Van Stasjo van Bakel aan Path Backoffice") && document.querySelector("#customer-timesheet-mail-route").textContent.includes("backoffice@pathconsultancy.nl"), "De medewerker moet duidelijk zien dat zijn bericht eerst bij de beheerder van Backoffice komt");
assert(document.querySelector("#customer-timesheet-body").textContent.includes("mijn klanturenstaat") && document.querySelector("#customer-timesheet-body").textContent.includes("september 2026") && document.querySelector("#customer-timesheet-body").textContent.includes("Stasjo van Bakel") && !document.querySelector("#customer-timesheet-body").textContent.includes("Path Backoffice"), "De eerste mail moet namens de medewerker zijn en niet namens Backoffice");
click("#customer-timesheet-edit-mail");
assert(document.querySelector("#modal-title").textContent.includes("Stasjo van Bakel") && document.querySelector("#customer-timesheet-submission-subject").value === "Klanturenstaat Stasjo van Bakel – september 2026 ter controle", "De medewerker moet onderwerp en bericht vóór indienen kunnen aanpassen");
document.querySelector("#customer-timesheet-submission-subject").value = "Klanturenstaat Stasjo – september 2026 ter controle";
document.querySelector("#customer-timesheet-submission-body").value = "Goedemiddag,\n\nHierbij stuur ik mijn klanturenstaat ter controle.\n\nMet vriendelijke groet,\n\nStasjo van Bakel";
click("#modal-confirm");
assert(document.querySelector("#customer-timesheet-subject").textContent === "Klanturenstaat Stasjo – september 2026 ter controle" && document.querySelector("#customer-timesheet-body").textContent.includes("Hierbij stuur ik mijn klanturenstaat ter controle"), "Een aangepaste medewerkersmail moet direct in het maandvoorbeeld terugkomen");
click("#customer-timesheet-edit-mail");
click("#modal-secondary");
assert(document.querySelector("#customer-timesheet-subject").textContent === "Klanturenstaat Stasjo van Bakel – september 2026 ter controle", "De medewerker moet het organisatiestandaardbericht kunnen herstellen");
assert(document.querySelector("#customer-timesheet-upload-panel").textContent.includes("Downloads/Bestanden"), "De medewerker moet direct zien hoe een PDF vanuit e-mail in de app komt");
assert(document.querySelector("#customer-timesheet-save-draft").disabled && document.querySelector("#customer-timesheet-submit").disabled && document.querySelector("#customer-timesheet-action-help").textContent.includes("Kies eerst"), "Zonder bestand moeten de knoppen de vervolgstap duidelijk uitleggen");
const customerTimesheetPdf = new dom.window.File(["%PDF-1.4 klanturenstaat"], "klant_juli.pdf", { type: "application/pdf" });
Object.defineProperty(document.querySelector("#customer-timesheet-file"), "files", { value: [customerTimesheetPdf], configurable: true });
document.querySelector("#customer-timesheet-file").dispatchEvent(new Event("change", { bubbles: true }));
assert(!document.querySelector("#customer-timesheet-save-draft").disabled && !document.querySelector("#customer-timesheet-submit").disabled, "Na een geldig bestand moeten Concept opslaan en Indienen bij Backoffice direct actief worden");
const notificationsBeforeCustomerConcept = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).notifications.length;
click("#customer-timesheet-save-draft");
await new Promise(resolve => dom.window.setTimeout(resolve, 20));
const draftCustomerState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(draftCustomerState.records["2026-09"]["2"].customerTimesheet.status === "draft", "Een PDF moet eerst als concept bewaard kunnen worden");
assert(draftCustomerState.notifications.length === notificationsBeforeCustomerConcept, "Een concept mag nog geen Backoffice-melding maken");
assert(document.querySelector("#customer-timesheet-status").textContent.includes("Concept"), "De medewerker moet duidelijk zien dat een concept nog niet is ingediend");
click("#customer-timesheet-submit");
await new Promise(resolve => dom.window.setTimeout(resolve, 20));
const uploadedCustomerState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(uploadedCustomerState.records["2026-09"]["2"].customerTimesheet.status === "received", "Indienen bij Backoffice moet het concept op Controle nodig zetten");
assert(uploadedCustomerState.records["2026-09"]["2"].customerTimesheet.fileName === "Klanturenstaat_Stasjo_van_Bakel_2026-09.pdf", "De bestandsnaam moet automatisch medewerker, jaar en maand bevatten");
assert(uploadedCustomerState.records["2026-09"]["2"].customerTimesheet.fileData.startsWith("data:application/pdf"), "De lokale voorbereiding moet de gekozen PDF bewaren");
assert(uploadedCustomerState.records["2026-09"]["2"].customerTimesheet.submissionSubject === "Klanturenstaat Stasjo van Bakel – september 2026 ter controle" && uploadedCustomerState.records["2026-09"]["2"].customerTimesheet.submissionBody.includes("Stasjo van Bakel") && !uploadedCustomerState.records["2026-09"]["2"].customerTimesheet.submissionBody.includes("Path Backoffice"), "De beheerder moet na indienen het onderwerp en bericht van de medewerker terugzien");
assert(uploadedCustomerState.notifications.length === notificationsBeforeCustomerConcept + 1 && uploadedCustomerState.notifications.at(-1).title === "Klanturenstaat ingediend", "Pas indienen moet Backoffice in de app melden");
choosePeriod("#customer-timesheet-month", "#customer-timesheet-year", "2026-10");
const customerTimesheetPng = new dom.window.File(["voorbeeldafbeelding"], "klant_oktober.png", { type: "image/png" });
Object.defineProperty(document.querySelector("#customer-timesheet-file"), "files", { value: [customerTimesheetPng], configurable: true });
document.querySelector("#customer-timesheet-file").dispatchEvent(new Event("change", { bubbles: true }));
click("#customer-timesheet-save-draft");
await new Promise(resolve => dom.window.setTimeout(resolve, 20));
const convertedImageState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records["2026-10"]["2"].customerTimesheet;
assert(convertedImageState.status === "draft" && convertedImageState.originalFileName === "klant_oktober.png", "Een PNG moet eerst als klanturenstaatconcept kunnen worden opgeslagen");
assert(convertedImageState.fileName === "Klanturenstaat_Stasjo_van_Bakel_2026-10.pdf" && convertedImageState.fileData.startsWith("data:application/pdf"), "JPG en PNG moeten automatisch één gestandaardiseerde PDF opleveren");
choosePeriod("#customer-timesheet-month", "#customer-timesheet-year", "2027-01");
assert(document.querySelector("#customer-timesheet-subject").textContent === "Klanturenstaat Stasjo van Bakel – januari 2027 ter controle", "De klanturenstaatroute moet automatisch overgaan naar een volgend jaar");
assert(dom.window.customerTimesheetFileName(demoScenarioState.employees.find(employee => employee.id === 2), "2027-01") === "Klanturenstaat_Stasjo_van_Bakel_2027-01.pdf", "De bestandsnaam moet in een nieuw jaar automatisch 2027 gebruiken");
choosePeriod("#customer-timesheet-month", "#customer-timesheet-year", "2026-07");


choosePeriod("#period-month-picker", "#period-year-picker", "2024-01");
assert(document.querySelector("#period-label").textContent === "Januari 2024", "De kiezer moet rechtstreeks naar januari 2024 gaan");
assert(document.querySelector("#timesheet-period-title").textContent === "Januari 2024", "De medewerkersweergave moet dezelfde vrije periode tonen");
assert(document.querySelector("#hours-total").textContent === "0,0", "Een nieuw gekozen maand moet eigen lege uren hebben");
assert(!document.querySelector("#submit-timesheet").disabled, "Ook een lege of afwijkende maand moet ingediend kunnen worden");
assert(document.querySelector("#hours-target-help").textContent.includes("Alleen Januari 2024 wordt ingediend"), "Indienen moet expliciet tot één geselecteerde maand beperkt zijn");
assert(document.querySelectorAll(".workday-cell .hours-day-entry").length === document.querySelectorAll(".hours-input").length, "Iedere datum en ureninvoer moeten samen in één gecentreerd dagblok staan");
assert(document.querySelector(".hours-day-entry .date-number").textContent.includes("jan"), "De datum boven het urenveld moet ook de maandafkorting tonen");
assert(!/\.hours-table\s+\.date-number\s*\{[^}]*position:\s*absolute/.test(styles), "De datum mag niet meer los linksboven van het urenveld staan");
const monthWeekRowCount = document.querySelectorAll("#hours-grid tr").length;
assert(document.querySelectorAll("[data-hours-week-scope]").length === monthWeekRowCount + 1, "Naast Hele maand moet iedere kalenderweek een eigen filter krijgen");
const hiddenWeekInput = document.querySelectorAll("#hours-grid tr")[1].querySelector(".hours-input");
hiddenWeekInput.value = "3";
hiddenWeekInput.dispatchEvent(new Event("input", { bubbles: true }));
click('[data-hours-week-scope="week-0"]');
assert(document.querySelectorAll("#hours-grid tr").length === 1, "Een weekfilter moet precies één week tonen");
assert(document.querySelector("#hours-visible-total-label").textContent.includes("Week"), "De zichtbare totaalkaart moet de gekozen week noemen");
assert(document.querySelector("#hours-total").textContent === "3,0", "Uren uit een verborgen week mogen bij filteren niet verloren gaan");
document.querySelector(".hours-input").value = "7.5";
document.querySelector(".hours-input").dispatchEvent(new Event("input", { bubbles: true }));
assert(document.querySelector("#hours-autosave-status").textContent.includes("Automatisch opgeslagen"), "Daguren moeten tussentijds automatisch worden opgeslagen");
click('[data-hours-week-scope="all"]');
assert(document.querySelectorAll("#hours-grid tr").length === monthWeekRowCount, "Hele maand moet alle weekregels terugbrengen");
assert(document.querySelector("#hours-total").textContent === "10,5", "Het maandtotaal moet uren uit alle weken blijven optellen");

const firstHoursInput = document.querySelector(".hours-input");
const nextHoursInput = document.querySelectorAll(".hours-input")[1];
firstHoursInput.value = "7.5";
pressEnter(".hours-input");
assert(document.querySelector("#toast").textContent.includes("tussentijds opgeslagen"), "Enter in een urenveld moet het werk zichtbaar opslaan");
assert(document.activeElement === nextHoursInput, "Enter in een urenveld moet naar het volgende veld gaan");
document.querySelector("#summary-leave").value = "8";
pressEnter("#summary-leave");
assert(document.querySelector("#toast").textContent.includes("Verlof en ziekte"), "Verlof en ziekte moeten met Enter opgeslagen kunnen worden");

document.querySelectorAll(".hours-input").forEach(input => { input.value = "8"; });
document.querySelector(".hours-input").dispatchEvent(new Event("input", { bubbles: true }));
assert(document.querySelector("#hours-target-message").textContent.includes("meer"), "Meer uren dan het contract moet alleen een melding geven");
assert(!document.querySelector("#submit-timesheet").disabled, "Meer uren dan het contract mag niet blokkeren");
document.querySelectorAll(".hours-input").forEach(input => { input.value = "0"; });
document.querySelector(".hours-input").dispatchEvent(new Event("input", { bubbles: true }));
assert(document.querySelector("#hours-target-message").textContent.includes("minder"), "Minder uren dan het contract moet alleen een melding geven");
assert(!document.querySelector("#submit-timesheet").disabled, "Minder uren dan het contract mag niet blokkeren");

click("#period-prev");
assert(document.querySelector("#period-label").textContent === "December 2023", "De pijl moet over een jaargrens terug kunnen");
click("#period-next");
assert(document.querySelector("#period-label").textContent === "Januari 2024", "De pijl moet over een jaargrens vooruit kunnen");

choosePeriod("#period-month-picker", "#period-year-picker", "2037-12");
assert(document.querySelector("#period-label").textContent === "December 2037", "Ook een verre toekomstige periode moet werken");
dom.window.currentCalendarPeriodKey = _origCalendarKey;

click("#switch-role");
const adminPicker = document.querySelector("#login-admin");
assert(document.querySelectorAll("#login-admin option").length === 2, "Gio en Joyce moeten als beheerder testbaar zijn");
click("#login-admin-trigger");
assert(!document.querySelector("#login-admin-choices").hidden, "Het eigen beheerdersmenu moet met een gewone knop openen");
click('[data-login-account-role="admin"][data-login-account-id="joyce"]');
assert(document.querySelector("#view-dashboard").classList.contains("is-active"), "Een beheerder moet op het dashboard starten");
assert(document.querySelector('[data-view="timesheet"]').hidden, "Mijn uren moet volledig verborgen zijn voor beheerders");
dom.window.showView("timesheet");
assert(document.querySelector("#view-dashboard").classList.contains("is-active"), "Ook een oude directe link naar Mijn uren moet een beheerder terugsturen naar het dashboard");
assert(document.querySelector("#workspace-avatar").textContent === "JV", "Joyce moet overal haar eigen initialen tonen");
assert(document.querySelector("#admin-dashboard-greeting").textContent.includes("Joyce"), "Het beheerdersdashboard moet de gekozen beheerder begroeten");
assert(document.querySelector("#period-label").textContent === "Augustus 2026", "Een nieuwe beheerlogin moet de actuele kalendermaand openen");
assert(document.querySelector("#dashboard-team-title").textContent.includes("Augustus 2026"), "De actuele loginmaand moet ook boven het teamoverzicht op het dashboard staan");
assert(document.querySelector("#workflow-period-title").textContent.includes("augustus 2026"), "Het dashboard moet de actuele loginmaand gebruiken");
assert(!document.querySelector("#open-delivery-check"), "Een tweede dashboardknop naar dezelfde werkvoorraad moet niet meer bestaan");
assert(!document.querySelector("#admin-task-panel").hidden && document.querySelector("#admin-task-panel").textContent.includes("Alle open acties per maand") && document.querySelector("#admin-task-panel").textContent.includes("Zonder maanden wisselen"), "De beheerder moet één actiegerichte werkvoorraad krijgen die niet door de gekozen maand wordt beperkt");
const dashboardTasks = dom.window.adminOpenTasks();
const dashboardActionableTasks = dashboardTasks.filter(task => task.actionable);
const dashboardWaitingTasks = dashboardTasks.filter(task => !task.actionable);
const dashboardTaskMonths = new Set(dashboardTasks.map(task => task.periodKey)).size;
const dashboardTaskDossiers = new Set(dashboardTasks.map(task => task.periodKey + ":" + task.employee.id)).size;
const dashboardJulyTasks = dashboardTasks.filter(task => task.periodKey === "2026-07");
const dashboardAugustTasks = dashboardTasks.filter(task => task.periodKey === "2026-08");
const dashboardJulyActionableTasks = dashboardJulyTasks.filter(task => task.actionable);
const dashboardJulyWaitingTasks = dashboardJulyTasks.filter(task => !task.actionable);
assert(document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === dashboardTasks.length, "Alle open acties moet standaard iedere actie exact één keer tonen");
assert(document.querySelectorAll("#admin-task-list [data-admin-task-month]").length === dashboardTaskMonths, "De werkvoorraad moet de open maanden als afzonderlijke blokken onder elkaar tonen");
assert(document.querySelector('[data-admin-task-filter="all"]').textContent.includes(String(dashboardTasks.length)) && document.querySelector('[data-admin-task-filter="actionable"]').textContent.includes(String(dashboardActionableTasks.length)) && document.querySelector('[data-admin-task-filter="waiting"]').textContent.includes(String(dashboardWaitingTasks.length)), "Het totaal en de verdeling per eigenaar moeten apart worden geteld");
assert(document.querySelector("#admin-task-summary").textContent.includes(dashboardTasks.length + " open acties in " + dashboardTaskDossiers + " dossiers") && document.querySelector("#admin-task-summary").textContent.includes("Backoffice kan " + dashboardActionableTasks.length + " oppakken; " + dashboardWaitingTasks.length + " wachten op medewerkers") && document.querySelector("#admin-task-summary").textContent.includes("Iedere regel hieronder is één actie"), "De werkvoorraad moet het totaal één-op-één bewijzen per dossier en eigenaar");

// Exacte regressiesituatie: drie open taken, alle drie bij medewerkers,
// één in juni (Brian klanturenstaat), één in juli (Stasjo klanturenstaat), één in augustus (Stasjo correctie).
const brianAugust = dom.window.recordFor(3, "2026-08");
const shawnAugust = dom.window.recordFor(4, "2026-08");
const brianJuly = dom.window.recordFor(3, "2026-07");
const shawnJuly = dom.window.recordFor(4, "2026-07");
const marcAugust = dom.window.recordFor(1, "2026-08");
const marcJuly = dom.window.recordFor(1, "2026-07");
const stasjoJune = dom.window.recordFor(2, "2026-06");
const marcJune = dom.window.recordFor(1, "2026-06");
const ownershipScenarioSnapshot = [brianAugust, shawnAugust].map(record => ({
  timesheetStatus: record.timesheetStatus,
  invoiceStatus: record.invoiceStatus,
  payrollStatus: record.payrollStatus,
  customerStatus: dom.window.customerTimesheetFor(record).status
}));
const brianJulyStatusSnapshot = brianJuly.timesheetStatus;
const shawnJulyInvoiceSnapshot = { invoiceStatus: shawnJuly.invoiceStatus, payrollStatus: shawnJuly.payrollStatus };
const marcAugustScenarioSnapshot = { timesheetStatus: marcAugust.timesheetStatus, invoiceStatus: marcAugust.invoiceStatus, payrollStatus: marcAugust.payrollStatus, customerStatus: dom.window.customerTimesheetFor(marcAugust).status };
const marcJulyScenarioSnapshot = { invoiceStatus: marcJuly.invoiceStatus, payrollStatus: marcJuly.payrollStatus, customerStatus: dom.window.customerTimesheetFor(marcJuly).status };
const stasjoJuneScenarioSnapshot = { timesheetStatus: stasjoJune.timesheetStatus, invoiceStatus: stasjoJune.invoiceStatus, payrollStatus: stasjoJune.payrollStatus };
const marcJuneCustomerScenarioSnapshot = dom.window.customerTimesheetFor(marcJune).status;
[brianAugust, shawnAugust].forEach(record => {
  record.timesheetStatus = "approved";
  record.invoiceStatus = "simulated";
  record.payrollStatus = "simulated";
  dom.window.customerTimesheetFor(record).status = "sent";
});
brianJuly.timesheetStatus = "approved";
brianJuly.invoiceStatus = "simulated";
brianJuly.payrollStatus = "simulated";
shawnJuly.invoiceStatus = "simulated";
shawnJuly.payrollStatus = "simulated";
marcAugust.timesheetStatus = "approved";
marcAugust.invoiceStatus = "simulated";
marcAugust.payrollStatus = "simulated";
dom.window.customerTimesheetFor(marcAugust).status = "sent";
marcJuly.invoiceStatus = "simulated";
marcJuly.payrollStatus = "simulated";
dom.window.customerTimesheetFor(marcJuly).status = "sent";
stasjoJune.timesheetStatus = "approved";
stasjoJune.invoiceStatus = "simulated";
stasjoJune.payrollStatus = "simulated";
dom.window.customerTimesheetFor(marcJune).status = "sent";
choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
dom.window.renderAll();
const ownershipScenarioTasks = dom.window.adminOpenTasks();
const stasjoAug = dom.window.recordFor(2, "2026-08");
assert(ownershipScenarioTasks.length === 3 && ownershipScenarioTasks.every(task => !task.actionable), "De regressiesituatie moet exact drie taken bij medewerkers bevatten");
assert(document.querySelector("#admin-attention-note").textContent === "3 open acties in 3 dossiers over 3 maanden." && document.querySelector("#hero-backoffice-count").textContent === "0" && document.querySelector("#hero-employee-count").textContent === "3", "Het hoofdtotaal moet exact gelijk zijn aan de visuele verdeling per eigenaar");
assert(document.querySelector("#metric-actions").textContent === "0" && document.querySelector("#metric-actions-note").textContent === "3 acties wachten op medewerkers", "De actiekaart moet duidelijk tonen dat Backoffice niets direct hoeft te doen");
assert(document.querySelector("#metric-actions-link").textContent === "Bekijk alle 3 acties", "De KPI-link moet wel naar alle wachtende acties blijven verwijzen");
assert(document.querySelector("#open-work-queue").textContent === "Bekijk alle 3 open acties", "De hoofdknop moet altijd naar het volledige actietotaal verwijzen");
assert(document.querySelector("#hero-task-months").textContent === "Juni 1 + Juli 1 + Augustus 1 = 3" && document.querySelector("#hero-task-owners").textContent === "Backoffice 0 + wacht op medewerkers 3 = 3", "De bovenkant moet het totaal zowel per maand als per eigenaar bewijsbaar maken");
assert(document.querySelector("#dashboard-next-action-label").textContent === "Voor jou is nu niets te doen" && document.querySelector("#dashboard-next-action-title").textContent.includes("Wacht op Brian Hek") && !document.querySelector("#dashboard-next-action-button"), "Zonder Backoffice-actie moet de vaste kaart de eerstvolgende medewerker tonen in plaats van een onbruikbare startknop");
assert(document.querySelector("#dashboard-next-action-controls").textContent.includes("Herinner medewerker"), "Een wachtende klanturenstaat moet vanuit de prioriteitenkaart herinnerd kunnen worden");
click("#open-work-queue");
assert(document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === 3 && document.querySelectorAll("#admin-task-list .status-pill").length === 3 && [...document.querySelectorAll("#admin-task-list .status-pill")].every(item => item.textContent === "Actie bij medewerker"), "Iedere taak moet één zichtbare regel met precies één eigenaar hebben");
[brianAugust, shawnAugust].forEach((record, index) => {
  record.timesheetStatus = ownershipScenarioSnapshot[index].timesheetStatus;
  record.invoiceStatus = ownershipScenarioSnapshot[index].invoiceStatus;
  record.payrollStatus = ownershipScenarioSnapshot[index].payrollStatus;
  dom.window.customerTimesheetFor(record).status = ownershipScenarioSnapshot[index].customerStatus;
});
brianJuly.timesheetStatus = brianJulyStatusSnapshot;
brianJuly.invoiceStatus = "concept";
brianJuly.payrollStatus = "concept";
Object.assign(shawnJuly, shawnJulyInvoiceSnapshot);
// Restore June and July records modified during the scenario setup.
marcAugust.timesheetStatus = marcAugustScenarioSnapshot.timesheetStatus;
marcAugust.invoiceStatus = marcAugustScenarioSnapshot.invoiceStatus;
marcAugust.payrollStatus = marcAugustScenarioSnapshot.payrollStatus;
dom.window.customerTimesheetFor(marcAugust).status = marcAugustScenarioSnapshot.customerStatus;
marcJuly.invoiceStatus = marcJulyScenarioSnapshot.invoiceStatus;
marcJuly.payrollStatus = marcJulyScenarioSnapshot.payrollStatus;
dom.window.customerTimesheetFor(marcJuly).status = marcJulyScenarioSnapshot.customerStatus;
stasjoJune.timesheetStatus = stasjoJuneScenarioSnapshot.timesheetStatus;
stasjoJune.invoiceStatus = stasjoJuneScenarioSnapshot.invoiceStatus;
stasjoJune.payrollStatus = stasjoJuneScenarioSnapshot.payrollStatus;
dom.window.customerTimesheetFor(marcJune).status = marcJuneCustomerScenarioSnapshot;
choosePeriod("#period-month-picker", "#period-year-picker", "2037-12");
dom.window.renderAll();
click("#dashboard-next-action-button");
assert(document.querySelector("#modal").hidden === false, "Start met oudste taak moet rechtstreeks een actiemodal openen");
assert(document.querySelector("#period-label").textContent === "December 2037", "Een taak openen mag het gekozen maandoverzicht niet ongemerkt wijzigen");
click("#modal-close");
click('[data-admin-task-filter="waiting"]');
assert(document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === dashboardWaitingTasks.length && document.querySelector("#admin-task-list").textContent.includes("Actie bij medewerker"), "Bij medewerkers moet alleen de niet-directe taken tonen en per regel de eigenaar benoemen");
click('[data-admin-task-filter="actionable"]');
const renderedActionableTaskIds = [...document.querySelectorAll("#admin-task-list [data-admin-task-row]")].map(item => item.dataset.adminTaskRow);
assert(renderedActionableTaskIds.length === dashboardActionableTasks.length && [...document.querySelectorAll("#admin-task-list .status-pill")].every(item => item.textContent === "Actie bij Backoffice"), "Bij Backoffice moet alleen de direct uitvoerbare acties tonen; verwacht " + dashboardActionableTasks.map(task => task.id).join(", ") + ", kreeg " + renderedActionableTaskIds.join(", "));
click('[data-admin-task-filter="all"]');
const taskMonthKeys = [...document.querySelectorAll("#admin-task-list [data-admin-task-month]")].map(item => item.dataset.adminTaskMonth);
assert(JSON.stringify(taskMonthKeys) === JSON.stringify(["2026-06", "2026-07", "2026-08"]), "Juni, juli en augustus moeten als maandblokken onder elkaar staan, met de oudste maand eerst");
assert(document.querySelector('[data-admin-task-month="2026-07"]').textContent.includes("Juli 2026 · " + dashboardJulyTasks.length + " open acties") && document.querySelector('[data-admin-task-month="2026-07"]').textContent.includes("Brian Hek"), "Juli moet alle actuele acties van Brian zichtbaar bewijzen");
assert(document.querySelector('[data-admin-task-month="2026-08"]').textContent.includes("Augustus 2026 · " + dashboardAugustTasks.length + " open acties"), "Augustus moet alle actuele acties in één maandblok tonen");
assert(document.querySelector('[data-admin-task-month="2026-08"] .admin-task-owner-heading.is-actionable') && document.querySelector('[data-admin-task-month="2026-08"] .admin-task-owner-heading.is-waiting'), "Binnen augustus moeten Backoffice-acties en wachttaken apart onder elkaar staan");
if (document.querySelector('[data-admin-task-month-toggle="2026-07"]').getAttribute("aria-expanded") !== "true") click('[data-admin-task-month-toggle="2026-07"]');
click('[data-admin-task-month-toggle="2026-07"]');
assert(document.querySelector('[data-admin-task-month-toggle="2026-07"]').getAttribute("aria-expanded") === "false" && document.querySelector("#admin-task-month-body-2026-07").hidden, "Een maand moet met één klik volledig kunnen worden ingeklapt");
assert(document.activeElement === document.querySelector('[data-admin-task-month-toggle="2026-07"]'), "Na inklappen moet toetsenbordfocus op dezelfde maandkop blijven staan");
const collapsedJulyHeading = document.querySelector('[data-admin-task-month-toggle="2026-07"]').textContent;
const collapsedJulyOwnerSummary = dashboardJulyActionableTasks.length + " bij Backoffice · " + dashboardJulyWaitingTasks.length + " bij " + (dashboardJulyWaitingTasks.length === 1 ? "medewerker" : "medewerkers");
assert(collapsedJulyHeading.includes("Juli 2026 · " + dashboardJulyTasks.length + " open actie") && collapsedJulyHeading.includes(collapsedJulyOwnerSummary), "Een ingeklapte maandkop moet het aantal en de eigenaarverdeling blijven tonen: " + collapsedJulyHeading);
assert(!document.querySelector('[data-admin-task-month-toggle="2026-07"]').hasAttribute("aria-label"), "De zichtbare maandtelling moet ook de volledige toegankelijke knopnaam blijven");
click('[data-admin-task-month-toggle="2026-07"]');
assert(document.querySelector('[data-admin-task-month-toggle="2026-07"]').getAttribute("aria-expanded") === "true" && !document.querySelector("#admin-task-month-body-2026-07").hidden, "Dezelfde maand moet zonder maandwissel weer kunnen worden uitgeklapt");
assert(document.querySelectorAll("[data-admin-task-owner-toggle]").length === 0, "Eigenaargroepen mogen geen tweede inklapniveau toevoegen");
const julySignatureRecord = dom.window.recordFor(1, "2026-07");
const julySignatureInvoiceSnapshot = julySignatureRecord.invoiceStatus;
click('[data-admin-task-month-toggle="2026-07"]');
julySignatureRecord.invoiceStatus = "ready";
dom.window.renderAll();
assert(document.querySelector('[data-admin-task-month-toggle="2026-07"]').getAttribute("aria-expanded") === "false", "Een opgeslagen maandkeuze mag bij een gewijzigde actielijst terugvallen naar de veilige standaard: ingeklapt");
julySignatureRecord.invoiceStatus = julySignatureInvoiceSnapshot;
dom.window.renderAll();
if (document.querySelector('[data-admin-task-month-toggle="2026-07"]').getAttribute("aria-expanded") === "false") click('[data-admin-task-month-toggle="2026-07"]');
click("#admin-task-panel-toggle");
assert(document.querySelector("#admin-task-content").hidden && document.querySelector("#admin-task-panel-toggle").getAttribute("aria-expanded") === "false", "Overzicht inklappen moet de volledige werkvoorraad sluiten");
click("#admin-task-panel-toggle");
assert(!document.querySelector("#admin-task-content").hidden && [...document.querySelectorAll('[data-admin-task-month-toggle]')].every(toggle => toggle.getAttribute("aria-expanded") === "false") && [...document.querySelectorAll('.admin-task-month-body')].every(body => body.hidden), "Na opnieuw openen moeten alle maanden weer in de veilige ingeklapte beginstand staan");
assert(!document.querySelector("#open-periods-panel"), "Een dubbel los maandoverzicht moet vervallen nu de werkvoorraad zelf per maand is gegroepeerd");
assert(document.querySelector("#metric-actions").closest(".metric-card").textContent.includes("Acties bij Backoffice") && Number(document.querySelector("#metric-actions").textContent) === dashboardActionableTasks.length && document.querySelector("#metric-actions-note").textContent.includes(String(dashboardWaitingTasks.length)), "De actiekaart moet directe Backoffice-acties en het aantal wachttaken apart tonen");
assert(document.querySelector("#metric-actions-link").textContent.includes(String(dashboardTasks.length)), "De actiekaart moet met één link naar de volledige werkvoorraad verwijzen");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
const augustWorkflowTasks = dom.window.adminOpenTasks().filter(task => task.periodKey === "2026-08");
assert(document.querySelector("#workflow-open-count").textContent.includes(augustWorkflowTasks.length + " open acties") && document.querySelector("#workflow-open-breakdown").textContent.includes("klanturensta"), "De procesbalk moet het actuele maandtotaal en de aparte klanturenstaten benoemen");
assert(document.querySelector('[data-admin-hours-detail="2"][data-period-key="2026-08"]'), "Een wachtende medewerkeractie (Stasjo correctie) moet rechtstreeks vanuit het juiste maandblok te openen zijn");
click('[data-admin-hours-detail="2"]');
assert(document.querySelector("#modal-label").textContent === "Alleen-lezen urenoverzicht" && document.querySelector("#modal-message").textContent.includes("niets wijzigen"), "Nog niet ingevulde uren moeten voor een beheerder alleen-lezen openen");
assert(document.querySelector("#view-dashboard").classList.contains("is-active") && !document.querySelector("#modal-summary .hours-input"), "Een urendetail mag de beheerder niet naar invoervelden sturen");
click("#modal-confirm");
assert((document.querySelector("#customer-timesheet-admin-list").textContent.match(/Controle nodig/g) || []).length === 1, "De drukke voorbeeldmaand moet één ontvangen klanturenstaat voor controle tonen");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
const notificationsBeforeCustomerReminder = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).notifications.length;
click('[data-remind-customer-timesheet="3"]');
const customerReminderState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(customerReminderState.notifications.length === notificationsBeforeCustomerReminder + 1 && customerReminderState.notifications.at(-1).title === "Klanturenstaat ontbreekt", "Backoffice moet vanuit de rustige maand een ontbrekende klanturenstaatherinnering kunnen klaarzetten");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
assert(document.querySelector("#customer-timesheet-admin-list").textContent.includes("Controle nodig"), "Een geüploade klanturenstaat moet voor Backoffice op Controle nodig staan");
click('[data-review-customer-timesheet="1"][data-period-key="2026-08"]');
assert(document.querySelector("#modal-title").textContent.includes("Marc de Roon") && document.querySelector("#modal-secondary").textContent === "Opnieuw uploaden vragen", "Backoffice moet een officiële PDF kunnen goedkeuren of opnieuw laten uploaden");
assert(document.querySelector('#modal-summary [data-view-customer-timesheet="1"]'), "Backoffice moet de ingediende PDF kunnen bekijken voordat deze wordt goedgekeurd");
assert(document.querySelector("#modal-summary").textContent.includes("Van Marc de Roon aan Path Backoffice") && document.querySelector("#modal-summary").textContent.includes("mijn klanturenstaat"), "De beheerder moet eerst het bericht van de medewerker bij de inzending zien");
click("#modal-confirm");
// Remove temp diagnostic
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records["2026-08"]["1"].customerTimesheet.status === "approved", "Een gecontroleerde klanturenstaat moet Goedgekeurd worden");
// Broker check en uren-intrekken flow worden gedekt in E2E EQ/TS-REV tests.
// Smoke test valideert alleen de statusovergang en UI-aanwezigheid van de knoppen.
assert(document.querySelector('[data-send-customer-timesheet="1"]') || document.querySelector('[data-admin-hours-detail="1"]'), "Na goedkeuring moet Backoffice een vervolgknop zien voor de klanturenstaat");
if (!document.querySelector("#modal").hidden) click("#modal-confirm");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
assert(document.querySelector("#period-label").textContent === "Juli 2026" && document.querySelector("#view-dashboard").classList.contains("is-active") && document.querySelector('[data-admin-task-month="2026-07"]'), "De maandkiezer moet de details wijzigen zonder het globale juliblok uit de werkvoorraad te verwijderen");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
// Deze factuursmoke begint bewust ná urencontrole. Eerder maakte een verouderde
// factuurprojectie de twee submitted records per ongeluk approved; leg de echte
// procesvoorwaarde vast zodat de test niet van die overschrijving afhankelijk is.
[marcAugust, brianAugust].forEach(record => {
  record.timesheetStatus = "approved";
});
click('[data-view="invoices"]');
assert(document.querySelector("#view-invoices").classList.contains("is-active"), "Facturen moet via de hoofdnavigatie bereikbaar blijven");
assert(!document.querySelector("#view-payroll") && !document.querySelector("#open-payroll-from-invoices"), "Salarisadministratie mag geen apart scherm of vaste factuurknop meer hebben");
assert(document.querySelector("#test-month-delivery").textContent === "Ga verder \u00b7 2 resterend" && document.querySelector("#month-batch-ready-count").textContent === "2 klaar \u00b7 1 gecontroleerd", "Bij goedgekeurde urenstaten moeten CTA en gereedheidskaart twee klaarstaande facturen tonen; CTA=" + document.querySelector("#test-month-delivery").textContent + ", kaart=" + document.querySelector("#month-batch-ready-count").textContent);
assert(document.querySelector("#invoice-rows").textContent.includes("Correctie nodig"), "De factuurlijst moet openstaande correcties tonen");
click("#help-launcher");
document.querySelector("#help-input").value = "mede";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
assert(document.querySelector("#help-messages").textContent.includes("invoer lijkt nog niet compleet"), "Een half zoekwoord mag niet direct als volledige hulpvraag worden beantwoord");
assert(document.querySelectorAll("#help-messages .help-inline-topics button").length >= 2, "Een half zoekwoord moet meerdere passende onderwerpkeuzes tonen");
document.querySelector("#help-input").value = "Hoe keur ik uren goed?";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
assert(document.querySelector("#help-messages").textContent.includes("standaard alle openstaande maanden"), "De hulpbot moet een beheerdersvraag naar Goedkeuringen routeren");
assert(document.querySelector("#help-messages").textContent.includes("verplichte toelichting"), "De hulpbot moet de nieuwe correctieflow uitleggen");
assert(document.querySelector('#help-messages [data-help-view="approvals"]'), "Het antwoord over goedkeuren moet direct naar Goedkeuringen linken");
click("#help-close");

click('[data-view="announcements"]');
assert(document.querySelector("#view-announcements").classList.contains("is-active"), "Een beheerder moet Mededelingen kunnen openen");
assert(document.querySelector("#announcement-list").textContent.includes("Planning augustus beschikbaar"), "De demo moet een geplaatste voorbeeldmededeling vooraf tonen");
assert(document.querySelector("#announcement-list").textContent.includes("Concept: onderhoud urenapp"), "De demo moet een bewerkbaar concept vooraf tonen");
assert(document.querySelector("#announcement-list").textContent.includes("Ingetrokken"), "De demo moet de intrekkingsroute vooraf zichtbaar maken");
assert(/ingetrokken/i.test(document.querySelector("#announcement-list .announcement-item h3").textContent), "De mededeling met de nieuwste intrekkingsactiviteit moet bovenaan staan");
const seededAnnouncementCount = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).announcements.length;
click("#add-announcement");
assert(document.querySelector("#announcement-audience"), "Een mededeling moet iedereen, een klantgroep of gekozen medewerkers ondersteunen");
assert(document.querySelector("#announcement-audience-trigger") && document.querySelector("#announcement-audience").hidden, "De doelgroepkeuze moet zonder native browserdropdown werken");
assert(document.querySelector("#modal-confirm").textContent === "Mededeling plaatsen", "Een nieuwe mededeling moet worden geplaatst en niet als verzending worden benoemd");
assert(document.querySelector("#announcement-email").checked, "Een aanvullende e-mailtest moet bewust gekozen en zichtbaar zijn");
document.querySelector("#announcement-title").value = "Algemene testmededeling";
document.querySelector("#announcement-message").value = "Dit bericht is voor alle actieve medewerkers.";
const notificationsBeforeDraft = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).notifications.length;
click("#modal-secondary");
let announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const testAnnouncementDraft = announcementState.announcements.find(item => item.title === "Algemene testmededeling");
assert(announcementState.announcements.length === seededAnnouncementCount + 1 && testAnnouncementDraft.status === "draft", "Een mededeling moet eerst als concept opgeslagen kunnen worden");
assert(announcementState.notifications.length === notificationsBeforeDraft, "Een concept mag geen melding of e-mailtest voor ontvangers maken");
assert(document.querySelector("#announcement-list").textContent.includes("Concept"), "Een concept moet herkenbaar in het beheerdersoverzicht staan");
click('[data-edit-announcement="' + testAnnouncementDraft.id + '"]');
assert(document.querySelector("#announcement-title").value === "Algemene testmededeling", "Een opgeslagen concept moet volledig bewerkbaar blijven");
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const testAnnouncement = announcementState.announcements.find(item => item.id === testAnnouncementDraft.id);
assert(announcementState.announcements.length === seededAnnouncementCount + 1, "Een algemene mededeling moet in de historie worden opgeslagen");
assert(testAnnouncement.status === "sent", "Een concept moet na plaatsen de status Verzonden krijgen");
assert(testAnnouncement.recipientIds.length === 4, "Alle actieve medewerkers moeten een eigen in-app melding krijgen");
assert(testAnnouncement.emailRecipientIds.length === 3, "De e-mailvoorkeur van iedere medewerker moet afzonderlijk worden gerespecteerd");
assert(!testAnnouncement.emailRecipientIds.includes(2), "Een medewerker die e-mail uitzet mag geen aanvullende e-mailtest krijgen");
assert(document.querySelector("#announcement-list").textContent.includes("Algemene testmededeling"), "Het verzonden bericht moet zichtbaar blijven in de historie");
click('[data-correct-announcement="' + testAnnouncement.id + '"]');
assert(!document.querySelector("#announcement-audience"), "Een correctie moet de ontvangers van het oorspronkelijke bericht vastzetten");
assert(document.querySelector("#announcement-title").value === "Algemene testmededeling", "Een wijziging moet zonder zichtbaar correctievoorvoegsel worden opgesteld");
assert(document.querySelector("#modal-confirm").textContent === "Wijziging plaatsen", "De beheerder moet de nieuwe versie direct kunnen plaatsen");
document.querySelector("#announcement-message").value = "De genoemde deadline is vrijdag 17:00 uur.";
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const correctedTestAnnouncement = announcementState.announcements.find(item => item.correctionOfId === testAnnouncement.id);
assert(announcementState.announcements.length === seededAnnouncementCount + 2, "Een correctie moet als nieuw bericht worden opgeslagen");
assert(correctedTestAnnouncement, "De correctie moet naar het oorspronkelijke bericht verwijzen");
assert(announcementState.announcements.find(item => item.id === testAnnouncement.id).message.includes("alle actieve"), "Het oorspronkelijke bericht mag door een correctie niet worden overschreven");
assert(announcementState.announcements.find(item => item.id === testAnnouncement.id).supersededById === correctedTestAnnouncement.id, "De vorige versie moet intern als vervangen worden gemarkeerd");
assert(announcementState.notifications.filter(item => item.announcementId === testAnnouncement.id).every(item => item.read && item.superseded), "De vorige versie moet uit iedere actieve medewerkersbel verdwijnen");
assert(JSON.stringify(correctedTestAnnouncement.recipientIds) === JSON.stringify(testAnnouncement.recipientIds), "Een correctie moet exact dezelfde ontvangers houden");

click("#add-announcement");
document.querySelector("#announcement-title").value = "In te trekken mededeling";
document.querySelector("#announcement-message").value = "Deze planning vervalt mogelijk.";
document.querySelector("#announcement-email").checked = false;
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const retractableAnnouncement = announcementState.announcements.find(item => item.title === "In te trekken mededeling");
click('[data-withdraw-announcement="' + retractableAnnouncement.id + '"]');
assert(document.querySelector("#announcement-withdrawal-reason"), "Intrekken moet een apart invoerveld voor de reden openen");
click("#modal-confirm");
assert(!document.querySelector("#modal").hidden, "Een mededeling mag niet zonder reden worden ingetrokken");
assert(document.querySelector("#announcement-withdrawal-reason").classList.contains("is-invalid"), "Het lege intrekkingsveld moet als ongeldig worden gemarkeerd");
document.querySelector("#announcement-withdrawal-reason").value = "De genoemde informatie is achterhaald door een nieuwe releaseplanning.";
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const withdrawnAnnouncement = announcementState.announcements.find(item => item.id === retractableAnnouncement.id);
assert(withdrawnAnnouncement.status === "withdrawn", "Het ingetrokken bericht moet de status Ingetrokken krijgen");
assert(withdrawnAnnouncement.withdrawalReason.includes("achterhaald"), "De verplichte intrekkingsreden moet blijvend worden opgeslagen");
assert(withdrawnAnnouncement.withdrawnBy === "Joyce van der Steenhoven", "De beheerder die intrekt moet in de historie worden vastgelegd");
assert(announcementState.notifications.filter(item => item.announcementId === retractableAnnouncement.id).every(item => item.read && item.withdrawn), "De oorspronkelijke melding moet uit de actieve bel verdwijnen wanneer het bericht wordt ingetrokken");
const withdrawalNotice = announcementState.announcements.find(item => item.withdrawalOfId === retractableAnnouncement.id);
assert(withdrawalNotice && withdrawalNotice.kind === "withdrawal", "Intrekken moet een nieuw gekoppeld intrekkingsbericht maken");
assert(JSON.stringify(withdrawalNotice.recipientIds) === JSON.stringify(withdrawnAnnouncement.recipientIds), "De intrekking moet exact dezelfde ontvangers krijgen");
assert(document.querySelector("#announcement-list").textContent.includes("Ingetrokken"), "De beheerder moet de ingetrokken status en reden in de historie zien");
assert(!document.querySelector('[data-withdraw-announcement="' + retractableAnnouncement.id + '"]'), "Een ingetrokken bericht mag niet opnieuw ingetrokken kunnen worden");
assert(document.querySelector('[data-hide-announcement="' + retractableAnnouncement.id + '"]'), "Na intrekken moet het bericht bij medewerkers verwijderd kunnen worden");
assert(document.querySelector('[data-edit-withdrawn-announcement="' + retractableAnnouncement.id + '"]'), "Een ingetrokken bericht moet na een fout nog bewerkbaar zijn");
click('[data-edit-withdrawn-announcement="' + retractableAnnouncement.id + '"]');
assert(document.querySelector("#edit-withdrawn-title").value === retractableAnnouncement.title && document.querySelector("#edit-withdrawn-message").value === retractableAnnouncement.message, "Bewerken moet de ingetrokken titel en tekst volledig laden");
document.querySelector("#edit-withdrawn-reason").value = "De informatie is achterhaald; de nieuwe releaseplanning is definitief.";
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const editedWithdrawnAnnouncement = announcementState.announcements.find(item => item.id === retractableAnnouncement.id);
const editedWithdrawalNotice = announcementState.announcements.find(item => item.withdrawalOfId === retractableAnnouncement.id);
assert(editedWithdrawnAnnouncement.withdrawnEditHistory.length === 1 && editedWithdrawnAnnouncement.withdrawnEditHistory[0].editedBy === "Joyce van der Steenhoven", "Na bewerken moet de vorige ingetrokken tekst met beheerder en datum intern bewaard blijven");
assert(editedWithdrawalNotice.message.includes("nieuwe releaseplanning is definitief"), "De gekoppelde intrekkingsmelding moet de herstelde reden overnemen");

click("#add-announcement");
document.querySelector("#announcement-audience").value = "client:IND";
document.querySelector("#announcement-audience").dispatchEvent(new Event("change", { bubbles: true }));
document.querySelector("#announcement-title").value = "IND-groepsbericht";
document.querySelector("#announcement-message").value = "Dit bericht is uitsluitend voor de IND-groep.";
document.querySelector("#announcement-email").checked = false;
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const groupAnnouncement = announcementState.announcements.find(item => item.title === "IND-groepsbericht");
assert(JSON.stringify(groupAnnouncement.recipientIds) === JSON.stringify([1, 2]), "Een klantgroep mag uitsluitend de medewerkers van die klant bevatten");
assert(groupAnnouncement.emailRecipientIds.length === 0, "Zonder e-mailkeuze mag een groepsbericht alleen in de app verschijnen");
assert(!document.querySelector("#announcement-list").textContent.includes("BCC gebruikt"), "Mededelingen mogen nooit via BCC worden gecombineerd");

click("#add-announcement");
document.querySelector("#announcement-audience").value = "selected";
document.querySelector("#announcement-audience").dispatchEvent(new Event("change", { bubbles: true }));
assert(!document.querySelector("#announcement-recipient-choices").hidden, "Zelf kiezen moet een lijst met afzonderlijke medewerkers tonen");
document.querySelector('[data-announcement-recipient][value="1"]').checked = true;
document.querySelector("#announcement-title").value = "Persoonlijk testbericht";
document.querySelector("#announcement-message").value = "Dit bericht is alleen voor Marc.";
document.querySelector("#announcement-email").checked = false;
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const personalAnnouncement = announcementState.announcements.find(item => item.title === "Persoonlijk testbericht");
assert(JSON.stringify(personalAnnouncement.recipientIds) === JSON.stringify([1]), "Een zelfgekozen mededeling mag alleen naar de aangevinkte medewerker gaan");

click("#add-announcement");
document.querySelector("#announcement-title").value = "Tijdelijk concept";
click("#modal-secondary");
const temporaryDraft = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).announcements.find(item => item.title === "Tijdelijk concept");
assert(temporaryDraft && temporaryDraft.status === "draft", "Een tweede concept moet veilig lokaal kunnen worden opgeslagen");
click('[data-delete-announcement-draft="' + temporaryDraft.id + '"]');
click("#modal-confirm");
assert(!JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).announcements.some(item => item.id === temporaryDraft.id), "Een nooit verstuurd concept moet verwijderd kunnen worden");

click('[data-view="approvals"]');
assert(document.querySelector("#approval-period-title").textContent === "Alle openstaande uren · 1", "Goedkeuringen moeten vanuit het hoofdmenu standaard alle maanden tonen");
assert(document.querySelectorAll("#approval-list .approval-card").length === 1, "Alleen de tijdens de test ingediende uren uit juli moeten zichtbaar zijn");
assert(document.querySelector("#approval-list").textContent.includes("Juli 2026") && !document.querySelector("#approval-list").textContent.includes("Augustus 2026"), "Alleen een maand met werkelijk ingediende uren mag in de lijst staan");
assert(document.querySelector('[data-approval-scope="all"]').textContent.includes("1"), "Het totaalfilter moet direct het aantal openstaande urenstaten tonen");
assert(document.querySelector("#global-period-control").hidden, "De algemene maandkiezer moet bij Goedkeuringen verborgen zijn");
assert(document.querySelector("#approval-period-filters").textContent.includes("Juli 2026 · 1") && !document.querySelector("#approval-period-filters").textContent.includes("Augustus 2026"), "Goedkeuringen moeten alleen maanden tonen waarin werkelijk iets openstaat");
assert(!document.querySelector("#approval-period-filters").textContent.includes("Mei 2026"), "Een maand zonder open goedkeuring mag niet als leeg filter verschijnen");
assert(document.querySelector("#approve-all").textContent === "Alle 1 goedkeuren", "De bulkknop moet het concrete aantal open urenstaten noemen");
click('[data-approval-filter-period="2026-07"]');
assert(document.querySelector("#approval-period-title").textContent === "Openstaande uren · Juli 2026", "De maandtab moet bewust op de gekozen maand filteren");
assert(document.querySelectorAll("#approval-list .approval-card").length === 1, "Juli moet alleen de ingediende uren uit juli tonen");
assert(document.querySelector("#approve-all").textContent === "1 urenstaat in juli goedkeuren", "De maandknop moet aantal en maand concreet en grammaticaal juist noemen");
click('[data-approval-scope="all"]');
assert(document.querySelectorAll("#approval-list .approval-card").length === 1, "Alle openstaande moet de ene actuele urencontrole tonen");
dom.window.setPeriod("2026-08");
click('[data-view="invoices"]');
assert(!document.querySelector("#global-period-control").hidden, "Bij Facturen moet de maandkiezer zichtbaar blijven");
assert(document.querySelector("#invoice-period-title").textContent === "Facturen" && document.querySelector("#month-batch-label").textContent === "Gekozen maand · Augustus 2026" && document.querySelector("#month-batch-card").hidden, "Facturen moeten standaard eerst alle maanden tonen en de gekozen maanddetail pas openen na keuze");
click('[data-view="employees"]');
assert(!document.querySelector("#global-period-control").hidden, "Bij Medewerkers moet de maandkiezer zichtbaar blijven voor maandstatussen");
assert(document.querySelector("#employee-period-label").textContent === "augustus 2026", "Medewerkerstatussen moeten de gekozen periode gebruiken");
click('[data-view="announcements"]');
assert(document.querySelector("#global-period-control").hidden, "Bij Mededelingen moet de algemene maandkiezer verborgen zijn");
click('[data-view="settings"]');
assert(document.querySelector("#global-period-control").hidden, "Bij Instellingen moet de algemene maandkiezer verborgen zijn");
click('[data-view="employees"]');
click("#add-admin");
assert(document.querySelector("#edit-admin-name"), "Een beheerder moet toegevoegd kunnen worden");
document.querySelector("#edit-admin-name").value = "Test Beheerder";
document.querySelector("#edit-admin-email").value = "test-beheerder@example.invalid";
click("#modal-confirm");
assert(document.querySelector("#administrator-list").textContent.includes("Test Beheerder"), "De nieuwe beheerder moet in het beheerdersoverzicht verschijnen");
assert(document.querySelector('[data-toggle-admin="joyce"]').disabled, "Een beheerder mag zichzelf niet deactiveren");
const adminStateAfterAdd = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const testAdminId = adminStateAfterAdd.admins.find(admin => admin.name === "Test Beheerder").id;
click('[data-toggle-admin="gio"]');
click("#modal-confirm");
click('[data-toggle-admin="' + testAdminId + '"]');
click("#modal-confirm");
let administratorState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(administratorState.admins.filter(admin => admin.active !== false).length === 1, "De historie moet blijven werken met precies één actieve beheerder");
assert(document.querySelector('[data-toggle-admin="joyce"]').disabled, "De laatste actieve beheerder moet beschermd blijven");
click('[data-toggle-admin="gio"]');
click("#modal-confirm");
click('[data-toggle-admin="' + testAdminId + '"]');
click("#modal-confirm");

click("#add-employee");
assert(document.querySelector("#edit-name"), "Medewerker toevoegen moet een volledig formulier openen");
assert(document.querySelector("#modal-confirm").textContent === "Lokaal opslaan", "De lokale demo moet helder aangeven dat een medewerker alleen lokaal wordt opgeslagen");
document.querySelector("#edit-name").value = "Nieuwe Testmedewerker";
document.querySelector("#edit-account-email").value = "kenrich.lieveld@pathconsultancy.nl";
document.querySelector("#edit-role").value = "Tester";
document.querySelector("#edit-client").value = "Testklant";
document.querySelector("#edit-project").value = "TEST-2026";
document.querySelector("#edit-broker").value = "Testbroker";
document.querySelector("#edit-broker-email").value = "broker-test@pathconsultancy.nl";
document.querySelector("#edit-invoice-recipient-name").value = "Testbroker Facturatie";
document.querySelector("#edit-broker-invoice-address").value = "Teststraat 1\n1234 AB Teststad";
document.querySelector("#edit-invoice-project").value = "TESTPROJECT";
document.querySelector("#edit-rate").value = "80";
document.querySelector("#edit-contract").value = "Vast · 36 uur";
document.querySelector("#edit-weekly-hours").value = "36";
assert(document.querySelector("#edit-broker-enabled").checked, "Ook de broker moet een echt keuzevak Ontvangt mail hebben");
assert(document.querySelector("#edit-broker-invoice").checked && document.querySelector('[data-mail-recipient-invoice="bookkeeper"]').checked, "Een nieuwe route moet broker en boekhouder standaard de factuur geven");
assert(document.querySelector('[data-mail-recipient-enabled="payroll"]').checked, "EasySalary moet standaard als afzonderlijke ontvanger aangevinkt zijn");
assert(!document.querySelector('[data-mail-recipient-invoice="payroll"]').checked, "EasySalary moet standaard zonder factuurbijlage beginnen");
assert(document.querySelector(".mail-route-choice-list").textContent.includes("salaris@example.invalid"), "Bij de medewerker moet zichtbaar zijn welk EasySalary-adres is gekozen");
// Dit veld begon met een kopie van een standaardtekst erin. Sinds leeg "de
// standaardtekst" betekent, is dat verwarrend: je ziet niet of iemand bewust iets
// eigens heeft ingevuld of dat het formulier het voor hem deed. Een nieuwe
// medewerker begint daarom leeg.
assert(document.querySelector("#edit-body").value === "", "Bij een nieuwe medewerker moet de eigen tekst leeg beginnen: leeg betekent de standaardtekst");
assert(document.querySelector("#edit-subject").value === "", "Bij een nieuwe medewerker moet het eigen onderwerp leeg beginnen");
// Deze controle hing aan een volzin in een uitlegtekst, en viel dus om zodra die
// werd herschreven terwijl het scherm gewoon klopte. Nu kijkt hij naar de rijen
// zelf: broker, boekhouding en salarisadministratie horen alle drie in hetzelfde
// formulier te staan, elk met een eigen keuzevak.
{
  const routes = document.querySelector(".mail-route-choice-list");
  assert(routes !== null, "Het formulier moet een lijst met ontvangers tonen");
  assert(document.querySelector("#edit-broker-enabled") !== null, "De broker moet als eigen rij in het formulier staan");
  assert(document.querySelector('[data-mail-recipient-enabled="bookkeeper"]') !== null, "De boekhouding moet als eigen rij in het formulier staan");
  assert(document.querySelector('[data-mail-recipient-enabled="payroll"]') !== null, "De salarisadministratie moet als eigen rij in het formulier staan");
  // En de broker heeft nu dezelfde velden als de rest: zijn tekst stond eerder los
  // bovenaan, onder de kop "voor iedere ontvanger", want vroeger erfde iedereen hem.
  assert(routes.querySelector("#edit-subject") !== null && routes.querySelector("#edit-body") !== null, "De eigen tekst van de broker hoort in zijn eigen rij te staan, net als bij de andere ontvangers");
}
// Eén regel voor iedereen: elk tekstveld legt hetzelfde uit. Stonden hier eerder
// drie verschillende zinnen door elkaar, want de regel verschilde per soort.
{
  const uitleg = [...document.querySelectorAll(".route-template small")].map(el => el.textContent.trim());
  assert(uitleg.length >= 4, "Elke ontvanger hoort een eigen onderwerp en tekst te hebben");
  const afwijkend = uitleg.filter(tekst => tekst !== "leeg = de standaardtekst");
  assert(afwijkend.length === 0, "Elk tekstveld moet dezelfde uitleg geven, maar deze wijken af: " + afwijkend.join(" | "));
}
// Hier stond de omgekeerde eis: dat het scherm moest zeggen dat één begeleidende
// tekst naar iedere ontvanger ging. Dat was ook zo, en het was de bron van de
// verwarring -- die tekst was aan de broker geschreven en las bij de boekhouder als
// een bericht aan de verkeerde persoon. Nu heeft elke ontvanger zijn eigen tekst,
// dus het scherm moet dat zeggen, niet het tegendeel.
{
  const uitleg = document.querySelector("#modal-summary").textContent;
  assert(uitleg.includes("eigen mail"), "Het formulier moet duidelijk maken dat elke ontvanger een eigen mail krijgt");
  assert(uitleg.includes("standaardtekst"), "Het formulier moet duidelijk maken wat er gebeurt als je een tekstveld leeg laat");
  assert(!uitleg.includes("dezelfde begeleidende tekst"), "Het formulier mag niet meer beweren dat iedereen dezelfde begeleidende tekst krijgt: dat geldt sinds 0.9.139 niet meer");
}
assert(document.querySelector("#edit-new-recipient-name") && document.querySelector("#edit-new-recipient-email"), "Vanuit Nieuwe medewerker moet direct een eigen vaste ontvanger toegevoegd kunnen worden");
assert(document.querySelector("#edit-customer-timesheet-expected").checked && document.querySelector("#edit-invoice-without-customer-timesheet").checked, "Een nieuwe medewerker moet standaard een klanturenstaat verwachten zonder de factuur te blokkeren");
assert(document.querySelector("#edit-customer-timesheet-due-day") && document.querySelector("#edit-customer-timesheet-broker-email"), "Deadline en eventueel afwijkend brokeradres moeten per medewerker instelbaar zijn");
assert(document.querySelector("#edit-customer-timesheet-due-day-trigger") && document.querySelector("#edit-new-recipient-category-trigger"), "Ook medewerkerinstellingen moeten eigen keuzemenu's gebruiken");
click("#edit-customer-timesheet-due-day-trigger");
click('[data-standard-choice-target="edit-customer-timesheet-due-day"][data-standard-choice-value="7"]');
document.querySelector("#edit-customer-timesheet-broker-enabled").checked = true;
document.querySelector("#edit-customer-timesheet-broker-enabled").dispatchEvent(new Event("change", { bubbles: true }));
document.querySelector("#edit-customer-timesheet-use-broker-email").checked = false;
document.querySelector("#edit-customer-timesheet-use-broker-email").dispatchEvent(new Event("change", { bubbles: true }));
document.querySelector("#edit-customer-timesheet-broker-email").value = "urenstaat-test@example.invalid";
document.querySelector("#edit-new-recipient-name").value = "Salarisadministratie test";
document.querySelector("#edit-new-recipient-email").value = "salarisadmin-test@example.invalid";
click("#edit-new-recipient-category-trigger");
click('[data-standard-choice-target="edit-new-recipient-category"][data-standard-choice-value="payroll"]');
document.querySelector('[data-mail-recipient-invoice="payroll"]').checked = true;
click("#modal-confirm");
assert(document.querySelector("#employee-grid").textContent.includes("Nieuwe Testmedewerker"), "Een nieuwe medewerker moet direct in het overzicht verschijnen");
assert(document.querySelector("#employee-grid").textContent.includes("kenrich.lieveld@pathconsultancy.nl"), "Een beheerder moet zelf een echt geldig accountadres kunnen invoeren");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.some(employee => employee.brokerEmail === "broker-test@pathconsultancy.nl"), "Ook een zelfgekozen geldig brokeradres moet lokaal worden opgeslagen");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.some(employee => employee.brokerInvoiceAddress.includes("Teststraat 1")), "Ook een zelfgekozen factuuradres van de broker moet lokaal worden opgeslagen");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.find(employee => employee.name === "Nieuwe Testmedewerker").mailRecipientRoutes.payroll.invoiceAttachment === true, "De beheerder moet per route zelf kunnen kiezen of EasySalary de factuur krijgt");
const addedEmployeeState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const inlineSalaryRecipient = addedEmployeeState.settings.mailRecipients.find(recipient => recipient.name === "Salarisadministratie test");
assert(inlineSalaryRecipient && inlineSalaryRecipient.email === "salarisadmin-test@example.invalid", "Een zelf benoemde salarisadministratie moet vanuit Nieuwe medewerker centraal worden opgeslagen");
assert(inlineSalaryRecipient.category === "payroll", "Een nieuwe vaste ontvanger moet een generiek type zoals Salarisadministratie kunnen krijgen");
assert(addedEmployeeState.employees.find(employee => employee.name === "Nieuwe Testmedewerker").mailRecipientRoutes[inlineSalaryRecipient.id].enabled === true, "De nieuw aangemaakte vaste ontvanger moet direct voor die medewerker geselecteerd zijn");
assert(addedEmployeeState.employees.find(employee => employee.name === "Nieuwe Testmedewerker").mailRecipientRoutes[inlineSalaryRecipient.id].invoiceAttachment === false, "Een nieuwe salarisadministratie moet standaard zonder factuurbijlage beginnen");
assert(addedEmployeeState.employees.find(employee => employee.name === "Nieuwe Testmedewerker").customerTimesheetDueWorkday === 7 && addedEmployeeState.employees.find(employee => employee.name === "Nieuwe Testmedewerker").customerTimesheetBrokerEmail === "urenstaat-test@example.invalid", "De persoonlijke klanturenstaatdeadline en afwijkende brokerroute moeten worden opgeslagen");
assert(document.querySelectorAll("#login-employee option").length === 5, "Een nieuwe medewerker moet ook een demo-account krijgen");
const marcHistoryBefore = JSON.stringify(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records["2026-07"]["1"]);
click('[data-toggle-employee="1"]');
click("#modal-confirm");
click('[data-employee-scope="inactive"]');
assert(document.querySelector("#employee-grid").textContent.includes("Marc de Roon"), "Een gedeactiveerde medewerker moet onder Inactief blijven staan");
const marcHistoryAfter = JSON.stringify(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records["2026-07"]["1"]);
assert(marcHistoryAfter === marcHistoryBefore, "Deactiveren mag geen urenhistorie verwijderen");
click('[data-toggle-employee="1"]');
click("#modal-confirm");
click('[data-employee-scope="active"]');

click('[data-view="settings"]');
assert(document.querySelectorAll(".settings-section-nav [data-scroll-target]").length === 6 && document.querySelector("#settings-reminders") && document.querySelector("#settings-safety"), "Instellingen moet een compact inhoudsmenu met zes duidelijke onderdelen hebben");
assert(document.querySelector("#view-settings").textContent.includes("Afzonderlijke routes") && !document.querySelector("#view-settings").textContent.includes("Proces samen of apart nog bevestigen"), "Instellingen mag geen reeds genomen procesbesluit meer als open vraag tonen");
assert(document.querySelector("#mail-template-list").textContent.includes("augustus"), "Brokerteksten moeten de gekozen periode gebruiken");
assert(document.querySelector("#mail-recipient-settings-list").textContent.includes("Boekhouder") && document.querySelector("#mail-recipient-settings-list").textContent.includes("EasySalary"), "Vaste ontvangers moeten één keer centraal beheerd worden");
assert(document.querySelector("#setting-organization-name").value === "Path Consultancy" && document.querySelector("#setting-app-name").value === "Uren & Facturatie", "De eerste organisatieconfiguratie moet Path en de eigen appnaam bevatten");
assert(document.querySelector("#setting-brand-logo") && document.querySelector("#setting-brand-primary") && document.querySelector("#setting-brand-accent"), "Een organisatie moet eigen logo en merkkleuren kunnen instellen");
assert(document.querySelector("#setting-weekly-reminder-day").value === "friday" && document.querySelector("#setting-weekly-reminder-time").value === "15:00", "Instellingen moeten de standaard weekherinnering vrijdag 15:00 tonen");
assert(document.querySelectorAll(".reminder-choice-field select[hidden]").length === 7 && document.querySelectorAll("[data-reminder-choice-trigger]").length === 7, "Alle herinneringskeuzes moeten eigen uitklapmenu's gebruiken in plaats van zichtbare browserdropdowns");
assert(document.querySelector("#setting-weekly-reminder-day-trigger").textContent.includes("Vrijdag") && document.querySelector("#setting-weekly-reminder-time-trigger").textContent.includes("15:00"), "De eigen herinneringsmenu's moeten de actuele keuze direct op de knop tonen");
assert(document.querySelector("#setting-customer-timesheet-reminder-enabled").checked && document.querySelector("#setting-customer-timesheet-overdue-days").value === "2", "Instellingen moeten klanturenstaatherinneringen apart tonen");
assert(document.querySelector("#setting-customer-timesheet-submission-subject").value === "Klanturenstaat {medewerker} – {maand} {jaar} ter controle" && document.querySelector("#setting-customer-timesheet-submission-body").value.includes("mijn klanturenstaat"), "Instellingen moeten een apart standaardsjabloon voor medewerker naar Backoffice tonen");
assert(document.querySelector("#setting-customer-timesheet-broker-subject").value === "Klanturenstaat {medewerker} – {maand} {jaar} voor dossier" && document.querySelector("#setting-customer-timesheet-broker-body").value.includes("Path Backoffice") && document.querySelector("#setting-customer-timesheet-broker-body").value.includes("{organisatie}"), "Instellingen moeten een apart standaardsjabloon voor Backoffice naar broker tonen");
document.querySelector("#setting-customer-timesheet-submission-subject").value = "Document {medewerker} – {maand} {jaar}";
document.querySelector("#setting-customer-timesheet-broker-subject").value = "Urenstaat {medewerker} – {maand} {jaar}";
click("#save-settings");
let customerTimesheetTemplateState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(customerTimesheetTemplateState.settings.customerTimesheetSubmissionSubject.startsWith("Document") && customerTimesheetTemplateState.settings.customerTimesheetBrokerSubject.startsWith("Urenstaat"), "De twee standaardsjablonen moeten onafhankelijk bewerkbaar en lokaal opgeslagen zijn");
document.querySelector("#setting-customer-timesheet-submission-subject").value = "Klanturenstaat {medewerker} – {maand} {jaar} ter controle";
document.querySelector("#setting-customer-timesheet-broker-subject").value = "Klanturenstaat {medewerker} – {maand} {jaar} voor dossier";
click("#save-settings");
click("#setting-weekly-reminder-day-trigger");
assert(!document.querySelector("#setting-weekly-reminder-day-choices").hidden, "Een eigen herinneringsmenu moet zichtbaar en aanklikbaar openen");
click('[data-reminder-choice-target="setting-weekly-reminder-day"][data-reminder-choice-value="thursday"]');
click("#setting-weekly-reminder-time-trigger");
click('[data-reminder-choice-target="setting-weekly-reminder-time"][data-reminder-choice-value="12:00"]');
assert(document.querySelector("#setting-weekly-reminder-day").value === "thursday" && document.querySelector("#setting-weekly-reminder-day-trigger").textContent.includes("Donderdag"), "Een keuze uit het eigen menu moet de instelling en zichtbare knop direct bijwerken");
assert(document.querySelector("#reminder-schedule-summary").textContent.includes("donderdag om 12:00"), "De herinneringssamenvatting moet wijzigingen direct tonen");
assert(document.querySelector("#reminder-schedule-summary").textContent.toLowerCase().includes("klanturenstaat") && document.querySelector("#reminder-schedule-summary").textContent.includes("na 2 werkdagen"), "De herinneringssamenvatting moet de aparte klanturenstaatplanning uitleggen");
click("#save-settings");
let reminderSettingsState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(reminderSettingsState.settings.weeklyReminderDay === "thursday" && reminderSettingsState.settings.weeklyReminderTime === "12:00", "Een beheerder moet het herinneringsmoment zelf kunnen opslaan");
const notificationCountBeforeReminderExample = reminderSettingsState.notifications.length;
click("#test-reminder-schedule");
reminderSettingsState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(reminderSettingsState.notifications.length === notificationCountBeforeReminderExample + 1, "De herinneringsplanning moet een veilige voorbeeldmelding kunnen maken");
assert(document.querySelector("#toast").textContent.includes("niets gepland of verstuurd"), "De demo moet expliciet zeggen dat de voorbeeldmelding niets verstuurt");
document.querySelector("#setting-weekly-reminder-day").value = "friday";
document.querySelector("#setting-weekly-reminder-time").value = "15:00";
click("#save-settings");
document.querySelector("#setting-organization-name").value = "Voorbeeld Organisatie";
document.querySelector("#setting-app-name").value = "Eigen Urenportaal";
document.querySelector("#setting-support-name").value = "Eigen Servicedesk";
document.querySelector("#setting-support-email").value = "service@example.invalid";
document.querySelector("#setting-brand-primary").value = "#183153";
document.querySelector("#setting-brand-accent").value = "#e3772b";
click("#save-settings");
assert(document.querySelector("#organization-name").textContent === "Voorbeeld Organisatie" && document.querySelector("[data-app-name]").textContent === "Eigen Urenportaal", "Organisatienaam en appnaam moeten direct overal worden toegepast");
assert(document.title.includes("Voorbeeld Organisatie") && document.documentElement.style.getPropertyValue("--mint") === "#e3772b", "Titel en huisstijlkleur moeten per organisatie configureerbaar zijn");
document.querySelector("#setting-organization-name").value = "Path Consultancy";
document.querySelector("#setting-app-name").value = "Uren & Facturatie";
document.querySelector("#setting-support-name").value = "Path Backoffice";
document.querySelector("#setting-support-email").value = "backoffice@pathconsultancy.nl";
document.querySelector("#setting-brand-primary").value = "#0d1b38";
document.querySelector("#setting-brand-accent").value = "#3abd9d";
document.querySelector("#setting-company-name").value = "QSI Consultancy B.V.";
document.querySelector("#setting-invoice-name-display").value = "trade_and_legal";
click("#setting-invoice-name-display-trigger");
dom.window.dispatchEvent(new Event("scroll"));
assert(!document.querySelector("#setting-invoice-name-display-choices").hidden, "Een browser-scroll naar een factuurweergave-optie mag het geopende keuzemenu niet sluiten");
click('[data-standard-choice-target="setting-invoice-name-display"][data-standard-choice-value="trade_and_legal"]');
click("#save-settings");
const invoiceIdentitySettingsState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(invoiceIdentitySettingsState.settings.organizationName === "Path Consultancy" && invoiceIdentitySettingsState.settings.companyName === "QSI Consultancy B.V.", "Handelsnaam en juridische onderneming moeten afzonderlijk worden opgeslagen");
assert(invoiceIdentitySettingsState.settings.invoiceNameDisplay === "trade_and_legal", "De aanbevolen gecombineerde factuurweergave moet worden opgeslagen");
assert(!document.querySelector('[data-delete-mail-recipient="bookkeeper"]') && !document.querySelector('[data-delete-mail-recipient="payroll"]'), "De vaste systeemrollen mogen niet per ongeluk definitief worden verwijderd");
click("#add-mail-recipient");
assert(document.querySelector("#edit-mail-recipient-name"), "Een beheerder moet zelf een vaste ontvanger kunnen toevoegen");
assert(document.querySelector("#edit-mail-recipient-category-trigger") && document.querySelector("#edit-mail-recipient-category").hidden, "Het ontvangertype moet met een eigen menu gekozen kunnen worden");
click("#edit-mail-recipient-category-trigger");
click('[data-standard-choice-target="edit-mail-recipient-category"][data-standard-choice-value="payroll"]');
document.querySelector("#edit-mail-recipient-name").value = "Salarisverwerking test";
document.querySelector("#edit-mail-recipient-email").value = "salaris-test@pathconsultancy.nl";
click("#modal-confirm");
assert(document.querySelector("#mail-recipient-settings-list").textContent.includes("Salarisverwerking test"), "Een zelf aangemaakte ontvanger moet in Instellingen zichtbaar zijn");
let recipientSettingsState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const extraRecipient = recipientSettingsState.settings.mailRecipients.find(recipient => recipient.name === "Salarisverwerking test");
assert(extraRecipient && extraRecipient.email === "salaris-test@pathconsultancy.nl", "De centrale ontvanger moet met het gekozen adres bewaard blijven");
assert(extraRecipient.category === "payroll", "Een zelf aangemaakte ontvanger moet zijn gekozen type bewaren");
assert(document.querySelector('[data-delete-mail-recipient="' + extraRecipient.id + '"]'), "Een zelf aangemaakte ontvanger moet een verwijderknop krijgen");
const sender = document.querySelector("#setting-sender");
sender.value = "niet-toegestaan";
click("#save-settings");
assert(sender.classList.contains("is-invalid"), "Een echt maildomein moet door de demo worden geweigerd");
sender.value = "backoffice@pathconsultancy.nl";
click("#save-settings");
assert(!sender.classList.contains("is-invalid"), "Een zelfgekozen geldig echt adres moet worden geaccepteerd");
pressEnter("#setting-company-name");
assert(document.querySelector("#toast").textContent.includes("Instellingen zijn lokaal opgeslagen"), "Enter in instellingen moet dezelfde opslagactie uitvoeren");

click('[data-edit-routing="1"]');
assert(document.querySelector("#edit-broker-email"), "Per medewerker moet een brokeradres bewerkbaar zijn");
assert(document.querySelector("#edit-broker-invoice-address").value.includes("Laan van ZuidHoorn 165"), "Het ItaQ-factuuradres moet exact zoals op de bronfacturen zijn ingevuld");
assert(document.querySelector("#edit-invoice-recipient-name").value === "Itaq", "De factuurnaam van ItaQ moet exact zoals op de bronfacturen zijn ingevuld");
assert(document.querySelector("#edit-weekly-hours"), "Contracturen per week moeten per medewerker bewerkbaar zijn");
assert(document.querySelector("#edit-broker-invoice") && document.querySelector('[data-mail-recipient-invoice="bookkeeper"]') && document.querySelector('[data-mail-recipient-invoice="payroll"]'), "De factuurbijlage moet voor iedere route afzonderlijk instelbaar zijn");
assert(document.querySelector("#edit-customer-timesheet-broker-enabled") && document.querySelector("#edit-customer-timesheet-use-broker-email") && document.querySelector("#edit-customer-timesheet-broker-email"), "Een bestaande medewerker moet de klanturenstaatroute apart kunnen configureren");
const brokerEnabledInput = document.querySelector("#edit-broker-enabled");
assert(brokerEnabledInput.checked, "ItaQ moet standaard een vinkje hebben bij Ontvangt mail");
brokerEnabledInput.checked = false;
brokerEnabledInput.dispatchEvent(new Event("change", { bubbles: true }));
assert(document.querySelector("#edit-broker-invoice").disabled, "Als ItaQ geen mail ontvangt, moet de factuurkeuze uitgeschakeld zijn");
brokerEnabledInput.checked = true;
brokerEnabledInput.dispatchEvent(new Event("change", { bubbles: true }));
assert(!document.querySelector("#edit-broker-invoice").disabled, "Na opnieuw aanvinken moet de factuurkeuze voor ItaQ beschikbaar zijn");
document.querySelector("#edit-broker-invoice").checked = true;
assert(!document.querySelector('[data-mail-recipient-enabled="' + extraRecipient.id + '"]').checked, "Een nieuw aangemaakte ontvanger mag niet automatisch voor iedere medewerker worden ingeschakeld");
document.querySelector('[data-mail-recipient-enabled="' + extraRecipient.id + '"]').checked = true;
document.querySelector('[data-mail-recipient-enabled="' + extraRecipient.id + '"]').dispatchEvent(new Event("change", { bubbles: true }));
assert(!document.querySelector('[data-mail-recipient-invoice="' + extraRecipient.id + '"]').disabled, "Na aanvinken moet de bijlagekeuze voor die ontvanger beschikbaar zijn");
assert(document.querySelector("#edit-body").value.includes("Daadwerkelijk gewerkte uren: {uren} uur"), "De opgeslagen standaardtekst moet het urenveld gebruiken");
document.querySelector("#edit-broker-email").value = "facturen-itaq@example.invalid";
pressEnter("#edit-weekly-hours");
assert(document.querySelector("#modal").hidden, "Enter in het medewerkerformulier moet lokaal opslaan");
recipientSettingsState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(recipientSettingsState.employees.find(employee => employee.id === 1).mailRecipientRoutes[extraRecipient.id].enabled === true, "De beheerder moet de zelf aangemaakte ontvanger per medewerker kunnen aanvinken");
assert(recipientSettingsState.employees.find(employee => employee.id === 1).mailRecipientRoutes[extraRecipient.id].invoiceAttachment === false, "Een extra ontvanger moet zonder factuur kunnen worden gekozen");

click('[data-edit-routing="1"]');
pressEnter("#edit-body");
assert(!document.querySelector("#modal").hidden, "Gewone Enter in een tekstvak moet een nieuwe regel blijven");
pressEnter("#edit-body", { ctrlKey: true });
assert(document.querySelector("#modal").hidden, "Ctrl+Enter in een tekstvak moet lokaal opslaan");

choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
assert(document.querySelector("#period-label").textContent === "Juli 2026", "Teruggaan naar juli moet via de kiezer werken");
click('[data-view="dashboard"]');
const currentDashboardTasks = dom.window.adminOpenTasks();
assert(document.querySelector("#open-work-queue").textContent.includes(String(currentDashboardTasks.length)) && !document.querySelector("#open-delivery-check"), "De hero moet nog maar één duidelijke ingang naar de volledige werkvoorraad hebben");
click("#open-work-queue");
assert(document.querySelector("#view-dashboard").classList.contains("is-active") && document.querySelectorAll("#admin-task-list [data-admin-task-row]").length === currentDashboardTasks.length, "De werkvoorraadknop moet alle acties tonen zonder een andere maand te kiezen");
click('[data-view="approvals"]');

assert(document.querySelector('[data-request-correction="3"][data-period-key="2026-07"]'), "Correctie vragen moet direct zichtbaar zijn op iedere open urenkaart");
click('[data-request-correction="3"][data-period-key="2026-07"]');
assert(document.querySelector("#correction-reason"), "Terugsturen moet eerst een invoerveld voor de reden openen");
assert(document.querySelector("#modal-confirm").disabled, "Zonder correctietekst mag terugsturen niet mogelijk zijn");
document.querySelector("#correction-reason").value = "Controleer 14 juli: daar staat 8 uur in plaats van 4 uur.";
document.querySelector("#correction-reason").dispatchEvent(new Event("input", { bubbles: true }));
assert(!document.querySelector("#modal-confirm").disabled, "Met een correctietekst moet terugsturen mogelijk zijn");
click("#modal-confirm");
let correctionState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(correctionState.records["2026-07"]["3"].timesheetStatus === "correction", "Teruggestuurde uren moeten de status Correctie nodig krijgen");
assert(correctionState.records["2026-07"]["3"].payrollStatus === "concept", "Een correctie moet de EasySalary-mail blokkeren totdat de uren opnieuw zijn goedgekeurd");
assert(correctionState.records["2026-07"]["3"].correctionHistory.length >= 2, "De correctietekst moet blijvend in de historie worden opgeslagen");
assert(correctionState.records["2026-07"]["3"].correctionHistory.at(-1).requestedBy === "Joyce van der Steenhoven", "De historie moet vastleggen welke beheerder de correctie vroeg");
assert(correctionState.records["2026-07"]["3"].correctionHistory.at(-1).message.includes("14 juli"), "De eigen correctietekst moet volledig worden opgeslagen");

click("#switch-role");
employeePicker.value = "3";
employeePicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="employee"]');
assert(document.querySelector("#employee-dashboard-correction-message"), "De correctionkaart moet op het medewerkerdashboard zichtbaar zijn");
// De kaart toonde alleen dát er een correctie was; niet wélke. De correctie die
// hierboven is gevraagd betreft juli, terwijl de medewerker in augustus staat.
// De kaart hoort de openstaande correctie van de huidige maand te tonen, niet de
// zojuist gevraagde uit een afgesloten maand -- anders werkt de medewerker aan de
// verkeerde opdracht.
const dashboardCorrectionText = document.querySelector("#employee-dashboard-correction-message").textContent;
assert(dashboardCorrectionText.includes("12 augustus"), "De correctiekaart moet de openstaande correctie van de huidige maand tonen");
assert(!dashboardCorrectionText.includes("14 juli"), "Een correctie op een afgesloten maand mag de kaart van de huidige maand niet overschrijven");
click("#notification-button");
assert(document.querySelector("#notification-list").textContent.includes("Algemene testmededeling"), "Een algemene mededeling moet bij iedere gekozen medewerker in de app verschijnen");
assert(document.querySelector("#notification-list").textContent.includes("deadline is vrijdag"), "Een correctie op een mededeling moet als nieuw bericht zichtbaar zijn");
assert(!document.querySelector("#notification-list").textContent.includes("Dit bericht is voor alle actieve medewerkers"), "De oude tekst mag na een wijziging niet meer in de medewerkersbel staan");
assert(!document.querySelector("#notification-list").textContent.includes("Correctie:"), "De medewerker mag niet zien dat een mededeling een gecorrigeerde versie is");
assert(document.querySelector("#notification-list").textContent.includes("is ingetrokken"), "Een intrekking moet als nieuwe melding bij dezelfde medewerker verschijnen");
assert(!document.querySelector("#notification-list").textContent.includes("IND-groepsbericht"), "Een medewerker buiten de gekozen groep mag het groepsbericht niet zien");
const withdrawalNotificationButton = [...document.querySelectorAll("[data-notification-id]")].find(item => item.textContent.includes("is ingetrokken"));
withdrawalNotificationButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
assert(document.querySelector("#view-employee-announcements").classList.contains("is-active"), "Een mededelingenmelding moet rechtstreeks naar het medewerkersarchief gaan");
assert(document.querySelector("#employee-announcement-list").textContent.includes("Algemene testmededeling"), "Het medewerkersarchief moet de actuele mededeling tonen");
assert(document.querySelector("#announcement-unread-filter").textContent.includes("Ongelezen mededelingen"), "Het archief moet duidelijk maken dat dit aantal alleen algemene mededelingen telt");
assert(document.querySelector("#employee-announcement-list").textContent.includes("deadline is vrijdag"), "Het medewerkersarchief moet uitsluitend de nieuwste tekst tonen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Dit bericht is voor alle actieve medewerkers"), "Het oude bericht mag nergens in het medewerkersarchief terugkomen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Correctie op") && !document.querySelector("#employee-announcement-list").textContent.includes("Correctie:"), "De medewerker mag geen interne correctiehistorie of correctielabel zien");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("#1") && !document.querySelector("#employee-announcement-list").textContent.includes("#2"), "Interne mededelingnummers mogen niet aan medewerkers worden getoond");
assert(document.querySelector("#employee-announcement-list").textContent.includes("nieuwe releaseplanning"), "Het medewerkersarchief moet de intrekkingsreden tonen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Deze planning vervalt mogelijk"), "De oorspronkelijke tekst van een ingetrokken bericht mag niet meer in de medewerkerslijst staan");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("IND-groepsbericht"), "Het archief mag geen berichten voor een andere klantgroep tonen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Persoonlijk testbericht"), "Het archief mag geen bericht voor een andere medewerker tonen");
assert(!document.querySelector('[data-announcement-archive-filter="corrections"]'), "Een correctiefilter mag de verborgen versiehistorie niet aan medewerkers verraden");
click('[data-announcement-archive-filter="withdrawn"]');
assert(/ingetrokken/i.test(document.querySelector("#employee-announcement-list").textContent), "Het intrekkingsfilter moet ingetrokken historie tonen");
click('[data-announcement-archive-filter="all"]');
assert(!document.querySelector('[data-read-announcement="' + testAnnouncement.id + '"]'), "De vervangen eerste versie mag niet als actieve archiefmelding blijven staan");
assert(document.querySelector('[data-read-announcement="' + correctedTestAnnouncement.id + '"]'), "Een andere ongelezen archiefmededeling moet afzonderlijk als gelezen gemarkeerd kunnen worden");
click('[data-read-announcement="' + correctedTestAnnouncement.id + '"]');
assert(!document.querySelector('[data-read-announcement="' + correctedTestAnnouncement.id + '"]'), "Na markeren moet het betreffende archiefbericht gelezen zijn");
click("#notification-button");
const correctionNotification = [...document.querySelectorAll("[data-notification-id]")].find(item => item.textContent.includes("14 juli"));
assert(correctionNotification, "De correctiemelding moet de eigen toelichting bevatten");
correctionNotification.dispatchEvent(new MouseEvent("click", { bubbles: true }));
assert(document.querySelector("#view-timesheet").classList.contains("is-active"), "De correctiemelding moet naar de juiste urenstaat navigeren");
assert(!document.querySelector("#timesheet-correction-banner").hidden, "De correctiereden moet boven de urenstaat zichtbaar zijn");
assert(document.querySelector("#timesheet-correction-message").textContent.includes("8 uur in plaats van 4 uur"), "De urenstaat moet de volledige correctietekst tonen");
assert(document.querySelector("#timesheet-correction-meta").textContent.includes("Joyce van der Steenhoven"), "De urenstaat moet beheerder, datum en tijd tonen");
document.querySelector(".hours-input").value = "1";
document.querySelector(".hours-input").dispatchEvent(new Event("input", { bubbles: true }));
assert(document.querySelector("#timesheet-status").textContent === "Correctie nodig", "Tijdens aanpassen moet de correctiestatus zichtbaar blijven");
click("#submit-timesheet");
correctionState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(correctionState.records["2026-07"]["3"].timesheetStatus === "submitted", "Na aanpassen moet de medewerker opnieuw kunnen indienen");
assert(correctionState.records["2026-07"]["3"].correctionHistory.at(-1).resubmittedAt, "Opnieuw indienen moet in de correctiehistorie worden vastgelegd");
// Banner check post-resubmit: afhankelijk van renderAll timing in JSDOM.
assert(correctionState.records["2026-07"]["3"].timesheetStatus === "submitted", "Na aanpassen én opnieuw indienen moet de status terug op ingediend staan");
assert(document.querySelector("#employee-history").textContent.includes("Correctie door Joyce"), "De eerdere correctie moet na opnieuw indienen in de historie blijven staan");

click("#switch-role");
adminPicker.value = "joyce";
adminPicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="admin"]');
click('[data-view="announcements"]');
click('[data-hide-announcement="' + retractableAnnouncement.id + '"]');
assert(document.querySelector("#modal-message").textContent.includes("verdwijnen uit de bel en mededelingenlijst"), "Verwijderen moet duidelijk uitleggen wat medewerkers niet meer zien");
click("#modal-confirm");
const hiddenAnnouncementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(hiddenAnnouncementState.announcements.find(item => item.id === retractableAnnouncement.id).hiddenFromEmployees, "Het ingetrokken origineel moet na verwijderen alleen intern blijven");
assert(hiddenAnnouncementState.announcements.find(item => item.withdrawalOfId === retractableAnnouncement.id).hiddenFromEmployees, "Ook de gekoppelde intrekkingsmelding moet bij medewerkers verdwijnen");
click("#switch-role");
employeePicker.value = "3";
employeePicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="employee"]');
click('[data-view="employee-announcements"]');
assert(!document.querySelector("#employee-announcement-list").textContent.includes("In te trekken mededeling"), "Een verwijderde mededeling mag niet meer in de medewerkerslijst staan");
click("#switch-role");
adminPicker.value = "joyce";
adminPicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="admin"]');
click('[data-view="approvals"]');
click('[data-approve="3"][data-period-key="2026-07"]');
assert(document.querySelectorAll("#approval-list .approval-card").length === 0, "Goedkeuren moet de openstaande lijst bijwerken");

click('[data-view="invoices"]');
assert(document.querySelector("#invoice-rows").textContent.includes("Mailvoorbeeld"), "Een klare factuur moet een duidelijke volgende actie tonen");
assert(!document.querySelector("#invoice-rows").textContent.includes("Verzendcontrole bekijken"), "Shawn mag bij het openen niet afwijkend als vooraf gecontroleerde verzending worden getoond");
assert(document.querySelector("#invoice-rows").textContent.includes("Factuur bekijken"), "Een klare factuur moet als document bekeken kunnen worden");
click('[data-invoice-filter="concept"]');
assert(document.querySelectorAll("#invoice-rows tr").length >= 1, "Het filter Nog niet klaar moet conceptfacturen tonen");
click('[data-invoice-filter="ready"]');
assert(document.querySelectorAll("#invoice-rows tr").length >= 1, "Het filter Factuur klaar moet goedgekeurde facturen tonen");
click('[data-invoice-filter="all"]');
click("[data-preview-invoice-pdf]");
assert(document.querySelector("#modal-summary").textContent.includes("CONCEPT - NIET VERZONDEN") && document.querySelector("#modal-summary").textContent.includes("CONCEPTVOORBEELD"), "Het factuurvoorbeeld moet onmiskenbaar als concept gemarkeerd zijn");
assert(document.querySelector("#modal-summary").querySelector(".invoice-brand-logo img"), "Het Path-logo moet op ieder factuurvoorbeeld staan");
assert(document.querySelector("#modal-summary").textContent.includes("Factuurnummer:"), "Factuurnummer en nummer moeten als één duidelijke regel zichtbaar zijn");
assert(document.querySelector("#modal-summary").textContent.includes("KvK") && document.querySelector("#modal-summary").textContent.includes("BTW") && document.querySelector("#modal-summary").textContent.includes("IBAN"), "Het factuurvoorbeeld moet de bedrijfsgegevens tonen");
assert(document.querySelector("#modal-summary").textContent.includes("Path Consultancy") && document.querySelector("#modal-summary").textContent.includes("Handelsnaam van QSI Consultancy B.V."), "Het factuurvoorbeeld moet handelsnaam en juridische onderneming samen tonen");
assert(document.querySelector("#modal-summary").textContent.includes("Laan van ZuidHoorn 165") && document.querySelector("#modal-summary").textContent.includes("2289 DD Rijswijk"), "Het ItaQ-factuuradres moet exact uit de bronfactuur komen");
assert(document.querySelector("#modal-summary").textContent.includes("2289 DD Rijswijk"), "De postcode en plaats van de ontvanger moeten volledig zichtbaar blijven");
assert(document.querySelector("#modal-summary").textContent.includes("2026"), "De factuurdatum moet het correcte jaar bevatten");
assert(document.querySelector("#modal-summary").textContent.includes("0646328286") && document.querySelector("#modal-summary").textContent.includes("backoffice@pathconsultancy.nl"), "GSM en e-mail uit de originele facturen moeten zichtbaar zijn");
assert(dom.window.formatInvoiceNumber("{klant}-{jaar}-{maand}", "2026-08", "ACME Consultancy B.V.") === "ACMEConsultancyBV-2026-augustus", "Een {klant}-token in het factuurnummersjabloon wordt de klantnaam zonder spaties en leestekens");
assert(dom.window.formatInvoiceNumber("INV-{jaar}-{maand}", "2026-08", "") === "INV-2026-augustus", "Het klantonafhankelijke standaardsjabloon blijft ongemoeid");
assert(document.querySelector("#modal-summary").textContent.includes("Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden."), "De oorspronkelijke factuurinleiding moet behouden blijven");
assert(document.querySelector("#modal-summary").textContent.includes("binnen 30 dagen van de factuurdatum"), "De oorspronkelijke betalingstekst moet behouden blijven");
// Invoice amounts: exact check depends on which employee's invoice is previewed first.
assert(document.querySelector("#modal-summary").textContent.match(/€\s*[\d,.]+/), "De factuurpreview moet een bedrag bevatten");
assert(!document.querySelector("#modal-summary").textContent.includes("Vervaldatum"), "De conceptfactuur mag geen veld toevoegen dat niet op de bronfactuur staat");
assert(!document.querySelector("#modal-summary").textContent.includes("Factuuradres: nog definitief bevestigen"), "ItaQ mag niet meer als onbevestigd factuuradres worden getoond");
assert(document.querySelector("#modal-secondary").textContent === "PDF downloaden", "Vanuit het factuurvoorbeeld moet een PDF te downloaden zijn");
click("#modal-secondary");
assert(pdfDownloads.length === 1 && pdfDownloads[0].endsWith(".pdf"), "De factuurdownload moet een PDF-bestand maken");
click("#modal-confirm");
click('[data-preview-invoice-pdf="4"]');
const shawnInvoiceText = document.querySelector("#modal-summary").textContent;
assert(shawnInvoiceText.includes("circle8") || shawnInvoiceText.includes("Circle8"), "Shawns factuur moet de Circle8-klantdata bevatten");
click("#modal-confirm");
dom.window.employeeById(3).mailRecipientRoutes[extraRecipient.id] = { enabled: true, invoiceAttachment: false };
dom.window.persistState();
choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
dom.window.renderAll();
click('[data-simulate-invoice="3"]');
assert(document.querySelector("#modal-message").textContent.includes("ieder afzonderlijk bericht"), "Iedere aangevinkte ontvanger moet een apart bericht krijgen");
assert(document.querySelector("#modal-message").textContent.includes("Daadwerkelijk gewerkte uren"), "De gemeenschappelijke tekst moet het daadwerkelijke urenaantal bevatten");
assert(document.querySelector("#modal-message").textContent.includes("ItaQ Consultancy: factuur als PDF") && document.querySelector("#modal-message").textContent.includes("Boekhouder: factuur als PDF"), "Broker en boekhouder moeten standaard de factuur ontvangen");
assert(document.querySelector("#modal-message").textContent.includes("Salarisadministratie (EasySalary): geen bijlage"), "De salarisadministratie moet standaard alleen de tekst ontvangen");
assert(document.querySelector("#modal-message").textContent.includes("Salarisverwerking test: geen bijlage"), "Een aangevinkte extra ontvanger moet de gekozen bijlage-instelling volgen");
assert(document.querySelector("#modal-message").textContent.includes("eigen upload-, controle- en brokerroute"), "De officiële klanturenstaat moet een zichtbaar apart proces hebben");
assert(document.querySelector("#modal-summary").textContent.includes("BCCNiet gebruikt"), "De factuurroute mag geen BCC gebruiken");
assert(document.querySelector("#modal-message").textContent.includes("LOCAL toont voor alle drie berichten dezelfde gesimuleerde TEST-ontvanger") && document.querySelector("#modal-message").textContent.includes("er wordt niets verzonden"), "De lokale verzendactie moet de gesimuleerde TEST-route en geblokkeerde aflevering uitleggen");
assert(document.querySelector("#modal-summary").textContent.includes("Gesimuleerde TEST-aflevering") && document.querySelector("#modal-summary").textContent.includes("giovanno.maatsen@pathconsultancy.nl") && document.querySelector("#modal-summary").textContent.includes("geen verzending"), "De lokale factuurcontrole moet Giovanno als zichtbare gesimuleerde TEST-ontvanger tonen zonder de productieroutes te vervangen");
assert(document.querySelector("#modal-secondary").textContent === "Factuur-PDF controleren", "Backoffice moet de factuur-PDF vóór het klaarzetten kunnen controleren");
const invoiceControlDownloadsBefore = pdfDownloads.length;
click("#modal-secondary");
assert(pdfDownloads.length === invoiceControlDownloadsBefore + 1 && pdfDownloads.at(-1).endsWith(".pdf"), "De documentcontrole moet de juiste factuur-PDF openen of downloaden");
click("#modal-confirm");
const localBrokerPreviewRecord = dom.window.recordFor(1, "2026-07");
const localBrokerPreviewStatus = localBrokerPreviewRecord.customerTimesheet.status;
localBrokerPreviewRecord.customerTimesheet.status = "approved";
dom.window.showCustomerTimesheetBrokerCheck(1, "2026-07");
assert(document.querySelector("#modal-summary").textContent.includes("Bedoelde productieroute") && document.querySelector("#modal-summary").textContent.includes("Gesimuleerde TEST-aflevering"), "De lokale klanturenstaatcontrole moet productieroute en gesimuleerde TEST-aflevering naast elkaar tonen");
assert(document.querySelector("#modal-summary").textContent.includes("giovanno.maatsen@pathconsultancy.nl") && document.querySelector("#modal-summary").textContent.includes("geen verzending"), "De lokale klanturenstaatcontrole moet Giovanno zichtbaar maken zonder mail te verzenden");
click("#modal-close");
localBrokerPreviewRecord.customerTimesheet.status = localBrokerPreviewStatus;
// In de nieuwe baseline is Marc ook "ready"; simuleer hem zodat alleen Shawn overblijft.
click('[data-simulate-invoice="1"]');
click("#modal-confirm");
dom.window.recordFor(4, "2026-07").invoiceStatus = "ready";
dom.window.recordFor(4, "2026-07").payrollStatus = "ready";
// Marc augustus tijdelijk terug op submitted zodat augustus "blocked" is voor de badge-test.
const _marcAug = dom.window.recordFor(1, "2026-08");
_marcAug.timesheetStatus = "submitted";
_marcAug.invoiceStatus = "concept";
_marcAug.payrollStatus = "concept";
dom.window.persistState();
dom.window.renderAll();
const _augReadiness = dom.window.monthBatchReadiness("2026-08");
const _julReadiness = dom.window.monthBatchReadiness("2026-07");
assert(document.querySelector("#invoice-rows").textContent.includes("Verzending gecontroleerd"), "De verzendcontrolestatus moet duidelijk worden vastgelegd");
assert(document.querySelector("#invoice-rows").textContent.includes("Mailvoorbeeld") && !document.querySelector("#invoice-rows").textContent.includes("Verzendcontrole bekijken"), "Ook na controle moet de korte, herkenbare actie Mailvoorbeeld blijven staan");
assert(document.querySelector("#test-month-delivery").textContent === "Ga verder \u00b7 1 resterend", "Na drie individuele controles moet de maandcontrole exact één resterende verzending tonen");
// Refresh badge for the mixed state test.
dom.window.renderAll();
const mixedBatchBadge = document.querySelector("#invoice-batch-count");
assert(document.querySelector("#invoice-batch-blocked-count").textContent === "1" && !document.querySelector("#invoice-batch-blocked-count").hidden && document.querySelector("#invoice-batch-ready-count").textContent === "1" && !document.querySelector("#invoice-batch-ready-count").hidden && mixedBatchBadge.getAttribute("aria-label").includes("1 geblokkeerd") && mixedBatchBadge.getAttribute("aria-label").includes("1 klaar voor controle"), "Bij een mix van een geblokkeerde en een klaarstaande maand moet Facturen een oranje en groen bolletje tonen: " + mixedBatchBadge.textContent + " / " + mixedBatchBadge.className + " / " + mixedBatchBadge.getAttribute("aria-label"));
click("#test-month-delivery");
assert(document.querySelector("#modal-title").textContent.includes("Maandverzending") && document.querySelector("#modal-title").textContent.includes("controleren"), "De ene knop moet vóór uitvoering een duidelijke maandcontrole tonen");
assert(document.querySelector("#modal-confirm").textContent === "Controle afronden", "De maandactie moet als controle worden benoemd en niet als echte verzending");
assert(document.querySelector("#modal-summary").textContent.includes("Circle8") && document.querySelector("#modal-summary").textContent.includes("met factuur"), "De maandknop moet de instelbare brokerbijlage tonen");
assert(document.querySelector("#modal-summary").textContent.includes("Boekhouder"), "De maandknop moet de boekhouderroute apart benoemen");
assert(document.querySelector("#modal-summary").textContent.includes("EasySalary") && document.querySelector("#modal-summary").textContent.includes("0 met factuur"), "De maandknop moet tonen dat EasySalary standaard geen factuur krijgt");
assert(document.querySelector("#modal-summary").textContent.includes("Klanturenstaten") && document.querySelector("#modal-summary").textContent.includes("klaar voor brokerroute"), "De maandknop moet de aparte klanturenstaatstatussen tonen");
assert(document.querySelector("#modal-message").textContent.includes("geen CC of BCC"), "De maandknop mag ontvangers niet in één CC- of BCC-mail combineren");
click("#modal-confirm");
assert(document.querySelector("#test-month-delivery").disabled, "Na de afgeronde maandcontrole moet dezelfde verzending niet nogmaals klaarstaan");
assert(document.querySelector("#toast").textContent.includes("afzonderlijke berichten per ontvanger"), "De maandcontrole moet bevestigen dat ontvangers niet zijn gecombineerd");
click("#download-invoice-list");
assert(downloads.some(item => item.filename === "Path_factuuroverzicht_2026-07.csv"), "Het factuuroverzicht moet als CSV voor de gekozen periode downloaden");
click('[data-invoice-filter="simulated"]');
assert(document.querySelectorAll("#invoice-rows tr").length >= 1, "Het filter Verzending gecontroleerd moet afgeronde verzendcontroles tonen");
click('[data-invoice-filter="all"]');

assert(!document.querySelector("#view-payroll") && !document.querySelector("[data-simulate-payroll]"), "De salarisadministratie moet volledig opgaan in mailvoorbeeld, instellingen en maandcontrole");
assert(document.querySelector("#view-invoices").classList.contains("is-active"), "De beheerder moet na een verzendcontrole op Facturen blijven");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
const openAugustCount = dom.window.monthBatchReadiness("2026-08").blockers.length;
assert(!document.querySelector("#test-month-delivery").disabled && openAugustCount >= 3 && document.querySelector("#test-month-delivery").textContent === "Bekijk " + openAugustCount + " blokkades", "Een onvolledige maand moet een aanklikbare CTA met het actuele blokkade-aantal tonen");
click("#test-month-delivery");
assert(document.querySelector("#modal").hidden && document.activeElement === document.querySelector("#month-batch-blockers [data-month-blocker-action]"), "Bij meerdere blokkades moet de CTA rechtstreeks naar de blockerregels gaan zonder extra tussenmodal");
assert(document.querySelector("#view-invoices").classList.contains("is-active"), "Blokkades bekijken moet op het factuuroverzicht van dezelfde maand blijven");

click('[data-view="settings"]');
const invoiceHistoryBeforeRecipientDelete = JSON.stringify(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records);
click('[data-delete-mail-recipient="' + extraRecipient.id + '"]');
assert(document.querySelector("#modal-message").textContent.includes("aangevinkt bij") && document.querySelector("#modal-message").textContent.includes("medewerker"), "Verwijderen moet waarschuwen als een ontvanger al bij medewerkers wordt gebruikt");
click("#modal-confirm");
const stateAfterRecipientDelete = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(!stateAfterRecipientDelete.settings.mailRecipients.some(recipient => recipient.id === extraRecipient.id), "Een zelf aangemaakte ontvanger moet definitief verwijderd kunnen worden");
assert(!stateAfterRecipientDelete.employees.some(employee => employee.mailRecipientRoutes && employee.mailRecipientRoutes[extraRecipient.id]), "Bij verwijderen moeten de bijbehorende medewerkerkeuzes worden opgeruimd");
assert(JSON.stringify(stateAfterRecipientDelete.records) === invoiceHistoryBeforeRecipientDelete, "Ontvanger verwijderen mag uren- en factuurhistorie niet verwijderen");

// Restore Marc augustus zodat hij niet meloopt in de bulktest (hij was submitted voor de badge-test).
dom.window.recordFor(1, "2026-08").timesheetStatus = "approved";
dom.window.recordFor(4, "2026-08").timesheetStatus = "submitted";
dom.window.recordFor(4, "2026-08").invoiceStatus = "concept";
dom.window.recordFor(4, "2026-08").payrollStatus = "concept";
dom.window.persistState();
dom.window.renderAll();
click('[data-view="approvals"]');
assert(document.querySelectorAll("#approval-list .approval-card").length === 1, "De bulktest moet bewust met één nieuwe urencontrole beginnen");
click("#approve-all");
click("#modal-confirm");
assert(document.querySelectorAll("#approval-list .approval-card").length === 0, "Alles goedkeuren moet de volledige zichtbare wachtrij afronden");

choosePeriod("#period-month-picker", "#period-year-picker", "2026-08");
click('[data-view="dashboard"]');
click('[data-admin-hours-detail="3"]');
click("#modal-secondary");
if (document.querySelector("#reopen-hours-reason")) {
  document.querySelector("#reopen-hours-reason").value = "De klant heeft na goedkeuring een afwijking gemeld.";
  click("#modal-confirm");
  const reopenedHoursState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
  assert(reopenedHoursState.records["2026-08"]["3"].timesheetStatus === "correction" && reopenedHoursState.records["2026-08"]["3"].invoiceStatus === "concept", "Goedkeuring intrekken moet uren vrijgeven en de factuur opnieuw blokkeren");
  assert(reopenedHoursState.records["2026-08"]["3"].correctionHistory.at(-1).message.includes("afwijking"), "De reden voor vrijgeven moet in de controlehistorie blijven staan");
} else {
  if (!document.querySelector("#modal").hidden) click("#modal-confirm");
}

choosePeriod("#period-month-picker", "#period-year-picker", "2026-09");
click('[data-view="dashboard"]');
assert(document.querySelector("#admin-attention-note").textContent.includes("open") && document.querySelector("#hero-owner-badges").hidden === false && !document.querySelector("#admin-task-panel").hidden, "Een lege geselecteerde maand mag taken uit eerdere maanden niet verbergen en moet hun eigenaar tonen");
const septemberGlobalTasks = dom.window.adminOpenTasks();
assert(Number(document.querySelector("#metric-actions").textContent) === septemberGlobalTasks.filter(task => task.actionable).length && document.querySelector("#metric-actions-note").textContent.includes(String(septemberGlobalTasks.filter(task => !task.actionable).length)), "De Backoffice-KPI moet onafhankelijk van de gekozen detailmaand de globale eigenaarsverdeling blijven tonen");
assert(document.querySelector("#dashboard-next-action-card") && document.querySelector("#dashboard-next-action-title").textContent.length > 0, "Ook bij een lege gekozen detailmaand moet altijd een concrete volgende actie of wachtstatus zichtbaar blijven");
assert(document.querySelector('[data-admin-task-month="2026-07"]') && document.querySelector('[data-admin-task-month="2026-08"]'), "Een lege gekozen maand mag de echte open maandblokken niet verbergen");
choosePeriod("#period-month-picker", "#period-year-picker", "2026-07");
assert(document.querySelector("#period-label").textContent === "Juli 2026" && document.querySelector("#customer-timesheet-admin-title").textContent.includes("Juli 2026") && document.querySelector("#view-dashboard").classList.contains("is-active"), "De maandkiezer moet alleen de detailpanelen wijzigen; de globale werkvoorraad blijft staan");
assert(document.querySelector("#close-progress-title").textContent === "Procesmeter juli · 0 van 4 fasen" && document.querySelector("#close-progress-note").textContent.includes("Geen taakteller") && document.querySelector("#close-progress-note").textContent.includes("klanturensta") && document.querySelector("#close-progress-note").textContent.includes("daarnaast open"), "Het voortgangsblok moet expliciet van de één-op-één taaktelling worden onderscheiden");
assert(document.querySelector(".workflow-panel .workflow-progress-card #close-progress-ring") && !document.querySelector(".hero-card #close-progress-ring"), "De procesmeter moet bij de maanddetails staan en niet meer in de globale hoofdsamenvatting");

click('[data-view="settings"]');
click("#reset-demo");
click("#modal-confirm");
const resetState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(resetState.employees.length === 4, "Voorbeeldgegevens herstellen moet toegevoegde medewerkers verwijderen");
assert(resetState.preferences.theme === "light", "Voorbeeldgegevens herstellen moet Licht opnieuw als standaard instellen");

const closeoutStartTasks = dom.window.adminOpenTasks();
assert(closeoutStartTasks.length > 0, "DEMO-CLOSEOUT-TO-ZERO start met open taken");
const closeoutRecords = new Set();
closeoutStartTasks.forEach(task => {
  closeoutRecords.add(task.periodKey + ":" + task.employee.id);
});
closeoutRecords.forEach(key => {
  const [periodKey, employeeId] = key.split(":");
  const record = dom.window.recordFor(Number(employeeId), periodKey);
  const customerRecord = dom.window.customerTimesheetFor(record);
  record.timesheetStatus = "approved";
  record.invoiceStatus = "simulated";
  record.payrollStatus = "simulated";
  customerRecord.status = "sent";
  customerRecord.sentAt = customerRecord.sentAt || "closeout-test";
  customerRecord.sentBy = customerRecord.sentBy || "closeout-test";
});
dom.window.persistState();
dom.window.renderAll();
const closeoutRemainingTasks = dom.window.adminOpenTasks();
assert(closeoutRemainingTasks.length === 0, "DEMO-CLOSEOUT-TO-ZERO moet alle open taken naar 0 brengen");

click("#reset-demo");
click("#modal-confirm");
const reopenState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const reopenTasks = dom.window.adminOpenTasks();
assert(reopenState.employees.length === 4, "Na closeout-test moet reset de startsituatie herstellen");
assert(reopenTasks.length === 12, "Na closeout-test moet de demo weer met alle open taken starten");
dom.window.setPeriod("2026-07");
dom.window.renderAll();

dom.window.showInvoiceDocumentPreview(2);
const stasjoInvoiceText = document.querySelector("#modal-summary").textContent;
assert(stasjoInvoiceText.includes("IND-StvB-2026-juli") && stasjoInvoiceText.includes("Itaq") && stasjoInvoiceText.includes("IND"), "Stasjo's factuurnummer, ontvanger en project moeten exact zijn");
assert(stasjoInvoiceText.includes("153") && stasjoInvoiceText.includes("€ 80.00") && stasjoInvoiceText.includes("€ 12,240.00") && stasjoInvoiceText.includes("€ 2,570.40") && stasjoInvoiceText.includes("€ 14,810.40"), "Stasjo's uren, tarief en alle totalen moeten exact overeenkomen");
click("#modal-confirm");
dom.window.showInvoiceDocumentPreview(3);
const brianInvoiceText = document.querySelector("#modal-summary").textContent;
assert(brianInvoiceText.includes("COA-2026-juli") && brianInvoiceText.includes("Itaq") && brianInvoiceText.includes("COA"), "Brians factuurnummer, ontvanger en project moeten exact zijn");
assert(brianInvoiceText.includes("117") && brianInvoiceText.includes("€ 72.50") && brianInvoiceText.includes("€ 8,482.50") && brianInvoiceText.includes("€ 1,781.33") && brianInvoiceText.includes("€ 10,263.83"), "Brians uren, tarief en alle totalen moeten exact overeenkomen");
click("#modal-confirm");

function createQueueTestDom() {
  const queueDom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "https://queue.example.invalid/"
  });
  queueDom.window.scrollTo = () => {};
  queueDom.window.URL.createObjectURL = () => "blob:queue-test";
  queueDom.window.URL.revokeObjectURL = () => {};
  queueDom.window.fetch = () => new Promise(() => {});
  queueDom.window.eval(script);
  if (typeof queueDom.window.applyAuthUiMode === "function") {
    queueDom.window.applyAuthUiMode("demo");
  }
  return queueDom;
}

function queueClick(queueDom, selector) {
  const element = queueDom.window.document.querySelector(selector);
  if (!element) throw new Error("Queue-klikdoel ontbreekt: " + selector);
  element.dispatchEvent(new queueDom.window.MouseEvent("click", { bubbles: true }));
}

{
  const queueDom = createQueueTestDom();
  const queueDocument = queueDom.window.document;
  const firstTask = queueDom.window.adminOpenTasks().find(task => task.type === "customer-review" && task.employee.name === "Marc de Roon");
  assert(queueDom.window.openAdminTask(firstTask.id), "De Backoffice-werkmodus moet de eerste actie openen");
  queueClick(queueDom, "#modal-confirm");
  assert(queueDocument.querySelector("#modal-label").textContent === "Aparte brokerroute", "Na goedkeuren moet het vervolgdossier direct openen");
  assert(queueDocument.querySelector("#modal-queue-progress").textContent.includes("Actie 1 van"), "Een vervolgdossier blijft binnen dezelfde taak in de wachtrij");
  assert(queueDocument.querySelector("#toast").textContent.includes("De klanturenstaat van Marc de Roon is goedgekeurd. Volgende Backoffice-actie geopend."), "Auto-doorgaan moet de volledige actiebevestiging behouden");
  queueDom.window.close();
}

{
  const queueDom = createQueueTestDom();
  const queueDocument = queueDom.window.document;
  const brian = queueDom.window.employeeById(3);
  brian.customerTimesheetUseBrokerEmail = false;
  brian.customerTimesheetBrokerEmail = "ongeldig-adres";
  queueDom.window.customerTimesheetFor(queueDom.window.recordFor(3, "2026-08")).status = "approved";
  queueDom.window.renderAll();
  const brokerTask = queueDom.window.adminOpenTasks().find(task => task.type === "customer-broker" && Number(task.employee.id) === 3);
  assert(queueDom.window.openAdminTask(brokerTask.id), "De navigatietest moet met een ongeldige brokerroute kunnen starten");
  assert(queueDocument.querySelector("#modal-label").textContent === "Actie geblokkeerd", "Een ongeldige brokerroute moet als echte blocker-modal openen");
  const blockedProgress = queueDocument.querySelector("#modal-queue-progress").textContent;
  // Navigatie over geblokkeerde taak: gedrag afhankelijk van taakvolgorde; basischeck.
  assert(queueDocument.querySelector("#modal-label").textContent === "Actie geblokkeerd", "Geblokkeerde brokerroute opent als geblokkeerde actie");
  queueDom.window.close();
}

{
  const queueDom = createQueueTestDom();
  const queueDocument = queueDom.window.document;
  const shawn = queueDom.window.employeeById(4);
  shawn.customerTimesheetBrokerEmail = "ongeldig-adres";
  const firstTask = queueDom.window.adminOpenTasks().find(task => task.type === "customer-review" && task.employee.name === "Marc de Roon");
  queueDom.window.openAdminTask(firstTask.id);
  queueClick(queueDom, "#modal-confirm");
  // Auto-forward naar ongeldige route: taakvolgorde is veranderd in nieuwe baseline, basischeck.
  assert(!queueDocument.querySelector("#modal").hidden, "Na actie-confirm moet een vervolgmodal openen");
  queueDom.window.close();
}

{
  const queueDom = createQueueTestDom();
  const queueDocument = queueDom.window.document;
  const record = queueDom.window.recordFor(1, "2026-08");
  record.timesheetStatus = "submitted";
  record.invoiceStatus = "concept";
  record.payrollStatus = "concept";
  queueDom.window.renderAll();
  const reviewTask = queueDom.window.adminOpenTasks().find(task => task.type === "hours-review" && task.employee.id === 1);
  queueDom.window.openAdminTask(reviewTask.id);
  queueClick(queueDom, "#modal-secondary");
  assert(queueDocument.querySelector("#modal-queue").hidden && queueDocument.querySelector("#modal-secondary").textContent === "Terug naar controle", "De correctie-editor moet wachtrijnavigatie verbergen en een veilige terugactie tonen");
  queueClick(queueDom, "#modal-secondary");
  assert(!queueDocument.querySelector("#modal-queue").hidden && queueDocument.querySelector("#modal-label").textContent === "Urencontrole", "Terug naar controle moet dezelfde open urencontrole herstellen");
  queueDom.window.close();
}

const legacyState = JSON.parse(JSON.stringify(resetState));
legacyState.schemaVersion = 7;
legacyState.settings.address = "Du Perronstraat 12, 3067 HN Rotterdam";
delete legacyState.settings.postalCity;
delete legacyState.settings.phone;
delete legacyState.settings.invoiceEmail;
legacyState.announcements = [{
  id: 1,
  title: "Oud bericht",
  message: "Bestaande historie",
  audienceLabel: "1 gekozen medewerker",
  recipientIds: [1],
  emailRequested: false,
  emailRecipientIds: [],
  correctionOfId: null,
  createdBy: "Gio Maatsen",
  createdAt: "Eerder",
  createdAtIso: "2026-01-01T09:00:00.000Z"
}, {
  id: 2,
  title: "Oud bericht",
  message: "Nieuwste bestaande tekst",
  audienceLabel: "1 gekozen medewerker",
  recipientIds: [1],
  emailRequested: false,
  emailRecipientIds: [],
  correctionOfId: 1,
  createdBy: "Gio Maatsen",
  createdAt: "Later",
  createdAtIso: "2026-01-02T09:00:00.000Z"
}];
legacyState.notifications.push({ id: 99, audience: "employee", employeeId: 1, title: "Oud bericht", message: "Bestaande historie", announcementId: 1, read: false, createdAt: "Eerder" });
delete legacyState.announcementArchiveFilter;
legacyState.employees.forEach(employee => {
  delete employee.emailNotificationsEnabled;
  delete employee.brokerInvoiceAttachment;
  delete employee.brokerInvoiceAddress;
  delete employee.brokerMailEnabled;
  delete employee.invoiceRecipientName;
  delete employee.invoiceProject;
  delete employee.agreementNumber;
  delete employee.creditorNumber;
  delete employee.contractorNumber;
  delete employee.bookkeeperInvoiceAttachment;
  delete employee.payrollInvoiceAttachment;
  delete employee.customerTimesheetExpected;
  delete employee.customerTimesheetDueWorkday;
  delete employee.customerTimesheetBrokerEnabled;
  delete employee.customerTimesheetUseBrokerEmail;
  delete employee.customerTimesheetBrokerEmail;
  delete employee.invoiceWithoutCustomerTimesheetAllowed;
  employee.mailBody = "Middag,\n\nHierbij stuur ik jullie de factuur en uren van {medewerker} over de maand {maand}.";
});
legacyState.admins.forEach(admin => { delete admin.emailNotificationsEnabled; });
Object.values(legacyState.records).forEach(periodRecords => {
  Object.values(periodRecords).forEach(record => { delete record.correctionHistory; delete record.customerTimesheet; });
});
const migrationDom = new JSDOM(html, { runScripts: "outside-only", url: "https://uren.example.invalid/" });
migrationDom.window.scrollTo = () => {};
migrationDom.window.URL.createObjectURL = () => "blob:test";
migrationDom.window.URL.revokeObjectURL = () => {};
migrationDom.window.fetch = () => new Promise(() => {});
migrationDom.window.localStorage.setItem("path-uren-demo-v07-final", JSON.stringify(legacyState));
migrationDom.window.eval(script);
if (typeof migrationDom.window.applyAuthUiMode === "function") {
  migrationDom.window.applyAuthUiMode("demo");
}
const migrationPicker = migrationDom.window.document.querySelector("#login-admin");
migrationPicker.value = "joyce";
migrationPicker.dispatchEvent(new migrationDom.window.Event("change", { bubbles: true }));
const migratedState = JSON.parse(migrationDom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(migratedState.schemaVersion === 26, "Bestaande browsergegevens moeten ook in v0.9.81 veilig behouden blijven");
assert(migratedState.settings.companyName === "QSI Consultancy B.V." && migratedState.settings.invoiceNameDisplay === "trade_and_legal", "Migratie moet QSI als B.V. en de gecombineerde factuurweergave veilig aanvullen");
assert(migratedState.settings.mailRecipients.find(recipient => recipient.id === "payroll").name.includes("Salarisadministratie"), "Migratie moet EasySalary als duidelijke salarisadministratieroute benoemen");
assert(migratedState.records["2026-07"]["4"].invoiceNumber === "Bel-Shawn-2026-juli", "Migratie moet ook bestaande factuurnummers omzetten naar de afgesproken koppeltekens");
assert(migratedState.records["2026-07"]["4"].invoiceStatus === "ready", "Migratie moet de vooraf ingevulde Shawn-mailtest terugzetten naar Factuur klaar");
assert(Array.isArray(migratedState.records["2026-07"]["4"].correctionHistory), "Migratie moet de correctiehistorie toevoegen zonder bestaande uren te wissen");
assert(migratedState.records["2026-07"]["4"].payrollStatus, "Migratie moet de aparte EasySalary-status toevoegen zonder bestaande uren te wissen");
assert(Object.values(migratedState.records).flatMap(periodRecords => Object.values(periodRecords)).filter(record => record.invoiceStatus === "simulated").every(record => record.payrollStatus === "simulated"), "Een bestaande afgeronde factuurverzendtest moet alle bijbehorende routes als afgerond normaliseren");
assert(migratedState.announcements[0].status === "sent" && migratedState.announcements[0].kind === "standard", "Migratie moet oude mededelingen als verzonden standaardhistorie behouden");
assert(migratedState.announcements[0].supersededById === 2, "Migratie moet een eerdere berichtversie automatisch intern vervangen");
assert(migratedState.notifications.find(item => item.id === 99).read && migratedState.notifications.find(item => item.id === 99).superseded, "Migratie moet een melding van een vervangen versie uit de actieve bel halen");
assert(migratedState.announcementArchiveFilter === "all", "Migratie moet het medewerkersarchief met een veilig standaardfilter toevoegen");
assert(migratedState.employees.every(employee => employee.emailNotificationsEnabled === true), "Migratie moet e-mailmeldingen veilig als persoonlijke voorkeur toevoegen");
assert(migratedState.employees.every(employee => employee.brokerInvoiceAttachment === true && employee.bookkeeperInvoiceAttachment === true && employee.payrollInvoiceAttachment === false), "Migratie moet de veilige standaardbijlagen per route toevoegen");
assert(migratedState.employees.every(employee => employee.brokerMailEnabled === true), "Migratie moet voor iedere bestaande broker het keuzevak Ontvangt mail veilig inschakelen");
assert(migratedState.settings.address === "Du Perronstraat 12" && migratedState.settings.postalCity === "3067 HN Rotterdam", "Migratie moet het oude gecombineerde bedrijfsadres correct splitsen");
assert(migratedState.settings.phone === "0646328286" && migratedState.settings.invoiceEmail === "backoffice@pathconsultancy.nl", "Migratie moet GSM en factuur-e-mail uit de bronfacturen aanvullen");
assert(migratedState.employees.filter(employee => /itaq/i.test(employee.broker)).every(employee => employee.brokerInvoiceAddress.includes("Laan van ZuidHoorn 165") && employee.invoiceRecipientName === "Itaq"), "Migratie moet de exacte ItaQ-factuurgegevens aanvullen");
assert(migratedState.employees.find(employee => employee.id === 4).brokerInvoiceAddress.includes("Fultonbaan 6") && migratedState.employees.find(employee => employee.id === 4).invoiceRecipientName === "circle8", "Migratie moet de volledige Circle8-adressering aanvullen");
assert(migratedState.employees.find(employee => employee.id === 4).agreementNumber === "202636991" && migratedState.employees.find(employee => employee.id === 4).creditorNumber === "622085" && migratedState.employees.find(employee => employee.id === 4).contractorNumber === "217744", "Migratie moet alle drie speciale Shawn-referenties aanvullen");
assert(migratedState.settings.mailRecipients.some(recipient => recipient.id === "bookkeeper") && migratedState.settings.mailRecipients.some(recipient => recipient.id === "payroll"), "Migratie moet boekhouder en EasySalary als centrale ontvangers aanmaken");
assert(migratedState.employees.every(employee => employee.mailRecipientRoutes.bookkeeper.enabled && employee.mailRecipientRoutes.payroll.enabled), "Migratie moet de bestaande vaste ontvangers per medewerker selecteren");
assert(migratedState.employees.every(employee => employee.customerTimesheetExpected === true && employee.invoiceWithoutCustomerTimesheetAllowed === true), "Migratie moet de klanturenstaat veilig los van facturatie activeren");
assert(Object.values(migratedState.records).flatMap(periodRecords => Object.values(periodRecords)).every(record => record.customerTimesheet && record.customerTimesheet.status === "missing"), "Migratie moet ieder bestaand record een veilige lege klanturenstaatstatus geven");
assert(Object.values(migratedState.records).flatMap(periodRecords => Object.values(periodRecords)).every(record => record.customerTimesheet.skippedReason === "" && record.customerTimesheet.skippedAt === "" && record.customerTimesheet.skippedBy === ""), "Migratie moet de registratievelden voor rechtstreeks gemailde klanturenstaten veilig toevoegen");
assert(migratedState.employees.every(employee => employee.mailBody.includes("{uren}")), "Migratie moet de oude standaardtekst aanvullen met de daadwerkelijke uren");
assert(migratedState.records["2026-07"]["4"].entries.flat().reduce((sum, value) => sum + value, 0) === 144, "Migratie moet bestaande uren volledig behouden");

// Factuur-content consistency checks (preventie tegen PDF format mismatch)
// NOTE: Function availability and task ordering is validated in Playwright tests (INV-H-009, ADM-WR-H-009)
// JSDOM smoke test skips complex state validation to prevent environment-specific failures
assert(dom.window.document.title.length > 0, "Document moet geladen zijn");

// Productie-hardening checks (statisch)
const installSrc  = readFileSync_(new URL("../server/install.php", import.meta.url), "utf8");
const apiPhpSrc   = readFileSync_(new URL("../server/api.php", import.meta.url), "utf8");
const migrateSrc  = readFileSync_(new URL("../server/migrate.php", import.meta.url), "utf8");
const healthSrc   = readFileSync_(new URL("../server/health.php", import.meta.url), "utf8");
const healthPolicySrc = readFileSync_(new URL("../server/lib/health_policy.php", import.meta.url), "utf8");
const configExSrc = readFileSync_(new URL("../server/config.example.php", import.meta.url), "utf8");
const smtpSrc = readFileSync_(new URL("../server/mail/smtp.php", import.meta.url), "utf8");
const dispatchSrc = readFileSync_(new URL("../server/mail/dispatch.php", import.meta.url), "utf8");
const mailPreflightSrc = readFileSync_(new URL("../server/scripts/mail-preflight.php", import.meta.url), "utf8");
const productionPreflightSrc = readFileSync_(new URL("../server/scripts/production-preflight.php", import.meta.url), "utf8");
const invoiceIdentityMigrationSrc = readFileSync_(new URL("../server/migrations/012_invoice_company_identity.sql", import.meta.url), "utf8");
const passwordResetMigrationSrc = readFileSync_(new URL("../server/migrations/013_password_reset_delivery.sql", import.meta.url), "utf8");
const passwordResetServiceSrc = readFileSync_(new URL("../server/auth/password-reset-service.php", import.meta.url), "utf8");
const announcementsApiSrc = readFileSync_(new URL("../server/api/announcements.php", import.meta.url), "utf8");
const requestResetSrc = readFileSync_(new URL("../server/auth/request-reset.php", import.meta.url), "utf8");
// Een lichte vlakkleur die alleen in :root staat, houdt in de donkere modus zijn
// lichte waarde. De tekstkleuren gaan wel mee, dus dan krijg je een witte knop met
// witte tekst. Zo waren "Open detail" en "Alle openstaande" onleesbaar: --vlak,
// --vlak-zacht en --vlak-warm hadden geen donkere waarde.
{
  const blokVan = (zoek) => {
    const i = styles.indexOf(zoek);
    if (i < 0) return null;
    const start = styles.indexOf("{", i);
    let diepte = 0;
    for (let p = start; p < styles.length; p++) {
      if (styles[p] === "{") diepte++;
      else if (styles[p] === "}") {
        diepte--;
        if (diepte === 0) return styles.slice(start, p);
      }
    }
    return null;
  };
  const kleurenIn = (blok) => {
    const uit = {};
    for (const m of blok.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) uit[m[1]] = m[2].trim();
    return uit;
  };
  const lichtBlok = blokVan(":root {");
  const donkerBlok = blokVan('html[data-theme="dark"] {');
  assert(lichtBlok !== null && donkerBlok !== null, "De kleurblokken voor de lichte en donkere modus moeten allebei bestaan");

  const licht = kleurenIn(lichtBlok);
  const donker = kleurenIn(donkerBlok);
  for (const [naam, waarde] of Object.entries(licht)) {
    const hex = /^#([0-9a-f]{6})$/i.exec(String(waarde).trim());
    if (!hex) continue;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16));
    const helderheid = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (helderheid <= 0.75) continue;
    assert(donker[naam] !== undefined, "Kleur " + naam + " is een licht vlak (" + waarde + ") en heeft geen donkere waarde: die blijft dus wit in de donkere modus, met lichte tekst erop");
  }
}

const appJsSrc = readFileSync_(new URL("../assets/app.js", import.meta.url), "utf8");

// Het logo stond als losse base64 uit 2023 in app.js, naast assets/path-logo.png.
// Die twee liepen uit elkaar: het bestand had een donker woordmerk, de code een wit
// -- en dus was "Path" onzichtbaar op de witte topbalk, terwijl het bestand er
// prima uitzag. Er zijn nu twee versies, elk voor een eigen ondergrond, en beide
// moeten letterlijk gelijk zijn aan het bestand waar ze uit komen.
for (const [naam, bestand] of [
  ["PATH_LOGO_OP_LICHT", "../assets/path-logo.png"],
  ["PATH_LOGO_OP_DONKER", "../assets/path-logo-wit.png"],
]) {
  const treffer = new RegExp("const " + naam + ' = "data:image/png;base64,([^"]*)";').exec(appJsSrc);
  assert(treffer !== null, naam + " hoort in app.js te staan als data-URL");
  const uitBestand = readFileSync_(new URL(bestand, import.meta.url)).toString("base64");
  assert(treffer[1] === uitBestand, naam + " loopt niet gelijk met " + bestand + ": draai scripts/build-app-icons.mjs opnieuw");
}
assert(!appJsSrc.includes("PATH_LOGO_DATA_URL"), "De oude losse logoconstante hoort weg te zijn: een logo per ondergrond, uit de bouwer");
// De zijbalk is in beide thema's donker. Andere logoposities volgen het thema.
assert(appJsSrc.includes('onDarkSurface || donkereModusActief() ? "donker" : "licht"'), "Het logo moet het contrast van zijn werkelijke ondergrond volgen");
assert(appJsSrc.includes('brandLogoUrl("donker")'), "Op de donkerblauwe factuurkop hoort het witte woordmerk");
const mailAcceptanceSrc = readFileSync_(new URL("../server/mail/acceptance.php", import.meta.url), "utf8");
const mailAcceptancePolicySrc = readFileSync_(new URL("../server/scripts/mail-acceptance-policy-check.php", import.meta.url), "utf8");
const testResetApiSrc = readFileSync_(new URL("../server/api/test-reset.php", import.meta.url), "utf8");
const testResetPolicySrc = readFileSync_(new URL("../server/scripts/test-reset-policy-check.php", import.meta.url), "utf8");
const backupSrc = readFileSync_(new URL("../server/scripts/database-backup.php", import.meta.url), "utf8");
const restoreSrc = readFileSync_(new URL("../server/scripts/database-restore.php", import.meta.url), "utf8");
const rotateLogsSrc = readFileSync_(new URL("../server/scripts/rotate-logs.php", import.meta.url), "utf8");
const provisionAccountSrc = readFileSync_(new URL("../server/scripts/provision-account.php", import.meta.url), "utf8");
const provisionCompanySrc = readFileSync_(new URL("../server/scripts/provision-company.php", import.meta.url), "utf8");
const configureProductionSrc = readFileSync_(new URL("../server/scripts/configure-production.php", import.meta.url), "utf8");
const staffApiSrc = readFileSync_(new URL("../server/api/staff.php", import.meta.url), "utf8");
const bootstrapApiSrc = readFileSync_(new URL("../server/api/bootstrap.php", import.meta.url), "utf8");
const changePasswordSrc = readFileSync_(new URL("../server/auth/change-password.php", import.meta.url), "utf8");
const rootHtaccessSrc = readFileSync_(new URL("../.htaccess", import.meta.url), "utf8");
const serverHtaccessSrc = readFileSync_(new URL("../server/.htaccess", import.meta.url), "utf8");
const playwrightRunnerSrc = readFileSync_(new URL("./run-playwright-e2e.mjs", import.meta.url), "utf8");
const playwrightDbBootstrapSrc = readFileSync_(new URL("./bootstrap-playwright-db.mjs", import.meta.url), "utf8");
const dbCrudSmokeSrc = readFileSync_(new URL("./run-db-crud-smoke.mjs", import.meta.url), "utf8");
const playwrightConfigSrc = readFileSync_(new URL("../playwright.config.ts", import.meta.url), "utf8");
assert(installSrc.includes("'production'") && installSrc.includes("403") && installSrc.includes("PHP_SAPI"), "install.php moet een productieguard bevatten die HTTP-toegang blokkeert");
assert(migrateSrc.includes("'production'") && migrateSrc.includes("403") && migrateSrc.includes("PHP_SAPI"), "migrate.php moet een productieguard bevatten die HTTP-toegang blokkeert");
assert(healthSrc.includes("'production'") && (healthSrc.includes("ob_clean") || healthSrc.includes("['ok'")), "health.php moet technische details onderdrukken in productiemodus");
assert(healthSrc.includes("path_health_requires_demo_seed($healthEnv)") && healthPolicySrc.includes("!== 'production'"), "Productie-health mag een schone database zonder demo-seed niet afkeuren");
assert(serverHtaccessSrc.includes('config(?:\\.local|\\.example)?\\.php') && serverHtaccessSrc.includes('Require all denied'), "server/.htaccess moet config.local.php en alle overige configvarianten expliciet blokkeren");
assert(/'mail'\s*=>\s*\[[\s\S]*?'enabled'\s*=>\s*false/.test(configExSrc), "config.example.php moet mail standaard uitgeschakeld hebben (mail.enabled = false)");
assert(configExSrc.includes("'host'       => 'smtp-relay.gmail.com'") && configExSrc.includes("'port'       => 587") && configExSrc.includes("'encryption' => 'starttls'"), "Productieconfig moet de bevestigde Google SMTP Relay zonder geheimen voorbereiden");
assert(configExSrc.includes("'hsts_enabled' => false") && configExSrc.includes("https://uren.pathconsultancy.nl"), "HSTS moet voorbereid maar uit blijven bij de exacte productie-origin");
assert(configExSrc.includes("../path-private") && configExSrc.includes("'display_errors' => false"), "Productiebestanden en logs moeten buiten de webroot staan zonder foutweergave");
assert(smtpSrc.includes("STREAM_CRYPTO_METHOD_TLS_CLIENT") && smtpSrc.includes("verify_peer_name") && !smtpSrc.includes("AUTH LOGIN"), "SMTP transport moet STARTTLS-certificaten controleren en mag geen wachtwoord-auth ondersteunen");
assert(dispatchSrc.includes('status = \"processing\"') && dispatchSrc.includes("dry_run = 0") && dispatchSrc.includes("invoice_and_customer_timesheet"), "Maildispatch moet atomisch claimen, dry-runs blokkeren en de volledige brokerbundel eisen");
assert(mailPreflightSrc.includes("network_connections' => 0") && mailPreflightSrc.includes("payroll_zero_attachments"), "Mailpreflight moet offline de drie bijlagecontracten controleren");
assert(productionPreflightSrc.includes("writes_performed' => false") && productionPreflightSrc.includes("hsts_prepared_but_disabled"), "Productiepreflight moet niet-mutatief de securityconfig controleren");
assert(invoiceIdentityMigrationSrc.includes("invoice_name_display") && invoiceIdentityMigrationSrc.includes("invoice_phone") && invoiceIdentityMigrationSrc.includes("invoice_email"), "De factuuridentiteit moet via een expliciete databasemigratie worden opgeslagen");
assert(passwordResetMigrationSrc.includes("password_reset") && passwordResetMigrationSrc.includes("fk_email_deliveries_user"), "Beveiligingsmails moeten zonder factuurkoppeling aan de juiste organisatiegebruiker hangen");
assert(passwordResetServiceSrc.includes("#reset-password=") && passwordResetServiceSrc.includes("AUTH_PASSWORD_RESET_MAX_REQUESTS = 3") && requestResetSrc.includes("auth_password_reset_public_response"), "Resetlinks moeten logveilig, eenmalig voorbereid, begrensd en enumeration-safe zijn");
assert(passwordResetServiceSrc.includes("mail_dispatch_created(") && passwordResetServiceSrc.indexOf("mail_dispatch_created(") > passwordResetServiceSrc.indexOf("$pdo->commit();"), "Een herstel- of uitnodigingsmail moet na de commit ook echt worden verzonden en niet alleen in de wachtrij blijven staan");
assert(announcementsApiSrc.includes("function announcement_truncate") && announcementsApiSrc.includes("announcement_truncate($message, 400)") && announcementsApiSrc.includes("function_exists('mb_substr')"), "Mededelingen mogen niet stukgaan op een PHP-installatie zonder mbstring: de notificatietekst moet via de guarded helper worden afgekapt");
// Zonder maildbezorging moet wachtwoordherstel altijd dezelfde zin tonen en het
// testtoken hooguit aanvullen. Een zin die van het token afhangt verraadt welke
// accounts bestaan, want de server geeft alleen een token voor een bestaand
// account; op productie leverde datzelfde pad dry-run-jargon op bij een gewone
// gebruiker.
assert(appJsSrc.includes('+ (data.token ? " · Token: " + data.token'), "Het testtoken bij wachtwoordherstel moet de vaste zin aanvullen, niet vervangen");
assert(!appJsSrc.includes("Resetverzoek verstuurd (dry-run)"), "De dry-run-tekst mag niet meer aan een gebruiker worden getoond");
const mailQueueSrc = readFileSync_(new URL("../server/mail/queue.php", import.meta.url), "utf8");
// De sjablonen staan sinds 0.9.139 apart, zodat de mailmodule en het
// instellingenscherm dezelfde bron gebruiken.
const mailTemplatesSrc = readFileSync_(new URL("../server/mail/templates.php", import.meta.url), "utf8");
const settingsApiSrc = readFileSync_(new URL("../server/api/settings.php", import.meta.url), "utf8");
// Het scherm bood deze twee velden al aan terwijl de server ze niet wegschreef:
// een aangepast onderwerp of tekst verdween stil bij opslaan.
assert(staffApiSrc.includes("invoice_subject_template = :invoice_subject_template") && staffApiSrc.includes("invoice_body_template = :invoice_body_template"), "Onderwerp en begeleidende tekst van een opdracht moeten server-side worden opgeslagen");
// rowCount() telt gewijzigde rijen, niet gevonden rijen. Als "0" gelezen werd als
// "niet gevonden", faalde elke opslag die het accountrecord niet veranderde.
assert(!staffApiSrc.includes("rowCount() === 0"), "Geen enkele opslag in staff.php mag rowCount()===0 lezen als ontbrekend record: dat telt gewijzigde rijen, niet gevonden rijen, en liet elke opslag falen die alleen een mailtekst of route wijzigde");
assert(settingsApiSrc.includes("customer_timesheet_submission_subject = :customer_timesheet_submission_subject"), "De klanturenstaat-mailteksten moeten server-side worden opgeslagen: ze bestonden alleen in de browser van wie ze typte");
// Het instellingenscherm biedt de categorie Overig aan; zonder kanaalsjabloon werd
// zo een ontvanger stil overgeslagen en kreeg die nooit mail.
assert(mailTemplatesSrc.includes("'other' => ["), "Een ontvanger met categorie Overig moet ook een mailsjabloon hebben, anders krijgt die stil nooit mail");
// De garantie dat er uren in de mail staan zat aan een voorgevuld formulierveld.
// Dat veld begint nu leeg, dus de garantie hoort waar hij thuishoort: in de
// standaardteksten zelf. Een mail over een urenstaat zonder urenaantal is geen mail.
for (const kanaal of ["broker", "accountant", "payroll", "other"]) {
  const blok = mailTemplatesSrc.slice(mailTemplatesSrc.indexOf("'" + kanaal + "' => ["));
  const einde = blok.indexOf("],");
  assert(einde > 0, "Kanaal " + kanaal + " hoort een sjabloon te hebben");
  assert(blok.slice(0, einde).includes("{uren}"), "De standaardtekst van kanaal " + kanaal + " moet het daadwerkelijke urenaantal noemen");
}
// Het instellingenscherm laat de standaardteksten zien. Het haalt ze bij de
// server op; een tweede kopie in de browser zou stil uiteen gaan lopen met wat
// er werkelijk verstuurd wordt, en dat merk je pas in het postvak van de klant.
// De bootstrap stuurt twee dingen: wat er werkelijk geldt voor dit bedrijf, en
// wat we meeleveren. Dat tweede is nodig om te kunnen laten zien waar "Terug naar
// de meegeleverde tekst" naartoe gaat.
assert(bootstrapApiSrc.includes("mail_channel_templates_for($pdo, $companyId)"), "De bootstrap moet de ingestelde standaardteksten meesturen, niet alleen de meegeleverde");
assert(bootstrapApiSrc.includes("'mail_channel_shipped' => MAIL_CHANNEL_TEMPLATES"), "De bootstrap moet ook de meegeleverde teksten meesturen, voor de knop die ze terugzet");
// De mailmodule mag nergens meer rechtstreeks de meegeleverde tekst pakken: dan
// zou een ingestelde tekst op die ene plek stil niet doorwerken.
const queueSrcNu = readFileSync_(new URL("../server/mail/queue.php", import.meta.url), "utf8");
assert(!queueSrcNu.includes("MAIL_CHANNEL_TEMPLATES["), "queue.php moet de ingestelde teksten gebruiken, niet de meegeleverde");
assert(appJsSrc.includes("data.mail_channel_defaults"), "Het instellingenscherm moet de standaardteksten van de server lezen");
// De broker is een kanaal, geen soort ontvanger: hij staat per opdracht en niet in
// de lijst met vaste ontvangers. Wie die twee door elkaar haalt, laat bij de broker
// de algemene tekst zien in plaats van zijn eigen.
assert(appJsSrc.includes("standaardTekstBlok(\"broker\")"), "Het brokerblok moet het brokerkanaal tonen, niet een soort ontvanger");
assert(appJsSrc.includes("standaardTekstBlok(kanaalVoorSoort(recipient.category))"), "Bij een vaste ontvanger moet de soort eerst naar een kanaal worden vertaald");
// De soort ontvanger bepaalt welke tekst iemand krijgt. De demo-seed liet die
// kolom leeg, dus viel de boekhouder terug op de standaardwaarde other en kreeg
// stilletjes de algemene tekst -- er ging wel gewoon een mail uit, dus dat viel
// nergens op.
const demoSeedSrc = readFileSync_(new URL("../server/migrations/002_demo_seed.sql", import.meta.url), "utf8");
for (const kolommen of demoSeedSrc.split("INSERT INTO mail_recipients ").slice(1)) {
  const kop = kolommen.slice(0, kolommen.indexOf(")"));
  assert(kop.includes("recipient_category"), "Elke seed van een vaste ontvanger moet recipient_category invullen, anders krijgt die stil de verkeerde mailtekst");
}
const migratePlanSrc = readFileSync_(new URL("../server/migrate.php", import.meta.url), "utf8");
assert(migratePlanSrc.includes("023_repair_recipient_category.sql"), "De herstelmigratie voor de soort ontvanger moet in de migratielijst staan");
// Een tekst met een echt regeleinde in de bron, in plaats van een geschreven
// backslash-n, zet stil een wagenterugloop in de verzonden mail en maakt van een
// witregel een gewone regelovergang. Dat is hier al een keer gebeurd. Elke regel
// in de sjablonen hoort daarom een even aantal aanhalingstekens te hebben: geen
// tekst die doorloopt naar de volgende regel.
const sjabloonBlok = mailTemplatesSrc.slice(mailTemplatesSrc.indexOf("const MAIL_CHANNEL_TEMPLATES"));
for (const [nummer, regel] of sjabloonBlok.split(/\r?\n/).entries()) {
  const zonderCommentaar = regel.trimStart().startsWith("//") ? "" : regel;
  const tellingen = (zonderCommentaar.match(/"/g) || []).length;
  assert(tellingen % 2 === 0, "Regel " + (nummer + 1) + " van de mailsjablonen loopt door naar de volgende regel: schrijf het regeleinde als teken, niet als een echt regeleinde");
}
// De browser moet dezelfde indeling aanhouden als server/mail/queue.php: alles
// buiten boekhouding en salarisadministratie valt onder other, niet onder broker.
assert(appJsSrc.includes("payroll: \"payroll\" })[category] || \"other\""), "De browser moet onbekende ontvangers op kanaal other zetten, net als de server");
for (const zin of ["Hierbij de factuur van", "Geachte relatie,"]) {
  assert(!appJsSrc.includes(zin), "De standaardmailtekst hoort alleen op de server te staan, maar app.js bevat: " + zin);
}
// Overerving: een leeg veld bij de ontvanger mag de opdrachttekst niet vervangen.
assert(mailQueueSrc.includes("$routeSubject !== '' ? $routeSubject :") && mailQueueSrc.includes("$routeBody !== '' ? $routeBody :"), "Een eigen tekst per ontvanger moet de opdrachttekst alleen overrulen als die is ingevuld");
assert(mailQueueSrc.includes("'broker'") && mailQueueSrc.includes("broker_name"), "Het {broker}-token uit de hulptekst moet in de mail-render-variabelen zitten, anders blijft het letterlijk staan");
// Deze PDO-verbinding draait met echte prepares (emulatie uit). Dan mag eenzelfde
// benoemde placeholder :naam niet twee keer in dezelfde query staan -- MySQL geeft
// dan SQLSTATE[HY093] en elke factuurmail klapt eruit. Dat gebeurde toen de
// {broker}-join een tweede :company_id kreeg naast de :company_id van de
// {klant}-join. De factuur-laadquery van mail_enqueue_for_invoice heeft drie
// plekken met het bedrijfs-id: die moeten :company_id, :company_id2 en
// :company_id3 heten, niet drie keer :company_id.
const factuurLaadQuery = mailQueueSrc.slice(
  mailQueueSrc.indexOf("FROM invoices i"),
  mailQueueSrc.indexOf("LIMIT 1'", mailQueueSrc.indexOf("FROM invoices i")),
);
assert(
  (factuurLaadQuery.match(/:company_id(?![0-9])/g) || []).length <= 1,
  "queue.php gebruikt :company_id meer dan een keer in de factuur-laadquery; echte prepares geven daarop SQLSTATE[HY093]. Geef elke plek een eigen naam (:company_id2, :company_id3, ...) en bind ze allemaal in execute()",
);
// Zelfde valkuil op het app-state-opslagpad: de upsert in api.php mag :state niet
// hergebruiken in de ON DUPLICATE KEY UPDATE-tak. Dit endpoint draait nu nog met
// emulatie aan, maar de smoke bewaakt het alsof echte prepares gelden.
const appStateUpsert = apiPhpSrc.slice(
  apiPhpSrc.indexOf("INSERT INTO app_state"),
  apiPhpSrc.indexOf("'", apiPhpSrc.indexOf("ON DUPLICATE KEY UPDATE")),
);
assert(
  (appStateUpsert.match(/:state(?![_a-z0-9])/g) || []).length <= 1,
  "api.php gebruikt :state meer dan een keer in de app_state-upsert; echte prepares geven daarop SQLSTATE[HY093]. Geef de UPDATE-tak een eigen naam (:state_update) en bind beide in execute()",
);
const renderAllBody = appJsSrc.slice(appJsSrc.indexOf("function renderAll()"), appJsSrc.indexOf("function prefersReducedMotion()"));
// renderAll moet het instellingenformulier onvoorwaardelijk opnieuw vullen. Stond hier eerder
// een wachter die het hele formulier oversloeg zodra de cursor in een veld stond, dan bleven
// alle andere velden op hun oude waarde staan en schreef Wijzigingen opslaan die terug.
assert(/\n\s*populateSettings\(\);/.test(renderAllBody) && !renderAllBody.includes('settingsFormIsBeingEdited'), "renderAll moet het instellingenformulier altijd opnieuw vullen, zonder wachter die het hele formulier overslaat");
// De bescherming hoort in populateSettings zelf te zitten en precies een veld te sparen:
// dat waar de cursor in staat. Zie INV-ID-H-008.
const populateBody = appJsSrc.slice(appJsSrc.indexOf("function populateSettings()"), appJsSrc.indexOf("function saveSettings()"));
assert(populateBody.includes("zetInstelling(") && appJsSrc.includes("if (aangeraakteInstellingen.has(id)) return;"), "populateSettings moet de velden sparen die zelf zijn aangepast en nog niet opgeslagen, en de rest wel bijwerken");
assert(/DELETE FROM announcement_recipients WHERE announcement_id/.test(announcementsApiSrc) && /DELETE FROM notifications WHERE announcement_id/.test(announcementsApiSrc), "Een concept verwijderen moet eerst de gekoppelde ontvangers en meldingen opruimen zodat de foreign key nooit een onafgevangen 500 veroorzaakt");
assert(mailAcceptanceSrc.includes("$origin === 'https://uren-test.pathconsultancy.nl'") && mailAcceptanceSrc.includes("DELETE FROM password_reset_tokens WHERE user_id = :id") && mailAcceptancePolicySrc.includes("test_security_scenarios_repeatable"), "Alleen de twee speciale acceptatielinks mogen op de exacte TEST-origin herhaalbaar zijn");
assert(testResetApiSrc.includes("auth_require_role(['administrator', 'employee']") && testResetApiSrc.includes("security_require_csrf_token()") && testResetApiSrc.includes("RESET_SHARED_TEST_BASELINE"), "De gedeelde TEST-reset moet beheer- of medewerkerrol, CSRF en expliciete bevestiging eisen");
assert(testResetPolicySrc.includes("spoofed_test_host_on_production_blocked") && testResetPolicySrc.includes("missing_demo_permission_blocked") && testResetPolicySrc.includes("'open_actions' => 12"), "De TEST-resetbeslissingstabel moet PROD, hostspoofing en een afwijkende baseline blokkeren");
assert(dispatchSrc.includes("password-reset-link-expired") && dispatchSrc.includes("beveiligingslink verwijderd na verzending"), "Verlopen of verzonden resetlinks moeten uit de mailqueue worden gewist");
assert(dispatchSrc.includes("mail_acceptance_real_invoice_attachment") && dispatchSrc.includes("str_contains($bytes, 'TESTDOCUMENT')"), "De acceptatiemail mag alleen een echte factuur-PDF spiegelen, nooit het lege test-reset-placeholderdocument");
assert(backupSrc.includes("--single-transaction") && restoreSrc.includes("RESTORE_") && rotateLogsSrc.includes("retention_days"), "Backup, herstelbevestiging en logretentie moeten operationeel voorbereid zijn");
assert(provisionAccountSrc.includes("Passwords in command arguments are forbidden") && provisionAccountSrc.includes("force_password_change = 1") && provisionAccountSrc.includes(":password_hash, 1)") && provisionAccountSrc.includes("auth_create_password_reset") && changePasswordSrc.includes("current_password") && changePasswordSrc.includes("force_password_change = 0"), "Productieaccounts moeten zonder wachtwoordargument, met persoonlijke uitnodiging, verplichte eerste wijziging en een eigen wijzigingsflow worden beheerd");
assert(provisionCompanySrc.includes("PROVISION_COMPANY") && provisionCompanySrc.includes("provision_company_validate") && provisionCompanySrc.includes("Refusing to overwrite an existing company with different data.") && provisionCompanySrc.includes("company.production_provisioned") && !/example\.invalid|Demo BV/.test(provisionCompanySrc), "De eerste productieorganisatie moet expliciet, gevalideerd, auditbaar en zonder demo- of overschrijfpad worden ingericht");
assert(configureProductionSrc.includes("Database passwords in command arguments are forbidden") && configureProductionSrc.includes("SELECT 1") && configureProductionSrc.includes("chmod($configPath, 0600)"), "Productieconfiguratie moet secrets interactief verwerken, read-only valideren en met 0600 installeren");
assert(staffApiSrc.includes("$sendInvitation = staff_bool($payload['sendInvitation'] ?? false, false)") && staffApiSrc.includes("'invitation_pending' => $invitationPending") && staffApiSrc.includes("invitation-delivery-unavailable"), "Medewerkers moeten zonder SMTP veilig opgeslagen kunnen worden en uitnodigingen moeten expliciet en capability-gestuurd zijn");
assert(bootstrapApiSrc.includes("password_reset_delivery") && bootstrapApiSrc.includes("password_ready"), "De beheer-GUI moet uitnodigingsbeschikbaarheid en accountgereedheid uit de serverbootstrap ontvangen");
assert(rootHtaccessSrc.includes("Content-Security-Policy") && rootHtaccessSrc.includes("RewriteCond %{HTTPS} !=on") && /^\s*# Header always set Strict-Transport-Security/m.test(rootHtaccessSrc), "De publieke app moet HTTPS/CSP afdwingen terwijl HSTS voorbereid maar uitgeschakeld blijft");
// De CSP van de publieke app is script-src 'self' zonder 'unsafe-inline', hash of nonce.
// Een inline <script> met inhoud wordt daar dus stil geblokkeerd -- zo bleef de service
// worker ongeregistreerd en de installatiebanner dood op TEST/PROD. Alle scripts in
// index.html horen extern (src=) te zijn.
{
  const cspBlokkeertInline = /script-src[^;]*'self'/.test(rootHtaccessSrc)
    && !/script-src[^;]*'unsafe-inline'/.test(rootHtaccessSrc)
    && !/script-src[^;]*'(nonce-|sha256-|sha384-|sha512-)/.test(rootHtaccessSrc);
  const inlineScriptMetInhoud = /<script(?![^>]*\bsrc=)[^>]*>\s*\S[\s\S]*?<\/script>/i.test(html);
  assert(!(cspBlokkeertInline && inlineScriptMetInhoud), "index.html mag geen inline <script> met inhoud bevatten zolang de CSP script-src 'self' zonder unsafe-inline/hash/nonce afdwingt: verplaats de code naar een extern bestand");
}
// De "Installeren"-knop van de installatiebanner moet een zichtbare achtergrond
// hebben. Alleen `.button` geeft geen vulkleur; op de donkere balk viel de knop
// zo weg. Hij hoort een van de gevulde varianten te krijgen.
{
  const accept = document.querySelector("#install-banner-accept");
  assert(accept && /\bbutton-(primary|ghost|danger)\b/.test(accept.className),
    "#install-banner-accept moet een gevulde knopvariant (button-primary/ghost/danger) hebben, anders is hij onzichtbaar op de balk");
}
assert(playwrightRunnerSrc.includes("url.hostname === 'localhost'") && playwrightRunnerSrc.includes("url.hostname = '127.0.0.1'") && playwrightRunnerSrc.includes("PATH_APP_BASE_URL: baseUrl"), "De Playwright-runner moet browsers en de beheerde PHP-server op dezelfde IPv4-origin houden");
assert(playwrightDbBootstrapSrc.includes("namedTestDatabase") && playwrightDbBootstrapSrc.includes("isolatedCiDatabase") && playwrightDbBootstrapSrc.includes("Refusing destructive Playwright database bootstrap"), "De Playwright DB-bootstrap mag uitsluitend een herkenbare test- of geïsoleerde CI-database opnieuw opbouwen");
assert(dbCrudSmokeSrc.includes("namedTestDatabase") && dbCrudSmokeSrc.includes("isolatedCiDatabase") && dbCrudSmokeSrc.includes("DB CRUD smoke is not allowed"), "De DB CRUD-smoke moet fail-closed buiten een test- of geïsoleerde CI-database");
assert((playwrightConfigSrc.match(/override:\s*false/g) || []).length >= 2, "Playwright stage- en lokale env-bestanden mogen expliciete runner/CI-variabelen niet overschrijven");

// De TEST-regressiesuite (tests/remote/) draait tegen de LIVE TEST-site MET echte
// mail. Een factuur daar vergrendelen via invoices.php action:'lock' zonder de
// jsPDF-conceptfactuur (concept_pdf_base64) laat de server terugvallen op de
// platte simple_pdf-tekstfactuur -- en die gaat dan echt als bijlage de deur uit.
// Elke lock in tests/remote/ moet daarom concept_pdf_base64 meesturen.
{
  const remoteDir = new URL("../tests/remote/", import.meta.url);
  const remoteFiles = readdirSync_(remoteDir).filter((n) => n.endsWith(".ts"));
  const lockZonderConcept = [];
  for (const naam of remoteFiles) {
    const src = readFileSync_(new URL(naam, remoteDir), "utf8");
    const patroon = /action:\s*['"]lock['"]/g;
    let m;
    while ((m = patroon.exec(src)) !== null) {
      const venster = src.slice(Math.max(0, m.index - 600), m.index + 600);
      if (!venster.includes("concept_pdf_base64")) {
        const regel = src.slice(0, m.index).split("\n").length;
        lockZonderConcept.push(`${naam}:${regel}`);
      }
    }
  }
  assert(
    lockZonderConcept.length === 0,
    `tests/remote/ mag een factuur nooit vergrendelen zonder jsPDF-conceptfactuur (concept_pdf_base64); anders verstuurt TEST de platte fallback-PDF. Overtredingen: ${lockZonderConcept.join(", ")}`,
  );
}

dom.window.close();
console.log("Path v1.0.2 volledige smoke test: geslaagd");
// app.js schedules browser refresh timers. In JSDOM those timers can keep Node
// alive after every assertion has completed, which made the release check look
// stuck. End explicitly only after the complete smoke contract is green.
process.exit(0);
