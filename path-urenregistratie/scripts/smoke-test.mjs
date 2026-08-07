import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("assets/app.js", root), "utf8");
const styles = await readFile(new URL("assets/styles.css", root), "utf8");
const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "https://uren.example.invalid/"
});

dom.window.scrollTo = () => {};
dom.window.URL.createObjectURL = () => "blob:test";
dom.window.URL.revokeObjectURL = () => {};
dom.window.eval(script);

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
    save(filename) { pdfDownloads.push(filename); }
  }
};

const { document, Event, MouseEvent, KeyboardEvent } = dom.window;
const downloads = [];
dom.window.HTMLAnchorElement.prototype.click = function captureDownload() {
  downloads.push({ filename: this.download, href: this.href });
};

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ids = [...document.querySelectorAll("[id]")].map(element => element.id);
assert(new Set(ids).size === ids.length, "Ieder element-id moet uniek zijn");
assert(styles.includes("@media (max-width: 590px)"), "Er moet een mobiele layout voor smalle telefoons bestaan");
assert(styles.includes(".correction-banner.dashboard-correction .button"), "De correctiekaart moet op mobiel een bruikbare actieknop houden");
assert(/\.invoice-brand-number-line\s+strong\s*\{[^}]*color:\s*#fff/.test(styles), "Het factuurnummer moet wit en zichtbaar zijn op de donkerblauwe factuurkop");
assert(/\.invoice-brand-references\s+strong\s*\{[^}]*color:\s*#fff/.test(styles), "Shawns drie brokerreferenties moeten wit en zichtbaar zijn in het donkerblauwe referentieblok");

assert(document.querySelectorAll("#dashboard-employee-rows tr").length === 4, "Dashboard moet vier demo-medewerkers tonen");
assert(document.querySelector(".demo-badge").textContent.includes("v0.8.9"), "De zichtbare demoversie moet v0.8.9 zijn");
assert(!document.querySelector('.nav-list [data-view="payroll"]'), "EasySalary hoort niet meer als dubbel onderdeel in het hoofdmenu te staan");
assert(document.querySelector("#dashboard-employee-rows").textContent.includes("Marc de Roon"), "De aangeleverde medewerkergegevens moeten zichtbaar zijn");
assert(document.querySelector("#dashboard-employee-rows").textContent.includes("ItaQ Consultancy"), "De echte brokernaam moet zichtbaar zijn");
assert(document.querySelector("#metric-submitted-note").textContent.includes("Juli 2026"), "Dashboardstatussen moeten de betreffende maand noemen");
assert(document.querySelector("#metric-approved-action").textContent.includes("Open 2 controles"), "Vanuit de goedkeuringskaart moet een concrete doorklikactie voor de gekozen maand staan");
assert(document.querySelector("#hours-total").textContent === "153,0", "Juli moet voor Stasjo van Bakel 153,0 uur tonen");
assert(document.querySelectorAll("#approval-list .approval-card").length === 3, "Alle openstaande moet drie goedkeuringen uit juli en augustus tonen");
assert(document.querySelector("#period-picker").type === "month", "Er moet een directe maand- en jaarkiezer zijn");
assert(document.querySelectorAll("#add-employee").length === 1, "De knop Medewerker toevoegen mag maar één keer bestaan");
const settingsEmails = [...document.querySelectorAll('input[type="email"]')].map(input => input.value);
assert(settingsEmails.some(email => email.endsWith("@example.invalid")), "De algemene verzendafzender moet een veilige placeholder zijn");
assert(settingsEmails.includes("info@pathconsultancy.nl"), "Het e-mailadres uit de originele facturen moet op de PDF-instellingen staan");
assert(document.querySelectorAll("#mail-recipient-settings-list .mail-recipient-setting").length === 2, "Boekhouder en EasySalary moeten als centrale ontvangers bestaan");
assert(document.querySelector("#mail-recipient-settings-list").textContent.includes("salaris@example.invalid"), "Het EasySalary-adres moet centraal zichtbaar zijn");
assert(document.body.textContent.includes("@example.invalid"), "Veilige brokerplaceholders moeten zichtbaar zijn");

assert(!document.querySelector("#login-screen").hidden, "De rolkeuze moet bij het openen zichtbaar zijn");
assert(document.querySelector("#app-shell").hidden, "De applicatie moet voor de rolkeuze verborgen zijn");
assert(document.querySelectorAll("#login-employee option").length === 4, "Alle vier medewerkers moeten in het demo-inlogmenu staan");

const employeePicker = document.querySelector("#login-employee");
employeePicker.value = "4";
employeePicker.dispatchEvent(new Event("change", { bubbles: true }));
const demoScenarioState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(demoScenarioState.schemaVersion === 17, "Versie 0.8.9 moet wijzigingen onder de juiste gegevensversie bewaren");
assert(demoScenarioState.records["2026-08"]["1"].timesheetStatus === "draft", "Augustus moet een concepturenstaat bevatten");
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
assert(demoScenarioState.records["2026-08"]["3"].invoiceStatus === "ready", "Augustus moet een goedgekeurde urenstaat met factuur klaar bevatten");
assert(demoScenarioState.records["2026-08"]["4"].timesheetStatus === "submitted", "Augustus moet een ingediende urenstaat bevatten");
assert(demoScenarioState.records["2026-07"]["4"].invoiceStatus === "ready", "Shawn moet net als andere goedgekeurde medewerkers met Factuur klaar beginnen");
pressEnter("#login-employee");
assert(document.querySelector("#timesheet-employee").textContent === "Shawn-Douglas Nahar", "Enter in de medewerkerkiezer moet met de gekozen medewerker inloggen");
assert(document.querySelector('[data-view="approvals"]').hidden, "Ook een andere medewerker mag geen beheerfuncties zien");
assert(document.querySelector("#view-employee-dashboard").classList.contains("is-active"), "Een medewerker moet op het eigen dashboard starten");
assert(document.querySelector("#employee-dashboard-greeting").textContent.includes("Shawn-Douglas"), "Het medewerkerdashboard moet de voornaam in de begroeting tonen");

click("#switch-role");
employeePicker.value = "2";
employeePicker.dispatchEvent(new Event("change", { bubbles: true }));

click('[data-login-role="employee"]');
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
document.querySelector("#pref-theme").value = "dark";
document.querySelector("#pref-email-notifications").checked = false;
click("#modal-confirm");
assert(document.documentElement.dataset.theme === "dark", "Donkere modus moet direct toegepast worden");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.find(employee => employee.id === 2).emailNotificationsEnabled === false, "Een medewerker moet aanvullende e-mailmeldingen kunnen uitzetten");
click("#notification-button");
assert(!document.querySelector("#notification-panel").hidden, "De meldingknop moet altijd een venster openen");
assert(document.querySelector("#notification-list").textContent.includes("Uren wachten op controle"), "Een medewerker moet eigen testmeldingen zien");
click('[data-test-notification="reminder"]');
assert(document.querySelector("#notification-list").textContent.includes("Urenherinnering"), "Een urenherinnering moet direct testbaar zijn");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).notifications.at(-1).emailRequested === false, "Een uitgeschakelde e-mailvoorkeur moet ook bij urenmeldingen alleen de aanvullende e-mail overslaan");
click("#mark-notifications-read");
assert(document.querySelector("#notification-title").textContent === "Geen nieuwe meldingen", "Na alles lezen moet de teller leeg zijn");
assert(document.querySelector("#notification-list").textContent.includes("Je hebt geen nieuwe meldingen"), "Zonder nieuwe meldingen moet het venster een duidelijke lege toestand tonen");
click('[data-test-notification="reminder"]');
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
click("#help-close");
click('[data-view="timesheet"]');
assert(!document.querySelector("#submit-timesheet").disabled, "Een verschil met contracturen mag indienen nooit blokkeren");
assert(document.querySelector("#hours-target-help").textContent.includes("blokkeert indienen nooit"), "De controle moet duidelijk zeggen dat het verschil niet blokkeert");

const picker = document.querySelector("#period-picker");
picker.value = "2024-01";
picker.dispatchEvent(new Event("change", { bubbles: true }));
assert(document.querySelector("#period-label").textContent === "Januari 2024", "De kiezer moet rechtstreeks naar januari 2024 gaan");
assert(document.querySelector("#timesheet-period-title").textContent === "Januari 2024", "De medewerkersweergave moet dezelfde vrije periode tonen");
assert(document.querySelector("#hours-total").textContent === "0,0", "Een nieuw gekozen maand moet eigen lege uren hebben");
assert(!document.querySelector("#submit-timesheet").disabled, "Ook een lege of afwijkende maand moet ingediend kunnen worden");
assert(document.querySelector("#hours-target-help").textContent.includes("Alleen Januari 2024 wordt ingediend"), "Indienen moet expliciet tot één geselecteerde maand beperkt zijn");
assert(document.querySelectorAll(".workday-cell .hours-day-entry").length === document.querySelectorAll(".hours-input").length, "Iedere datum en ureninvoer moeten samen in één gecentreerd dagblok staan");
assert(document.querySelector(".hours-day-entry .date-number").textContent.includes("jan"), "De datum boven het urenveld moet ook de maandafkorting tonen");
assert(!/\.hours-table\s+\.date-number\s*\{[^}]*position:\s*absolute/.test(styles), "De datum mag niet meer los linksboven van het urenveld staan");

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

picker.value = "2037-12";
picker.dispatchEvent(new Event("change", { bubbles: true }));
assert(document.querySelector("#period-label").textContent === "December 2037", "Ook een verre toekomstige periode moet werken");

click("#switch-role");
const adminPicker = document.querySelector("#login-admin");
assert(document.querySelectorAll("#login-admin option").length === 2, "Gio en Joyce moeten als beheerder testbaar zijn");
adminPicker.value = "joyce";
adminPicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="admin"]');
assert(document.querySelector("#view-dashboard").classList.contains("is-active"), "Een beheerder moet op het dashboard starten");
assert(document.querySelector("#workspace-avatar").textContent === "JV", "Joyce moet overal haar eigen initialen tonen");
assert(document.querySelector("#admin-dashboard-greeting").textContent.includes("Joyce"), "Het beheerdersdashboard moet de gekozen beheerder begroeten");
assert(document.querySelector("#period-label").textContent === "December 2037", "De beheerder moet dezelfde gekozen maand zien");
assert(document.querySelector("#dashboard-team-title").textContent.includes("December 2037"), "De actieve maand moet ook boven het teamoverzicht op het dashboard staan");
assert(document.querySelector("#workflow-period-title").textContent.includes("december 2037"), "Het dashboard moet de gekozen periode gebruiken");
click("#open-payroll");
assert(document.querySelector("#view-payroll").classList.contains("is-active"), "Het dashboard moet rechtstreeks naar de aparte EasySalary-route gaan");
assert(document.querySelector("#payroll-period-title").textContent.includes("December 2037"), "EasySalary moet de gekozen periode gebruiken");
assert(document.querySelectorAll("#payroll-rows tr").length === 4, "EasySalary moet per medewerker een afzonderlijke regel tonen");
assert(document.querySelector("#payroll-rows").textContent.includes("Alleen naam, maand en uren"), "De EasySalary-route mag alleen de minimale urengegevens tonen");
click("#help-launcher");
document.querySelector("#help-input").value = "Hoe keur ik uren goed?";
document.querySelector("#help-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
assert(document.querySelector("#help-messages").textContent.includes("standaard alle openstaande maanden"), "De hulpbot moet een beheerdersvraag naar Goedkeuringen routeren");
assert(document.querySelector("#help-messages").textContent.includes("verplichte toelichting"), "De hulpbot moet de nieuwe correctieflow uitleggen");
assert(document.querySelector('#help-messages [data-help-view="approvals"]'), "Het antwoord over goedkeuren moet direct naar Goedkeuringen linken");
click("#help-close");

click('[data-view="announcements"]');
assert(document.querySelector("#view-announcements").classList.contains("is-active"), "Een beheerder moet Mededelingen kunnen openen");
assert(document.querySelector("#announcement-list").textContent.includes("Nog geen mededelingen"), "Mededelingen moet een duidelijke lege toestand hebben");
click("#add-announcement");
assert(document.querySelector("#announcement-audience"), "Een mededeling moet iedereen, een klantgroep of gekozen medewerkers ondersteunen");
assert(document.querySelector("#modal-confirm").textContent === "Mededeling plaatsen", "Een nieuwe mededeling moet worden geplaatst en niet als verzending worden benoemd");
assert(document.querySelector("#announcement-email").checked, "Een aanvullende e-mailtest moet bewust gekozen en zichtbaar zijn");
document.querySelector("#announcement-title").value = "Algemene testmededeling";
document.querySelector("#announcement-message").value = "Dit bericht is voor alle actieve medewerkers.";
const notificationsBeforeDraft = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).notifications.length;
click("#modal-secondary");
let announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(announcementState.announcements.length === 1 && announcementState.announcements[0].status === "draft", "Een mededeling moet eerst als concept opgeslagen kunnen worden");
assert(announcementState.notifications.length === notificationsBeforeDraft, "Een concept mag geen melding of e-mailtest voor ontvangers maken");
assert(document.querySelector("#announcement-list").textContent.includes("Concept"), "Een concept moet herkenbaar in het beheerdersoverzicht staan");
click('[data-edit-announcement="1"]');
assert(document.querySelector("#announcement-title").value === "Algemene testmededeling", "Een opgeslagen concept moet volledig bewerkbaar blijven");
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(announcementState.announcements.length === 1, "Een algemene mededeling moet in de historie worden opgeslagen");
assert(announcementState.announcements[0].status === "sent", "Een concept moet na verzenden de status Verzonden krijgen");
assert(announcementState.announcements[0].recipientIds.length === 4, "Alle actieve medewerkers moeten een eigen in-app melding krijgen");
assert(announcementState.announcements[0].emailRecipientIds.length === 3, "De e-mailvoorkeur van iedere medewerker moet afzonderlijk worden gerespecteerd");
assert(!announcementState.announcements[0].emailRecipientIds.includes(2), "Een medewerker die e-mail uitzet mag geen aanvullende e-mailtest krijgen");
assert(document.querySelector("#announcement-list").textContent.includes("Algemene testmededeling"), "Het verzonden bericht moet zichtbaar blijven in de historie");
click('[data-correct-announcement="1"]');
assert(!document.querySelector("#announcement-audience"), "Een correctie moet de ontvangers van het oorspronkelijke bericht vastzetten");
assert(document.querySelector("#announcement-title").value === "Algemene testmededeling", "Een wijziging moet zonder zichtbaar correctievoorvoegsel worden opgesteld");
assert(document.querySelector("#modal-confirm").textContent === "Wijziging plaatsen", "De beheerder moet de nieuwe versie direct kunnen plaatsen");
document.querySelector("#announcement-message").value = "De genoemde deadline is vrijdag 17:00 uur.";
click("#modal-confirm");
announcementState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(announcementState.announcements.length === 2, "Een correctie moet als nieuw bericht worden opgeslagen");
assert(announcementState.announcements[1].correctionOfId === 1, "De correctie moet naar het oorspronkelijke bericht verwijzen");
assert(announcementState.announcements[0].message.includes("alle actieve"), "Het oorspronkelijke bericht mag door een correctie niet worden overschreven");
assert(announcementState.announcements[0].supersededById === 2, "De vorige versie moet intern als vervangen worden gemarkeerd");
assert(announcementState.notifications.filter(item => item.announcementId === 1).every(item => item.read && item.superseded), "De vorige versie moet uit iedere actieve medewerkersbel verdwijnen");
assert(JSON.stringify(announcementState.announcements[1].recipientIds) === JSON.stringify(announcementState.announcements[0].recipientIds), "Een correctie moet exact dezelfde ontvangers houden");

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
assert(document.querySelector("#approval-period-title").textContent === "Alle openstaande uren", "Goedkeuringen moeten alle maanden tonen");
assert(document.querySelectorAll("#approval-list .approval-card").length === 3, "Openstaande uren uit juli en augustus moeten samen zichtbaar zijn");
assert(document.querySelector("#approval-list").textContent.includes("Juli 2026") && document.querySelector("#approval-list").textContent.includes("Augustus 2026"), "Iedere groep openstaande uren moet zijn eigen maand tonen");
picker.value = "2026-08";
picker.dispatchEvent(new Event("change", { bubbles: true }));
assert(document.querySelector("#approval-period-title").textContent === "Openstaande uren · Augustus 2026", "Een maandkeuze in Goedkeuringen moet automatisch op die maand filteren");
assert(document.querySelectorAll("#approval-list .approval-card").length === 1, "Augustus moet alleen de ingediende uren uit augustus tonen");
click('[data-approval-scope="all"]');
assert(document.querySelectorAll("#approval-list .approval-card").length === 3, "Alle openstaande moet de regels uit alle maanden weer tonen");
click('[data-view="invoices"]');
assert(document.querySelector("#invoice-period-title").textContent.includes("augustus 2026"), "Facturen moeten de gekozen periode gebruiken");
click('[data-view="employees"]');
assert(document.querySelector("#employee-period-label").textContent === "augustus 2026", "Medewerkerstatussen moeten de gekozen periode gebruiken");
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
assert(document.querySelector("#edit-body").value.includes("{uren}"), "De standaard begeleidende tekst moet het daadwerkelijke urenaantal bevatten");
document.querySelector('[data-mail-recipient-invoice="payroll"]').checked = true;
click("#modal-confirm");
assert(document.querySelector("#employee-grid").textContent.includes("Nieuwe Testmedewerker"), "Een nieuwe medewerker moet direct in het overzicht verschijnen");
assert(document.querySelector("#employee-grid").textContent.includes("kenrich.lieveld@pathconsultancy.nl"), "Een beheerder moet zelf een echt geldig accountadres kunnen invoeren");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.some(employee => employee.brokerEmail === "broker-test@pathconsultancy.nl"), "Ook een zelfgekozen geldig brokeradres moet lokaal worden opgeslagen");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.some(employee => employee.brokerInvoiceAddress.includes("Teststraat 1")), "Ook een zelfgekozen factuuradres van de broker moet lokaal worden opgeslagen");
assert(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).employees.find(employee => employee.name === "Nieuwe Testmedewerker").mailRecipientRoutes.payroll.invoiceAttachment === true, "De beheerder moet per route zelf kunnen kiezen of EasySalary de factuur krijgt");
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
assert(document.querySelector("#mail-template-list").textContent.includes("augustus"), "Brokerteksten moeten de gekozen periode gebruiken");
assert(document.querySelector("#mail-recipient-settings-list").textContent.includes("Boekhouder") && document.querySelector("#mail-recipient-settings-list").textContent.includes("EasySalary"), "Vaste ontvangers moeten één keer centraal beheerd worden");
assert(!document.querySelector('[data-delete-mail-recipient="bookkeeper"]') && !document.querySelector('[data-delete-mail-recipient="payroll"]'), "De vaste systeemrollen mogen niet per ongeluk definitief worden verwijderd");
click("#add-mail-recipient");
assert(document.querySelector("#edit-mail-recipient-name"), "Een beheerder moet zelf een vaste ontvanger kunnen toevoegen");
document.querySelector("#edit-mail-recipient-name").value = "Salarisverwerking test";
document.querySelector("#edit-mail-recipient-email").value = "salaris-test@pathconsultancy.nl";
click("#modal-confirm");
assert(document.querySelector("#mail-recipient-settings-list").textContent.includes("Salarisverwerking test"), "Een zelf aangemaakte ontvanger moet in Instellingen zichtbaar zijn");
let recipientSettingsState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
const extraRecipient = recipientSettingsState.settings.mailRecipients.find(recipient => recipient.name === "Salarisverwerking test");
assert(extraRecipient && extraRecipient.email === "salaris-test@pathconsultancy.nl", "De centrale ontvanger moet met het gekozen adres bewaard blijven");
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

picker.value = "2026-07";
picker.dispatchEvent(new Event("change", { bubbles: true }));
assert(document.querySelector("#period-label").textContent === "Juli 2026", "Teruggaan naar juli moet via de kiezer werken");
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
assert(correctionState.records["2026-07"]["3"].correctionHistory.length === 1, "De correctietekst moet blijvend in de historie worden opgeslagen");
assert(correctionState.records["2026-07"]["3"].correctionHistory[0].requestedBy === "Joyce van der Steenhoven", "De historie moet vastleggen welke beheerder de correctie vroeg");
assert(correctionState.records["2026-07"]["3"].correctionHistory[0].message.includes("14 juli"), "De eigen correctietekst moet volledig worden opgeslagen");

click("#switch-role");
employeePicker.value = "3";
employeePicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="employee"]');
assert(document.querySelector("#employee-dashboard-correction-message").textContent.includes("14 juli"), "De medewerker moet de reden op het eigen dashboard zien");
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
assert(document.querySelector("#employee-announcement-list").textContent.includes("deadline is vrijdag"), "Het medewerkersarchief moet uitsluitend de nieuwste tekst tonen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Dit bericht is voor alle actieve medewerkers"), "Het oude bericht mag nergens in het medewerkersarchief terugkomen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Correctie op") && !document.querySelector("#employee-announcement-list").textContent.includes("Correctie:"), "De medewerker mag geen interne correctiehistorie of correctielabel zien");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("#1") && !document.querySelector("#employee-announcement-list").textContent.includes("#2"), "Interne mededelingnummers mogen niet aan medewerkers worden getoond");
assert(document.querySelector("#employee-announcement-list").textContent.includes("nieuwe releaseplanning"), "Het medewerkersarchief moet de intrekkingsreden tonen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("IND-groepsbericht"), "Het archief mag geen berichten voor een andere klantgroep tonen");
assert(!document.querySelector("#employee-announcement-list").textContent.includes("Persoonlijk testbericht"), "Het archief mag geen bericht voor een andere medewerker tonen");
assert(!document.querySelector('[data-announcement-archive-filter="corrections"]'), "Een correctiefilter mag de verborgen versiehistorie niet aan medewerkers verraden");
click('[data-announcement-archive-filter="withdrawn"]');
assert(document.querySelector("#employee-announcement-list").textContent.includes("Ingetrokken"), "Het intrekkingsfilter moet ingetrokken historie tonen");
click('[data-announcement-archive-filter="all"]');
assert(!document.querySelector('[data-read-announcement="1"]'), "De vervangen eerste versie mag niet als actieve archiefmelding blijven staan");
assert(document.querySelector('[data-read-announcement="2"]'), "Een andere ongelezen archiefmededeling moet afzonderlijk als gelezen gemarkeerd kunnen worden");
click('[data-read-announcement="2"]');
assert(!document.querySelector('[data-read-announcement="2"]'), "Na markeren moet het betreffende archiefbericht gelezen zijn");
click("#notification-button");
const correctionNotification = [...document.querySelectorAll("[data-notification-id]")].find(item => item.textContent.includes("14 juli"));
assert(correctionNotification, "De correctiemelding moet de eigen toelichting bevatten");
correctionNotification.dispatchEvent(new MouseEvent("click", { bubbles: true }));
assert(document.querySelector("#view-timesheet").classList.contains("is-active"), "De correctiemelding moet naar de juiste urenstaat navigeren");
assert(!document.querySelector("#timesheet-correction-banner").hidden, "De correctiereden moet boven de urenstaat zichtbaar zijn");
assert(document.querySelector("#timesheet-correction-message").textContent.includes("8 uur in plaats van 4 uur"), "De urenstaat moet de volledige correctietekst tonen");
assert(document.querySelector("#timesheet-correction-meta").textContent.includes("Joyce van der Steenhoven"), "De urenstaat moet beheerder, datum en tijd tonen");
document.querySelector(".hours-input").value = "4";
document.querySelector(".hours-input").dispatchEvent(new Event("input", { bubbles: true }));
assert(document.querySelector("#timesheet-status").textContent === "Correctie nodig", "Tijdens aanpassen moet de correctiestatus zichtbaar blijven");
click("#submit-timesheet");
correctionState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(correctionState.records["2026-07"]["3"].timesheetStatus === "submitted", "Na aanpassen moet de medewerker opnieuw kunnen indienen");
assert(correctionState.records["2026-07"]["3"].correctionHistory[0].resubmittedAt, "Opnieuw indienen moet in de correctiehistorie worden vastgelegd");
assert(document.querySelector("#timesheet-correction-banner").hidden, "Na opnieuw indienen mag de actieve correctiebanner verdwijnen");
assert(document.querySelector("#employee-history").textContent.includes("Correctie door Joyce"), "De eerdere correctie moet na opnieuw indienen in de historie blijven staan");

click("#switch-role");
adminPicker.value = "joyce";
adminPicker.dispatchEvent(new Event("change", { bubbles: true }));
click('[data-login-role="admin"]');
click('[data-view="approvals"]');
click("[data-approve]");
assert(document.querySelectorAll("#approval-list .approval-card").length === 2, "Goedkeuren moet de openstaande lijst bijwerken");

click('[data-view="invoices"]');
assert(document.querySelector("#invoice-rows").textContent.includes("Urencontrole nodig"), "De factuurlijst moet praktisch aangeven dat urencontrole nodig is");
assert(document.querySelector("#invoice-rows").textContent.includes("Uren goedkeuren"), "Een open urencontrole moet rechtstreeks vanuit de factuurlijst te openen zijn");
assert(document.querySelector("#invoice-rows").textContent.includes("Mailvoorbeeld"), "Een klare factuur moet een duidelijke volgende actie tonen");
assert(!document.querySelector("#invoice-rows").textContent.includes("Mailtest bekijken"), "Shawn mag bij het openen niet afwijkend als vooraf geteste mail worden getoond");
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
assert(document.querySelector("#modal-summary").textContent.includes("Laan van ZuidHoorn 165") && document.querySelector("#modal-summary").textContent.includes("2289 DD Rijswijk"), "Het ItaQ-factuuradres moet exact uit de bronfactuur komen");
assert(document.querySelector("#modal-summary").textContent.includes("2289 DD Rijswijk"), "De postcode en plaats van de ontvanger moeten volledig zichtbaar blijven");
assert(document.querySelector("#modal-summary").textContent.includes("01-08-2026"), "De factuurdatum moet de eerste dag na de gefactureerde maand zijn");
assert(document.querySelector("#modal-summary").textContent.includes("06 21 46 91 72") && document.querySelector("#modal-summary").textContent.includes("info@pathconsultancy.nl"), "GSM en e-mail uit de originele facturen moeten zichtbaar zijn");
assert(document.querySelector("#modal-summary").textContent.includes("Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden."), "De oorspronkelijke factuurinleiding moet behouden blijven");
assert(document.querySelector("#modal-summary").textContent.includes("binnen 30 dagen van de factuurdatum"), "De oorspronkelijke betalingstekst moet behouden blijven");
assert(document.querySelector("#modal-summary").textContent.includes("€ 13,940.00") && document.querySelector("#modal-summary").textContent.includes("€ 16,867.40"), "De bedragen van Marc moeten dezelfde notatie en totalen als de bronfactuur gebruiken");
assert(!document.querySelector("#modal-summary").textContent.includes("Vervaldatum"), "De conceptfactuur mag geen veld toevoegen dat niet op de bronfactuur staat");
assert(!document.querySelector("#modal-summary").textContent.includes("Factuuradres: nog definitief bevestigen"), "ItaQ mag niet meer als onbevestigd factuuradres worden getoond");
assert(document.querySelector("#modal-secondary").textContent === "PDF downloaden", "Vanuit het factuurvoorbeeld moet een PDF te downloaden zijn");
click("#modal-secondary");
assert(pdfDownloads.length === 1 && pdfDownloads[0].endsWith(".pdf"), "De factuurdownload moet een PDF-bestand maken");
click("#modal-confirm");
click('[data-preview-invoice-pdf="4"]');
const shawnInvoiceText = document.querySelector("#modal-summary").textContent;
assert(shawnInvoiceText.includes("Factuurnummer:Bel-Shawn-2026-juli") && shawnInvoiceText.includes("01-08-2026"), "Shawns factuurnummer en factuurdatum moeten exact zijn");
assert(shawnInvoiceText.includes("circle8") && shawnInvoiceText.includes("Plettenburg-West,") && shawnInvoiceText.includes("Fultonbaan 6,") && shawnInvoiceText.includes("3439 NE Nieuwegein"), "De volledige Circle8-adressering moet exact op Shawns factuur staan");
assert(shawnInvoiceText.includes("Overeenkomstnummer:") && shawnInvoiceText.includes("202636991"), "Shawns overeenkomstnummer moet zichtbaar zijn");
assert(shawnInvoiceText.includes("Crediteurennummer:") && shawnInvoiceText.includes("622085"), "Shawns crediteurennummer moet zichtbaar zijn");
assert(shawnInvoiceText.includes("Nummer opdrachtuitvoerder:") && shawnInvoiceText.includes("217744"), "Shawns nummer opdrachtuitvoerder moet zichtbaar zijn");
assert(shawnInvoiceText.includes("belastingdienst") && shawnInvoiceText.includes("Maand juli"), "Shawns project en omschrijving moeten exact zijn");
assert(shawnInvoiceText.includes("€ 85.50") && shawnInvoiceText.includes("€ 12,312.00") && shawnInvoiceText.includes("€ 2,585.52") && shawnInvoiceText.includes("€ 14,897.52"), "Shawns tarief en alle totalen moeten exact overeenkomen");
click("#modal-confirm");
click("[data-simulate-invoice]");
assert(document.querySelector("#modal-message").textContent.includes("ieder afzonderlijk bericht"), "Iedere aangevinkte ontvanger moet een apart bericht krijgen");
assert(document.querySelector("#modal-message").textContent.includes("Daadwerkelijk gewerkte uren"), "De gemeenschappelijke tekst moet het daadwerkelijke urenaantal bevatten");
assert(document.querySelector("#modal-message").textContent.includes("ItaQ Consultancy: factuur als PDF") && document.querySelector("#modal-message").textContent.includes("Boekhouder: factuur als PDF"), "Broker en boekhouder moeten standaard de factuur ontvangen");
assert(document.querySelector("#modal-message").textContent.includes("EasySalary: geen bijlage"), "EasySalary moet standaard alleen de tekst ontvangen");
assert(document.querySelector("#modal-message").textContent.includes("Salarisverwerking test: geen bijlage"), "Een aangevinkte extra ontvanger moet de gekozen bijlage-instelling volgen");
assert(document.querySelector("#modal-message").textContent.includes("Urenstaat: niet toegevoegd"), "Geen enkele route mag standaard een urenstaat als bijlage krijgen");
assert(document.querySelector("#modal-summary").textContent.includes("BCCNiet gebruikt"), "De factuurroute mag geen BCC gebruiken");
assert(document.querySelector("#modal-message").textContent.includes("verstuurt geen e-mail"), "De verzendactie moet expliciet een veilige test zijn");
click("#modal-confirm");
assert(document.querySelector("#invoice-rows").textContent.includes("Test gedaan"), "De verzendteststatus moet worden vastgelegd");
click("#download-invoice-list");
assert(downloads.some(item => item.filename === "Path_demo_factuuroverzicht_2026-07.csv"), "Het factuuroverzicht moet als CSV voor de gekozen periode downloaden");
click('[data-invoice-filter="simulated"]');
assert(document.querySelectorAll("#invoice-rows tr").length >= 1, "Het filter Test gedaan moet facturen met een afgeronde verzendtest tonen");
click('[data-invoice-filter="all"]');

click("#open-payroll-from-invoices");
assert(document.querySelector("#view-payroll").classList.contains("is-active"), "EasySalary moet vanuit Facturen controleerbaar blijven zonder hoofdmenu-item");
assert(document.querySelector("#payroll-recipient").textContent.endsWith("@example.invalid"), "De EasySalary-ontvanger moet in de demo veilig blijven");
const payrollPreview = document.querySelector("[data-simulate-payroll]");
assert(payrollPreview, "Goedgekeurde uren moeten een afzonderlijk EasySalary-mailvoorbeeld krijgen");
payrollPreview.dispatchEvent(new MouseEvent("click", { bubbles: true }));
assert(document.querySelector("#modal-message").textContent.includes("Daadwerkelijk gewerkte uren"), "De EasySalary-mail moet het goedgekeurde urentotaal in de gemeenschappelijke tekst zetten");
assert(document.querySelector("#modal-summary").textContent.includes("BijlagenGeen"), "De EasySalary-mail mag geen bijlage bevatten");
assert(document.querySelector("#modal-summary").textContent.includes("TariefgegevensNiet opgenomen"), "EasySalary mag geen tariefgegevens ontvangen");
assert(!document.querySelector("#modal-summary").textContent.includes("ItaQ"), "EasySalary mag geen brokergegevens ontvangen");
assert(!document.querySelector("#modal-summary").textContent.includes("€"), "EasySalary mag geen tarief of bedrag ontvangen");
click("#modal-confirm");
assert(document.querySelector("#payroll-rows").textContent.includes("Mailtest gedaan"), "Een losse EasySalary-mailtest moet een eigen status krijgen");
assert(!document.querySelector("#test-all-payroll"), "De aparte EasySalary-bulkknop moet verwijderd zijn");
click("#back-to-invoices");
assert(document.querySelector("#view-invoices").classList.contains("is-active"), "Na de EasySalary-controle moet de beheerder terug kunnen naar Facturen");
picker.value = "2026-08";
picker.dispatchEvent(new Event("change", { bubbles: true }));
assert(!document.querySelector("#test-month-delivery").disabled, "De beheerder moet de overige maandroutes met één knop kunnen klaarzetten");
click("#test-month-delivery");
assert(document.querySelector("#modal-title").textContent.includes("Maandverzending"), "De ene knop moet vóór uitvoering een duidelijke maandbevestiging tonen");
assert(document.querySelector("#modal-summary").textContent.includes("ItaQ Consultancy") && document.querySelector("#modal-summary").textContent.includes("met factuur"), "De maandknop moet de instelbare brokerbijlage tonen");
assert(document.querySelector("#modal-summary").textContent.includes("Boekhouder"), "De maandknop moet de boekhouderroute apart benoemen");
assert(document.querySelector("#modal-summary").textContent.includes("EasySalary") && document.querySelector("#modal-summary").textContent.includes("0 met factuur"), "De maandknop moet tonen dat EasySalary standaard geen factuur krijgt");
assert(document.querySelector("#modal-summary").textContent.includes("UrenstaatNooit toegevoegd"), "De maandknop moet bevestigen dat geen urenstaat meegaat");
assert(document.querySelector("#modal-message").textContent.includes("geen CC of BCC"), "De maandknop mag ontvangers niet in één CC- of BCC-mail combineren");
click("#modal-confirm");
assert(document.querySelector("#test-month-delivery").disabled, "Na de veilige maandtest moet dezelfde verzending niet nogmaals klaarstaan");
assert(document.querySelector("#toast").textContent.includes("afzonderlijke berichten per ontvanger"), "De maandtest moet bevestigen dat niets is gecombineerd of verstuurd");

click('[data-view="settings"]');
const invoiceHistoryBeforeRecipientDelete = JSON.stringify(JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final")).records);
click('[data-delete-mail-recipient="' + extraRecipient.id + '"]');
assert(document.querySelector("#modal-message").textContent.includes("aangevinkt bij 1 medewerker"), "Verwijderen moet waarschuwen als een ontvanger al bij een medewerker wordt gebruikt");
click("#modal-confirm");
const stateAfterRecipientDelete = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(!stateAfterRecipientDelete.settings.mailRecipients.some(recipient => recipient.id === extraRecipient.id), "Een zelf aangemaakte ontvanger moet definitief verwijderd kunnen worden");
assert(!stateAfterRecipientDelete.employees.some(employee => employee.mailRecipientRoutes && employee.mailRecipientRoutes[extraRecipient.id]), "Bij verwijderen moeten de bijbehorende medewerkerkeuzes worden opgeruimd");
assert(JSON.stringify(stateAfterRecipientDelete.records) === invoiceHistoryBeforeRecipientDelete, "Ontvanger verwijderen mag uren- en factuurhistorie niet verwijderen");

click('[data-view="approvals"]');
click("#approve-all");
click("#modal-confirm");
assert(document.querySelectorAll("#approval-list .approval-card").length === 0, "Alles goedkeuren moet de volledige zichtbare wachtrij afronden");

click('[data-view="settings"]');
click("#reset-demo");
click("#modal-confirm");
const resetState = JSON.parse(dom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(resetState.employees.length === 4, "Demo herstellen moet toegevoegde medewerkers verwijderen");
assert(resetState.preferences.theme === "light", "Demo herstellen moet Licht opnieuw als standaard instellen");
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
  employee.mailBody = "Middag,\n\nHierbij stuur ik jullie de factuur en uren van {medewerker} over de maand {maand}.";
});
legacyState.admins.forEach(admin => { delete admin.emailNotificationsEnabled; });
Object.values(legacyState.records).forEach(periodRecords => {
  Object.values(periodRecords).forEach(record => { delete record.correctionHistory; });
});
const migrationDom = new JSDOM(html, { runScripts: "outside-only", url: "https://uren.example.invalid/" });
migrationDom.window.scrollTo = () => {};
migrationDom.window.URL.createObjectURL = () => "blob:test";
migrationDom.window.URL.revokeObjectURL = () => {};
migrationDom.window.localStorage.setItem("path-uren-demo-v07-final", JSON.stringify(legacyState));
migrationDom.window.eval(script);
const migrationPicker = migrationDom.window.document.querySelector("#login-admin");
migrationPicker.value = "joyce";
migrationPicker.dispatchEvent(new migrationDom.window.Event("change", { bubbles: true }));
const migratedState = JSON.parse(migrationDom.window.localStorage.getItem("path-uren-demo-v07-final"));
assert(migratedState.schemaVersion === 17, "Bestaande browsergegevens moeten automatisch naar v0.8.9 migreren");
assert(migratedState.records["2026-07"]["4"].invoiceNumber === "Bel-Shawn-2026-juli", "Migratie moet ook bestaande factuurnummers omzetten naar de afgesproken koppeltekens");
assert(migratedState.records["2026-07"]["4"].invoiceStatus === "ready", "Migratie moet de vooraf ingevulde Shawn-mailtest terugzetten naar Factuur klaar");
assert(Array.isArray(migratedState.records["2026-07"]["1"].correctionHistory), "Migratie moet de correctiehistorie toevoegen zonder bestaande uren te wissen");
assert(migratedState.records["2026-07"]["1"].payrollStatus, "Migratie moet de aparte EasySalary-status toevoegen zonder bestaande uren te wissen");
assert(migratedState.announcements[0].status === "sent" && migratedState.announcements[0].kind === "standard", "Migratie moet oude mededelingen als verzonden standaardhistorie behouden");
assert(migratedState.announcements[0].supersededById === 2, "Migratie moet een eerdere berichtversie automatisch intern vervangen");
assert(migratedState.notifications.find(item => item.id === 99).read && migratedState.notifications.find(item => item.id === 99).superseded, "Migratie moet een melding van een vervangen versie uit de actieve bel halen");
assert(migratedState.announcementArchiveFilter === "all", "Migratie moet het medewerkersarchief met een veilig standaardfilter toevoegen");
assert(migratedState.employees.every(employee => employee.emailNotificationsEnabled === true), "Migratie moet e-mailmeldingen veilig als persoonlijke voorkeur toevoegen");
assert(migratedState.employees.every(employee => employee.brokerInvoiceAttachment === true && employee.bookkeeperInvoiceAttachment === true && employee.payrollInvoiceAttachment === false), "Migratie moet de veilige standaardbijlagen per route toevoegen");
assert(migratedState.employees.every(employee => employee.brokerMailEnabled === true), "Migratie moet voor iedere bestaande broker het keuzevak Ontvangt mail veilig inschakelen");
assert(migratedState.settings.address === "Du Perronstraat 12" && migratedState.settings.postalCity === "3067 HN Rotterdam", "Migratie moet het oude gecombineerde bedrijfsadres correct splitsen");
assert(migratedState.settings.phone === "06 21 46 91 72" && migratedState.settings.invoiceEmail === "info@pathconsultancy.nl", "Migratie moet GSM en factuur-e-mail uit de bronfacturen aanvullen");
assert(migratedState.employees.filter(employee => /itaq/i.test(employee.broker)).every(employee => employee.brokerInvoiceAddress.includes("Laan van ZuidHoorn 165") && employee.invoiceRecipientName === "Itaq"), "Migratie moet de exacte ItaQ-factuurgegevens aanvullen");
assert(migratedState.employees.find(employee => employee.id === 4).brokerInvoiceAddress.includes("Fultonbaan 6") && migratedState.employees.find(employee => employee.id === 4).invoiceRecipientName === "circle8", "Migratie moet de volledige Circle8-adressering aanvullen");
assert(migratedState.employees.find(employee => employee.id === 4).agreementNumber === "202636991" && migratedState.employees.find(employee => employee.id === 4).creditorNumber === "622085" && migratedState.employees.find(employee => employee.id === 4).contractorNumber === "217744", "Migratie moet alle drie speciale Shawn-referenties aanvullen");
assert(migratedState.settings.mailRecipients.some(recipient => recipient.id === "bookkeeper") && migratedState.settings.mailRecipients.some(recipient => recipient.id === "payroll"), "Migratie moet boekhouder en EasySalary als centrale ontvangers aanmaken");
assert(migratedState.employees.every(employee => employee.mailRecipientRoutes.bookkeeper.enabled && employee.mailRecipientRoutes.payroll.enabled), "Migratie moet de bestaande vaste ontvangers per medewerker selecteren");
assert(migratedState.employees.every(employee => employee.mailBody.includes("{uren}")), "Migratie moet de oude standaardtekst aanvullen met de daadwerkelijke uren");
assert(migratedState.records["2026-07"]["1"].entries.flat().reduce((sum, value) => sum + value, 0) === 164, "Migratie moet bestaande uren volledig behouden");

console.log("Path demo v0.8.9 volledige smoke test: geslaagd");
