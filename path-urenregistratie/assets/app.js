const STORAGE_KEY = "path-uren-demo-v07-final";
const DEMO_DOMAIN = "@example.invalid";
const SUPPORT_EMAIL = "backoffice@pathconsultancy.nl";
const DEFAULT_INVOICE_MAIL_BODY = "Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.";
const PATH_LOGO_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKIAAAA2CAMAAABz27J8AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABj1BMVEWy4dQ6n4cKrn5Gu5gSXWMuqoAYm3sTXWMNHDgQPE1LuoBLuoBIuIARqX8KrX4TXmMOIjxFvJtLuoAyrIAdo4AKrn5GvJtDupkQNklLuoA+soAVqH8KpHoqp4MKrn5LuoAKoHdKuoFKuoAKrX7+/v4Jrn7+/v7////////////////////////+/v5Gu5pFu5YMhG0OSVANHTj////////////+/v5Iu40MmXUMVVMOHDhFu5Y1rYAdo4ALZ1wOLEENPEf///8Ni3I5tJBEupk0r4sRRlQ9tZQQdWsPMUYOHDhFvJsuq4r///8Ra2cQO0wPf24OIjw4spETXWMRT1oRRVITXmMOHDgOHTgTXWMOHDgOHDgOHjkTXWMOGzgOHDgOHDhGvJtGu5tGu5tGu5pJuohGu5tGvJtGvJtGvJtGvJtGvJtGvJtFu5pGvJpGvJtGvJtGvJtGu5tGvJtGvJtGvJtGvJtGvJshooFKuYAKrX5FtoD///9Fu5oOIzwOHDgSVF0TYGQSXGIRTVgdkXmwq1CyAAAAeHRSTlMBCUMypvj5uEYef+j6/uuGMVjM/v7JYRcStv79/v72LY5333sU3UfTxJNVNGQmJOL++Ej1tKSC/f399v39/f3+/uX+/fv+/v7+/j4b/nP++v304NPWJuXsnfi6ZdHxSvqBNTylykdUavW43ZDvmIbr7q+0wdWfT3duXC0bAAAAAWJLR0QnLQ+oIwAAAAd0SU1FB+kLExUdG6cH7eEAAAaHSURBVGje7Zn7d9pGFsfvmLaJG6eJnESorVOyu1oGoVdaSTRtmrZKnb6It1ua124fu4AlBLYFBsdIE9lOlP7h/WEEQgJscJwe9py9P3BAZwZ9dB/fuTMC+L/9GYaWltBiE2beePOtc+cXGHD57QsrnnfxnUuXFzXGzOqKf8XzrhJyjc0uICC39O6K77/neZ73PiFr15ayC1cl717wff/Zdc/zvKuEEPLBtcWqm9yNC77v+/4Vz4vcSAj54FxucarkL39d8X3f9595kV0khBBC3vlbdkFivEoBh06MQk0IWVuIaA9i7Ee1Mhrq8WgjPmknPwDP8zw/nHoaFw5iPKyVpBsJIX+/wcXj8zhpBaF4/G1FjDEWAAAkjDEW5LkRFdUf2hXPm+BGcvPDj+LxxSBtmi4ed4O8FgSBAQBQCoIgCHR+fsSDjyc4MXbjrU8OPz0WMQiwOAeiVjwF4sFtCvmZl7A7hBBy6/Mvjo5OQgwK/OyIgXAaxIOD277vr3gpu0jWbn55dJREFA3djMBMoRR91aRZEPMl/AqIBwe3n715J213Pzk8SiMCIEmjKZhHIAoaTTA0AyKA9EqIB1+9v5ayWx8eHU1ABNmM0z7ixTTSSJQEQ5BENFQaWZS0IAh0UZQHWSJQJUJzI65fv0NSdvP54TGIkTNELQiCwJQBABWjHDAF2cAYGwj4gkZdrmk6GiLykl7ABaPIz4d4b1RmaCm/CL+OEM9PQDQSiCKAbGhxjZtBEBQQ8DguqSGihLVZ1CqN+E1SrQkha9+GYfgdRfz+REQZeH2szhHwhXFEbA6vzaaRZYp4P6nWhJC7YRiGLw+nIhZkAAB+Q4tUh0qKaZRKuhZD5YslLQiCQrGYH1UsTZtDIyniV1St10ac+I8wHLhxImKAJR7lI5wSiJRbBABUNIeIyYouRgGW8kWaFcLMiOvXR9Q6qpUwHLpxMmKg6Ub0zRRhY5CSsUhPQxR4AEBCPGQWxHupNpGQWy8oYvjDdMR4lS4B0kfyc+DSyYhYjvVyZsT162P9zbcRYfj88ERETeCj0h0sMrRKpiDqI48xM+L9sf5m6MQw/OEERA1LKLoWZ79+DKIw8i+zIq6PtYlRrVA3fjGlog3DMAyhRAWYIuYHQ4wzRrw31ibeDUfs68mI0vi1oRfRGXvxm0R7c/Vi0olhGH43AyLNxY3Er7NDvD/WJv4zQRi+/PFkROq3QcOT11KI+ishVlJd4tW1kVqJKub78fYqhUh1MYo0MkYa3bwWBIGZ51GqGaOIs6yA2Z9+T9uLlyl7MHIIJRcluu6mEKkUmpLM82KJLjnmRhENF/GCALKkpxG1jeIMfnx46dGLhA1asIE9fjJ6TFaMFmCc3snRxVozMY4bHlOGYbOjo43ExiCSLnOmHeHlc/8aDWsS8dN/n088Z3HaVoA3RpscHN+/NEAsJWbOhQjczw+mIf7yM5ccG3UCpfH48HG/WJBLcacr4wTisAET5kEEWL70aBLi4ycPx7YiBYwL+sQMQkXd1IJAMwUZ+FIBY0xxRMM0Tc0ACWNcEIYFwgvxkJns8pNf04jpGMfnH9NSHMl5ScrLyXMSACTLoiiPH5jwc56goN+ilIwQ/zMW40U4pqUpSREf/3f5LA7dqhkAJXOGkA8vPaKISaE5vSkVtQb1zTMNx+U3fn1+ODkJJ7vJYi0EqMZaCDLVrMWUATKsraCaAtlaGTUcO9tsLUHWZnLVLFdTMmw1mpWtZQGU6ilC89uDOZIQbW2r2zuc21Y7O0qzvdtyupzV6rU2bbVXZpxdZDm21XG6mWZbVbdZq7232VEtOovt7KJqZbV8mlPlOZKw2t5R6i2m/VRxHZtd31F2Opmtts02radtpdzb5CzHRt1Kzu0wSv2A5bqdfdtx6aya2671Vet1Vxjj7INSZZ19qHb6lsNAY7vKqO2ey/XbOehucpZjQ311ubvKAbPOQr2SVVSXzkI5td+sv3YRsB0bbLfhsGA5DcuxoeHUMmyj6TD9dgY1e5zlMKheUXZbCjRuN9AA0QbbzaJuRWVeO6Ky1+vvNXO9Vn2vUt11LGCdel3tP93eZ5xmXXUate2W7TpP2U6vXnE2GbXHlVste6/X32tywDqV8uvX0lq9uZWDh25zp4r6fQ6W3X7ObXZZxLnNG/tbNmrsWGW3z7HdLtN3rS0bgN1S6CxQVPfPeSUy8jn90qRZHNOyYLGNadW5BUdE5QV/N/+/bH8AzHkozyLYwM8AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDYtMDFUMTE6NTU6MDcrMDA6MDAUEDBLAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTA2LTAxVDExOjU1OjA3KzAwOjAwZU2I9wAAAABJRU5ErkJggg==";
const MONTH_NAMES = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"
];

function defaultMailRecipientRoutes() {
  return {
    bookkeeper: { enabled: true, invoiceAttachment: true },
    payroll: { enabled: true, invoiceAttachment: false }
  };
}

function parsePeriodKey(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(value));
  if (!match) return null;
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

function makePeriodKey(year, monthIndex) {
  return String(year).padStart(4, "0") + "-" + String(monthIndex + 1).padStart(2, "0");
}

function utcDate(year, monthIndex, day) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

function isoWeekInfo(date) {
  const target = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const weekYear = target.getUTCFullYear();
  const yearStart = utcDate(weekYear, 0, 1);
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return { week, year: weekYear };
}

function periodFromKey(key) {
  const parsed = parsePeriodKey(key) || { year: 2026, monthIndex: 6 };
  const month = MONTH_NAMES[parsed.monthIndex];
  const weekRows = [];
  const rowsByMonday = new Map();
  const daysInMonth = utcDate(parsed.year, parsed.monthIndex + 1, 0).getUTCDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = utcDate(parsed.year, parsed.monthIndex, day);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - (weekday - 1));
    const mondayKey = monday.toISOString().slice(0, 10);
    let row = rowsByMonday.get(mondayKey);
    if (!row) {
      const info = isoWeekInfo(date);
      row = { number: info.week, year: info.year, days: Array(5).fill(null) };
      rowsByMonday.set(mondayKey, row);
      weekRows.push(row);
    }
    row.days[weekday - 1] = {
      day,
      label: day + " " + month + " " + parsed.year
    };
  }

  const label = month.charAt(0).toUpperCase() + month.slice(1) + " " + parsed.year;
  return {
    key: makePeriodKey(parsed.year, parsed.monthIndex),
    label,
    month,
    year: parsed.year,
    monthIndex: parsed.monthIndex,
    weekRows,
    businessDays: weekRows.reduce((sum, row) => sum + row.days.filter(Boolean).length, 0)
  };
}

function shiftPeriodKey(key, delta) {
  const parsed = parsePeriodKey(key);
  if (!parsed) return "2026-07";
  const absoluteMonth = parsed.year * 12 + parsed.monthIndex + delta;
  const year = Math.floor(absoluteMonth / 12);
  const monthIndex = ((absoluteMonth % 12) + 12) % 12;
  if (year < 1 || year > 9999) return key;
  return makePeriodKey(year, monthIndex);
}

function emptyEntries(periodKey) {
  return Array.from({ length: periodFromKey(periodKey).weekRows.length }, () => Array(5).fill(0));
}

function entriesFromTotal(total, periodKey) {
  const period = periodFromKey(periodKey);
  const entries = emptyEntries(period.key);
  let remaining = total;
  for (let week = 0; week < entries.length && remaining > 0; week += 1) {
    for (let day = 0; day < entries[week].length && remaining > 0; day += 1) {
      if (!period.weekRows[week].days[day]) continue;
      const value = Math.min(8, remaining);
      entries[week][day] = value;
      remaining -= value;
    }
  }
  return entries;
}

function makeRecord(total, contractHours, timesheetStatus, invoiceStatus, invoiceNumber, periodKey) {
  return {
    entries: entriesFromTotal(total, periodKey),
    contractHours,
    leave: 0,
    sick: 0,
    timesheetStatus,
    invoiceStatus,
    payrollStatus: timesheetStatus === "approved" ? "ready" : "concept",
    invoiceNumber,
    correctionHistory: []
  };
}

function makeCorrectionRecord(total, contractHours, invoiceNumber, periodKey, message) {
  const record = makeRecord(total, contractHours, "correction", "concept", invoiceNumber, periodKey);
  record.correctionHistory.push({
    id: 1,
    message,
    requestedBy: "Joyce van der Steenhoven",
    requestedAt: "5 augustus 2026 om 10:15",
    requestedAtIso: "2026-08-05T08:15:00.000Z",
    resubmittedAt: null,
    resubmittedAtIso: null
  });
  return record;
}

function freshState() {
  return {
    schemaVersion: 16,
    currentRole: null,
    currentAdminId: "gio",
    currentEmployeeId: 2,
    selectedPeriodKey: "2026-07",
    invoiceFilter: "all",
    approvalScope: "all",
    employeeScope: "active",
    announcementArchiveFilter: "all",
    preferences: {
      theme: "light",
      themeDefaultVersion: 1,
      hourReminders: true,
      statusNotifications: true,
      approvalNotifications: true,
      invoiceNotifications: true
    },
    admins: [
      { id: "gio", name: "Gio Maatsen", email: "gio@example.invalid", active: true, emailNotificationsEnabled: true, photo: "" },
      { id: "joyce", name: "Joyce van der Steenhoven", email: "joyce@example.invalid", active: true, emailNotificationsEnabled: true, photo: "" }
    ],
    settings: {
      companyName: "QSI Consultancy",
      kvk: "89320018",
      vat: "NL001622017B32",
      iban: "NL95INGB0006947972",
      address: "Du Perronstraat 12",
      postalCity: "3067 HN Rotterdam",
      phone: "06 21 46 91 72",
      invoiceEmail: "info@pathconsultancy.nl",
      paymentTerm: "30",
      sender: "backoffice@example.invalid",
      bookkeeperName: "Boekhouder",
      bookkeeper: "boekhouder@example.invalid",
      payrollName: "EasySalary",
      payroll: "salaris@example.invalid",
      mailRecipients: [
        { id: "bookkeeper", name: "Boekhouder", email: "boekhouder@example.invalid", active: true },
        { id: "payroll", name: "EasySalary", email: "salaris@example.invalid", active: true }
      ],
      approvalRequired: true,
      lockInvoice: true,
      auditLog: true
    },
    employees: [
      {
        id: 1,
        name: "Marc de Roon",
        email: "marc@example.invalid",
        active: true,
        startDate: "2026-01-01",
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
        mailBody: DEFAULT_INVOICE_MAIL_BODY,
        brokerInvoiceAttachment: true,
        bookkeeperInvoiceAttachment: true,
        payrollInvoiceAttachment: false,
        mailRecipientRoutes: defaultMailRecipientRoutes()
      },
      {
        id: 2,
        name: "Stasjo van Bakel",
        email: "stasjo@example.invalid",
        active: true,
        startDate: "2026-01-01",
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
        mailBody: DEFAULT_INVOICE_MAIL_BODY,
        brokerInvoiceAttachment: true,
        bookkeeperInvoiceAttachment: true,
        payrollInvoiceAttachment: false,
        mailRecipientRoutes: defaultMailRecipientRoutes()
      },
      {
        id: 3,
        name: "Brian Hek",
        email: "brian@example.invalid",
        active: true,
        startDate: "2026-01-01",
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
        mailBody: DEFAULT_INVOICE_MAIL_BODY,
        brokerInvoiceAttachment: true,
        bookkeeperInvoiceAttachment: true,
        payrollInvoiceAttachment: false,
        mailRecipientRoutes: defaultMailRecipientRoutes()
      },
      {
        id: 4,
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
        mailBody: DEFAULT_INVOICE_MAIL_BODY,
        brokerInvoiceAttachment: true,
        bookkeeperInvoiceAttachment: true,
        payrollInvoiceAttachment: false,
        mailRecipientRoutes: defaultMailRecipientRoutes()
      }
    ],
    notifications: [
      { id: 1, audience: "admin", employeeId: 2, title: "Uren ingediend", message: "Stasjo heeft Juli 2026 ingediend.", periodKey: "2026-07", view: "approvals", read: false, createdAt: "Vandaag, 09:12" },
      { id: 2, audience: "admin", employeeId: 3, title: "Uren ingediend", message: "Brian heeft Juli 2026 ingediend.", periodKey: "2026-07", view: "approvals", read: false, createdAt: "Vandaag, 09:18" },
      { id: 3, audience: "employee", employeeId: 2, title: "Uren wachten op controle", message: "Je uren voor Juli 2026 zijn ingediend.", periodKey: "2026-07", view: "employee-dashboard", read: false, createdAt: "Vandaag, 09:12" }
    ],
    announcements: [],
    records: {
      "2026-06": {
        "1": makeRecord(144, 144, "approved", "simulated", "IND-2026-juni", "2026-06"),
        "2": makeRecord(144, 144, "approved", "simulated", "IND-StvB-2026-juni", "2026-06"),
        "3": makeRecord(136, 144, "approved", "simulated", "COA-2026-juni", "2026-06"),
        "4": makeRecord(144, 144, "approved", "simulated", "Bel-Shawn-2026-juni", "2026-06")
      },
      "2026-07": {
        "1": makeRecord(164, 164, "approved", "ready", "IND-2026-juli", "2026-07"),
        "2": makeRecord(153, 153, "submitted", "concept", "IND-StvB-2026-juli", "2026-07"),
        "3": makeRecord(117, 153, "submitted", "concept", "COA-2026-juli", "2026-07"),
        "4": makeRecord(144, 144, "approved", "simulated", "Bel-Shawn-2026-juli", "2026-07")
      },
      "2026-08": {
        "1": makeRecord(0, 151.2, "draft", "concept", "IND-2026-augustus", "2026-08"),
        "2": makeCorrectionRecord(80, 151.2, "IND-StvB-2026-augustus", "2026-08", "Controleer 12 augustus: daar staat 8 uur, maar volgens de planning hoort dit 4 uur te zijn."),
        "3": makeRecord(144, 151.2, "approved", "ready", "COA-2026-augustus", "2026-08"),
        "4": makeRecord(144, 151.2, "submitted", "concept", "Bel-Shawn-2026-augustus", "2026-08")
      }
    }
  };
}

function loadState() {
  const fallback = freshState();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!saved || ![7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(saved.schemaVersion) || !parsePeriodKey(saved.selectedPeriodKey)) return fallback;
    const previousSchemaVersion = Number(saved.schemaVersion || 0);
    const hadLightDefault = saved.preferences && saved.preferences.themeDefaultVersion === 1;
    saved.preferences = Object.assign({}, fallback.preferences, saved.preferences || {});
    if (!hadLightDefault) {
      saved.preferences.theme = "light";
      saved.preferences.themeDefaultVersion = 1;
    }
    const previousSettings = saved.settings || {};
    saved.settings = Object.assign({}, fallback.settings, previousSettings);
    if (!Object.prototype.hasOwnProperty.call(previousSettings, "postalCity") && String(saved.settings.address || "").includes(",")) {
      const addressParts = String(saved.settings.address).split(",");
      saved.settings.address = addressParts.shift().trim();
      saved.settings.postalCity = addressParts.join(",").trim() || fallback.settings.postalCity;
    }
    if (!Array.isArray(saved.settings.mailRecipients) || !saved.settings.mailRecipients.length) {
      saved.settings.mailRecipients = [
        { id: "bookkeeper", name: saved.settings.bookkeeperName || "Boekhouder", email: saved.settings.bookkeeper || fallback.settings.bookkeeper, active: true },
        { id: "payroll", name: saved.settings.payrollName || "EasySalary", email: saved.settings.payroll || fallback.settings.payroll, active: true }
      ];
    }
    saved.settings.mailRecipients = saved.settings.mailRecipients.map((recipient, index) => Object.assign({
      id: "recipient-" + (index + 1),
      name: "Ontvanger " + (index + 1),
      email: "ontvanger-" + (index + 1) + DEMO_DOMAIN,
      active: true
    }, recipient));
    const savedBookkeeper = saved.settings.mailRecipients.find(recipient => recipient.id === "bookkeeper");
    const savedPayroll = saved.settings.mailRecipients.find(recipient => recipient.id === "payroll");
    if (savedBookkeeper) {
      saved.settings.bookkeeperName = savedBookkeeper.name;
      saved.settings.bookkeeper = savedBookkeeper.email;
    }
    if (savedPayroll) {
      saved.settings.payrollName = savedPayroll.name;
      saved.settings.payroll = savedPayroll.email;
    }
    saved.admins = Array.isArray(saved.admins) && saved.admins.length ? saved.admins : fallback.admins;
    saved.notifications = Array.isArray(saved.notifications) ? saved.notifications : fallback.notifications;
    saved.announcements = Array.isArray(saved.announcements) ? saved.announcements : [];
    saved.announcements = saved.announcements.map(item => Object.assign({
      status: "sent",
      kind: item && item.correctionOfId ? "correction" : "standard",
      recipientIds: [],
      emailRequested: false,
      emailRecipientIds: [],
      correctionOfId: null,
      withdrawalOfId: null,
      withdrawalReason: "",
      withdrawnBy: "",
      withdrawnAt: "",
      withdrawnAtIso: null,
      supersededById: null
    }, item || {}));
    applyAnnouncementSupersession(saved);
    saved.records = saved.records && typeof saved.records === "object" ? saved.records : fallback.records;
    Object.values(saved.records).forEach(periodRecords => {
      if (!periodRecords || typeof periodRecords !== "object") return;
      Object.values(periodRecords).forEach(record => {
        if (!record || typeof record !== "object") return;
        record.correctionHistory = Array.isArray(record.correctionHistory) ? record.correctionHistory : [];
      });
    });
    saved.schemaVersion = 16;
    saved.employees = Array.isArray(saved.employees) && saved.employees.length ? saved.employees : fallback.employees;
    saved.admins = saved.admins.map((admin, index) => Object.assign({
      id: "admin-" + (index + 1),
      name: "Beheerder",
      email: "beheerder-" + (index + 1) + DEMO_DOMAIN,
      active: true,
      emailNotificationsEnabled: true,
      photo: ""
    }, admin));
    const previousDefaultBodies = new Set([
      "Middag,\n\nHierbij stuur ik jullie de factuur en uren van {medewerker} over de maand {maand}.",
      "Middag,\n\nHierbij stuur ik jullie de factuur en uren van {medewerker} over de maand {maand}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.",
      "Goedemiddag,\n\nBijgaand ontvangen jullie de factuur en urenstaat voor {medewerker}. Referentie: {overeenkomstnummer}.",
      "Goedemiddag,\n\nBijgaand ontvangen jullie de factuur en urenstaat van {medewerker}."
    ]);
    saved.employees = saved.employees.map((employee, index) => {
      const normalized = Object.assign({
        id: index + 1,
        email: "medewerker-" + (index + 1) + DEMO_DOMAIN,
        active: true,
        startDate: "",
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        photo: "",
        invoiceRecipientName: "",
        brokerInvoiceAddress: "",
        invoiceProject: "",
        brokerMailEnabled: true,
        brokerInvoiceAttachment: true,
        bookkeeperInvoiceAttachment: true,
        payrollInvoiceAttachment: false,
        mailRecipientRoutes: defaultMailRecipientRoutes()
      }, employee);
      normalized.mailRecipientRoutes = Object.assign(defaultMailRecipientRoutes(), normalized.mailRecipientRoutes || {});
      normalized.mailRecipientRoutes.bookkeeper = Object.assign({ enabled: true, invoiceAttachment: normalized.bookkeeperInvoiceAttachment !== false }, normalized.mailRecipientRoutes.bookkeeper || {});
      normalized.mailRecipientRoutes.payroll = Object.assign({ enabled: true, invoiceAttachment: normalized.payrollInvoiceAttachment === true }, normalized.mailRecipientRoutes.payroll || {});
      if (previousSchemaVersion < 15 && /itaq/i.test(normalized.broker || "")) {
        normalized.invoiceRecipientName = "Itaq";
        normalized.brokerInvoiceAddress = "Laan van ZuidHoorn 165\n2289 DD Rijswijk";
        normalized.brokerMailEnabled = true;
      } else if (previousSchemaVersion < 15 && /circle8/i.test(normalized.broker || "")) {
        normalized.invoiceRecipientName = "circle8";
        normalized.brokerInvoiceAddress = "Plettenburg-West,\nFultonbaan 6,\n3439 NE Nieuwegein";
        normalized.brokerMailEnabled = true;
        normalized.invoiceProject = "belastingdienst";
        normalized.agreementNumber = "202636991";
        normalized.creditorNumber = "622085";
        normalized.contractorNumber = "217744";
      } else if (!String(normalized.invoiceRecipientName || "").trim()) {
        normalized.invoiceRecipientName = normalized.broker || "Broker";
      }
      if (!String(normalized.invoiceProject || "").trim()) {
        normalized.invoiceProject = /belastingdienst/i.test(normalized.client || "") ? "belastingdienst" : normalized.client;
      }
      if (previousDefaultBodies.has(normalized.mailBody)) normalized.mailBody = DEFAULT_INVOICE_MAIL_BODY;
      return normalized;
    });
    if (previousSchemaVersion < 16) {
      const confirmedTemplates = new Map(fallback.employees.map(employee => [Number(employee.id), employee.invoiceTemplate]));
      saved.employees.forEach(employee => {
        if (confirmedTemplates.has(Number(employee.id))) employee.invoiceTemplate = confirmedTemplates.get(Number(employee.id));
      });
      Object.entries(saved.records).forEach(([periodKey, periodRecords]) => {
        if (!parsePeriodKey(periodKey) || !periodRecords || typeof periodRecords !== "object") return;
        Object.entries(periodRecords).forEach(([employeeId, record]) => {
          const employee = saved.employees.find(item => Number(item.id) === Number(employeeId));
          if (employee && record && typeof record === "object") {
            record.invoiceNumber = formatInvoiceNumber(employee.invoiceTemplate, periodKey);
          }
        });
      });
    }
    saved.currentRole = null;
    if (!saved.admins.some(admin => String(admin.id) === String(saved.currentAdminId) && admin.active !== false)) {
      saved.currentAdminId = String((saved.admins.find(admin => admin.active !== false) || saved.admins[0]).id);
    }
    if (!saved.employees.some(employee => Number(employee.id) === Number(saved.currentEmployeeId) && employee.active !== false)) {
      saved.currentEmployeeId = Number((saved.employees.find(employee => employee.active !== false) || saved.employees[0]).id);
    }
    saved.invoiceFilter = "all";
    if (!["all", "month"].includes(saved.approvalScope)) saved.approvalScope = "all";
    if (!["active", "inactive", "all"].includes(saved.employeeScope)) saved.employeeScope = "active";
    if (!["all", "unread", "withdrawn"].includes(saved.announcementArchiveFilter)) saved.announcementArchiveFilter = "all";
    return saved;
  } catch {
    return fallback;
  }
}

let state = loadState();
let modalAction = null;
let modalSecondaryAction = null;
let pendingProfilePhoto = "";
let unresolvedHelpQuestion = "";

const roleProfiles = {
  admin: { label: "Beheerder", home: "dashboard" },
  employee: { label: "Medewerker", home: "employee-dashboard" }
};

const adminViews = new Set(["dashboard", "approvals", "invoices", "payroll", "announcements", "employees", "settings"]);
const statusLabels = {
  draft: ["Nog invullen", "status-concept"],
  correction: ["Correctie nodig", "status-warning"],
  approved: ["Goedgekeurd", "status-approved"],
  submitted: ["Ingediend", "status-submitted"],
  concept: ["Nog niet klaar", "status-concept"],
  ready: ["Factuur klaar", "status-ready"],
  simulated: ["Test gedaan", "status-sent"]
};

const pageTitles = {
  dashboard: "Urenoverzicht",
  "employee-dashboard": "Mijn overzicht",
  timesheet: "Mijn uren",
  approvals: "Goedkeuringen",
  invoices: "Facturen",
  payroll: "EasySalary",
  announcements: "Mededelingen",
  "employee-announcements": "Mijn mededelingen",
  employees: "Medewerkers",
  settings: "Instellingen"
};

const HELP_TOPICS = [
  { id: "dashboard", roles: ["admin", "employee"], label: "Dashboard", terms: "dashboard overzicht home logo startpagina", answer: "Het Path-logo en de knop Dashboard brengen je altijd naar je eigen startscherm. Beheerders zien alle open urenacties; medewerkers zien alleen hun eigen maandstatus en historie.", view: "home" },
  { id: "hours", roles: ["admin", "employee"], label: "Uren invullen", terms: "uren invullen dag week enter opslaan verder", answer: "Open Mijn uren, kies de juiste maand en vul de uren per werkdag in. Enter slaat tussentijds op en gaat naar het volgende veld. Enter dient de maand nooit automatisch in.", view: "timesheet" },
  { id: "month", roles: ["admin", "employee"], label: "Maand kiezen", terms: "maand jaar periode vorige volgende kalender kiezen", answer: "Gebruik bovenaan de maand- en jaarkiezer of de pijlen. Je kunt rechtstreeks naar iedere maand en ieder jaar. Iedere maand wordt apart bewaard." },
  { id: "submit", roles: ["admin", "employee"], label: "Maand indienen", terms: "dien dient indien indienen versturen maand submit knop slechts een", answer: "De knop Uren indienen dient uitsluitend de geselecteerde maand in. Andere maanden blijven ongewijzigd. Na indienen ziet de beheerder een melding en verschijnt de maand bij Goedkeuringen.", view: "timesheet" },
  { id: "difference", roles: ["admin", "employee"], label: "Meer of minder uren", terms: "meer minder afwijking contracturen verschil blokkeren", answer: "Meer of minder uren dan de contracturen geeft alleen een controlebericht. Het blokkeert opslaan of indienen nooit." },
  { id: "absence", roles: ["admin", "employee"], label: "Verlof of ziekte", terms: "verlof vakantie ziek ziekte afwezig", answer: "Vul verlof en ziekte rechts bij de maandsamenvatting in. Ze blijven apart van declarabele klanturen. De EasySalary-mail bevat in deze opzet alleen het goedgekeurde gewerkte urentotaal.", view: "timesheet" },
  { id: "status", roles: ["admin", "employee"], label: "Status uitleg", terms: "status nog invullen ingediend goedgekeurd correctie", answer: "Nog invullen betekent dat de medewerker werkt aan de maand. Ingediend wacht op controle. Correctie nodig betekent aanpassen en opnieuw indienen. Goedgekeurd betekent dat de urencontrole klaar is." },
  { id: "approvals", roles: ["admin"], label: "Goedkeuringen", terms: "keur keuren goed goedkeuren controle uren alle openstaande maand terugsturen afkeuren correctie reden toelichting", answer: "Goedkeuringen opent standaard alle openstaande maanden. Je kunt filteren op de gekozen maand, uren bekijken, met een verplichte toelichting terugsturen voor correctie of goedkeuren. De medewerker ziet de reden bij de melding en urenstaat. Na goedkeuring staat de factuur klaar.", view: "approvals" },
  { id: "invoices", roles: ["admin"], label: "Facturen", terms: "factuur facturen klaar mailvoorbeeld ongefactureerd", answer: "Facturen toont per gekozen maand wat nog op uren wacht, wat klaarstaat en welke verzendtest is gedaan. De demo maakt alleen een veilig mailvoorbeeld en verstuurt niets.", view: "invoices" },
  { id: "invoice-test", roles: ["admin"], label: "Verzendtest", terms: "verzendtest test mail e-mail bijlagen sturen boekhouder broker ontvanger", answer: "Eén actie maakt een afzonderlijk bericht voor iedere aangevinkte ontvanger. De tekst bevat medewerker, maand en daadwerkelijke goedgekeurde uren. Per medewerker stel je in wie mail krijgt en of de factuur als PDF wordt toegevoegd. Een urenstaat wordt niet bijgevoegd en BCC wordt niet gebruikt.", view: "invoices" },
  { id: "invoice-filter", roles: ["admin"], label: "Factuurfilters", terms: "filter factuur nog niet klaar test gedaan alle", answer: "Gebruik boven de factuurlijst de filters Alle, Nog niet klaar, Factuur klaar en Test gedaan. De maandkiezer blijft bepalen welke maand je ziet.", view: "invoices" },
  { id: "easysalary", roles: ["admin"], label: "EasySalary", terms: "easysalary salaris loon uren mail per medewerker excel csv een knop maandverzending", answer: "EasySalary loopt mee in dezelfde maandverzending, maar ontvangt een eigen bericht per medewerker. Standaard gaat alleen de tekst met naam, maand en goedgekeurde uren mee en geen factuur. De aparte EasySalary-bulkactie is daarom verwijderd.", view: "invoices" },
  { id: "announcements", roles: ["admin"], label: "Mededelingen sturen", terms: "mededeling bericht iedereen groep medewerkers mail e-mail correctie intrekken concept verbeteren algemeen update versie", answer: "Onder Mededelingen maak je een concept of stuur je een app-update naar alle actieve medewerkers, één klantgroep of zelf gekozen medewerkers. Bij een wijziging zien medewerkers uitsluitend de nieuwste tekst; de oudere versie blijft alleen intern voor beheerders controleerbaar. Intrekken vereist een reden. Aanvullende e-mailmeldingen worden per ontvanger en volgens de persoonlijke voorkeur behandeld.", view: "announcements" },
  { id: "announcement-archive", roles: ["employee"], label: "Eerdere mededelingen", terms: "mededelingen archief eerdere gelezen ongelezen ingetrokken bericht terugvinden", answer: "Open Mededelingen in het menu. Daar staan jouw actuele berichten, ook als je ze via de bel al hebt gelezen. Wanneer een beheerder een tekst wijzigt, zie jij alleen de nieuwste versie en niet dat er een eerdere versie was.", view: "employee-announcements" },
  { id: "employee-add", roles: ["admin"], label: "Medewerker toevoegen", terms: "medewerker persoon toevoegen uitnodigen nieuwe account", answer: "Open Medewerkers en kies Medewerker toevoegen. Vul account, contracturen en opdrachtgegevens in. In de demo wordt alles lokaal opgeslagen en wordt een uitnodiging alleen nagebootst.", view: "employees" },
  { id: "employee-edit", roles: ["admin"], label: "Medewerker aanpassen", terms: "medewerker wijzigen aanpassen broker tarief opdracht ontvanger easysalary boekhouder factuur bijlage", answer: "Open Medewerkers en kies Gegevens aanpassen. Je kunt account-, opdracht-, broker- en voorbeeldmailgegevens wijzigen. Daar vink je ook per medewerker aan welke vaste ontvangers mail krijgen en wie de factuur als PDF ontvangt. Vaste ontvangers maak je één keer aan onder Instellingen.", view: "employees" },
  { id: "employee-remove", roles: ["admin"], label: "Medewerker deactiveren", terms: "medewerker verwijderen weghalen deactiveren inactief historie", answer: "Medewerkers worden nooit hard verwijderd. Deactiveren stopt toegang en herinneringen, maar bewaart alle oude uren, goedkeuringen en facturen. Via het filter Inactief kun je iemand opnieuw activeren.", view: "employees" },
  { id: "admin", roles: ["admin"], label: "Beheerder beheren", terms: "beheerder toevoegen verwijderen deactiveren gio joyce toegang", answer: "Onder Medewerkers staat het beheerdersoverzicht. Je kunt een beheerder toevoegen of deactiveren. Jezelf en de laatste actieve beheerder kun je niet deactiveren, zodat de app bereikbaar blijft.", view: "employees" },
  { id: "privacy", roles: ["admin", "employee"], label: "Wie ziet wat?", terms: "privacy collega tarieven zien rol toegang medewerker beheerder", answer: "Een medewerker ziet uitsluitend het eigen dashboard, de eigen uren, meldingen en historie. Alleen beheerders zien collega’s, goedkeuringen, tarieven, facturen en instellingen." },
  { id: "notifications", roles: ["admin", "employee"], label: "Meldingen", terms: "melding meldingen bel herinnering maandag goedgekeurd e-mail aan uit", answer: "De bel toont uren- en algemene meldingen voor jouw account. In Voorkeuren kun je aanvullende e-mailmeldingen aan- of uitzetten. Berichten in de app blijven zichtbaar. De demo simuleert e-mail en verstuurt niets." },
  { id: "profile", roles: ["admin", "employee"], label: "Profiel en foto", terms: "profiel foto profielfoto naam e-mail account", answer: "Klik rechtsboven op je initialen en kies Mijn profiel. In de demo kun je lokaal een foto kiezen. In productie komen naam, zakelijk e-mailadres en standaardfoto uit Google Workspace." },
  { id: "theme", roles: ["admin", "employee"], label: "Licht of donker", terms: "donker dark licht light automatisch thema uiterlijk voorkeur", answer: "Open rechtsboven Voorkeuren en kies Licht, Automatisch of Donker. Licht is standaard; Automatisch volgt de instelling van je computer of telefoon." },
  { id: "settings", roles: ["admin"], label: "Instellingen", terms: "instellingen bedrijf iban kvk btw betalingstermijn mailroutering ontvanger toevoegen", answer: "Instellingen bevat bedrijfsgegevens, mailroutering, vaste ontvangers en veiligheidsregels. Boekhouder, EasySalary of een extra ontvanger maak je hier één keer aan; daarna vink je die per medewerker aan. De demo bewaart dit alleen lokaal en heeft geen echte verzendkoppeling.", view: "settings" },
  { id: "placeholders", roles: ["admin"], label: "E-mailadressen in de demo", terms: "placeholder example invalid echt e-mailadres veilig waarom", answer: "De standaardvoorbeelden gebruiken @example.invalid, maar je kunt zelf ieder geldig adres invoeren. Ook met een echt adres wordt niets verstuurd, omdat de demo geen e-mailkoppeling bevat." },
  { id: "google", roles: ["admin", "employee"], label: "Google-login", terms: "google gmail workspace inloggen wachtwoord 2fa e-mail wijzigen", answer: "De demo gebruikt een rolkeuze. In productie logt iedereen in met Google Workspace. Wachtwoord, e-mailadres en tweestapsverificatie worden daarom niet in deze app beheerd." },
  { id: "help", roles: ["admin", "employee"], label: "Hulp en contact", terms: "hulp contact backoffice vraag antwoord chatbot bot gmail outlook mailapp", answer: "Deze hulpbot geeft vaste, betrouwbare antwoorden over iedere functie. Begrijpt hij een vraag niet, dan vraagt hij eerst om één duidelijkere formulering. Pas als ook die tweede poging onbekend blijft, kun je een vooraf ingevuld bericht openen in Gmail, Outlook / je standaard mailapp of de tekst kopiëren voor backoffice@pathconsultancy.nl. Jij moet de e-mail altijd zelf verzenden." },
  { id: "install", roles: ["admin", "employee"], label: "App installeren", terms: "installeren pwa telefoon desktop apple google store", answer: "Installeren komt zodra de productie-app op het Path-domein staat. Eerst wordt het een installeerbare webapp; plaatsing in de Apple- en Google-stores kan daarna." }
];

const currency = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function invoiceMoney(value) {
  return "€ " + Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function invoiceHours(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const hoursFormat = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function persistState() {
  const copy = JSON.parse(JSON.stringify(state));
  copy.currentRole = null;
  copy.invoiceFilter = "all";
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
}

function currentPeriod() {
  if (!parsePeriodKey(state.selectedPeriodKey)) state.selectedPeriodKey = "2026-07";
  return periodFromKey(state.selectedPeriodKey);
}

function employeeById(id) {
  return state.employees.find(employee => employee.id === Number(id));
}

function adminById(id) {
  return state.admins.find(admin => admin.id === String(id));
}

function activeEmployees() {
  return state.employees.filter(employee => employee.active !== false);
}

function activeAdmins() {
  return state.admins.filter(admin => admin.active !== false);
}

function currentAdmin() {
  return adminById(state.currentAdminId) || activeAdmins()[0] || state.admins[0];
}

function currentEmployee() {
  const selected = employeeById(state.currentEmployeeId);
  if (selected && selected.active !== false) return selected;
  return activeEmployees()[0] || state.employees[0];
}

function mailRecipientById(id) {
  return (state.settings.mailRecipients || []).find(recipient => String(recipient.id) === String(id));
}

function activeMailRecipients() {
  return (state.settings.mailRecipients || []).filter(recipient => recipient.active !== false);
}

function mailRecipientRouteFor(employee, recipientId) {
  const routes = employee.mailRecipientRoutes || {};
  if (routes[recipientId]) return routes[recipientId];
  if (recipientId === "bookkeeper") return { enabled: true, invoiceAttachment: employee.bookkeeperInvoiceAttachment !== false };
  if (recipientId === "payroll") return { enabled: true, invoiceAttachment: employee.payrollInvoiceAttachment === true };
  return { enabled: false, invoiceAttachment: false };
}

function deliveryRoutesFor(employee) {
  const routes = [];
  if (employee.brokerMailEnabled !== false) routes.push({
    id: "broker",
    name: employee.broker || "Broker",
    email: employee.brokerEmail,
    invoiceAttachment: employee.brokerInvoiceAttachment !== false,
    kind: "broker"
  });
  activeMailRecipients().forEach(recipient => {
    const preference = mailRecipientRouteFor(employee, recipient.id);
    if (preference.enabled !== false) routes.push({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      invoiceAttachment: preference.invoiceAttachment === true,
      kind: recipient.id === "payroll" ? "payroll" : recipient.id === "bookkeeper" ? "bookkeeper" : "additional"
    });
  });
  return routes;
}

function syncLegacyRecipientSettings() {
  const bookkeeper = mailRecipientById("bookkeeper");
  const payroll = mailRecipientById("payroll");
  if (bookkeeper) {
    state.settings.bookkeeperName = bookkeeper.name;
    state.settings.bookkeeper = bookkeeper.email;
  }
  if (payroll) {
    state.settings.payrollName = payroll.name;
    state.settings.payroll = payroll.email;
  }
}

function weeklyHoursFor(employee) {
  const explicit = Number(employee.weeklyHours);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const match = /(\d+(?:[.,]\d+)?)\s*uur/i.exec(employee.contract || "");
  return match ? Number(match[1].replace(",", ".")) : 40;
}

function defaultContractHours(employee, periodKey) {
  const period = periodFromKey(periodKey);
  return Math.round((period.businessDays * weeklyHoursFor(employee) / 5) * 10) / 10;
}

function formatInvoiceNumber(template, periodKey) {
  const period = periodFromKey(periodKey);
  return String(template || "Factuur-{jaar}-{maand}")
    .replaceAll("{jaar}", String(period.year))
    .replaceAll("{maand}", period.month);
}

function invoiceNumberFor(employeeId, periodKey) {
  const employee = employeeById(employeeId);
  const template = employee && employee.invoiceTemplate
    ? employee.invoiceTemplate
    : ((employee && employee.client) || "Factuur") + "-{jaar}-{maand}";
  return formatInvoiceNumber(template, periodKey);
}

function normalizeRecord(record, employee, periodKey) {
  const period = periodFromKey(periodKey);
  const entries = emptyEntries(period.key);
  if (Array.isArray(record.entries)) {
    period.weekRows.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        if (!day) return;
        const value = Number(record.entries[weekIndex] && record.entries[weekIndex][dayIndex]);
        entries[weekIndex][dayIndex] = Number.isFinite(value) && value >= 0 ? value : 0;
      });
    });
  }
  record.entries = entries;
  if (!Number.isFinite(Number(record.contractHours))) record.contractHours = defaultContractHours(employee, period.key);
  record.contractHours = Number(record.contractHours) || 0;
  record.leave = Number(record.leave) || 0;
  record.sick = Number(record.sick) || 0;
  record.timesheetStatus = record.timesheetStatus || "draft";
  record.invoiceStatus = record.invoiceStatus || "concept";
  record.payrollStatus = record.payrollStatus || (record.timesheetStatus === "approved" ? "ready" : "concept");
  record.invoiceNumber = record.invoiceNumber || invoiceNumberFor(employee.id, period.key);
  record.correctionHistory = Array.isArray(record.correctionHistory) ? record.correctionHistory : [];
  return record;
}

function ensurePeriodRecords(periodKey) {
  const period = periodFromKey(periodKey);
  if (!state.records || typeof state.records !== "object") state.records = {};
  if (!state.records[period.key]) state.records[period.key] = {};
  state.employees.forEach(employee => {
    const id = String(employee.id);
    if (!state.records[period.key][id]) {
      state.records[period.key][id] = makeRecord(
        0,
        defaultContractHours(employee, period.key),
        "draft",
        "concept",
        invoiceNumberFor(employee.id, period.key),
        period.key
      );
    } else {
      normalizeRecord(state.records[period.key][id], employee, period.key);
    }
  });
  return state.records[period.key];
}

function recordFor(employeeId, periodKey) {
  const key = periodKey || currentPeriod().key;
  return ensurePeriodRecords(key)[String(employeeId)];
}

function totalEntries(entries) {
  return entries.flat().reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function correctionHistoryFor(record) {
  if (!Array.isArray(record.correctionHistory)) record.correctionHistory = [];
  return record.correctionHistory;
}

function latestCorrection(record) {
  const history = correctionHistoryFor(record);
  return history.length ? history[history.length - 1] : null;
}

function activeCorrection(record) {
  const history = correctionHistoryFor(record);
  return [...history].reverse().find(item => !item.resubmittedAt) || null;
}

function correctionTimestamp() {
  const now = new Date();
  let label;
  try {
    label = new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Amsterdam"
    }).format(now);
  } catch {
    label = now.toLocaleString("nl-NL");
  }
  return { iso: now.toISOString(), label };
}

function initials(name) {
  return String(name || "P").split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function applyAvatar(element, name, photo) {
  if (!element) return;
  element.textContent = photo ? "" : initials(name);
  element.style.backgroundImage = photo ? 'url("' + String(photo).replaceAll('"', "%22") + '")' : "none";
}

function currentProfileData() {
  if (state.currentRole === "employee") {
    const employee = currentEmployee();
    return { source: employee, name: employee.name, email: employee.email, label: "Medewerker", photo: employee.photo || "" };
  }
  const admin = currentAdmin();
  return { source: admin, name: admin.name, email: admin.email, label: "Beheerder", photo: admin.photo || "" };
}

function updateLoginAdminPreview() {
  const picker = document.querySelector("#login-admin");
  if (!picker) return;
  const admin = adminById(picker.value) || currentAdmin();
  if (!admin) return;
  applyAvatar(document.querySelector("#login-admin-avatar"), admin.name, admin.photo);
  document.querySelector("#login-admin-summary").textContent = admin.name + " · uren controleren, facturen en instellingen";
}

function renderLoginAdminPicker() {
  const picker = document.querySelector("#login-admin");
  const admins = activeAdmins();
  if (!picker || !admins.length) return;
  if (!adminById(state.currentAdminId) || adminById(state.currentAdminId).active === false) state.currentAdminId = admins[0].id;
  picker.innerHTML = admins.map(admin => '<option value="' + escapeHtml(admin.id) + '">' + escapeHtml(admin.name) + " · beheerder</option>").join("");
  picker.value = String(state.currentAdminId);
  updateLoginAdminPreview();
}

function updateLoginEmployeePreview() {
  const picker = document.querySelector("#login-employee");
  if (!picker) return;
  const employee = employeeById(picker.value) || currentEmployee();
  if (!employee) return;
  document.querySelector("#login-employee-avatar").textContent = initials(employee.name);
  document.querySelector("#login-employee-summary").textContent = employee.name + " · eigen uren invullen en indienen";
}

function renderLoginEmployeePicker() {
  const picker = document.querySelector("#login-employee");
  const employees = activeEmployees();
  if (!picker || !employees.length) return;
  if (!employeeById(state.currentEmployeeId) || employeeById(state.currentEmployeeId).active === false) state.currentEmployeeId = employees[0].id;
  picker.innerHTML = employees
    .map(employee => '<option value="' + employee.id + '">' + escapeHtml(employee.name) + " · " + escapeHtml(employee.client) + "</option>")
    .join("");
  picker.value = String(state.currentEmployeeId);
  updateLoginEmployeePreview();
}

function profileForRole(role) {
  if (role === "admin") {
    const admin = currentAdmin();
    if (!admin) return null;
    return { initials: initials(admin.name), name: admin.name, email: admin.email, photo: admin.photo || "", label: roleProfiles.admin.label, home: roleProfiles.admin.home };
  }
  const employee = currentEmployee();
  if (!employee) return null;
  return {
    initials: initials(employee.name),
    name: employee.name,
    email: employee.email,
    photo: employee.photo || "",
    label: roleProfiles.employee.label,
    home: roleProfiles.employee.home
  };
}

function statusPill(status) {
  const info = statusLabels[status] || [status, "status-concept"];
  return '<span class="status-pill ' + info[1] + '">' + escapeHtml(info[0]) + "</span>";
}

function invoiceStatusInfo(record) {
  if (record.invoiceStatus === "simulated") return ["Test gedaan", "status-sent"];
  if (record.invoiceStatus === "ready") return ["Factuur klaar", "status-ready"];
  if (record.timesheetStatus === "submitted") return ["Urencontrole nodig", "status-submitted"];
  return ["Wacht op medewerker", "status-concept"];
}

function invoiceStatusPill(record) {
  const info = invoiceStatusInfo(record);
  return '<span class="status-pill ' + info[1] + '">' + info[0] + "</span>";
}

function payrollStatusInfo(record) {
  if (record.payrollStatus === "simulated") return ["Mailtest gedaan", "status-sent"];
  if (record.timesheetStatus === "approved") return ["Uren klaar", "status-ready"];
  if (record.timesheetStatus === "submitted") return ["Wacht op controle", "status-submitted"];
  if (record.timesheetStatus === "correction") return ["Correctie nodig", "status-warning"];
  return ["Nog niet klaar", "status-concept"];
}

function payrollStatusPill(record) {
  const info = payrollStatusInfo(record);
  return '<span class="status-pill ' + info[1] + '">' + info[0] + "</span>";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(value).trim());
}

function templateValues(employee, invoiceNumber) {
  const period = currentPeriod();
  const record = recordFor(employee.id);
  const actualHours = totalEntries(record.entries);
  return {
    medewerker: employee.name,
    klant: employee.client,
    broker: employee.broker,
    maand: period.month,
    jaar: period.year,
    uren: hoursFormat.format(actualHours),
    factuurnummer: invoiceNumber,
    overeenkomstnummer: employee.agreementNumber || "Niet van toepassing"
  };
}

function formatTemplate(template, employee, invoiceNumber) {
  const values = templateValues(employee, invoiceNumber);
  return String(template).replace(/\{([a-z]+)\}/gi, (match, key) => values[key] === undefined ? match : values[key]);
}

function renderPeriodHeadings() {
  const period = currentPeriod();
  document.querySelector("#period-label").textContent = period.label;
  document.querySelector("#period-picker").value = period.key;
  document.querySelector("#workflow-period-title").textContent = "Maandafsluiting " + period.month + " " + period.year;
  document.querySelector("#dashboard-team-title").textContent = "Overzicht per medewerker · " + period.label;
  document.querySelector("#timesheet-period-title").textContent = period.label;
  document.querySelector("#invoice-period-title").textContent = "Facturen " + period.month + " " + period.year;
  document.querySelector("#employee-period-label").textContent = period.month + " " + period.year;
  document.querySelector("#approval-month-filter").textContent = period.label;
}

function applyTheme() {
  const choice = state.preferences && state.preferences.theme ? state.preferences.theme : "light";
  let resolved = choice;
  if (choice === "system") {
    resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeChoice = choice;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === "dark" ? "#09131f" : "#0D1B38";
}

function greetingForNow() {
  let hour = new Date().getHours();
  try {
    hour = Number(new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" }).format(new Date()).replace(/\D/g, ""));
  } catch {
    hour = new Date().getHours();
  }
  if (hour >= 5 && hour < 12) return "Goedemorgen";
  if (hour >= 12 && hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function renderProfileChrome() {
  if (!state.currentRole) return;
  const profile = profileForRole(state.currentRole);
  if (!profile) return;
  applyAvatar(document.querySelector("#workspace-avatar"), profile.name, profile.photo);
  applyAvatar(document.querySelector("#topbar-avatar"), profile.name, profile.photo);
  applyAvatar(document.querySelector("#profile-menu-avatar"), profile.name, profile.photo);
  document.querySelector("#workspace-name").textContent = profile.name;
  document.querySelector("#workspace-role").textContent = profile.label;
  document.querySelector("#profile-menu-name").textContent = profile.name;
  document.querySelector("#profile-menu-role").textContent = profile.label;
}

function renderEmployeeDashboard() {
  const employee = currentEmployee();
  const record = recordFor(employee.id);
  const period = currentPeriod();
  const total = totalEntries(record.entries);
  const absence = Number(record.leave || 0) + Number(record.sick || 0);
  const accounted = total + absence;
  const difference = Math.round((accounted - record.contractHours) * 10) / 10;
  const progress = record.contractHours > 0 ? Math.min(100, Math.round(accounted / record.contractHours * 100)) : 0;
  const firstName = employee.name.split(/\s+/)[0];
  const status = statusLabels[record.timesheetStatus] || statusLabels.draft;
  let next = "Vul je uren in en dien alleen deze maand in.";
  let action = "Uren verder invullen";
  let note = "Nog niet ingediend";
  if (record.timesheetStatus === "correction") {
    const correction = activeCorrection(record) || latestCorrection(record);
    next = correction
      ? "Je uren zijn teruggestuurd. Reden: " + correction.message
      : "Je uren zijn teruggestuurd. Pas ze aan en dien de maand opnieuw in.";
    action = "Correctie openen";
    note = "Actie nodig";
  }
  if (record.timesheetStatus === "submitted") {
    next = "Je uren zijn ingediend en wachten op controle door Gio of Joyce.";
    action = "Ingediende uren bekijken";
    note = "Wacht op controle";
  }
  if (record.timesheetStatus === "approved") {
    next = "Je uren zijn goedgekeurd. Voor deze maand hoef je niets meer te doen.";
    action = "Goedgekeurde uren bekijken";
    note = "Afgerond";
  }
  document.querySelector("#employee-dashboard-greeting").textContent = greetingForNow() + ", " + firstName;
  document.querySelector("#employee-dashboard-next").textContent = next;
  document.querySelector("#employee-dashboard-action").textContent = action;
  document.querySelector("#employee-dashboard-period").textContent = period.label;
  document.querySelector("#employee-dashboard-hours").textContent = hoursFormat.format(accounted) + " uur";
  document.querySelector("#employee-dashboard-contract").textContent = "van " + hoursFormat.format(record.contractHours) + " contracturen";
  document.querySelector("#employee-dashboard-progress").style.width = progress + "%";
  document.querySelector("#employee-dashboard-status").textContent = status[0];
  document.querySelector("#employee-dashboard-status-note").textContent = note;
  document.querySelector("#employee-dashboard-billable").textContent = hoursFormat.format(total);
  document.querySelector("#employee-dashboard-absence").textContent = hoursFormat.format(absence);
  document.querySelector("#employee-dashboard-difference").textContent = (difference > 0 ? "+" : "") + hoursFormat.format(difference);

  const dashboardCorrection = document.querySelector("#employee-dashboard-correction");
  const openCorrection = activeCorrection(record);
  dashboardCorrection.hidden = !openCorrection;
  if (openCorrection) {
    document.querySelector("#employee-dashboard-correction-message").textContent = openCorrection.message;
    document.querySelector("#employee-dashboard-correction-meta").textContent = "Teruggestuurd door " + openCorrection.requestedBy + " · " + openCorrection.requestedAt;
  }

  const history = Object.keys(state.records)
    .sort((left, right) => right.localeCompare(left))
    .filter(key => state.records[key] && state.records[key][String(employee.id)])
    .slice(0, 6);
  document.querySelector("#employee-history").innerHTML = history.map(key => {
    const historyRecord = recordFor(employee.id, key);
    const historyTotal = totalEntries(historyRecord.entries) + Number(historyRecord.leave || 0) + Number(historyRecord.sick || 0);
    const correction = latestCorrection(historyRecord);
    const historyNote = correction
      ? "Correctie door " + correction.requestedBy + " · " + correction.requestedAt + ": " + correction.message
      : "Eigen urenregistratie";
    return '<div class="employee-history-row"><div><strong>' + escapeHtml(periodFromKey(key).label) + '</strong><small>' + escapeHtml(historyNote) + '</small></div><div><strong>' + hoursFormat.format(historyTotal) + ' uur</strong><small>totaal verantwoord</small></div><div>' + statusPill(historyRecord.timesheetStatus) + '</div><button class="small-button" data-history-period="' + key + '">Bekijken</button></div>';
  }).join("") || '<div class="dashboard-action-empty">Er zijn nog geen eerdere maanden.</div>';
}

function renderDashboardActions() {
  const period = currentPeriod();
  const allOpen = allOpenApprovals();
  const selectedRows = activeEmployees().map(employee => ({ employee, record: recordFor(employee.id) }));
  const missing = selectedRows.filter(item => ["draft", "correction"].includes(item.record.timesheetStatus));
  const ready = selectedRows.filter(item => item.record.invoiceStatus === "ready");
  const payrollReady = selectedRows.filter(item => item.record.timesheetStatus === "approved" && item.record.payrollStatus !== "simulated");
  const actions = [];
  if (allOpen.length) actions.push({ icon: "U", title: allOpen.length + " urenregistratie" + (allOpen.length === 1 ? "" : "s") + " controleren", note: "Openstaand over alle maanden", view: "approvals", label: "Controleren" });
  if (missing.length) actions.push({ icon: "M", title: missing.length + " medewerker" + (missing.length === 1 ? "" : "s") + " nog niet klaar", note: period.label + " · herinnering kan worden getest", view: "employees", label: "Bekijken" });
  if (ready.length) actions.push({ icon: "F", title: ready.length + " factu" + (ready.length === 1 ? "ur" : "ren") + " klaar", note: "Controleer het veilige mailvoorbeeld", view: "invoices", label: "Open facturen" });
  if (payrollReady.length) actions.push({ icon: "S", title: payrollReady.length + " EasySalary-urenmail" + (payrollReady.length === 1 ? "" : "s") + " klaar", note: period.label + " · afzonderlijk per medewerker", view: "payroll", label: "Open salarisuren" });
  const admin = currentAdmin();
  document.querySelector("#admin-dashboard-greeting").textContent = greetingForNow() + ", " + (admin ? admin.name.split(/\s+/)[0] : "beheerder");
  document.querySelector("#admin-attention-note").textContent = actions.length
    ? "Dit vraagt nu je aandacht: er staan " + actions.length + " soorten acties klaar."
    : "Er staat niets open: alle urenacties voor " + period.label + " zijn afgerond.";
  document.querySelector("#dashboard-action-list").innerHTML = actions.map(action => '<div class="dashboard-action-item"><span class="dashboard-action-icon">' + action.icon + '</span><div><strong>' + escapeHtml(action.title) + '</strong><small>' + escapeHtml(action.note) + '</small></div><button class="small-button" data-dashboard-view="' + action.view + '">' + escapeHtml(action.label) + '</button></div>').join("") || '<div class="dashboard-action-empty">Er staat nu niets open. Kies een andere maand om die periode te bekijken.</div>';
}

function setWorkflowStep(id, visualState) {
  const element = document.querySelector(id);
  element.classList.remove("is-done", "is-current");
  if (visualState) element.classList.add(visualState);
}

function renderDashboard() {
  const period = currentPeriod();
  const rows = activeEmployees().map(employee => ({ employee, record: recordFor(employee.id) }));
  document.querySelector("#dashboard-employee-rows").innerHTML = rows.map(item => {
    const employee = item.employee;
    const record = item.record;
    const total = totalEntries(record.entries);
    return "<tr>" +
      '<td><div class="person-cell"><span class="mini-avatar">' + initials(employee.name) + "</span><span><strong>" + escapeHtml(employee.name) + "</strong><small>" + escapeHtml(employee.role) + "</small></span></div></td>" +
      "<td><strong>" + escapeHtml(employee.client) + "</strong><small>" + escapeHtml(employee.broker) + "</small></td>" +
      "<td><strong>" + hoursFormat.format(total) + "</strong><small>uur</small></td>" +
      "<td><strong>" + currency.format(total * employee.rate) + "</strong><small>exclusief btw</small></td>" +
      "<td>" + statusPill(record.timesheetStatus) + "</td>" +
      '<td><button class="text-button" data-employee-detail="' + employee.id + '">Bekijken</button></td>' +
      "</tr>";
  }).join("");

  const submitted = rows.filter(item => ["submitted", "approved"].includes(item.record.timesheetStatus)).length;
  const approved = rows.filter(item => item.record.timesheetStatus === "approved").length;
  const open = rows.filter(item => item.record.timesheetStatus === "submitted").length;
  const ready = rows.filter(item => item.record.invoiceStatus === "ready").length;
  const simulated = rows.filter(item => item.record.invoiceStatus === "simulated").length;
  const invoiceTotal = rows
    .filter(item => ["ready", "simulated"].includes(item.record.invoiceStatus))
    .reduce((sum, item) => sum + totalEntries(item.record.entries) * item.employee.rate, 0);

  document.querySelector("#metric-submitted").innerHTML = submitted + " <small>/ " + rows.length + "</small>";
  document.querySelector("#metric-submitted-note").textContent = submitted === rows.length
    ? "Iedereen heeft " + period.label + " ingediend"
    : (rows.length - submitted) + " nog niet ingediend voor " + period.label;
  document.querySelector("#metric-approved").innerHTML = approved + " <small>/ " + rows.length + "</small>";
  document.querySelector("#metric-approved-note").textContent = open ? open + " wachten op controle voor " + period.label : "Geen openstaande controles voor " + period.label;
  document.querySelector("#metric-approved-action").textContent = open ? "Open " + open + (open === 1 ? " controle" : " controles") : "Bekijk goedkeuringen";
  document.querySelector("#metric-actions").textContent = open;
  document.querySelector("#metric-invoice-total").textContent = currency.format(invoiceTotal);
  document.querySelector("#approval-count").textContent = open;
  document.querySelector("#approval-count").hidden = open === 0;

  const completedPhases = [submitted === rows.length, approved === rows.length, ready + simulated === rows.length, simulated === rows.length].filter(Boolean).length;
  const progress = Math.round(completedPhases / 4 * 100);
  document.querySelector("#close-progress-ring").style.setProperty("--progress", progress);
  document.querySelector("#close-progress-value").textContent = progress + "%";
  document.querySelector("#close-progress-title").textContent = completedPhases + " van 4 fasen compleet";
  document.querySelector("#close-progress-note").textContent = simulated === rows.length ? "Alle verzendtests zijn gedaan" : "Demo; er wordt niets echt verstuurd";

  document.querySelector("#workflow-hours-note").textContent = submitted + " ingediend";
  document.querySelector("#workflow-approval-note").textContent = open + " open";
  document.querySelector("#workflow-invoices-note").textContent = ready + " facturen klaar";
  document.querySelector("#workflow-send-note").textContent = simulated ? simulated + " tests gedaan" : "Nog niet getest";
  setWorkflowStep("#workflow-hours", submitted === rows.length ? "is-done" : submitted ? "is-current" : "");
  setWorkflowStep("#workflow-approval", approved === rows.length ? "is-done" : open ? "is-current" : "");
  setWorkflowStep("#workflow-invoices", ready + simulated === rows.length ? "is-done" : ready ? "is-current" : "");
  setWorkflowStep("#workflow-send", simulated === rows.length ? "is-done" : simulated ? "is-current" : "");
  renderDashboardActions();
}

function allOpenApprovals() {
  return Object.keys(state.records)
    .sort((left, right) => right.localeCompare(left))
    .flatMap(periodKey => {
      ensurePeriodRecords(periodKey);
      const period = periodFromKey(periodKey);
      return state.employees.map(employee => ({
        employee,
        record: recordFor(employee.id, periodKey),
        period,
        periodKey
      }));
    })
    .filter(item => item.record.timesheetStatus === "submitted");
}

function renderApprovals() {
  const allApprovals = allOpenApprovals();
  const period = currentPeriod();
  const approvals = state.approvalScope === "month"
    ? allApprovals.filter(item => item.periodKey === period.key)
    : allApprovals;
  const list = document.querySelector("#approval-list");
  const empty = document.querySelector("#approval-empty");
  const groups = approvals.reduce((result, item) => {
    if (!result.has(item.periodKey)) result.set(item.periodKey, []);
    result.get(item.periodKey).push(item);
    return result;
  }, new Map());
  list.innerHTML = [...groups.entries()].map(([, items]) => {
    const period = items[0].period;
    const cards = items.map(item => {
      const employee = item.employee;
      const total = totalEntries(item.record.entries);
      return '<article class="approval-card" data-approval-card="' + employee.id + '" data-approval-period="' + item.periodKey + '">' +
        '<div class="approval-person"><span class="mini-avatar">' + initials(employee.name) + "</span><span><strong>" + escapeHtml(employee.name) + "</strong><small>" + escapeHtml(employee.client) + " · " + escapeHtml(employee.role) + "</small></span></div>" +
        '<div class="approval-data"><small>Declarabele uren</small><strong>' + hoursFormat.format(total) + " uur</strong></div>" +
        '<div class="approval-data"><small>Verwacht factuurbedrag</small><strong>' + currency.format(total * employee.rate) + "</strong></div>" +
        '<div class="approval-actions"><button class="button button-ghost" data-review="' + employee.id + '" data-period-key="' + item.periodKey + '">Bekijken</button><button class="button button-ghost" data-request-correction="' + employee.id + '" data-period-key="' + item.periodKey + '">Correctie vragen</button><button class="button button-primary" data-approve="' + employee.id + '" data-period-key="' + item.periodKey + '">Goedkeuren</button></div>' +
        "</article>";
    }).join("");
    return '<section class="approval-period-group"><div class="approval-period-heading"><div><span class="section-label">Periode</span><h3>' + escapeHtml(period.label) + '</h3></div><span class="status-pill status-submitted">' + items.length + " open</span></div>" + cards + "</section>";
  }).join("");
  document.querySelectorAll("[data-approval-scope]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.approvalScope === state.approvalScope);
  });
  document.querySelector("#approval-period-title").textContent = state.approvalScope === "month"
    ? "Openstaande uren · " + period.label
    : "Alle openstaande uren";
  document.querySelector("#approval-scope-note").textContent = state.approvalScope === "month"
    ? "Alleen de openstaande uren van " + period.month + " " + period.year + ". Kies 'Alle openstaande' voor het totaaloverzicht."
    : "Een totaaloverzicht over alle maanden. Iedere open regel toont zelf bij welke periode hij hoort.";
  document.querySelector("#approval-empty-title").textContent = state.approvalScope === "month"
    ? "Geen openstaande uren in " + period.month
    : "Alles is gecontroleerd";
  document.querySelector("#approval-empty-text").textContent = state.approvalScope === "month"
    ? "Voor " + period.label + " staat niets meer open. In andere maanden kunnen nog wel controles staan."
    : "Er staan in geen enkele maand nog uren open.";
  empty.hidden = approvals.length > 0;
  document.querySelector("#approve-all").hidden = approvals.length === 0;
  document.querySelector("#approve-all").textContent = state.approvalScope === "month"
    ? "Alles in " + period.month + " goedkeuren"
    : "Alles goedkeuren";
  document.querySelector("#approval-count").textContent = allApprovals.length;
  document.querySelector("#approval-count").hidden = allApprovals.length === 0;
}

function renderInvoices() {
  const rows = state.employees
    .map(employee => ({ employee, record: recordFor(employee.id) }))
    .filter(item => item.employee.active !== false || totalEntries(item.record.entries) > 0 || item.record.timesheetStatus !== "draft")
    .filter(item => state.invoiceFilter === "all" || item.record.invoiceStatus === state.invoiceFilter);
  const tbody = document.querySelector("#invoice-rows");
  tbody.innerHTML = rows.map(item => {
    const employee = item.employee;
    const record = item.record;
    const total = totalEntries(record.entries);
    let action = '<span class="invoice-action-note">Nog geen factuur</span>';
    if (record.timesheetStatus === "submitted") action = '<button class="small-button" data-review="' + employee.id + '" data-period-key="' + currentPeriod().key + '">Uren goedkeuren</button>';
    if (record.invoiceStatus === "ready") action = '<button class="small-button" data-preview-invoice-pdf="' + employee.id + '">Factuur bekijken</button><button class="small-button send" data-simulate-invoice="' + employee.id + '">Mailvoorbeeld</button>';
    if (record.invoiceStatus === "simulated") action = '<button class="small-button" data-preview-invoice-pdf="' + employee.id + '">Factuur bekijken</button><button class="small-button" data-view-invoice="' + employee.id + '">Mailtest bekijken</button>';
    return "<tr>" +
      "<td><strong>" + escapeHtml(record.invoiceNumber) + "</strong><small>" + escapeHtml(currentPeriod().label) + "</small></td>" +
      "<td><strong>" + escapeHtml(employee.name) + "</strong><small>" + escapeHtml(employee.client) + "</small></td>" +
      "<td><strong>" + escapeHtml(employee.broker) + "</strong><small>" + escapeHtml(employee.brokerEmail) + "</small></td>" +
      "<td><strong>" + currency.format(total * employee.rate) + "</strong><small>" + hoursFormat.format(total) + " uur × " + currency.format(employee.rate) + "</small></td>" +
      "<td>" + invoiceStatusPill(record) + "</td>" +
      '<td><div class="invoice-action">' + action + "</div></td>" +
      "</tr>";
  }).join("");
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#6c7886">Geen facturen binnen dit filter.</td></tr>';
  }
}

function renderPayroll() {
  const period = currentPeriod();
  const rows = state.employees
    .map(employee => ({ employee, record: recordFor(employee.id) }))
    .filter(item => item.employee.active !== false || totalEntries(item.record.entries) > 0 || item.record.timesheetStatus !== "draft");
  document.querySelector("#payroll-period-title").textContent = "EasySalary-uren · " + period.label;
  const payrollRecipient = mailRecipientById("payroll") || { email: state.settings.payroll || "", active: true };
  document.querySelector("#payroll-recipient").textContent = payrollRecipient.active === false ? "EasySalary is gedeactiveerd" : payrollRecipient.email;
  document.querySelector("#payroll-rows").innerHTML = rows.map(item => {
    const employee = item.employee;
    const record = item.record;
    const total = totalEntries(record.entries);
    const route = mailRecipientRouteFor(employee, "payroll");
    const enabled = payrollRecipient.active !== false && route.enabled !== false;
    let action = '<span class="invoice-action-note">Eerst uren goedkeuren</span>';
    if (!enabled) action = '<span class="invoice-action-note">Niet aangevinkt voor deze medewerker</span>';
    if (enabled && record.timesheetStatus === "approved" && record.payrollStatus !== "simulated") {
      action = '<button class="small-button" data-simulate-payroll="' + employee.id + '">Mailvoorbeeld openen</button>';
    }
    if (record.payrollStatus === "simulated") {
      action = '<button class="small-button" data-view-payroll="' + employee.id + '">Test bekijken</button>';
    }
    return "<tr>" +
      '<td><div class="person-cell"><span class="mini-avatar">' + initials(employee.name) + '</span><span><strong>' + escapeHtml(employee.name) + '</strong><small>Afzonderlijk EasySalary-bericht</small></span></div></td>' +
      '<td><strong>' + escapeHtml(period.label) + '</strong><small>één medewerker</small></td>' +
      '<td><strong>' + hoursFormat.format(total) + ' uur</strong><small>goedgekeurd gewerkt totaal</small></td>' +
      '<td><strong>' + (route.invoiceAttachment === true ? "Naam, maand, uren en factuur" : "Alleen naam, maand en uren") + '</strong><small>' + (enabled ? (route.invoiceAttachment === true ? "factuur is voor deze route aangezet" : "geen factuurbijlage") : "route staat uit") + '</small></td>' +
      '<td>' + payrollStatusPill(record) + '</td>' +
      '<td><div class="invoice-action">' + action + '</div></td>' +
      "</tr>";
  }).join("");
  const approved = rows.filter(item => item.record.timesheetStatus === "approved");
  const pendingMonthDelivery = approved.filter(item => item.record.invoiceStatus !== "simulated" || item.record.payrollStatus !== "simulated");
  const monthDelivery = document.querySelector("#test-month-delivery");
  monthDelivery.disabled = approved.length === 0 || pendingMonthDelivery.length === 0;
  monthDelivery.textContent = !approved.length
    ? "Eerst uren goedkeuren"
    : pendingMonthDelivery.length
      ? "Maandverzending klaarzetten · " + pendingMonthDelivery.length
      : "Maandverzending veilig getest";
}

function announcementCorrectionRootId(item, announcements) {
  let current = item;
  const visited = new Set();
  while (current && current.correctionOfId && !visited.has(Number(current.id))) {
    visited.add(Number(current.id));
    const parent = announcements.find(candidate => Number(candidate.id) === Number(current.correctionOfId));
    if (!parent) return Number(current.correctionOfId);
    current = parent;
  }
  return current ? Number(current.id) : Number(item.correctionOfId || item.id);
}

function applyAnnouncementSupersession(targetState) {
  const announcements = Array.isArray(targetState.announcements) ? targetState.announcements : [];
  announcements.forEach(item => { item.supersededById = null; });
  const correctionGroups = new Map();
  announcements
    .filter(item => item.status === "sent" && (item.kind === "correction" || item.correctionOfId))
    .sort((left, right) => Number(left.id) - Number(right.id))
    .forEach(item => {
      const rootId = announcementCorrectionRootId(item, announcements);
      if (!correctionGroups.has(rootId)) correctionGroups.set(rootId, []);
      correctionGroups.get(rootId).push(item);
    });
  correctionGroups.forEach((corrections, rootId) => {
    let previous = announcements.find(item => Number(item.id) === Number(rootId));
    corrections.forEach(correction => {
      if (previous && Number(previous.id) !== Number(correction.id)) previous.supersededById = correction.id;
      previous = correction;
    });
  });
  const supersededIds = new Set(announcements.filter(item => item.supersededById).map(item => Number(item.id)));
  (targetState.notifications || []).forEach(notification => {
    if (!notification.announcementId) return;
    if (supersededIds.has(Number(notification.announcementId))) {
      notification.read = true;
      notification.superseded = true;
    } else if (notification.superseded) {
      notification.superseded = false;
    }
  });
}

function nextAnnouncementId() {
  return state.announcements.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function announcementById(id) {
  return state.announcements.find(item => Number(item.id) === Number(id));
}

function announcementAudienceLabel(recipientIds) {
  const names = recipientIds.map(id => employeeById(id)).filter(Boolean);
  const active = activeEmployees();
  if (names.length === active.length && active.every(employee => recipientIds.includes(employee.id))) return "Alle actieve medewerkers";
  const clients = [...new Set(names.map(employee => employee.client).filter(Boolean))];
  if (clients.length === 1 && names.every(employee => employee.client === clients[0])) return "Klantgroep " + clients[0];
  return names.length + " gekozen medewerker" + (names.length === 1 ? "" : "s");
}

function announcementKind(item) {
  if (item.kind === "withdrawal" || item.withdrawalOfId) return "withdrawal";
  if (item.kind === "correction" || item.correctionOfId) return "correction";
  return "standard";
}

function announcementStatusMarkup(item) {
  if (item.status === "draft") return '<span class="status-pill status-concept">Concept</span>';
  if (item.supersededById) return '<span class="status-pill status-concept">Intern vervangen door #' + item.supersededById + '</span>';
  if (announcementKind(item) === "withdrawal") return '<span class="status-pill status-warning">Intrekking van #' + item.withdrawalOfId + '</span>';
  if (item.status === "withdrawn") return '<span class="status-pill status-warning">Ingetrokken</span>';
  if (announcementKind(item) === "correction") return '<span class="status-pill status-warning">Nieuwe versie van #' + item.correctionOfId + '</span>';
  return '<span class="status-pill status-submitted">Mededeling</span>';
}

function announcementEmailText(item) {
  if (item.status === "draft") return "Concept · nog niets klaargezet";
  if (!item.emailRequested) return "Alleen in-app · geen e-mail gekozen";
  const sent = Array.isArray(item.emailRecipientIds) ? item.emailRecipientIds.length : 0;
  const skipped = Math.max(0, item.recipientIds.length - sent);
  return sent + " afzonderlijke e-mailmelding" + (sent === 1 ? "" : "en") + " gesimuleerd · " + skipped + " overgeslagen door voorkeur";
}

function renderAnnouncements() {
  const list = document.querySelector("#announcement-list");
  if (!list) return;
  const announcements = [...state.announcements].sort((left, right) => Number(right.id) - Number(left.id));
  if (!announcements.length) {
    list.innerHTML = '<div class="dashboard-action-empty"><strong>Nog geen mededelingen.</strong><br>Maak een bericht voor iedereen, een klantgroep of gekozen medewerkers.</div>';
    return;
  }
  list.innerHTML = announcements.map(item => {
    const kind = announcementKind(item);
    const className = item.status === "draft" ? " is-draft" : item.status === "withdrawn" || kind === "withdrawal" || item.supersededById ? " is-withdrawn" : "";
    const withdrawalNote = item.status === "withdrawn"
      ? '<div class="announcement-withdrawal-note"><strong>Ingetrokken door ' + escapeHtml(item.withdrawnBy || "beheerder") + '</strong>' + escapeHtml(item.withdrawalReason || "Geen reden vastgelegd.") + (item.withdrawnAt ? '<br><small>' + escapeHtml(item.withdrawnAt) + '</small>' : '') + '</div>'
      : "";
    let actions = "";
    if (item.status === "draft") {
      actions = '<button class="small-button" data-edit-announcement="' + item.id + '">Concept bewerken</button><button class="text-button" data-delete-announcement-draft="' + item.id + '">Concept verwijderen</button>';
    } else if (item.status === "sent" && kind !== "withdrawal" && !item.supersededById) {
      actions = '<button class="small-button" data-correct-announcement="' + item.id + '">Mededeling wijzigen</button><button class="text-button" data-withdraw-announcement="' + item.id + '">Mededeling intrekken</button>';
    }
    return '<article class="announcement-item' + className + '">' +
      '<div class="announcement-item-head"><div>' + announcementStatusMarkup(item) + '<h3>' + escapeHtml(item.title || "Naamloos concept") + '</h3></div><small>#' + item.id + ' · ' + escapeHtml(item.createdAt) + '</small></div>' +
      '<p>' + escapeHtml(item.message) + '</p>' +
      withdrawalNote +
      '<div class="announcement-meta"><span><strong>Ontvangers</strong>' + escapeHtml(item.audienceLabel || announcementAudienceLabel(item.recipientIds)) + ' · ' + item.recipientIds.length + (item.status === "draft" ? " geselecteerd" : " in-app") + '</span><span><strong>E-mail</strong>' + escapeHtml(announcementEmailText(item)) + '</span><span><strong>Afzender</strong>' + escapeHtml(item.createdBy) + '</span></div>' +
      (actions ? '<div class="announcement-actions">' + actions + '</div>' : '') +
      '</article>';
  }).join("");
}

function announcementNotificationsFor(employeeId, announcementId) {
  return state.notifications.filter(item => item.audience === "employee" && Number(item.employeeId) === Number(employeeId) && Number(item.announcementId) === Number(announcementId));
}

function isAnnouncementUnread(employeeId, announcementId) {
  return announcementNotificationsFor(employeeId, announcementId).some(item => !item.read);
}

function renderEmployeeAnnouncementArchive() {
  const list = document.querySelector("#employee-announcement-list");
  if (!list) return;
  if (state.currentRole !== "employee") {
    list.innerHTML = "";
    return;
  }
  const employee = currentEmployee();
  let announcements = state.announcements
    .filter(item => item.status !== "draft" && !item.supersededById && item.recipientIds.includes(employee.id))
    .sort((left, right) => Number(right.id) - Number(left.id));
  if (state.announcementArchiveFilter === "unread") announcements = announcements.filter(item => isAnnouncementUnread(employee.id, item.id));
  if (state.announcementArchiveFilter === "withdrawn") announcements = announcements.filter(item => item.status === "withdrawn" || announcementKind(item) === "withdrawal");
  document.querySelectorAll("[data-announcement-archive-filter]").forEach(button => button.classList.toggle("is-active", button.dataset.announcementArchiveFilter === state.announcementArchiveFilter));
  if (!announcements.length) {
    list.innerHTML = '<div class="dashboard-action-empty"><strong>Geen mededelingen binnen dit filter.</strong><br>Nieuwe berichten verschijnen ook via de bel.</div>';
    return;
  }
  list.innerHTML = announcements.map(item => {
    const unread = isAnnouncementUnread(employee.id, item.id);
    const kind = announcementKind(item);
    const withdrawn = item.status === "withdrawn" || kind === "withdrawal";
    const withdrawalNote = item.status === "withdrawn"
      ? '<div class="announcement-withdrawal-note"><strong>Dit bericht is ingetrokken</strong>' + escapeHtml(item.withdrawalReason || "Geen reden vastgelegd.") + '</div>'
      : "";
    const employeeStatus = withdrawn
      ? '<span class="status-pill status-warning">' + (kind === "withdrawal" ? "Mededeling ingetrokken" : "Ingetrokken") + '</span>'
      : '<span class="status-pill status-submitted">Mededeling</span>';
    return '<article class="employee-announcement-card' + (unread ? " is-unread" : "") + (withdrawn ? " is-withdrawn" : "") + '">' +
      '<header><div>' + employeeStatus + '<h3>' + escapeHtml(item.title) + '</h3></div><small>' + escapeHtml(item.createdAt) + '</small></header>' +
      '<p>' + escapeHtml(item.message) + '</p>' + withdrawalNote +
      '<footer><span>Van ' + escapeHtml(item.createdBy) + ' · ' + (unread ? "Ongelezen" : "Gelezen") + '</span>' + (unread ? '<button class="small-button" data-read-announcement="' + item.id + '">Markeer als gelezen</button>' : '') + '</footer>' +
      '</article>';
  }).join("");
}

function announcementRecipientIds(correctionOfId) {
  if (correctionOfId) {
    const original = announcementById(correctionOfId);
    return original ? [...original.recipientIds] : [];
  }
  const audience = document.querySelector("#announcement-audience").value;
  if (audience === "all") return activeEmployees().map(employee => employee.id);
  if (audience.startsWith("client:")) {
    const client = audience.slice(7);
    return activeEmployees().filter(employee => employee.client === client).map(employee => employee.id);
  }
  return [...document.querySelectorAll('[data-announcement-recipient]:checked')].map(input => Number(input.value));
}

function storeAnnouncement(options) {
  const recipientIds = [...options.recipientIds];
  const emailRequested = options.emailRequested === true;
  const status = options.status === "draft" ? "draft" : "sent";
  const emailRecipientIds = status === "sent" && emailRequested ? recipientIds.filter(id => {
    const employee = employeeById(id);
    return employee && employee.active !== false && employee.emailNotificationsEnabled !== false;
  }) : [];
  const timestamp = correctionTimestamp();
  const existingDraft = options.draftId ? announcementById(options.draftId) : null;
  const announcement = existingDraft && existingDraft.status === "draft" ? existingDraft : { id: nextAnnouncementId() };
  Object.assign(announcement, {
    title: options.title,
    message: options.message,
    audienceLabel: options.audienceLabel || (options.correctionOfId ? "Zelfde ontvangers als bericht #" + options.correctionOfId : announcementAudienceLabel(recipientIds)),
    audienceValue: options.audienceValue || (options.correctionOfId ? "fixed" : "selected"),
    recipientIds,
    emailRequested,
    emailRecipientIds,
    correctionOfId: options.correctionOfId || null,
    withdrawalOfId: options.withdrawalOfId || null,
    kind: options.kind || (options.withdrawalOfId ? "withdrawal" : options.correctionOfId ? "correction" : "standard"),
    status,
    createdBy: currentAdmin().name,
    createdAt: timestamp.label,
    createdAtIso: timestamp.iso,
    updatedAt: timestamp.label,
    updatedAtIso: timestamp.iso
  });
  if (!existingDraft) state.announcements.push(announcement);
  if (status === "sent") {
    if (announcement.correctionOfId) applyAnnouncementSupersession(state);
    recipientIds.forEach(employeeId => addNotification({
      audience: "employee",
      type: "announcement",
      employeeId,
      title: announcement.title,
      message: announcement.message,
      announcementId: announcement.id,
      emailRequested: emailRecipientIds.includes(employeeId),
      view: "employee-announcements"
    }, true));
  }
  return announcement;
}

function saveAnnouncementFromEditor(correctionOfId, draftId, asDraft) {
  const titleInput = document.querySelector("#announcement-title");
  const messageInput = document.querySelector("#announcement-message");
  const title = titleInput.value.trim();
  const message = messageInput.value.trim();
  const recipientIds = announcementRecipientIds(correctionOfId);
  [titleInput, messageInput].forEach(input => input.classList.remove("is-invalid"));
  if (asDraft && !title && !message) {
    titleInput.classList.add("is-invalid");
    messageInput.classList.add("is-invalid");
    toast("Vul voor een concept minimaal een onderwerp of bericht in.");
    return;
  }
  if (!asDraft && (!title || !message || !recipientIds.length)) {
    if (!title) titleInput.classList.add("is-invalid");
    if (!message) messageInput.classList.add("is-invalid");
    toast(recipientIds.length ? "Vul een onderwerp en bericht in." : "Kies minimaal één ontvanger.");
    return;
  }
  const audience = document.querySelector("#announcement-audience");
  const announcement = storeAnnouncement({
    title,
    message,
    recipientIds,
    emailRequested: document.querySelector("#announcement-email").checked,
    correctionOfId: correctionOfId || null,
    audienceValue: audience ? audience.value : "fixed",
    draftId: draftId || null,
    status: asDraft ? "draft" : "sent"
  });
  persistState();
  closeModal();
  renderAll();
  if (asDraft) {
    toast("Concept lokaal opgeslagen; ontvangers hebben niets gekregen.");
  } else {
    toast("Mededeling geplaatst voor " + recipientIds.length + " medewerker" + (recipientIds.length === 1 ? "" : "s") + "; " + announcement.emailRecipientIds.length + " aanvullende e-mail" + (announcement.emailRecipientIds.length === 1 ? "" : "s") + " veilig gesimuleerd.");
  }
}

function showAnnouncementEditor(correctionOfId, draftId) {
  const draft = draftId ? announcementById(draftId) : null;
  if (draftId && (!draft || draft.status !== "draft")) return;
  const linkedCorrectionId = draft && draft.correctionOfId ? draft.correctionOfId : correctionOfId;
  const original = linkedCorrectionId ? announcementById(linkedCorrectionId) : null;
  if (correctionOfId && !original) return;
  const clients = [...new Set(activeEmployees().map(employee => employee.client).filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));
  const selectedAudience = draft && draft.audienceValue && draft.audienceValue !== "fixed" ? draft.audienceValue : "all";
  const option = (value, label) => '<option value="' + escapeHtml(value) + '"' + (selectedAudience === value ? " selected" : "") + '>' + escapeHtml(label) + '</option>';
  const audienceOptions = option("all", "Alle actieve medewerkers") + clients.map(client => option("client:" + client, "Klantgroep " + client)).join("") + option("selected", "Zelf medewerkers kiezen");
  const selectedRecipientIds = draft ? draft.recipientIds : [];
  const recipientChecks = activeEmployees().map(employee => '<label class="recipient-choice"><input type="checkbox" data-announcement-recipient value="' + employee.id + '"' + (selectedRecipientIds.includes(employee.id) ? " checked" : "") + '><span><strong>' + escapeHtml(employee.name) + '</strong><small>' + escapeHtml(employee.client) + '</small></span></label>').join("");
  const audienceField = original
    ? '<div class="full fixed-audience"><strong>Ontvangers blijven gelijk</strong><span>' + escapeHtml(original.audienceLabel) + ' · ' + original.recipientIds.length + ' medewerker' + (original.recipientIds.length === 1 ? "" : "s") + '</span></div>'
    : '<label class="full">Ontvangers<select id="announcement-audience">' + audienceOptions + '</select></label><div class="recipient-choice-grid full" id="announcement-recipient-choices"' + (selectedAudience === "selected" ? "" : " hidden") + '>' + recipientChecks + '</div>';
  const editorTitle = draft ? draft.title : original ? original.title : "";
  const editorMessage = draft ? draft.message : "";
  const emailChecked = !draft || draft.emailRequested !== false;
  const summary = '<div class="modal-form announcement-form">' + audienceField +
    '<label class="full">Onderwerp<input id="announcement-title" maxlength="160" value="' + escapeHtml(editorTitle) + '" placeholder="Bijvoorbeeld: Update v0.7.9 is beschikbaar"></label>' +
    '<label class="full">Bericht<textarea id="announcement-message" maxlength="1500" placeholder="Bijvoorbeeld: Let op, vanaf nu kunnen we ook e-mailmeldingen sturen.">' + escapeHtml(editorMessage) + '</textarea></label>' +
    '<label class="check-row full"><input id="announcement-email" type="checkbox"' + (emailChecked ? " checked" : "") + '><span>Ontvangers ook afzonderlijk per e-mail laten weten dat er een nieuwe melding klaarstaat</span></label>' +
    '<p class="full form-help">De mededeling verschijnt altijd in de app. Een medewerker kan aanvullende e-mailmeldingen onder Voorkeuren uitzetten. De demo verstuurt geen echte e-mail en gebruikt nooit CC of BCC.</p></div>';
  showModal({
    label: draft ? "Concept #" + draft.id : original ? "Mededeling wijzigen" : "Nieuwe mededeling",
    title: draft ? "Concept bewerken" : original ? "Nieuwe versie maken" : "Nieuwe mededeling plaatsen",
    message: original ? "Na verzending zien medewerkers alleen deze nieuwste versie. De vorige tekst blijft uitsluitend intern zichtbaar voor beheerders." : "Kies de doelgroep en schrijf één duidelijk bericht.",
    summary,
    secondary: "Concept opslaan",
    secondaryAction: () => saveAnnouncementFromEditor(original ? original.id : null, draft ? draft.id : null, true),
    confirm: draft ? "Mededeling plaatsen" : original ? "Wijziging plaatsen" : "Mededeling plaatsen",
    wide: true,
    action: () => saveAnnouncementFromEditor(original ? original.id : null, draft ? draft.id : null, false)
  });
  const audience = document.querySelector("#announcement-audience");
  if (audience) audience.addEventListener("change", () => {
    document.querySelector("#announcement-recipient-choices").hidden = audience.value !== "selected";
  });
  document.querySelector(draft ? "#announcement-message" : "#announcement-title").focus();
}

function showDeleteAnnouncementDraft(id) {
  const draft = announcementById(id);
  if (!draft || draft.status !== "draft") return;
  showModal({
    label: "Concept verwijderen",
    title: "Dit concept verwijderen?",
    message: "Het concept is nooit verzonden. Er zijn geen ontvangers of e-mails om terug te draaien.",
    confirm: "Concept verwijderen",
    action: () => {
      state.announcements = state.announcements.filter(item => Number(item.id) !== Number(draft.id));
      persistState();
      closeModal();
      renderAnnouncements();
      toast("Concept verwijderd.");
    }
  });
}

function showAnnouncementWithdrawal(id) {
  const original = announcementById(id);
  if (!original || original.status !== "sent" || announcementKind(original) === "withdrawal") return;
  const summary = '<div class="modal-form announcement-form">' +
    '<label class="full">Reden voor intrekken<textarea id="announcement-withdrawal-reason" maxlength="750" placeholder="Leg kort uit waarom dit bericht wordt ingetrokken."></textarea></label>' +
    '<label class="check-row full"><input id="announcement-withdrawal-email" type="checkbox" checked><span>Ontvangers ook afzonderlijk per e-mail laten weten dat het bericht is ingetrokken</span></label>' +
    '<p class="full form-help">Een eerder verzonden e-mail kan niet worden teruggehaald. De app bewaart daarom het origineel en stuurt een nieuwe, herkenbare intrekkingsmelding.</p></div>';
  showModal({
    label: "Mededeling #" + original.id,
    title: "Mededeling intrekken",
    message: "Dezelfde ontvangers krijgen een nieuwe melding. Het oorspronkelijke bericht blijft zichtbaar als ingetrokken.",
    summary,
    confirm: "Intrekking klaarzetten",
    wide: true,
    action: () => {
      const reasonInput = document.querySelector("#announcement-withdrawal-reason");
      const reason = reasonInput.value.trim();
      reasonInput.classList.remove("is-invalid");
      if (!reason) {
        reasonInput.classList.add("is-invalid");
        toast("Vul een reden voor het intrekken in.");
        return;
      }
      const timestamp = correctionTimestamp();
      original.status = "withdrawn";
      original.withdrawalReason = reason;
      original.withdrawnBy = currentAdmin().name;
      original.withdrawnAt = timestamp.label;
      original.withdrawnAtIso = timestamp.iso;
      state.notifications
        .filter(item => Number(item.announcementId) === Number(original.id))
        .forEach(item => {
          item.read = true;
          item.withdrawn = true;
        });
      const notice = storeAnnouncement({
        title: "Ingetrokken: " + original.title,
        message: "Mededeling #" + original.id + " is ingetrokken.\nReden: " + reason,
        recipientIds: [...original.recipientIds],
        audienceLabel: "Zelfde ontvangers als bericht #" + original.id,
        emailRequested: document.querySelector("#announcement-withdrawal-email").checked,
        withdrawalOfId: original.id,
        kind: "withdrawal",
        status: "sent"
      });
      original.withdrawalNoticeId = notice.id;
      persistState();
      closeModal();
      renderAll();
      toast("Mededeling ingetrokken; het origineel en de reden blijven bewaard.");
    }
  });
  document.querySelector("#announcement-withdrawal-reason").focus();
}

function renderEmployees() {
  const employees = state.employees.filter(employee => state.employeeScope === "all" || (state.employeeScope === "active" ? employee.active !== false : employee.active === false));
  document.querySelector("#employee-grid").innerHTML = employees.map(employee => {
    const record = recordFor(employee.id);
    const active = employee.active !== false;
    return '<article class="employee-card' + (active ? "" : " is-inactive") + '">' +
      '<div class="employee-card-head"><div class="employee-identity"><span class="mini-avatar">' + initials(employee.name) + "</span><span><strong>" + escapeHtml(employee.name) + "</strong><small>" + escapeHtml(employee.role) + " · " + escapeHtml(employee.email || "geen accountadres") + "</small></span></div>" + (active ? statusPill(record.timesheetStatus) : '<span class="status-pill status-concept">Inactief</span>') + "</div>" +
      '<div class="employee-details"><div><small>Klant</small><strong>' + escapeHtml(employee.client) + "</strong></div><div><small>Uren per week</small><strong>" + hoursFormat.format(weeklyHoursFor(employee)) + " uur</strong></div><div><small>Broker</small><strong>" + escapeHtml(employee.broker) + "</strong></div></div>" +
      '<div class="employee-card-actions"><button class="text-button" data-edit-routing="' + employee.id + '">Gegevens aanpassen</button><button class="small-button" data-toggle-employee="' + employee.id + '">' + (active ? "Deactiveren" : "Opnieuw activeren") + "</button></div>" +
      "</article>";
  }).join("") || '<div class="dashboard-action-empty">Geen medewerkers binnen dit filter.</div>';
  document.querySelectorAll("[data-employee-scope]").forEach(button => button.classList.toggle("is-active", button.dataset.employeeScope === state.employeeScope));
  renderAdministrators();
}

function renderAdministrators() {
  const current = currentAdmin();
  const activeCount = activeAdmins().length;
  document.querySelector("#administrator-list").innerHTML = state.admins.map(admin => {
    const isCurrent = current && admin.id === current.id;
    const active = admin.active !== false;
    const disabled = isCurrent || (active && activeCount <= 1);
    const reason = isCurrent ? "Huidig account" : (active ? "Actieve beheerder" : "Geen toegang");
    return '<div class="administrator-row"><div class="administrator-person"><span class="mini-avatar">' + initials(admin.name) + '</span><span><strong>' + escapeHtml(admin.name) + '</strong><small>' + escapeHtml(admin.email) + " · " + reason + '</small></span></div><span class="status-pill ' + (active ? "status-approved" : "status-concept") + '">' + (active ? "Actief" : "Inactief") + '</span><div><button class="small-button" data-edit-admin="' + escapeHtml(admin.id) + '">Aanpassen</button> <button class="small-button" data-toggle-admin="' + escapeHtml(admin.id) + '"' + (disabled ? " disabled" : "") + '>' + (active ? "Deactiveren" : "Activeren") + '</button></div></div>';
  }).join("");
}

function renderMailTemplates() {
  document.querySelector("#mail-template-list").innerHTML = activeEmployees().map(employee => {
    const record = recordFor(employee.id);
    const subject = formatTemplate(employee.mailSubject, employee, record.invoiceNumber);
    const routes = deliveryRoutesFor(employee).map(route => route.name + ": " + (route.invoiceAttachment ? "factuur" : "alleen tekst")).join(" · ");
    return '<article class="template-item">' +
      '<div class="template-person"><span class="mini-avatar">' + initials(employee.name) + "</span><span><strong>" + escapeHtml(employee.name) + "</strong><small>" + escapeHtml(employee.broker) + " · " + escapeHtml(employee.brokerEmail) + "</small></span></div>" +
      '<div class="template-subject"><small>' + escapeHtml(routes) + '</small><strong>' + escapeHtml(subject) + "</strong></div>" +
      '<button class="small-button" data-edit-routing="' + employee.id + '">Aanpassen</button>' +
      "</article>";
  }).join("");
}

function renderHoursGrid() {
  const employee = currentEmployee();
  const period = currentPeriod();
  const record = recordFor(employee.id);
  document.querySelector("#timesheet-assignment").textContent = employee.client + " · " + employee.role;
  document.querySelector("#timesheet-employee").textContent = employee.name;
  document.querySelector("#timesheet-project").textContent = employee.projectCode;
  document.querySelector("#timesheet-status").className = "status-pill " + (statusLabels[record.timesheetStatus] || statusLabels.draft)[1];
  document.querySelector("#timesheet-status").textContent = (statusLabels[record.timesheetStatus] || statusLabels.draft)[0];
  document.querySelector("#summary-contract").textContent = hoursFormat.format(record.contractHours) + " uur";
  document.querySelector("#summary-leave").value = Number(record.leave) || 0;
  document.querySelector("#summary-sick").value = Number(record.sick) || 0;
  const correction = activeCorrection(record);
  const correctionBanner = document.querySelector("#timesheet-correction-banner");
  correctionBanner.hidden = !correction;
  if (correction) {
    document.querySelector("#timesheet-correction-message").textContent = correction.message;
    document.querySelector("#timesheet-correction-meta").textContent = "Teruggestuurd door " + correction.requestedBy + " · " + correction.requestedAt;
  }
  document.querySelector("#hours-grid").innerHTML = period.weekRows.map((week, weekIndex) => {
    const cells = week.days.map((day, dayIndex) => {
      if (!day) return '<td class="outside-month"><span aria-hidden="true">—</span></td>';
      const value = record.entries[weekIndex][dayIndex];
      return '<td><span class="date-number">' + day.day + '</span><input class="hours-input" data-week-index="' + weekIndex + '" data-day-index="' + dayIndex + '" type="number" min="0" max="24" step="0.5" value="' + value + '" aria-label="' + escapeHtml(day.label) + '"></td>';
    }).join("");
    const yearNote = week.year === period.year ? "" : " · " + week.year;
    return "<tr><td>Week " + week.number + yearNote + "</td>" + cells + '<td class="week-total">0,0</td></tr>';
  }).join("");
  updateHoursTotal(false);
}

function updateHoursTotal(markDraft) {
  const employee = currentEmployee();
  const record = recordFor(employee.id);
  document.querySelectorAll("#hours-grid tr").forEach((row, weekIndex) => {
    const values = Array(5).fill(0);
    row.querySelectorAll(".hours-input").forEach(input => {
      values[Number(input.dataset.dayIndex)] = Math.max(0, Number(input.value) || 0);
    });
    record.entries[weekIndex] = values;
    row.querySelector(".week-total").textContent = hoursFormat.format(values.reduce((sum, value) => sum + value, 0));
  });
  const total = totalEntries(record.entries);
  record.leave = Math.max(0, Number(document.querySelector("#summary-leave").value) || 0);
  record.sick = Math.max(0, Number(document.querySelector("#summary-sick").value) || 0);
  if (markDraft) {
    if (record.timesheetStatus !== "correction") record.timesheetStatus = "draft";
    record.invoiceStatus = "concept";
    record.payrollStatus = "concept";
    persistState();
  }
  document.querySelector("#hours-total").textContent = hoursFormat.format(total);
  document.querySelector("#summary-billable").textContent = hoursFormat.format(total) + " uur";
  const difference = Math.round((total - record.contractHours) * 10) / 10;
  let comparison = "Declarabele uren zijn gelijk aan de contracturen.";
  if (difference < 0) comparison = hoursFormat.format(Math.abs(difference)) + " uur minder dan de contracturen.";
  if (difference > 0) comparison = hoursFormat.format(difference) + " uur meer dan de contracturen.";
  document.querySelector("#hours-target-message").textContent = comparison;
  document.querySelector("#hours-target-help").textContent = "Dit blokkeert indienen nooit. Alleen " + currentPeriod().label + " wordt ingediend. Enter slaat tussentijds op en gaat verder.";
  const submit = document.querySelector("#submit-timesheet");
  submit.disabled = false;
  submit.textContent = record.timesheetStatus === "submitted"
    ? "Uren " + currentPeriod().month + " opnieuw indienen"
    : "Uren " + currentPeriod().month + " indienen";
  if (markDraft) {
    const status = statusLabels[record.timesheetStatus] || statusLabels.draft;
    document.querySelector("#timesheet-status").className = "status-pill " + status[1];
    document.querySelector("#timesheet-status").textContent = status[0];
    renderDashboard();
    renderApprovals();
    renderInvoices();
  }
}

function renderMailRecipientSettings() {
  const list = document.querySelector("#mail-recipient-settings-list");
  if (!list) return;
  const recipients = state.settings.mailRecipients || [];
  list.innerHTML = recipients.length ? recipients.map(recipient =>
    '<article class="mail-recipient-setting' + (recipient.active === false ? " is-inactive" : "") + '">' +
      '<div><strong>' + escapeHtml(recipient.name) + '</strong><small>' + escapeHtml(recipient.email) + '</small></div>' +
      '<span class="status-pill ' + (recipient.active === false ? "status-concept" : "status-approved") + '">' + (recipient.active === false ? "Inactief" : "Beschikbaar") + '</span>' +
      '<div><button class="small-button" data-edit-mail-recipient="' + escapeHtml(recipient.id) + '">Aanpassen</button> <button class="text-button" data-toggle-mail-recipient="' + escapeHtml(recipient.id) + '">' + (recipient.active === false ? "Activeren" : "Deactiveren") + '</button>' + (recipient.id === "bookkeeper" || recipient.id === "payroll" ? "" : ' <button class="text-button danger-text" data-delete-mail-recipient="' + escapeHtml(recipient.id) + '">Verwijderen</button>') + '</div>' +
    '</article>'
  ).join("") : '<div class="dashboard-action-empty"><strong>Nog geen vaste ontvangers.</strong><br>Voeg bijvoorbeeld de boekhouder of EasySalary toe.</div>';
}

function nextMailRecipientId() {
  let index = 1;
  while (mailRecipientById("recipient-" + index)) index += 1;
  return "recipient-" + index;
}

function showMailRecipientEditor(recipientId) {
  const existing = recipientId ? mailRecipientById(recipientId) : null;
  const recipient = existing || { id: nextMailRecipientId(), name: "", email: "nieuw-adres@example.invalid", active: true };
  const summary = '<div class="modal-form">' +
    '<label>Naam ontvanger<input id="edit-mail-recipient-name" value="' + escapeHtml(recipient.name) + '" placeholder="Bijvoorbeeld: EasySalary"></label>' +
    '<label>E-mailadres<input id="edit-mail-recipient-email" type="email" value="' + escapeHtml(recipient.email) + '"></label>' +
    '<p class="full form-help">Deze ontvanger wordt centraal opgeslagen. Daarna kun je hem bij iedere medewerker aanvinken en apart kiezen of de factuur meegaat.</p>' +
  '</div>';
  showModal({
    label: existing ? "Ontvanger aanpassen" : "Ontvanger toevoegen",
    title: existing ? recipient.name : "Nieuwe vaste ontvanger",
    message: "Gebruik één centraal adres, zodat dit niet per medewerker opnieuw hoeft te worden ingevuld.",
    summary,
    confirm: "Ontvanger opslaan",
    action: () => {
      const nameInput = document.querySelector("#edit-mail-recipient-name");
      const emailInput = document.querySelector("#edit-mail-recipient-email");
      [nameInput, emailInput].forEach(input => input.classList.remove("is-invalid"));
      if (!nameInput.value.trim() || !isValidEmail(emailInput.value)) {
        if (!nameInput.value.trim()) nameInput.classList.add("is-invalid");
        if (!isValidEmail(emailInput.value)) emailInput.classList.add("is-invalid");
        toast("Vul een naam en een geldig e-mailadres in.");
        return;
      }
      const updated = Object.assign({}, recipient, { name: nameInput.value.trim(), email: emailInput.value.trim(), active: recipient.active !== false });
      if (existing) state.settings.mailRecipients[state.settings.mailRecipients.findIndex(item => item.id === existing.id)] = updated;
      else state.settings.mailRecipients.push(updated);
      syncLegacyRecipientSettings();
      persistState();
      closeModal();
      renderAll();
      toast(updated.name + " is als vaste ontvanger opgeslagen.");
    }
  });
  document.querySelector("#edit-mail-recipient-name").focus();
}

function toggleMailRecipient(recipientId) {
  const recipient = mailRecipientById(recipientId);
  if (!recipient) return;
  recipient.active = recipient.active === false;
  syncLegacyRecipientSettings();
  persistState();
  renderAll();
  toast(recipient.name + (recipient.active ? " is weer beschikbaar." : " is gedeactiveerd; bestaande instellingen blijven bewaard."));
}

function showDeleteMailRecipient(recipientId) {
  const recipient = mailRecipientById(recipientId);
  if (!recipient || recipient.id === "bookkeeper" || recipient.id === "payroll") return;
  const usedBy = state.employees.filter(employee => mailRecipientRouteFor(employee, recipient.id).enabled !== false);
  showModal({
    label: "Ontvanger verwijderen",
    title: recipient.name + " definitief verwijderen?",
    message: usedBy.length
      ? "Deze ontvanger is aangevinkt bij " + usedBy.length + " medewerker" + (usedBy.length === 1 ? "" : "s") + ". Bij verwijderen verdwijnen ook die ontvangerkeuzes. Eerder vastgelegde uren en facturen blijven behouden."
      : "Deze ontvanger is bij geen enkele medewerker aangevinkt. Verwijderen kan niet ongedaan worden gemaakt.",
    summary: "<div><span>Ontvanger</span><strong>" + escapeHtml(recipient.name) + "</strong></div><div><span>E-mailadres</span><strong>" + escapeHtml(recipient.email) + "</strong></div><div><span>Geselecteerd bij</span><strong>" + usedBy.length + " medewerker" + (usedBy.length === 1 ? "" : "s") + "</strong></div>",
    confirm: "Definitief verwijderen",
    action: () => {
      state.settings.mailRecipients = state.settings.mailRecipients.filter(item => String(item.id) !== String(recipient.id));
      state.employees.forEach(employee => {
        if (employee.mailRecipientRoutes) delete employee.mailRecipientRoutes[recipient.id];
      });
      persistState();
      closeModal();
      renderAll();
      toast(recipient.name + " is definitief verwijderd. Uren en factuurhistorie zijn behouden.");
    }
  });
}

function populateSettings() {
  const settings = state.settings;
  document.querySelector("#setting-company-name").value = settings.companyName;
  document.querySelector("#setting-kvk").value = settings.kvk;
  document.querySelector("#setting-vat").value = settings.vat;
  document.querySelector("#setting-iban").value = settings.iban;
  document.querySelector("#setting-address").value = settings.address;
  document.querySelector("#setting-postal-city").value = settings.postalCity;
  document.querySelector("#setting-phone").value = settings.phone;
  document.querySelector("#setting-invoice-email").value = settings.invoiceEmail;
  document.querySelector("#setting-payment-term").value = settings.paymentTerm;
  document.querySelector("#setting-sender").value = settings.sender;
  document.querySelector("#setting-approval-required").checked = settings.approvalRequired;
  document.querySelector("#setting-lock-invoice").checked = settings.lockInvoice;
  document.querySelector("#setting-audit-log").checked = settings.auditLog;
  renderMailRecipientSettings();
}

function saveSettings() {
  const emailInputs = [document.querySelector("#setting-sender"), document.querySelector("#setting-invoice-email")];
  const invalid = emailInputs.filter(input => !isValidEmail(input.value));
  document.querySelectorAll(".is-invalid").forEach(input => input.classList.remove("is-invalid"));
  if (invalid.length) {
    invalid.forEach(input => input.classList.add("is-invalid"));
    toast("Niet opgeslagen: vul bij ieder e-mailveld een geldig adres in.");
    return;
  }
  state.settings = Object.assign({}, state.settings, {
    companyName: document.querySelector("#setting-company-name").value.trim(),
    kvk: document.querySelector("#setting-kvk").value.trim(),
    vat: document.querySelector("#setting-vat").value.trim(),
    iban: document.querySelector("#setting-iban").value.trim(),
    address: document.querySelector("#setting-address").value.trim(),
    postalCity: document.querySelector("#setting-postal-city").value.trim(),
    phone: document.querySelector("#setting-phone").value.trim(),
    invoiceEmail: document.querySelector("#setting-invoice-email").value.trim(),
    paymentTerm: document.querySelector("#setting-payment-term").value,
    sender: document.querySelector("#setting-sender").value.trim(),
    approvalRequired: document.querySelector("#setting-approval-required").checked,
    lockInvoice: document.querySelector("#setting-lock-invoice").checked,
    auditLog: document.querySelector("#setting-audit-log").checked
  });
  syncLegacyRecipientSettings();
  persistState();
  renderAll();
  toast("Instellingen zijn lokaal opgeslagen.");
}

function nextNotificationId() {
  return state.notifications.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function addNotification(notification, force) {
  const audience = notification.audience;
  if (!force && audience === "admin" && !state.preferences.approvalNotifications && notification.type !== "invoice") return;
  if (!force && audience === "admin" && notification.type === "invoice" && !state.preferences.invoiceNotifications) return;
  if (!force && audience === "employee" && !state.preferences.statusNotifications && notification.type !== "reminder") return;
  if (!force && audience === "employee" && notification.type === "reminder" && !state.preferences.hourReminders) return;
  state.notifications.push(Object.assign({
    id: nextNotificationId(),
    employeeId: null,
    title: "Nieuwe melding",
    message: "",
    periodKey: currentPeriod().key,
    view: audience === "admin" ? "dashboard" : "employee-dashboard",
    emailRequested: audience === "employee" && employeeById(notification.employeeId) ? employeeById(notification.employeeId).emailNotificationsEnabled !== false : false,
    read: false,
    createdAt: "Zojuist"
  }, notification));
  persistState();
  renderNotifications();
}

function notificationsForCurrentProfile() {
  if (!state.currentRole) return [];
  return state.notifications
    .filter(item => state.currentRole === "admin" ? item.audience === "admin" : item.audience === "employee" && Number(item.employeeId) === currentEmployee().id)
    .sort((left, right) => Number(right.id) - Number(left.id));
}

function renderNotifications() {
  const list = document.querySelector("#notification-list");
  if (!list) return;
  const notifications = notificationsForCurrentProfile();
  const visible = notifications.filter(item => !item.read);
  const unread = visible.length;
  const count = document.querySelector("#notification-count");
  count.textContent = unread > 9 ? "9+" : String(unread);
  count.hidden = unread === 0;
  document.querySelector("#notification-title").textContent = unread
    ? unread + " nieuwe melding" + (unread === 1 ? "" : "en")
    : "Geen nieuwe meldingen";
  list.innerHTML = visible.length ? visible.map(item => '<button class="notification-item is-unread" data-notification-id="' + item.id + '"><span class="notification-item-dot"></span><span><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.message) + '</span><small>' + escapeHtml(item.createdAt) + '</small></span></button>').join("") : '<div class="notification-empty"><strong>Je hebt geen nieuwe meldingen.</strong><br>Een beheerder maakt algemene berichten onder Mededelingen.</div>';
  const tests = state.currentRole === "admin"
    ? [
        ["submitted", "Uren ingediend"],
        ["pending", "Controle blijft open"],
        ["invoice", "Factuur klaar"]
      ]
    : [
        ["reminder", "Urenherinnering"],
        ["correction", "Correctie nodig"],
        ["approved", "Uren goedgekeurd"]
      ];
  document.querySelector("#notification-test-buttons").innerHTML = tests.map(test => '<button data-test-notification="' + test[0] + '">' + test[1] + '</button>').join("");
}

function createTestNotification(type) {
  const employee = currentEmployee();
  const period = currentPeriod();
  const definitions = {
    submitted: { audience: "admin", type, employeeId: employee.id, title: "Uren ingediend", message: employee.name + " heeft " + period.label + " ingediend.", view: "approvals" },
    pending: { audience: "admin", type, employeeId: employee.id, title: "Urencontrole staat open", message: "De uren van " + employee.name + " wachten nog op controle.", view: "approvals" },
    invoice: { audience: "admin", type, employeeId: employee.id, title: "Factuur klaar", message: "De factuur voor " + employee.name + " kan worden gecontroleerd.", view: "invoices" },
    reminder: { audience: "employee", type, employeeId: employee.id, title: "Urenherinnering", message: "Vul je uren voor " + period.label + " aan en dien de maand in.", view: "timesheet" },
    correction: { audience: "employee", type, employeeId: employee.id, title: "Correctie nodig", message: "Je uren voor " + period.label + " zijn teruggestuurd om aan te passen.", view: "timesheet" },
    approved: { audience: "employee", type, employeeId: employee.id, title: "Uren goedgekeurd", message: "Je uren voor " + period.label + " zijn goedgekeurd.", view: "employee-dashboard" }
  };
  const definition = definitions[type];
  if (!definition) return;
  addNotification(definition, true);
  toast("Testmelding toegevoegd. Er is geen e-mail verstuurd.");
}

function closeTopbarPopovers() {
  ["notification-panel", "profile-menu"].forEach(id => {
    const panel = document.querySelector("#" + id);
    if (panel) panel.hidden = true;
  });
  document.querySelector("#notification-button").setAttribute("aria-expanded", "false");
  document.querySelector("#profile-menu-button").setAttribute("aria-expanded", "false");
}

function toggleTopbarPopover(id, buttonId) {
  const panel = document.querySelector("#" + id);
  const open = panel.hidden;
  closeTopbarPopovers();
  panel.hidden = !open;
  document.querySelector("#" + buttonId).setAttribute("aria-expanded", String(open));
}

function helpRoleTopics() {
  return HELP_TOPICS.filter(topic => topic.roles.includes(state.currentRole));
}

function renderHelpSuggestions() {
  const target = document.querySelector("#help-suggestions");
  if (!target) return;
  const preferred = state.currentRole === "admin"
    ? ["approvals", "invoices", "employee-add", "notifications", "theme"]
    : ["hours", "submit", "status", "notifications", "absence"];
  const topics = preferred.map(id => HELP_TOPICS.find(topic => topic.id === id)).filter(Boolean);
  target.innerHTML = topics.map(topic => '<button data-help-topic="' + topic.id + '">' + escapeHtml(topic.label) + '</button>').join("");
}

function addHelpMessage(text, type, options) {
  const target = document.querySelector("#help-messages");
  const item = document.createElement("div");
  item.className = "help-message" + (type === "user" ? " user" : "");
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  item.append(paragraph);
  if (options && options.view) {
    const button = document.createElement("button");
    button.className = "small-button";
    button.dataset.helpView = options.view;
    button.textContent = options.label || "Open dit onderdeel";
    item.append(button);
  }
  if (options && options.contact) {
    const profile = currentProfileData();
    const subject = "Vraag over Path Uren & Facturatie";
    const body = "Hallo Path Backoffice,\n\nIk heb een vraag over de urenapp.\n\nMijn vraag:\n" + (options.question || "Schrijf hier je vraag") + "\n\nNaam: " + profile.name + "\nPeriode: " + currentPeriod().label;
    const actions = document.createElement("div");
    actions.className = "help-contact-actions";
    const gmail = document.createElement("a");
    gmail.href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(SUPPORT_EMAIL) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    gmail.target = "_blank";
    gmail.rel = "noopener noreferrer";
    gmail.textContent = "Open in Gmail";
    const mailApp = document.createElement("a");
    mailApp.href = "mailto:" + SUPPORT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    mailApp.textContent = "Open in Outlook / mailapp";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.dataset.copySupport = subject + "\n\nAan: " + SUPPORT_EMAIL + "\n\n" + body;
    copy.textContent = "Kopieer bericht";
    actions.append(gmail, mailApp, copy);
    item.append(actions);
  }
  target.append(item);
  target.scrollTop = target.scrollHeight;
}

function openHelp() {
  const panel = document.querySelector("#help-panel");
  panel.hidden = false;
  document.querySelector("#help-launcher").setAttribute("aria-expanded", "true");
  const profile = currentProfileData();
  document.querySelector("#help-greeting").textContent = "Waarmee kan ik helpen, " + profile.name.split(/\s+/)[0] + "?";
  if (!document.querySelector("#help-messages").children.length) {
    addHelpMessage("Hallo " + profile.name.split(/\s+/)[0] + ". Stel een vraag over een functie of kies hieronder een veelgestelde vraag.", "bot");
  }
  renderHelpSuggestions();
  document.querySelector("#help-input").focus();
}

function closeHelp() {
  document.querySelector("#help-panel").hidden = true;
  document.querySelector("#help-launcher").setAttribute("aria-expanded", "false");
}

async function copyText(value) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const field = document.createElement("textarea");
      field.value = value;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    toast("E-mailtekst gekopieerd. Er is niets verzonden.");
  } catch {
    toast("Kopiëren is in deze browser geblokkeerd. Open Gmail of je standaard mailapp.");
  }
}

function normalizeHelpWords(value) {
  const stop = new Set(["de", "het", "een", "en", "of", "ik", "je", "jij", "u", "hoe", "wat", "waar", "kan", "kun", "mijn", "met", "voor", "van", "naar", "is", "zijn", "doe", "deze", "dit", "ook", "hier", "app"]);
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(word => word.length > 1 && !stop.has(word));
}

function findHelpTopic(question) {
  const words = normalizeHelpWords(question);
  let best = null;
  let bestScore = 0;
  helpRoleTopics().forEach(topic => {
    const haystack = normalizeHelpWords(topic.label + " " + topic.terms + " " + topic.answer);
    const score = words.reduce((sum, word) => {
      if (haystack.some(term => term === word)) return sum + 3;
      if (haystack.some(term => term.length >= 4 && word.length >= 4 && (term.startsWith(word) || word.startsWith(term)))) return sum + 1;
      return sum;
    }, 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  });
  return bestScore > 0 ? best : null;
}

function answerHelpQuestion(question, explicitTopicId) {
  const topic = explicitTopicId ? HELP_TOPICS.find(item => item.id === explicitTopicId && item.roles.includes(state.currentRole)) : findHelpTopic(question);
  if (!explicitTopicId) addHelpMessage(question, "user");
  if (topic) {
    unresolvedHelpQuestion = "";
    const view = topic.view === "home" ? profileForRole(state.currentRole).home : topic.view;
    addHelpMessage(topic.answer, "bot", view ? { view, label: "Open " + pageTitles[view] } : null);
    return;
  }
  if (!unresolvedHelpQuestion) {
    unresolvedHelpQuestion = question;
    addHelpMessage("Ik begrijp je vraag nog niet helemaal. Wil je hem één keer anders of iets concreter formuleren? Bijvoorbeeld: ‘Hoe dien ik mijn uren voor juli in?’", "bot");
    return;
  }
  const combinedQuestion = "Eerste formulering: " + unresolvedHelpQuestion + "\nTweede formulering: " + question;
  unresolvedHelpQuestion = "";
  addHelpMessage("Ook na je tweede formulering heb ik nog geen betrouwbaar standaardantwoord. Kies hieronder Gmail, Outlook / je standaard mailapp of kopieer het bericht. Een mailprogramma opent alleen als het op jouw apparaat is ingesteld; er wordt niets automatisch verzonden.", "bot", { contact: true, question: combinedQuestion });
}

function renderAll() {
  renderLoginAdminPicker();
  renderLoginEmployeePicker();
  renderPeriodHeadings();
  renderDashboard();
  renderEmployeeDashboard();
  renderApprovals();
  renderInvoices();
  renderPayroll();
  renderAnnouncements();
  renderEmployeeAnnouncementArchive();
  renderEmployees();
  renderMailTemplates();
  renderMailRecipientSettings();
  renderHoursGrid();
  renderProfileChrome();
  renderNotifications();
  renderHelpSuggestions();
  applyTheme();
}

function showView(view) {
  if (state.currentRole === "employee" && adminViews.has(view)) view = "employee-dashboard";
  if (state.currentRole === "admin" && view === "employee-dashboard") view = "dashboard";
  if (state.currentRole === "admin" && view === "employee-announcements") view = "dashboard";
  const target = document.querySelector("#view-" + view);
  if (!target) return;
  document.querySelectorAll(".view").forEach(item => item.classList.toggle("is-active", item === target));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("is-active", item.dataset.view === view));
  document.querySelector("#page-title").textContent = pageTitles[view];
  window.location.hash = view;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function login(role) {
  if (role === "admin") {
    const selectedAdmin = document.querySelector("#login-admin").value;
    if (adminById(selectedAdmin) && adminById(selectedAdmin).active !== false) state.currentAdminId = selectedAdmin;
  }
  if (role === "employee") {
    const selectedEmployee = Number(document.querySelector("#login-employee").value);
    if (employeeById(selectedEmployee)) state.currentEmployeeId = selectedEmployee;
  }
  const profile = profileForRole(role);
  if (!profile) return;
  state.currentRole = role;
  persistState();
  document.body.dataset.role = role;
  document.querySelector("#login-screen").hidden = true;
  document.querySelector("#app-shell").hidden = false;
  document.querySelectorAll(".role-admin-only").forEach(item => { item.hidden = role !== "admin"; });
  document.querySelectorAll(".role-employee-only").forEach(item => { item.hidden = role !== "employee"; });
  document.querySelector("#help-launcher").hidden = false;
  renderAll();
  showView(profile.home);
}

function logout() {
  state.currentRole = null;
  unresolvedHelpQuestion = "";
  delete document.body.dataset.role;
  document.querySelector("#app-shell").hidden = true;
  document.querySelector("#login-screen").hidden = false;
  document.querySelectorAll(".role-admin-only").forEach(item => { item.hidden = false; });
  document.querySelectorAll(".role-employee-only").forEach(item => { item.hidden = true; });
  document.querySelector("#help-launcher").hidden = true;
  closeHelp();
  closeTopbarPopovers();
  document.querySelector("#help-messages").innerHTML = "";
  renderLoginAdminPicker();
  renderLoginEmployeePicker();
  window.location.hash = "";
}

function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("is-visible"), 3400);
}

function showModal(options) {
  const settings = Object.assign({ label: "Controle", title: "", message: "", summary: "", confirm: "Bevestigen", action: null, secondary: "", secondaryAction: null, wide: false }, options);
  document.querySelector("#modal-label").textContent = settings.label;
  document.querySelector("#modal-title").textContent = settings.title;
  document.querySelector("#modal-message").textContent = settings.message;
  document.querySelector("#modal-summary").innerHTML = settings.summary;
  document.querySelector("#modal-summary").hidden = !settings.summary;
  document.querySelector("#modal-confirm").textContent = settings.confirm;
  document.querySelector("#modal-confirm").disabled = false;
  document.querySelector("#modal-secondary").textContent = settings.secondary || "Terugsturen";
  document.querySelector("#modal-secondary").hidden = !settings.secondary;
  document.querySelector(".modal").classList.toggle("is-wide", settings.wide);
  modalAction = settings.action;
  modalSecondaryAction = settings.secondaryAction;
  document.querySelector("#modal").hidden = false;
  document.querySelector("#modal-confirm").focus();
}

function closeModal() {
  document.querySelector("#modal").hidden = true;
  document.querySelector(".modal").classList.remove("is-wide");
  document.querySelector("#modal-secondary").hidden = true;
  document.querySelector("#modal-confirm").disabled = false;
  modalAction = null;
  modalSecondaryAction = null;
}

function approveEmployee(id, periodKey) {
  const key = periodKey || currentPeriod().key;
  const record = recordFor(id, key);
  record.timesheetStatus = "approved";
  record.invoiceStatus = "ready";
  record.payrollStatus = "ready";
  addNotification({ audience: "employee", type: "approved", employeeId: Number(id), title: "Uren goedgekeurd", message: "Je uren voor " + periodFromKey(key).label + " zijn goedgekeurd.", periodKey: key, view: "employee-dashboard" });
  addNotification({ audience: "admin", type: "invoice", employeeId: Number(id), title: "Factuur klaar", message: "De factuur voor " + employeeById(id).name + " staat klaar.", periodKey: key, view: "invoices" });
  persistState();
  renderAll();
  toast(employeeById(id).name + " is goedgekeurd voor " + periodFromKey(key).label + "; de factuur staat klaar.");
}

function showCorrectionEditor(id, periodKey) {
  const key = periodKey || currentPeriod().key;
  const employee = employeeById(id);
  const period = periodFromKey(key);
  showModal({
    label: "Correctie aanvragen",
    title: "Wat moet " + employee.name + " aanpassen?",
    message: "Schrijf concreet wat er niet klopt. De medewerker ziet deze tekst bij de melding en de urenstaat.",
    summary: '<div class="modal-form"><label class="full" for="correction-reason">Reden voor correctie<textarea id="correction-reason" maxlength="1000" placeholder="Bijvoorbeeld: controleer de uren van 14 juli; daar staat 8 uur in plaats van 4 uur."></textarea></label><p class="full form-help" id="correction-reason-help">Verplicht veld · maximaal 1000 tekens · Enter maakt een nieuwe regel · Ctrl+Enter verstuurt.</p></div>',
    confirm: "Terugsturen",
    action: () => returnEmployeeForCorrection(employee.id, key, document.querySelector("#correction-reason").value)
  });
  const textarea = document.querySelector("#correction-reason");
  const confirm = document.querySelector("#modal-confirm");
  const help = document.querySelector("#correction-reason-help");
  const validate = () => {
    const valid = textarea.value.trim().length > 0;
    confirm.disabled = !valid;
    textarea.classList.toggle("is-invalid", !valid && textarea.dataset.touched === "true");
    textarea.setAttribute("aria-invalid", String(!valid && textarea.dataset.touched === "true"));
    help.textContent = valid
      ? textarea.value.trim().length + " van 1000 tekens · klaar om terug te sturen."
      : "Verplicht veld · leg uit wat de medewerker moet aanpassen.";
  };
  confirm.disabled = true;
  textarea.addEventListener("input", () => {
    textarea.dataset.touched = "true";
    validate();
  });
  textarea.focus();
}

function returnEmployeeForCorrection(id, periodKey, reason) {
  const key = periodKey || currentPeriod().key;
  const employee = employeeById(id);
  const record = recordFor(id, key);
  const message = String(reason || "").trim();
  if (!message) {
    const textarea = document.querySelector("#correction-reason");
    if (textarea) {
      textarea.dataset.touched = "true";
      textarea.classList.add("is-invalid");
      textarea.setAttribute("aria-invalid", "true");
      textarea.focus();
    }
    return;
  }
  const requestedBy = currentAdmin() ? currentAdmin().name : "Beheerder";
  const requestedAt = correctionTimestamp();
  correctionHistoryFor(record).push({
    id: correctionHistoryFor(record).length + 1,
    message,
    requestedBy,
    requestedAt: requestedAt.label,
    requestedAtIso: requestedAt.iso,
    resubmittedAt: null,
    resubmittedAtIso: null
  });
  record.timesheetStatus = "correction";
  record.invoiceStatus = "concept";
  record.payrollStatus = "concept";
  addNotification({ audience: "employee", type: "correction", employeeId: Number(id), title: "Correctie nodig", message: requestedBy + " vraagt je om " + periodFromKey(key).label + " aan te passen. Reden: " + message, periodKey: key, view: "timesheet" });
  persistState();
  closeModal();
  renderAll();
  toast("De uren van " + employee.name + " zijn met toelichting teruggestuurd. Er is niets gemaild.");
}

function invoiceSummary(employeeId) {
  const employee = employeeById(employeeId);
  const record = recordFor(employee.id);
  const subject = formatTemplate(employee.mailSubject, employee, record.invoiceNumber);
  const body = formatTemplate(employee.mailBody, employee, record.invoiceNumber);
  const total = totalEntries(record.entries);
  const routes = deliveryRoutesFor(employee);
  const routeHtml = routes.map(route =>
    "<div><span>" + escapeHtml(route.name) + "</span><strong>" + escapeHtml(route.email) + " · " + (route.invoiceAttachment ? "factuur als PDF" : "geen bijlage") + "</strong></div>"
  ).join("");
  return {
    employee,
    record,
    subject,
    body,
    routes,
    html: "<div><span>Factuur</span><strong>" + escapeHtml(record.invoiceNumber) + "</strong></div>" + routeHtml +
      "<div><span>Urenstaat</span><strong>Niet toegevoegd; daadwerkelijke uren staan in de tekst</strong></div>" +
      "<div><span>BCC</span><strong>Niet gebruikt</strong></div>" +
      "<div><span>Brokeronderwerp</span><strong>" + escapeHtml(subject) + "</strong></div>" +
      "<div><span>Totaal excl. btw</span><strong>" + currency.format(total * employee.rate) + "</strong></div>"
  };
}

function invoiceData(employeeId) {
  const employee = employeeById(employeeId);
  const record = recordFor(employee.id);
  const period = currentPeriod();
  const hours = totalEntries(record.entries);
  const subtotal = Math.round(hours * Number(employee.rate || 0) * 100) / 100;
  const vatRate = 21;
  const vatAmount = Math.round(subtotal * vatRate) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  const invoiceDate = utcDate(period.year, period.monthIndex + 1, 1);
  const dueDate = new Date(invoiceDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + Number(state.settings.paymentTerm || 30));
  const dateLabel = date => new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
  return {
    employee,
    record,
    period,
    hours,
    subtotal,
    vatRate,
    vatAmount,
    total,
    invoiceDate: dateLabel(invoiceDate),
    dueDate: dateLabel(dueDate)
  };
}

function brokerInvoiceAddress(employee) {
  const address = String(employee.brokerInvoiceAddress || "").trim();
  return address || "Factuuradres: nog definitief bevestigen";
}

function brokerInvoiceAddressHtml(employee) {
  return escapeHtml(brokerInvoiceAddress(employee)).replace(/\r?\n/g, "<br>");
}

function brokerInvoiceAddressLines(employee) {
  return brokerInvoiceAddress(employee).split(/\r?\n/).filter(Boolean);
}

function brokerInvoiceAddressParts(employee) {
  const lines = brokerInvoiceAddressLines(employee);
  if (lines.length < 2) return { addressLines: lines, postalCity: "" };
  return { addressLines: lines.slice(0, -1), postalCity: lines[lines.length - 1] };
}

function invoiceRecipientName(employee) {
  return String(employee.invoiceRecipientName || employee.broker || "Broker").trim();
}

function invoiceProjectName(employee) {
  return String(employee.invoiceProject || employee.client || "").trim();
}

function invoiceReferenceRows(employee) {
  return [
    ["Overeenkomstnummer", employee.agreementNumber],
    ["Crediteurennummer", employee.creditorNumber],
    ["Nummer opdrachtuitvoerder", employee.contractorNumber]
  ].filter(([, value]) => String(value || "").trim());
}

function invoiceField(label, value) {
  return '<div class="invoice-source-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

function invoicePreviewMarkup(data) {
  const employee = data.employee;
  const references = invoiceReferenceRows(employee);
  const referencesHtml = references.length
    ? '<section class="invoice-brand-references">' + references.map(([label, value]) => '<div><span>' + escapeHtml(label) + ':</span><strong>' + escapeHtml(value) + '</strong></div>').join("") + '</section>'
    : "";
  const recipientAddress = brokerInvoiceAddressParts(employee);
  return '<article class="invoice-document-preview invoice-branded-template">' +
    '<header class="invoice-brand-header"><div class="invoice-brand-logo"><img src="' + PATH_LOGO_DATA_URL + '" alt="Path Consultancy"><span>Uren &amp; Facturatie</span></div>' +
      '<div class="invoice-brand-title"><h3>FACTUUR</h3><div class="invoice-brand-number-line"><span>Factuurnummer:</span><strong>' + escapeHtml(data.record.invoiceNumber) + '</strong></div><small>Factuurdatum ' + escapeHtml(data.invoiceDate) + ' &nbsp;|&nbsp; Betreft ' + escapeHtml(data.period.month) + '</small><span>CONCEPT - NIET VERZONDEN</span></div></header>' +
    '<div class="invoice-brand-accent"></div>' +
    '<section class="invoice-brand-parties"><div class="invoice-brand-party sender"><span class="invoice-brand-label">Facturerende onderneming</span><h4>' + escapeHtml(state.settings.companyName) + '</h4>' +
      '<p>' + escapeHtml(state.settings.address) + '<br>' + escapeHtml(state.settings.postalCity) + '</p>' +
      '<dl><dt>KvK</dt><dd>' + escapeHtml(state.settings.kvk) + '</dd><dt>BTW</dt><dd>' + escapeHtml(state.settings.vat) + '</dd><dt>IBAN</dt><dd>' + escapeHtml(state.settings.iban) + '</dd></dl>' +
      '<p class="invoice-brand-contact">' + escapeHtml(state.settings.phone) + ' &nbsp;|&nbsp; ' + escapeHtml(state.settings.invoiceEmail) + '</p></div>' +
      '<div class="invoice-brand-party recipient"><span class="invoice-brand-label">Factuur aan</span><h4>' + escapeHtml(invoiceRecipientName(employee)) + '</h4>' +
      '<p>' + escapeHtml(recipientAddress.addressLines.join("\n")).replace(/\n/g, "<br>") + '<br>' + escapeHtml(recipientAddress.postalCity) + '</p>' +
      '<dl><dt>Project</dt><dd>' + escapeHtml(invoiceProjectName(employee)) + '</dd><dt>Omschrijving</dt><dd>Maand ' + escapeHtml(data.period.month) + '</dd></dl></div></section>' +
    referencesHtml +
    '<div class="invoice-brand-intro"><p>Beste,</p><p>Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden.</p></div>' +
    '<table class="invoice-preview-table"><thead><tr><th>Omschrijving</th><th>Uren</th><th>Tarief</th><th>Totaal</th></tr></thead><tbody><tr><td>Maand ' + escapeHtml(data.period.month) + '</td><td>' + invoiceHours(data.hours) + '</td><td>' + invoiceMoney(employee.rate) + '</td><td>' + invoiceMoney(data.subtotal) + '</td></tr></tbody></table>' +
    '<div class="invoice-brand-totals"><span>Totaal exclusief</span><strong>' + invoiceMoney(data.subtotal) + '</strong><span>BTW ' + data.vatRate + ' %</span><strong>' + invoiceMoney(data.vatAmount) + '</strong><span class="invoice-preview-total">Totaal inclusief</span><strong class="invoice-preview-total">' + invoiceMoney(data.total) + '</strong></div>' +
    '<div class="invoice-brand-payment"><span class="invoice-brand-label">Betalingsinformatie</span><p>U wordt vriendelijk verzocht uw betaling binnen ' + escapeHtml(String(state.settings.paymentTerm)) + ' dagen van de factuurdatum over te maken op rekening: <strong>' + escapeHtml(state.settings.iban) + '</strong> onder vermelding van factuurnummer: <strong>' + escapeHtml(data.record.invoiceNumber) + '</strong></p></div>' +
    '<div class="invoice-brand-closing"><p>Met vriendelijke groet,</p><strong>' + escapeHtml(state.settings.companyName) + '</strong></div>' +
    '<footer class="invoice-brand-footer"><span>Path-vormgeving &nbsp;|&nbsp; Facturerende onderneming: ' + escapeHtml(state.settings.companyName) + '</span><strong>CONCEPTVOORBEELD</strong></footer>' +
  '</article>';
}

function safeFilename(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "");
}

function downloadInvoicePdf(employeeId) {
  const data = invoiceData(employeeId);
  const jspdf = window.jspdf;
  if (!jspdf || typeof jspdf.jsPDF !== "function") {
    toast("PDF kon niet worden gemaakt. Vernieuw de pagina en probeer opnieuw.");
    return false;
  }
  const doc = new jspdf.jsPDF({ unit: "mm", format: "a4" });
  const invoiceFonts = window.PATH_INVOICE_FONTS;
  let pdfFontFamily = "helvetica";
  if (invoiceFonts && typeof doc.addFileToVFS === "function" && typeof doc.addFont === "function") {
    doc.addFileToVFS("path-invoice-regular.ttf", invoiceFonts.regular);
    doc.addFont("path-invoice-regular.ttf", "PathInvoice", "normal");
    doc.addFileToVFS("path-invoice-bold.ttf", invoiceFonts.bold);
    doc.addFont("path-invoice-bold.ttf", "PathInvoice", "bold");
    pdfFontFamily = "PathInvoice";
  }
  const recipientAddress = brokerInvoiceAddressParts(data.employee);
  const references = invoiceReferenceRows(data.employee);
  const navy = [13, 27, 56];
  const navySoft = [21, 39, 71];
  const mint = [58, 189, 157];
  const mintLight = [231, 248, 243];
  const ink = [23, 35, 50];
  const muted = [108, 120, 134];
  const line = [223, 230, 233];
  const background = [246, 249, 248];
  const drawText = (value, x, y, size = 8.5, color = ink, style = "normal", options = {}) => {
    doc.setTextColor(...color);
    doc.setFont(pdfFontFamily, style);
    doc.setFontSize(size);
    doc.text(String(value || ""), x, y, options);
  };
  const drawLabel = (value, x, y, color = muted) => drawText(String(value).toUpperCase(), x, y, 6.1, color, "bold");
  const roundedBox = (x, y, width, height, fill, stroke = null, radius = 3) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(...(stroke || fill));
    doc.roundedRect(x, y, width, height, radius, radius, stroke ? "FD" : "F");
  };

  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 46, "F");
  doc.setFillColor(...mint);
  doc.rect(0, 46, 210, 1.5, "F");
  doc.addImage(PATH_LOGO_DATA_URL, "PNG", 15, 14, 45, 15);
  drawText("UREN & FACTURATIE", 15, 38, 6.8, [191, 217, 210], "bold");
  drawText("FACTUUR", 195, 20, 21, [255, 255, 255], "bold", { align: "right" });
  drawText("Factuurnummer: " + data.record.invoiceNumber, 195, 30, 9.2, [255, 255, 255], "bold", { align: "right" });
  drawText("Factuurdatum  " + data.invoiceDate + "   |   Betreft  " + data.period.month, 195, 37.5, 7.2, [221, 233, 230], "normal", { align: "right" });
  roundedBox(151.5, 40, 43.5, 6.5, mint, null, 3.2);
  drawText("CONCEPT - NIET VERZONDEN", 192.5, 44.2, 5.9, navy, "bold", { align: "right" });

  roundedBox(14, 55, 88, 58, background, line);
  roundedBox(107, 55, 89, 58, mintLight);
  drawLabel("Facturerende onderneming", 20, 63);
  drawText(state.settings.companyName, 20, 70.5, 11, navy, "bold");
  drawText(state.settings.address, 20, 77);
  drawText(state.settings.postalCity, 20, 82.5);
  doc.setDrawColor(...line);
  doc.line(20, 88, 96, 88);
  drawLabel("KvK", 20, 94);
  drawText(state.settings.kvk, 36, 94);
  drawLabel("BTW", 59, 94);
  drawText(state.settings.vat, 72, 94);
  drawLabel("IBAN", 20, 100);
  drawText(state.settings.iban, 36, 100, 8.5, ink, "bold");
  drawText(state.settings.phone + "  |  " + state.settings.invoiceEmail, 20, 107, 7.5, [22, 93, 100]);

  drawLabel("Factuur aan", 113, 63);
  drawText(invoiceRecipientName(data.employee), 113, 70.5, 11, navy, "bold");
  recipientAddress.addressLines.forEach((addressLine, index) => drawText(addressLine, 113, 77 + (index * 5.5)));
  const recipientPostalY = 77 + (recipientAddress.addressLines.length * 5.5);
  drawText(recipientAddress.postalCity, 113, recipientPostalY);
  doc.setDrawColor(198, 233, 224);
  doc.line(113, 94, 190, 94);
  drawLabel("Project", 113, 100);
  drawText(invoiceProjectName(data.employee), 136, 100, 8.5, [22, 93, 100], "bold");
  drawLabel("Omschrijving", 113, 106.5);
  drawText("Maand " + data.period.month, 143, 106.5);

  if (references.length) {
    roundedBox(14, 120, 182, 20, navySoft, null, 3);
    const referenceWidth = 182 / references.length;
    references.forEach(([label, value], index) => {
      const x = 20 + (index * referenceWidth);
      drawLabel(label + ":", x, 128, [169, 198, 192]);
      drawText(value, x, 135, 9, [255, 255, 255], "bold");
    });
  }

  const introY = references.length ? 150 : 124;
  drawText("Beste,", 14, introY, 8.3);
  drawText("Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden.", 14, introY + 6, 8.3);
  const tableY = introY + 16;
  roundedBox(14, tableY, 182, 10, navy, null, 2.5);
  drawText("OMSCHRIJVING", 18, tableY + 6.3, 6.8, [255, 255, 255], "bold");
  drawText("UREN", 132, tableY + 6.3, 6.8, [255, 255, 255], "bold", { align: "right" });
  drawText("TARIEF", 162, tableY + 6.3, 6.8, [255, 255, 255], "bold", { align: "right" });
  drawText("TOTAAL", 191, tableY + 6.3, 6.8, [255, 255, 255], "bold", { align: "right" });
  doc.setFillColor(...background);
  doc.rect(14, tableY + 11, 182, 13, "F");
  drawText("Maand " + data.period.month, 18, tableY + 19, 8.5, ink, "bold");
  drawText(invoiceHours(data.hours), 132, tableY + 19, 8.5, ink, "normal", { align: "right" });
  drawText(invoiceMoney(data.employee.rate), 162, tableY + 19, 8.5, ink, "normal", { align: "right" });
  drawText(invoiceMoney(data.subtotal), 191, tableY + 19, 8.5, ink, "bold", { align: "right" });

  const totalsY = tableY + 37;
  drawLabel("Totaal exclusief", 122, totalsY);
  drawText(invoiceMoney(data.subtotal), 191, totalsY, 9, ink, "bold", { align: "right" });
  drawLabel("BTW " + data.vatRate + " %", 122, totalsY + 8);
  drawText(invoiceMoney(data.vatAmount), 191, totalsY + 8, 9, ink, "bold", { align: "right" });
  doc.setDrawColor(...mint);
  doc.setLineWidth(1.2);
  doc.line(122, totalsY + 13.5, 191, totalsY + 13.5);
  drawText("TOTAAL INCLUSIEF", 122, totalsY + 22, 7, navy, "bold");
  drawText(invoiceMoney(data.total), 191, totalsY + 22, 13, navy, "bold", { align: "right" });

  const paymentY = totalsY + 31;
  roundedBox(14, paymentY, 182, 21, mintLight, null, 3);
  drawLabel("Betalingsinformatie", 20, paymentY + 7);
  drawText("U wordt vriendelijk verzocht uw betaling binnen " + state.settings.paymentTerm + " dagen van de factuurdatum over te maken op rekening:", 20, paymentY + 13, 7.4, [22, 93, 100]);
  drawText(state.settings.iban + " onder vermelding van factuurnummer: " + data.record.invoiceNumber, 20, paymentY + 18, 7.4, [22, 93, 100]);
  drawText("Met vriendelijke groet,", 14, paymentY + 31, 8, ink);
  drawText(state.settings.companyName, 14, paymentY + 38, 9, navy, "bold");

  doc.setFillColor(...navy);
  doc.rect(0, 282, 210, 15, "F");
  drawText("Path-vormgeving  |  Facturerende onderneming: " + state.settings.companyName, 14, 291, 6.2, [221, 233, 230]);
  drawText("CONCEPTVOORBEELD", 196, 291, 6.2, mint, "bold", { align: "right" });
  const filename = "Conceptfactuur_" + safeFilename(data.record.invoiceNumber) + "_" + safeFilename(data.employee.name) + ".pdf";
  doc.save(filename);
  toast("Conceptfactuur als PDF gedownload. Er is niets verstuurd.");
  return true;
}

function showInvoiceDocumentPreview(employeeId) {
  const data = invoiceData(employeeId);
  showModal({
    label: "Factuurvoorbeeld",
    title: data.record.invoiceNumber,
    message: "Controleer het concept. Dit voorbeeld wordt als PDF bijgevoegd bij ontvangers waarvoor Factuur meesturen is aangevinkt.",
    summary: invoicePreviewMarkup(data),
    secondary: "PDF downloaden",
    secondaryAction: () => downloadInvoicePdf(employeeId),
    confirm: "Sluiten",
    wide: true,
    action: closeModal
  });
}

function payrollSummary(employeeId) {
  const employee = employeeById(employeeId);
  const record = recordFor(employee.id);
  const period = currentPeriod();
  const total = totalEntries(record.entries);
  const subject = "Doorgifte uren " + period.month + " " + period.year + " - " + employee.name;
  const body = formatTemplate(employee.mailBody, employee, record.invoiceNumber);
  const payroll = mailRecipientById("payroll") || { name: "EasySalary", email: state.settings.payroll || "" };
  const payrollRoute = mailRecipientRouteFor(employee, "payroll");
  const payrollAttachment = payrollRoute.invoiceAttachment === true ? "Factuur als PDF" : "Geen";
  return {
    employee,
    record,
    period,
    total,
    subject,
    body,
    payroll,
    enabled: payroll.active !== false && payrollRoute.enabled !== false,
    html: "<div><span>Aan</span><strong>" + escapeHtml(payroll.email) + "</strong></div>" +
      "<div><span>Onderwerp</span><strong>" + escapeHtml(subject) + "</strong></div>" +
      "<div><span>Medewerker</span><strong>" + escapeHtml(employee.name) + "</strong></div>" +
      "<div><span>Goedgekeurde uren</span><strong>" + hoursFormat.format(total) + " uur</strong></div>" +
      "<div><span>Bijlagen</span><strong>" + payrollAttachment + "</strong></div>" +
      "<div><span>Tariefgegevens</span><strong>Niet opgenomen</strong></div>"
  };
}

function showPayrollPreview(employeeId, allowTest) {
  const info = payrollSummary(employeeId);
  if (!info.enabled) {
    toast("EasySalary is voor deze medewerker niet aangevinkt.");
    return;
  }
  if (![state.settings.sender, info.payroll.email].every(isValidEmail)) {
    toast("EasySalary-mailtest geblokkeerd: controleer de e-mailadressen.");
    return;
  }
  if (info.record.timesheetStatus !== "approved") {
    toast("EasySalary-mail geblokkeerd: keur de uren eerst goed.");
    return;
  }
  showModal({
    label: "Aparte EasySalary-urenmail",
    title: info.employee.name + " · " + info.period.label,
    message: "Mailtekst:\n\n" + info.body + "\n\nDit is één afzonderlijk bericht. De factuurbijlage volgt de ingestelde route; een urenstaat gaat nooit mee.",
    summary: info.html,
    confirm: allowTest ? "Mailtest uitvoeren" : "Sluiten",
    action: allowTest ? () => {
      info.record.payrollStatus = "simulated";
      persistState();
      closeModal();
      renderAll();
      toast("EasySalary-mail voor " + info.employee.name + " is veilig getest. Er is niets verstuurd.");
    } : closeModal
  });
}

function showEmployeeEditor(employeeId) {
  const existing = employeeId ? employeeById(employeeId) : null;
  const nextId = state.employees.reduce((max, employee) => Math.max(max, employee.id), 0) + 1;
  const employee = existing || {
    id: nextId,
    name: "",
    email: "nieuwe-medewerker@example.invalid",
    active: true,
    startDate: "2026-08-01",
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    invitationPending: false,
    photo: "",
    role: "",
    client: "",
    broker: "",
    brokerEmail: "nieuw-adres@example.invalid",
    invoiceRecipientName: "",
    brokerInvoiceAddress: "",
    invoiceProject: "",
    brokerMailEnabled: true,
    rate: 0,
    contract: "",
    weeklyHours: 0,
    projectCode: "",
    invoiceTemplate: "{klant}-{jaar}-{maand}",
    mailSubject: "Factuur {factuurnummer} - {medewerker} - {maand} {jaar}",
    mailBody: DEFAULT_INVOICE_MAIL_BODY,
    brokerInvoiceAttachment: true,
    bookkeeperInvoiceAttachment: true,
    payrollInvoiceAttachment: false,
    mailRecipientRoutes: defaultMailRecipientRoutes()
  };
  const routeChoices = activeMailRecipients().map(recipient => {
    const preference = mailRecipientRouteFor(employee, recipient.id);
    const enabled = preference.enabled !== false;
    return '<article class="mail-route-choice">' +
      '<div><strong>' + escapeHtml(recipient.name) + '</strong><small>' + escapeHtml(recipient.email) + '</small></div>' +
      '<label class="route-toggle"><input type="checkbox" data-mail-recipient-enabled="' + escapeHtml(recipient.id) + '"' + (enabled ? " checked" : "") + '><span>Ontvangt mail</span></label>' +
      '<label class="route-toggle"><input type="checkbox" data-mail-recipient-invoice="' + escapeHtml(recipient.id) + '"' + (preference.invoiceAttachment === true ? " checked" : "") + (enabled ? "" : " disabled") + '><span>Factuur meesturen</span></label>' +
    '</article>';
  }).join("");
  const summary = '<div class="modal-form">' +
    '<p class="full form-help">Account en contract</p>' +
    '<label>Voor- en achternaam<input id="edit-name" value="' + escapeHtml(employee.name) + '"></label>' +
    '<label>Zakelijk accountadres<input id="edit-account-email" type="email" value="' + escapeHtml(employee.email || "nieuwe-medewerker@example.invalid") + '"></label>' +
    '<label>Functie<input id="edit-role" value="' + escapeHtml(employee.role) + '"></label>' +
    '<label>Startdatum<input id="edit-start-date" type="date" value="' + escapeHtml(employee.startDate || "2026-08-01") + '"></label>' +
    '<label>Contract<input id="edit-contract" value="' + escapeHtml(employee.contract) + '"></label>' +
    '<label>Uren per week<input id="edit-weekly-hours" type="number" min="0" step="0.5" value="' + weeklyHoursFor(employee) + '"></label>' +
    '<p class="full form-help">Opdracht en factuurroute</p>' +
    '<label>Klant<input id="edit-client" value="' + escapeHtml(employee.client) + '"></label>' +
    '<label>Projectcode<input id="edit-project" value="' + escapeHtml(employee.projectCode) + '"></label>' +
    '<label>Broker<input id="edit-broker" value="' + escapeHtml(employee.broker) + '"></label>' +
    '<label>Broker-e-mailadres<input id="edit-broker-email" type="email" value="' + escapeHtml(employee.brokerEmail) + '"></label>' +
    '<label>Naam ontvanger op factuur<input id="edit-invoice-recipient-name" value="' + escapeHtml(employee.invoiceRecipientName || employee.broker || "") + '"></label>' +
    '<label>Factuuradres broker<textarea id="edit-broker-invoice-address" rows="2" placeholder="Straat en huisnummer&#10;Postcode en plaats">' + escapeHtml(employee.brokerInvoiceAddress || "") + '</textarea></label>' +
    '<label>Project op factuur<input id="edit-invoice-project" value="' + escapeHtml(employee.invoiceProject || employee.client || "") + '"></label>' +
    '<label>Factuurtarief<input id="edit-rate" type="number" min="0" step="0.5" value="' + employee.rate + '"></label>' +
    '<label class="full">Onderwerp<input id="edit-subject" value="' + escapeHtml(employee.mailSubject) + '"></label>' +
    '<label class="full">Begeleidende tekst<textarea id="edit-body" rows="5">' + escapeHtml(employee.mailBody) + "</textarea></label>" +
    '<p class="full form-help">Beschikbare velden: {medewerker}, {klant}, {broker}, {maand}, {jaar}, {uren}, {factuurnummer}, {overeenkomstnummer}</p>' +
    '<p class="full form-help">Ontvangers en factuurbijlagen · iedere aangevinkte ontvanger krijgt een aparte mail; een urenstaat wordt nergens toegevoegd</p>' +
    '<div class="mail-route-choice-list full"><article class="mail-route-choice"><div><strong>' + escapeHtml(employee.broker || "Broker") + '</strong><small>' + escapeHtml(employee.brokerEmail) + ' · broker van deze medewerker</small></div><label class="route-toggle"><input id="edit-broker-enabled" type="checkbox"' + (employee.brokerMailEnabled !== false ? " checked" : "") + '><span>Ontvangt mail</span></label><label class="route-toggle"><input id="edit-broker-invoice" type="checkbox"' + (employee.brokerInvoiceAttachment !== false ? " checked" : "") + (employee.brokerMailEnabled !== false ? "" : " disabled") + '><span>Factuur meesturen</span></label></article>' + routeChoices + '</div>' +
    '<p class="full form-help">Boekhouder, EasySalary en extra ontvangers beheer je één keer onder Instellingen. Hier vink je per medewerker aan wie de mail krijgt.</p>' +
    '<label class="check-row full"><input id="edit-notifications" type="checkbox"' + (employee.notificationsEnabled !== false ? " checked" : "") + '><span>Urenherinneringen en statusmeldingen activeren</span></label>' +
    '<label class="check-row full"><input id="edit-email-notifications" type="checkbox"' + (employee.emailNotificationsEnabled !== false ? " checked" : "") + '><span>Aanvullende e-mailmeldingen activeren (in-app berichten blijven altijd zichtbaar)</span></label>' +
    (!existing ? '<label class="check-row"><input id="edit-invite" type="checkbox" checked><span>Uitnodiging klaarzetten (demo verstuurt niets)</span></label><label class="check-row"><input id="edit-add-another" type="checkbox"><span>Hierna nog iemand toevoegen</span></label>' : "") +
    "</div>";
  showModal({
    label: existing ? "Medewerker aanpassen" : "Medewerker toevoegen",
    title: employee.name || "Nieuwe medewerker",
    message: "Persoons-, contract- en opdrachtgegevens worden lokaal in deze browser bewaard. Je mag ieder geldig account- en brokeradres invullen; de demo verstuurt niets.",
    summary,
    confirm: "Lokaal opslaan",
    wide: true,
    action: () => {
      const brokerEmailInput = document.querySelector("#edit-broker-email");
      const accountEmailInput = document.querySelector("#edit-account-email");
      const nameInput = document.querySelector("#edit-name");
      [brokerEmailInput, accountEmailInput, nameInput].forEach(input => input.classList.remove("is-invalid"));
      if (!nameInput.value.trim() || !isValidEmail(brokerEmailInput.value) || !isValidEmail(accountEmailInput.value)) {
        if (!nameInput.value.trim()) nameInput.classList.add("is-invalid");
        if (!isValidEmail(brokerEmailInput.value)) brokerEmailInput.classList.add("is-invalid");
        if (!isValidEmail(accountEmailInput.value)) accountEmailInput.classList.add("is-invalid");
        toast("Vul een naam en geldige account- en brokeradressen in.");
        return;
      }
      const mailRecipientRoutes = Object.assign({}, employee.mailRecipientRoutes || {});
      document.querySelectorAll("[data-mail-recipient-enabled]").forEach(input => {
        const id = input.dataset.mailRecipientEnabled;
        const invoiceInput = [...document.querySelectorAll("[data-mail-recipient-invoice]")].find(item => item.dataset.mailRecipientInvoice === id);
        mailRecipientRoutes[id] = { enabled: input.checked, invoiceAttachment: input.checked && Boolean(invoiceInput && invoiceInput.checked) };
      });
      const updated = Object.assign({}, employee, {
        name: nameInput.value.trim(),
        email: accountEmailInput.value.trim(),
        startDate: document.querySelector("#edit-start-date").value,
        notificationsEnabled: document.querySelector("#edit-notifications").checked,
        emailNotificationsEnabled: document.querySelector("#edit-email-notifications").checked,
        role: document.querySelector("#edit-role").value.trim(),
        client: document.querySelector("#edit-client").value.trim(),
        projectCode: document.querySelector("#edit-project").value.trim(),
        broker: document.querySelector("#edit-broker").value.trim(),
        brokerEmail: brokerEmailInput.value.trim(),
        invoiceRecipientName: document.querySelector("#edit-invoice-recipient-name").value.trim(),
        brokerInvoiceAddress: document.querySelector("#edit-broker-invoice-address").value.trim(),
        invoiceProject: document.querySelector("#edit-invoice-project").value.trim(),
        brokerMailEnabled: document.querySelector("#edit-broker-enabled").checked,
        rate: Number(document.querySelector("#edit-rate").value) || 0,
        contract: document.querySelector("#edit-contract").value.trim(),
        weeklyHours: Number(document.querySelector("#edit-weekly-hours").value) || 0,
        mailSubject: document.querySelector("#edit-subject").value.trim(),
        mailBody: document.querySelector("#edit-body").value,
        brokerInvoiceAttachment: document.querySelector("#edit-broker-enabled").checked && document.querySelector("#edit-broker-invoice").checked,
        bookkeeperInvoiceAttachment: mailRecipientRoutes.bookkeeper ? mailRecipientRoutes.bookkeeper.invoiceAttachment === true : true,
        payrollInvoiceAttachment: mailRecipientRoutes.payroll ? mailRecipientRoutes.payroll.invoiceAttachment === true : false,
        mailRecipientRoutes
      });
      if (existing) {
        state.employees[state.employees.findIndex(item => item.id === existing.id)] = updated;
      } else {
        updated.active = true;
        updated.invitationPending = document.querySelector("#edit-invite").checked;
        state.employees.push(updated);
        const period = currentPeriod();
        state.records[period.key][String(updated.id)] = makeRecord(
          0,
          defaultContractHours(updated, period.key),
          "draft",
          "concept",
          invoiceNumberFor(updated.id, period.key),
          period.key
        );
      }
      persistState();
      const addAnother = !existing && document.querySelector("#edit-add-another").checked;
      closeModal();
      renderAll();
      populateSettings();
      toast("Medewerker en eigen urenaccount zijn lokaal opgeslagen. Er is niets gemaild.");
      if (addAnother) showEmployeeEditor(null);
    }
  });
  document.querySelectorAll("[data-mail-recipient-enabled]").forEach(input => input.addEventListener("change", () => {
    const invoiceInput = [...document.querySelectorAll("[data-mail-recipient-invoice]")].find(item => item.dataset.mailRecipientInvoice === input.dataset.mailRecipientEnabled);
    if (invoiceInput) {
      invoiceInput.disabled = !input.checked;
      if (!input.checked) invoiceInput.checked = false;
    }
  }));
  const brokerEnabledInput = document.querySelector("#edit-broker-enabled");
  const brokerInvoiceInput = document.querySelector("#edit-broker-invoice");
  brokerEnabledInput.addEventListener("change", () => {
    brokerInvoiceInput.disabled = !brokerEnabledInput.checked;
    if (!brokerEnabledInput.checked) brokerInvoiceInput.checked = false;
  });
}

function showAdminEditor(adminId) {
  const existing = adminId ? adminById(adminId) : null;
  const admin = existing || { id: "admin-" + (state.admins.length + 1), name: "", email: "nieuwe-beheerder@example.invalid", active: true, emailNotificationsEnabled: true, photo: "" };
  const summary = '<div class="modal-form"><label>Voor- en achternaam<input id="edit-admin-name" value="' + escapeHtml(admin.name) + '"></label><label>Zakelijk accountadres<input id="edit-admin-email" type="email" value="' + escapeHtml(admin.email) + '"></label><label class="check-row full"><input id="edit-admin-notifications" type="checkbox" checked><span>Meldingen over ingediende uren en facturen ontvangen</span></label><p class="full form-help">De demo bewaart het account lokaal en verstuurt geen uitnodiging. In productie krijgt deze persoon toegang via Google Workspace.</p></div>';
  showModal({
    label: existing ? "Beheerder aanpassen" : "Beheerder toevoegen",
    title: admin.name || "Nieuwe beheerder",
    message: "Beheerders kunnen uren controleren, medewerkers beheren en factuurgegevens bekijken.",
    summary,
    confirm: "Beheerder opslaan",
    wide: true,
    action: () => {
      const name = document.querySelector("#edit-admin-name");
      const email = document.querySelector("#edit-admin-email");
      [name, email].forEach(input => input.classList.remove("is-invalid"));
      if (!name.value.trim() || !isValidEmail(email.value)) {
        if (!name.value.trim()) name.classList.add("is-invalid");
        if (!isValidEmail(email.value)) email.classList.add("is-invalid");
        toast("Vul een naam en een geldig accountadres in.");
        return;
      }
      const updated = Object.assign({}, admin, { name: name.value.trim(), email: email.value.trim(), active: admin.active !== false, emailNotificationsEnabled: document.querySelector("#edit-admin-notifications").checked });
      if (existing) state.admins[state.admins.findIndex(item => item.id === existing.id)] = updated;
      else state.admins.push(updated);
      persistState();
      closeModal();
      renderAll();
      toast("Beheerder lokaal opgeslagen. Er is geen uitnodiging verstuurd.");
    }
  });
}

function toggleEmployeeStatus(employeeId) {
  const employee = employeeById(employeeId);
  const active = employee.active !== false;
  showModal({
    label: active ? "Medewerker deactiveren" : "Medewerker activeren",
    title: (active ? "Toegang stoppen voor " : "Toegang herstellen voor ") + employee.name + "?",
    message: active ? "De medewerker kan niet meer inloggen en krijgt geen herinneringen. Alle oude uren, goedkeuringen en facturen blijven bewaard." : "De medewerker kan weer inloggen en nieuwe maanden invullen. De volledige historie is nog aanwezig.",
    summary: "<div><span>Historie</span><strong>Blijft bewaard</strong></div><div><span>Facturen</span><strong>Blijven bewaard</strong></div><div><span>Toegang</span><strong>" + (active ? "Wordt gestopt" : "Wordt hersteld") + "</strong></div>",
    confirm: active ? "Deactiveren" : "Opnieuw activeren",
    action: () => {
      employee.active = !active;
      persistState();
      closeModal();
      renderAll();
      toast(employee.name + (active ? " is gedeactiveerd; de historie is bewaard." : " is opnieuw actief."));
    }
  });
}

function toggleAdminStatus(adminId) {
  const admin = adminById(adminId);
  const current = currentAdmin();
  const active = admin.active !== false;
  if (current && admin.id === current.id) {
    toast("Je kunt je eigen actieve beheerdersaccount niet deactiveren.");
    return;
  }
  if (active && activeAdmins().length <= 1) {
    toast("De laatste actieve beheerder kan niet worden gedeactiveerd.");
    return;
  }
  showModal({
    label: active ? "Beheerder deactiveren" : "Beheerder activeren",
    title: (active ? "Toegang stoppen voor " : "Toegang herstellen voor ") + admin.name + "?",
    message: "De audit- en wijzigingshistorie blijft altijd bewaard.",
    summary: "<div><span>Historie</span><strong>Blijft bewaard</strong></div><div><span>Beheerderstoegang</span><strong>" + (active ? "Wordt gestopt" : "Wordt hersteld") + "</strong></div>",
    confirm: active ? "Deactiveren" : "Activeren",
    action: () => {
      admin.active = !active;
      persistState();
      closeModal();
      renderAll();
      toast(admin.name + (active ? " is gedeactiveerd." : " is opnieuw actief."));
    }
  });
}

function showProfileEditor() {
  const profile = currentProfileData();
  pendingProfilePhoto = profile.photo || "";
  const summary = '<div class="profile-editor"><span class="profile-photo-preview" id="profile-photo-preview">' + escapeHtml(initials(profile.name)) + '</span><div class="profile-editor-copy"><strong>' + escapeHtml(profile.name) + '</strong><small>' + escapeHtml(profile.email) + '<br>' + escapeHtml(profile.label) + '</small><div class="profile-photo-control"><label>Profielfoto voor deze demo<input id="profile-photo-input" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="small-button" type="button" id="remove-profile-photo">Foto verwijderen</button></div></div></div><div class="modal-form" style="margin-top:18px"><label>Naam<input value="' + escapeHtml(profile.name) + '" disabled></label><label>Zakelijk e-mailadres<input value="' + escapeHtml(profile.email) + '" disabled></label><p class="full form-help">Naam en e-mailadres worden in productie beheerd door Google Workspace. Een gekozen demofoto blijft alleen in deze browser.</p></div>';
  showModal({
    label: "Mijn profiel",
    title: profile.name,
    message: "Bekijk je accountgegevens en kies desgewenst een lokale demofoto.",
    summary,
    confirm: "Profiel opslaan",
    wide: true,
    action: () => {
      profile.source.photo = pendingProfilePhoto;
      persistState();
      closeModal();
      renderAll();
      toast("Profiel is lokaal opgeslagen.");
    }
  });
  applyAvatar(document.querySelector("#profile-photo-preview"), profile.name, pendingProfilePhoto);
  document.querySelector("#profile-photo-input").addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 700000) {
      toast("Kies een PNG, JPG of WebP kleiner dan 700 KB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      pendingProfilePhoto = String(reader.result || "");
      applyAvatar(document.querySelector("#profile-photo-preview"), profile.name, pendingProfilePhoto);
    });
    reader.readAsDataURL(file);
  });
  document.querySelector("#remove-profile-photo").addEventListener("click", () => {
    pendingProfilePhoto = "";
    document.querySelector("#profile-photo-input").value = "";
    applyAvatar(document.querySelector("#profile-photo-preview"), profile.name, "");
  });
}

function showPreferences() {
  const profile = currentProfileData();
  const adminRows = state.currentRole === "admin" ? '<div class="preference-row"><span><strong>Ingediende uren</strong><small>Melding zodra uren ter controle klaarstaan</small></span><input id="pref-approvals" aria-label="Meldingen over ingediende uren" type="checkbox"' + (state.preferences.approvalNotifications ? " checked" : "") + '></div><div class="preference-row"><span><strong>Facturen klaar</strong><small>Melding na het goedkeuren van uren</small></span><input id="pref-invoices" aria-label="Meldingen over facturen" type="checkbox"' + (state.preferences.invoiceNotifications ? " checked" : "") + '></div>' : '<div class="preference-row"><span><strong>Urenherinneringen</strong><small>Maandag en rond de maandafsluiting</small></span><input id="pref-hours" aria-label="Urenherinneringen" type="checkbox"' + (state.preferences.hourReminders ? " checked" : "") + '></div><div class="preference-row"><span><strong>Statuswijzigingen</strong><small>Correctie nodig en goedkeuring</small></span><input id="pref-status" aria-label="Statusmeldingen" type="checkbox"' + (state.preferences.statusNotifications ? " checked" : "") + '></div>';
  const emailRow = '<div class="preference-row"><span><strong>Aanvullende e-mailmeldingen</strong><small>Uit: meldingen blijven wel in de app zichtbaar</small></span><input id="pref-email-notifications" aria-label="Aanvullende e-mailmeldingen" type="checkbox"' + (profile.source.emailNotificationsEnabled !== false ? " checked" : "") + '></div>';
  const summary = '<div class="preference-list"><div class="preference-row"><span><strong>Uiterlijk</strong><small>Licht is standaard; Automatisch volgt je apparaat</small></span><select id="pref-theme" aria-label="Uiterlijk"><option value="light">Licht</option><option value="system">Automatisch</option><option value="dark">Donker</option></select></div>' + adminRows + emailRow + '</div>';
  showModal({
    label: "Voorkeuren",
    title: "Uiterlijk en meldingen",
    message: "Deze voorkeuren worden in de demo alleen in deze browser bewaard.",
    summary,
    confirm: "Voorkeuren opslaan",
    action: () => {
      state.preferences.theme = document.querySelector("#pref-theme").value;
      profile.source.emailNotificationsEnabled = document.querySelector("#pref-email-notifications").checked;
      if (state.currentRole === "admin") {
        state.preferences.approvalNotifications = document.querySelector("#pref-approvals").checked;
        state.preferences.invoiceNotifications = document.querySelector("#pref-invoices").checked;
      } else {
        state.preferences.hourReminders = document.querySelector("#pref-hours").checked;
        state.preferences.statusNotifications = document.querySelector("#pref-status").checked;
      }
      persistState();
      closeModal();
      applyTheme();
      renderNotifications();
      toast("Voorkeuren zijn opgeslagen.");
    }
  });
  document.querySelector("#pref-theme").value = state.preferences.theme;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("click", event => {
  const notificationButton = event.target.closest("#notification-button");
  if (notificationButton) toggleTopbarPopover("notification-panel", "notification-button");

  const profileButton = event.target.closest("#profile-menu-button");
  if (profileButton) toggleTopbarPopover("profile-menu", "profile-menu-button");

  if (!event.target.closest(".topbar-popover") && !notificationButton && !profileButton) closeTopbarPopovers();

  const profileAction = event.target.closest("[data-profile-action]");
  if (profileAction) {
    closeTopbarPopovers();
    if (profileAction.dataset.profileAction === "profile") showProfileEditor();
    if (profileAction.dataset.profileAction === "preferences") showPreferences();
    if (profileAction.dataset.profileAction === "help") openHelp();
    if (["switch", "logout"].includes(profileAction.dataset.profileAction)) logout();
  }

  const notificationItem = event.target.closest("[data-notification-id]");
  if (notificationItem) {
    const item = state.notifications.find(notification => Number(notification.id) === Number(notificationItem.dataset.notificationId));
    if (item) {
      item.read = true;
      if (item.periodKey) setPeriod(item.periodKey);
      const targetView = state.currentRole === "employee" && item.announcementId ? "employee-announcements" : item.view;
      showView(targetView || profileForRole(state.currentRole).home);
      persistState();
      renderNotifications();
      renderEmployeeAnnouncementArchive();
      closeTopbarPopovers();
    }
  }

  const testNotification = event.target.closest("[data-test-notification]");
  if (testNotification) createTestNotification(testNotification.dataset.testNotification);

  const loginChoice = event.target.closest("[data-login-role]");
  if (loginChoice) login(loginChoice.dataset.loginRole);

  const home = event.target.closest("[data-home]");
  if (home) {
    event.preventDefault();
    const profile = profileForRole(state.currentRole);
    showView(profile ? profile.home : "dashboard");
  }

  const nav = event.target.closest("[data-view]");
  if (nav) showView(nav.dataset.view);

  const go = event.target.closest("[data-go]");
  if (go) showView(go.dataset.go);

  const dashboardView = event.target.closest("[data-dashboard-view]");
  if (dashboardView) showView(dashboardView.dataset.dashboardView);

  const scrollTarget = event.target.closest("[data-scroll-target]");
  if (scrollTarget) {
    const target = document.getElementById(scrollTarget.dataset.scrollTarget);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const historyPeriod = event.target.closest("[data-history-period]");
  if (historyPeriod) {
    setPeriod(historyPeriod.dataset.historyPeriod);
    showView("timesheet");
  }

  const employeeScope = event.target.closest("[data-employee-scope]");
  if (employeeScope) {
    state.employeeScope = employeeScope.dataset.employeeScope;
    persistState();
    renderEmployees();
  }

  const announcementArchiveFilter = event.target.closest("[data-announcement-archive-filter]");
  if (announcementArchiveFilter) {
    state.announcementArchiveFilter = announcementArchiveFilter.dataset.announcementArchiveFilter;
    persistState();
    renderEmployeeAnnouncementArchive();
  }

  const approvalScope = event.target.closest("[data-approval-scope]");
  if (approvalScope) {
    state.approvalScope = approvalScope.dataset.approvalScope;
    persistState();
    renderApprovals();
  }

  const detail = event.target.closest("[data-employee-detail]");
  if (detail) showEmployeeEditor(Number(detail.dataset.employeeDetail));

  const editRouting = event.target.closest("[data-edit-routing]");
  if (editRouting) showEmployeeEditor(Number(editRouting.dataset.editRouting));

  const editMailRecipient = event.target.closest("[data-edit-mail-recipient]");
  if (editMailRecipient) showMailRecipientEditor(editMailRecipient.dataset.editMailRecipient);

  const toggleMailRecipientButton = event.target.closest("[data-toggle-mail-recipient]");
  if (toggleMailRecipientButton) toggleMailRecipient(toggleMailRecipientButton.dataset.toggleMailRecipient);

  const deleteMailRecipientButton = event.target.closest("[data-delete-mail-recipient]");
  if (deleteMailRecipientButton) showDeleteMailRecipient(deleteMailRecipientButton.dataset.deleteMailRecipient);

  const toggleEmployee = event.target.closest("[data-toggle-employee]");
  if (toggleEmployee) toggleEmployeeStatus(Number(toggleEmployee.dataset.toggleEmployee));

  const editAdmin = event.target.closest("[data-edit-admin]");
  if (editAdmin) showAdminEditor(editAdmin.dataset.editAdmin);

  const toggleAdmin = event.target.closest("[data-toggle-admin]");
  if (toggleAdmin && !toggleAdmin.disabled) toggleAdminStatus(toggleAdmin.dataset.toggleAdmin);

  const helpTopic = event.target.closest("[data-help-topic]");
  if (helpTopic) answerHelpQuestion("", helpTopic.dataset.helpTopic);

  const helpView = event.target.closest("[data-help-view]");
  if (helpView) {
    closeHelp();
    showView(helpView.dataset.helpView);
  }

  const copySupport = event.target.closest("[data-copy-support]");
  if (copySupport) copyText(copySupport.dataset.copySupport);

  const requestCorrection = event.target.closest("[data-request-correction]");
  if (requestCorrection) {
    showCorrectionEditor(Number(requestCorrection.dataset.requestCorrection), requestCorrection.dataset.periodKey);
  }

  const correctAnnouncement = event.target.closest("[data-correct-announcement]");
  if (correctAnnouncement) showAnnouncementEditor(Number(correctAnnouncement.dataset.correctAnnouncement));

  const editAnnouncement = event.target.closest("[data-edit-announcement]");
  if (editAnnouncement) showAnnouncementEditor(null, Number(editAnnouncement.dataset.editAnnouncement));

  const deleteAnnouncementDraft = event.target.closest("[data-delete-announcement-draft]");
  if (deleteAnnouncementDraft) showDeleteAnnouncementDraft(Number(deleteAnnouncementDraft.dataset.deleteAnnouncementDraft));

  const withdrawAnnouncement = event.target.closest("[data-withdraw-announcement]");
  if (withdrawAnnouncement) showAnnouncementWithdrawal(Number(withdrawAnnouncement.dataset.withdrawAnnouncement));

  const readAnnouncement = event.target.closest("[data-read-announcement]");
  if (readAnnouncement && state.currentRole === "employee") {
    announcementNotificationsFor(currentEmployee().id, Number(readAnnouncement.dataset.readAnnouncement)).forEach(item => { item.read = true; });
    persistState();
    renderNotifications();
    renderEmployeeAnnouncementArchive();
    toast("Mededeling als gelezen gemarkeerd.");
  }

  const review = event.target.closest("[data-review]");
  if (review) {
    const employee = employeeById(review.dataset.review);
    const periodKey = review.dataset.periodKey || currentPeriod().key;
    const period = periodFromKey(periodKey);
    const record = recordFor(employee.id, periodKey);
    const total = totalEntries(record.entries);
    showModal({
      label: "Urencontrole",
      title: "Controleer " + employee.name,
      message: "Controleer de uren en het tarief voor " + period.label + ".",
      summary: "<div><span>Maand</span><strong>" + escapeHtml(period.label) + "</strong></div><div><span>Declarabel</span><strong>" + hoursFormat.format(total) + " uur</strong></div><div><span>Tarief</span><strong>" + currency.format(employee.rate) + " per uur</strong></div><div><span>Verwacht factuurbedrag</span><strong>" + currency.format(total * employee.rate) + "</strong></div>",
      secondary: "Terugsturen voor correctie",
      secondaryAction: () => showCorrectionEditor(employee.id, periodKey),
      confirm: "Goedkeuren",
      action: () => {
        closeModal();
        approveEmployee(employee.id, periodKey);
      }
    });
  }

  const approve = event.target.closest("[data-approve]");
  if (approve) approveEmployee(Number(approve.dataset.approve), approve.dataset.periodKey);

  const simulate = event.target.closest("[data-simulate-invoice]");
  if (simulate) {
    const info = invoiceSummary(Number(simulate.dataset.simulateInvoice));
    const safe = [state.settings.sender, ...info.routes.map(route => route.email)].every(isValidEmail);
    if (!safe) {
      toast("Verzendtest geblokkeerd: minimaal één e-mailadres is ongeldig.");
      return;
    }
    const routeText = info.routes.map(route => route.name + ": " + (route.invoiceAttachment ? "factuur als PDF" : "geen bijlage") + ".").join("\n");
    showModal({
      label: "Veilige verzendtest",
      title: info.record.invoiceNumber + " testen?",
      message: "Begeleidende tekst voor ieder afzonderlijk bericht:\n\n" + info.body + "\n\n" + routeText + "\nUrenstaat: niet toegevoegd.\n\nEr wordt geen CC of BCC gebruikt. Deze test verstuurt geen e-mail.",
      summary: info.html,
      confirm: "Verzending testen",
      action: () => {
        info.record.invoiceStatus = "simulated";
        info.record.payrollStatus = "simulated";
        persistState();
        closeModal();
        renderAll();
        toast("Verzendtest voltooid. Er is niets verstuurd.");
      }
    });
  }

  const previewInvoicePdf = event.target.closest("[data-preview-invoice-pdf]");
  if (previewInvoicePdf) showInvoiceDocumentPreview(Number(previewInvoicePdf.dataset.previewInvoicePdf));

  const viewInvoice = event.target.closest("[data-view-invoice]");
  if (viewInvoice) {
    const info = invoiceSummary(Number(viewInvoice.dataset.viewInvoice));
    let message = "De factuur kan worden gecontroleerd.";
    if (info.record.timesheetStatus === "draft") message = "De uren zijn nog niet ingediend. Daarom is deze factuur nog niet klaar.";
    if (info.record.timesheetStatus === "submitted") message = "De uren wachten op goedkeuring. Daarna wordt de factuur klaargezet.";
    if (info.record.invoiceStatus === "simulated") message = "De verzendtest is uitgevoerd. Er is niets verstuurd.";
    showModal({
      label: "Demo-factuur",
      title: info.record.invoiceNumber,
      message,
      summary: info.html,
      confirm: "Sluiten",
      action: closeModal
    });
  }

  const simulatePayroll = event.target.closest("[data-simulate-payroll]");
  if (simulatePayroll) showPayrollPreview(Number(simulatePayroll.dataset.simulatePayroll), true);

  const viewPayroll = event.target.closest("[data-view-payroll]");
  if (viewPayroll) showPayrollPreview(Number(viewPayroll.dataset.viewPayroll), false);
});

document.querySelector("#hours-grid").addEventListener("input", () => updateHoursTotal(true));

function handleEnterSave(event) {
  if (event.key !== "Enter" || event.isComposing || event.repeat) return;
  const target = event.target;
  if (!target || typeof target.matches !== "function") return;

  if (target.id === "login-admin") {
    event.preventDefault();
    state.currentAdminId = String(target.value);
    updateLoginAdminPreview();
    persistState();
    login("admin");
    return;
  }

  if (target.id === "login-employee") {
    event.preventDefault();
    state.currentEmployeeId = Number(target.value);
    updateLoginEmployeePreview();
    persistState();
    login("employee");
    return;
  }

  if (target.matches("#hours-grid .hours-input")) {
    event.preventDefault();
    const inputs = [...document.querySelectorAll("#hours-grid .hours-input:not([disabled])")];
    const next = inputs[inputs.indexOf(target) + 1];
    updateHoursTotal(true);
    if (next) {
      next.focus();
      next.select();
    } else {
      target.blur();
    }
    toast("Uren voor " + currentPeriod().label + " zijn tussentijds opgeslagen.");
    return;
  }

  if (target.matches(".summary-hours-input")) {
    event.preventDefault();
    updateHoursTotal(true);
    target.blur();
    toast("Verlof en ziekte voor " + currentPeriod().label + " zijn tussentijds opgeslagen.");
    return;
  }

  const isTextArea = target.matches("textarea");
  if (isTextArea && !event.ctrlKey && !event.metaKey) return;

  if (target.closest("#view-settings") && target.matches("input:not([type='checkbox']):not([type='radio']), select")) {
    event.preventDefault();
    saveSettings();
    return;
  }

  if (target.closest(".modal-form") && target.matches("input, select, textarea")) {
    event.preventDefault();
    document.querySelector("#modal-confirm").click();
  }
}

document.querySelector("#submit-timesheet").addEventListener("click", () => {
  const employee = currentEmployee();
  const record = recordFor(employee.id);
  const correction = activeCorrection(record);
  if (correction) {
    const resubmittedAt = correctionTimestamp();
    correction.resubmittedAt = resubmittedAt.label;
    correction.resubmittedAtIso = resubmittedAt.iso;
  }
  record.timesheetStatus = "submitted";
  record.invoiceStatus = "concept";
  record.payrollStatus = "concept";
  addNotification({ audience: "admin", type: "submitted", employeeId: employee.id, title: "Uren ingediend", message: employee.name + " heeft " + currentPeriod().label + " ingediend.", periodKey: currentPeriod().key, view: "approvals" });
  addNotification({ audience: "employee", type: "submitted", employeeId: employee.id, title: "Uren wachten op controle", message: "Je uren voor " + currentPeriod().label + " zijn ingediend.", periodKey: currentPeriod().key, view: "employee-dashboard" });
  persistState();
  renderAll();
  toast("Uren zijn lokaal ingediend voor " + currentPeriod().label + ".");
});

document.querySelector("#approve-all").addEventListener("click", () => {
  const open = allOpenApprovals().filter(item => state.approvalScope === "all" || item.periodKey === currentPeriod().key);
  const monthCount = new Set(open.map(item => item.periodKey)).size;
  showModal({
    title: "Alle openstaande uren goedkeuren?",
    message: "Dit geldt voor alle maanden die in het overzicht staan. De bijbehorende facturen worden per maand klaargezet.",
    summary: "<div><span>Openstaande registraties</span><strong>" + open.length + "</strong></div><div><span>Maanden</span><strong>" + monthCount + "</strong></div><div><span>E-mail</span><strong>Uitgeschakeld</strong></div>",
    confirm: "Alles goedkeuren",
    action: () => {
      open.forEach(item => {
        item.record.timesheetStatus = "approved";
        item.record.invoiceStatus = "ready";
        item.record.payrollStatus = "ready";
        addNotification({ audience: "employee", type: "approved", employeeId: item.employee.id, title: "Uren goedgekeurd", message: "Je uren voor " + item.period.label + " zijn goedgekeurd.", periodKey: item.periodKey, view: "employee-dashboard" });
      });
      persistState();
      closeModal();
      renderAll();
      toast("Alle openstaande uren uit " + monthCount + (monthCount === 1 ? " maand" : " maanden") + " zijn goedgekeurd.");
    }
  });
});

document.querySelectorAll("[data-invoice-filter]").forEach(button => button.addEventListener("click", () => {
  state.invoiceFilter = button.dataset.invoiceFilter;
  document.querySelectorAll("[data-invoice-filter]").forEach(item => item.classList.toggle("is-active", item === button));
  renderInvoices();
}));

document.querySelector("#open-payroll").addEventListener("click", () => showView("payroll"));
document.querySelector("#open-payroll-from-invoices").addEventListener("click", () => showView("payroll"));
document.querySelector("#back-to-invoices").addEventListener("click", () => showView("invoices"));

document.querySelector("#test-month-delivery").addEventListener("click", () => {
  const approved = state.employees
    .map(employee => ({ employee, record: recordFor(employee.id) }))
    .filter(item => item.record.timesheetStatus === "approved")
    .filter(item => item.record.invoiceStatus !== "simulated" || item.record.payrollStatus !== "simulated");
  if (!approved.length) {
    toast("Er staat geen goedgekeurde maandverzending meer klaar.");
    return;
  }
  const allRoutes = approved.flatMap(item => deliveryRoutesFor(item.employee));
  const safeAddresses = [state.settings.sender, ...allRoutes.map(route => route.email)];
  if (!safeAddresses.every(isValidEmail)) {
    toast("Maandverzending geblokkeerd: controleer de e-mailadressen.");
    return;
  }
  const routeCounters = new Map();
  allRoutes.forEach(route => {
    const counter = routeCounters.get(route.id) || { name: route.name, messages: 0, invoices: 0 };
    counter.messages += 1;
    if (route.invoiceAttachment) counter.invoices += 1;
    routeCounters.set(route.id, counter);
  });
  const routeSummary = [...routeCounters.values()].map(counter => "<div><span>" + escapeHtml(counter.name) + "</span><strong>" + counter.messages + " bericht" + (counter.messages === 1 ? "" : "en") + " · " + counter.invoices + " met factuur</strong></div>").join("");
  showModal({
    label: "Eén knop · gescheiden routes",
    title: "Maandverzending voor " + currentPeriod().label + " klaarzetten?",
    message: "Na één bevestiging maakt de demo per medewerker een afzonderlijk bericht voor iedere aangevinkte ontvanger, met naam, maand en daadwerkelijke goedgekeurde uren. De factuur gaat alleen mee waar Factuur meesturen is aangevinkt. Een urenstaat gaat nooit mee. Er wordt geen CC of BCC gebruikt en er gaat niets echt naar buiten.",
    summary: routeSummary + "<div><span>Urenstaat</span><strong>Nooit toegevoegd; uren staan in de tekst</strong></div>",
    confirm: "Alles veilig testen",
    action: () => {
      approved.forEach(item => {
        item.record.invoiceStatus = "simulated";
        item.record.payrollStatus = "simulated";
      });
      persistState();
      closeModal();
      renderAll();
      toast("Maandverzending veilig getest: afzonderlijke berichten per ontvanger, niets verstuurd.");
    }
  });
});

document.querySelector("#download-invoice-list").addEventListener("click", () => {
  const period = currentPeriod();
  downloadCsv("Path_demo_factuuroverzicht_" + period.key + ".csv", [
    ["Factuurnummer", "Medewerker", "Klant", "Broker", "Demo-adres", "Uren", "Bedrag excl. btw", "Status"],
    ...state.employees.map(employee => {
      const record = recordFor(employee.id);
      return [record.invoiceNumber, employee.name, employee.client, employee.broker, employee.brokerEmail, hoursFormat.format(totalEntries(record.entries)), (totalEntries(record.entries) * employee.rate).toFixed(2), invoiceStatusInfo(record)[0]];
    })
  ]);
  toast("Het demo-factuuroverzicht is gedownload.");
});

function setPeriod(periodKey) {
  const parsed = parsePeriodKey(periodKey);
  if (!parsed || parsed.year < 1 || parsed.year > 9999) return false;
  const next = makePeriodKey(parsed.year, parsed.monthIndex);
  const approvalsVisible = document.querySelector("#view-approvals").classList.contains("is-active");
  if (next === state.selectedPeriodKey) {
    if (approvalsVisible && state.approvalScope !== "month") {
      state.approvalScope = "month";
      persistState();
      renderApprovals();
    }
    return true;
  }
  state.selectedPeriodKey = next;
  if (approvalsVisible) state.approvalScope = "month";
  ensurePeriodRecords(next);
  state.invoiceFilter = "all";
  document.querySelectorAll("[data-invoice-filter]").forEach(button => button.classList.toggle("is-active", button.dataset.invoiceFilter === "all"));
  persistState();
  renderAll();
  toast("Periode gewijzigd naar " + currentPeriod().label + " voor beide rollen.");
  return true;
}

function changePeriod(delta) {
  setPeriod(shiftPeriodKey(state.selectedPeriodKey, delta));
}

document.querySelector("#period-prev").addEventListener("click", () => changePeriod(-1));
document.querySelector("#period-next").addEventListener("click", () => changePeriod(1));
document.querySelector("#period-picker").addEventListener("change", event => {
  if (!setPeriod(event.target.value)) {
    event.target.value = currentPeriod().key;
    toast("Kies een geldige maand en een viercijferig jaar.");
  }
});
document.querySelector("#login-employee").addEventListener("change", event => {
  state.currentEmployeeId = Number(event.target.value);
  updateLoginEmployeePreview();
  persistState();
});
document.querySelector("#login-admin").addEventListener("change", event => {
  state.currentAdminId = String(event.target.value);
  updateLoginAdminPreview();
  persistState();
});
document.querySelector("#add-employee").addEventListener("click", () => showEmployeeEditor(null));
document.querySelector("#add-admin").addEventListener("click", () => showAdminEditor(null));
document.querySelector("#add-announcement").addEventListener("click", () => showAnnouncementEditor(null, null));
document.querySelector("#add-mail-recipient").addEventListener("click", () => showMailRecipientEditor(null));
document.querySelector("#save-settings").addEventListener("click", saveSettings);
document.querySelectorAll(".summary-hours-input").forEach(input => input.addEventListener("input", () => updateHoursTotal(true)));

document.querySelector("#reset-demo").addEventListener("click", () => showModal({
  label: "Demo herstellen",
  title: "Alle lokale wijzigingen wissen?",
  message: "Hiermee worden alleen de wijzigingen in deze browser hersteld. Er zijn geen externe gegevens.",
  confirm: "Demo herstellen",
  action: () => {
    const role = state.currentRole || "admin";
    state = freshState();
    state.currentRole = role;
    window.localStorage.removeItem(STORAGE_KEY);
    persistState();
    closeModal();
    populateSettings();
    renderAll();
    showView(profileForRole(role).home);
    toast("De veilige demo is hersteld.");
  }
}));

document.querySelector("#connect-gmail").addEventListener("click", () => showModal({
  label: "Veilige demo",
  title: "Gmail is bewust uitgeschakeld",
  message: "Deze versie bevat geen Gmail-koppeling. Je mag ieder geldig e-mailadres invoeren, maar de app bewaart dit alleen lokaal en kan niets echt verzenden. Productieverzending bouwen we later als aparte, beveiligde stap.",
  summary: "<div><span>Verzendmodus</span><strong>Alleen lokaal testen</strong></div><div><span>Echte verzending</span><strong>Technisch uitgeschakeld</strong></div>",
  confirm: "Sluiten",
  action: closeModal
}));

document.querySelector("#mark-notifications-read").addEventListener("click", () => {
  notificationsForCurrentProfile().forEach(item => { item.read = true; });
  persistState();
  renderNotifications();
  renderEmployeeAnnouncementArchive();
  toast("Alle meldingen zijn als gelezen gemarkeerd.");
});
document.querySelector("#help-launcher").addEventListener("click", () => document.querySelector("#help-panel").hidden ? openHelp() : closeHelp());
document.querySelector("#help-close").addEventListener("click", closeHelp);
document.querySelector("#help-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.querySelector("#help-input");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  answerHelpQuestion(question);
});
document.querySelector("#switch-role").addEventListener("click", logout);
document.querySelector("#modal-close").addEventListener("click", closeModal);
document.querySelector("#modal-cancel").addEventListener("click", closeModal);
document.querySelector("#modal-secondary").addEventListener("click", () => modalSecondaryAction ? modalSecondaryAction() : closeModal());
document.querySelector("#modal-confirm").addEventListener("click", () => modalAction ? modalAction() : closeModal());
document.querySelector("#modal").addEventListener("click", event => { if (event.target.id === "modal") closeModal(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!document.querySelector("#modal").hidden) {
      closeModal();
      return;
    }
    closeTopbarPopovers();
    closeHelp();
  }
  handleEnterSave(event);
});

populateSettings();
renderAll();
