import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("assets/app.js", root), "utf8");
const customerTimesheetApi = await readFile(new URL("server/api/customer-timesheets.php", root), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!customerTimesheetApi.includes("Only received customer timesheets can be approved."), "Klantenurenstaat API mag geen Engelse goedkeuringsfout tonen");
assert(customerTimesheetApi.includes("Alleen een ingediende klanturenstaat kan worden goedgekeurd."), "Klantenurenstaat API moet een duidelijke Nederlandse goedkeuringsfout geven");
assert(script.includes("De status is ondertussen gewijzigd. De actuele klanturenstaat wordt opnieuw geladen."), "De UI moet een statusrace in het Nederlands uitleggen en verversen");

function createDemoDom(url, storedStateJson = null) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url
  });
  dom.window.scrollTo = () => {};
  dom.window.URL.createObjectURL = () => "blob:closeout-test";
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.fetch = () => new Promise(() => {});
  if (storedStateJson) {
    dom.window.localStorage.setItem("path-uren-demo-v07-final", storedStateJson);
  }
  dom.window.eval(script);
  if (typeof dom.window.applyAuthUiMode === "function") {
    dom.window.applyAuthUiMode("demo");
  }
  return dom;
}

function taskSummary(dom) {
  const openTasks = dom.window.adminOpenTasks();

  const byMonth = {};
  const byType = {};
  openTasks.forEach(task => {
    byMonth[task.periodKey] = (byMonth[task.periodKey] || 0) + 1;
    byType[task.type] = (byType[task.type] || 0) + 1;
  });

  return {
    total: openTasks.length,
    backoffice: openTasks.filter(task => task.actionable).length,
    employee: openTasks.filter(task => !task.actionable).length,
    byMonth,
    byType,
    stasjo: dom.window.employeeOpenTasks(2).length
  };
}

function employeeOverview(dom) {
  return dom.window.activeEmployees().map(employee => {
    const tasks = dom.window.employeeOpenTasks(employee.id);
    const byType = tasks.reduce((map, task) => {
      map[task.type] = (map[task.type] || 0) + 1;
      return map;
    }, {});
    return {
      id: Number(employee.id),
      name: String(employee.name),
      open: tasks.length,
      byType
    };
  });
}

function adminOverview(dom) {
  const tasks = dom.window.adminOpenTasks();
  return tasks.map(task => ({
    id: task.id,
    periodKey: task.periodKey,
    employee: task.employee && task.employee.name ? task.employee.name : "Onbekend",
    type: task.type,
    actionable: Boolean(task.actionable),
    title: task.title
  }));
}

function printSnapshot(label, summary, employees, adminTasks) {
  console.log("DEMO-CLOSEOUT-TO-ZERO snapshot", JSON.stringify({
    label,
    summary,
    employees,
    adminTasks
  }));
}

function assertRichBaseline(summary, employees, label) {
  assert(summary.total >= 10, label + ": begin-data moet veel open taken bevatten (minimaal 10)");
  assert(summary.backoffice >= 4, label + ": beheerder moet meerdere open taken hebben (minimaal 4)");
  assert(summary.employee >= 3, label + ": medewerkers moeten meerdere open taken hebben (minimaal 3)");
  assert(summary.stasjo >= 3, label + ": Stasjo moet minimaal 3 open acties houden");
  assert(employees.some(item => item.open > 0), label + ": minstens een medewerker moet open acties hebben");
  assert(employees.every(item => Number.isFinite(item.open)), label + ": medewerker-overzicht moet geldige aantallen bevatten");
}

function assertSummaryMatches(actual, expected, label) {
  assert(actual.total === expected.total, label + ": totaal open taken wijkt af van baseline");
  assert(actual.backoffice === expected.backoffice, label + ": open beheertaken wijken af van baseline");
  assert(actual.employee === expected.employee, label + ": open medewerkerstaken wijken af van baseline");
  assert(actual.stasjo === expected.stasjo, label + ": Stasjo open acties wijken af van baseline");
  assert(JSON.stringify(actual.byMonth) === JSON.stringify(expected.byMonth), label + ": maandverdeling wijkt af van baseline");
  assert(JSON.stringify(actual.byType) === JSON.stringify(expected.byType), label + ": taaktypeverdeling wijkt af van baseline");
}

const baselineDom = createDemoDom("https://closeout-baseline.example.invalid/");
const baselineSummary = taskSummary(baselineDom);
const baselineEmployees = employeeOverview(baselineDom);
const baselineAdminTasks = adminOverview(baselineDom);
printSnapshot("baseline", baselineSummary, baselineEmployees, baselineAdminTasks);
assertRichBaseline(baselineSummary, baselineEmployees, "DEMO-CLOSEOUT-TO-ZERO baseline");
const stasjoBaseline = baselineEmployees.find(item => /stasjo/i.test(item.name));
const brianBaseline = baselineEmployees.find(item => /brian/i.test(item.name));
assert(stasjoBaseline && stasjoBaseline.open >= 3, "DEMO-CLOSEOUT-TO-ZERO baseline: Stasjo moet minimaal 3 open acties hebben");
assert(brianBaseline && brianBaseline.open >= 3, "DEMO-CLOSEOUT-TO-ZERO baseline: Brian moet minimaal 3 open acties hebben");
baselineDom.window.persistState();
const baselineState = baselineDom.window.localStorage.getItem("path-uren-demo-v07-final");
assert(Boolean(baselineState), "DEMO-CLOSEOUT-TO-ZERO: baseline-state moet in localStorage staan");
baselineDom.window.close();

const closeoutDom = createDemoDom("https://closeout.example.invalid/");
const startSummary = taskSummary(closeoutDom);
const startEmployees = employeeOverview(closeoutDom);
const startAdminTasks = adminOverview(closeoutDom);
printSnapshot("start", startSummary, startEmployees, startAdminTasks);
assertSummaryMatches(startSummary, baselineSummary, "DEMO-CLOSEOUT-TO-ZERO start");
const startTasks = closeoutDom.window.adminOpenTasks();

const recordKeys = new Set(startTasks.map(task => task.periodKey + ":" + task.employee.id));
recordKeys.forEach(key => {
  const [periodKey, employeeId] = key.split(":");
  const record = closeoutDom.window.recordFor(Number(employeeId), periodKey);
  const customerRecord = closeoutDom.window.customerTimesheetFor(record);
  record.timesheetStatus = "approved";
  record.invoiceStatus = "simulated";
  record.payrollStatus = "simulated";
  customerRecord.status = "sent";
  customerRecord.sentAt = customerRecord.sentAt || "closeout-test";
  customerRecord.sentBy = customerRecord.sentBy || "closeout-test";
});
closeoutDom.window.persistState();
closeoutDom.window.renderAll();

const zeroTasks = closeoutDom.window.adminOpenTasks();
assert(zeroTasks.length === 0, "DEMO-CLOSEOUT-TO-ZERO: open taken zijn niet naar 0 gebracht");
const zeroEmployees = employeeOverview(closeoutDom);
printSnapshot("after-closeout", taskSummary(closeoutDom), zeroEmployees, adminOverview(closeoutDom));
assert(zeroEmployees.every(item => item.open === 0), "DEMO-CLOSEOUT-TO-ZERO: na closeout moet iedere medewerker 0 open acties hebben");
closeoutDom.window.close();

const freshDom = createDemoDom("https://closeout-fresh.example.invalid/");
const resetSummary = taskSummary(freshDom);
const resetEmployees = employeeOverview(freshDom);
const resetAdminTasks = adminOverview(freshDom);
printSnapshot("reset", resetSummary, resetEmployees, resetAdminTasks);
assertSummaryMatches(resetSummary, baselineSummary, "DEMO-CLOSEOUT-TO-ZERO reset");
freshDom.window.close();

const reloadDom = createDemoDom("https://closeout-reload.example.invalid/", baselineState);
const reloadSummary = taskSummary(reloadDom);
const reloadEmployees = employeeOverview(reloadDom);
const reloadAdminTasks = adminOverview(reloadDom);
printSnapshot("reload", reloadSummary, reloadEmployees, reloadAdminTasks);
assertSummaryMatches(reloadSummary, baselineSummary, "DEMO-CLOSEOUT-TO-ZERO F5");
reloadDom.window.close();

const reportData = {
  generatedAt: new Date().toISOString(),
  baseline: { summary: baselineSummary, employees: baselineEmployees, adminTasks: baselineAdminTasks },
  start: { summary: startSummary, employees: startEmployees, adminTasks: startAdminTasks },
  afterCloseout: { summary: { total: 0 }, employees: zeroEmployees },
  reset: { summary: resetSummary, employees: resetEmployees, adminTasks: resetAdminTasks },
  reload: { summary: reloadSummary, employees: reloadEmployees, adminTasks: reloadAdminTasks }
};
await mkdir(new URL("test-results", root), { recursive: true });
await writeFile(new URL("test-results/closeout-smoke-report.json", root), JSON.stringify(reportData, null, 2), "utf8");

console.log("DEMO-CLOSEOUT-TO-ZERO: geslaagd (begin-data beheer+medewerkers gecontroleerd, daarna naar 0 taken, reset en F5 bevestigd)");
