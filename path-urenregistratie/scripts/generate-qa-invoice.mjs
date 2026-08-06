import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { jsPDF as BaseJsPDF } from "jspdf";

const projectRoot = new URL("../", import.meta.url);
const outputDirectory = new URL("../../tmp/pdfs/", import.meta.url);
mkdirSync(outputDirectory, { recursive: true });

const html = readFileSync(new URL("index.html", projectRoot), "utf8");
const invoiceFontScript = readFileSync(new URL("assets/invoice-fonts.js", projectRoot), "utf8");
const appScript = readFileSync(new URL("assets/app.js", projectRoot), "utf8");
const writtenPaths = [];

function CapturingPdf(...args) {
  const document = new BaseJsPDF(...args);
  document.save = filename => {
    const writtenPath = fileURLToPath(new URL(filename, outputDirectory));
    writeFileSync(writtenPath, Buffer.from(document.output("arraybuffer")));
    writtenPaths.push(writtenPath);
  };
  return document;
}

const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "https://uren.example.invalid/"
});
dom.window.scrollTo = () => {};
dom.window.URL.createObjectURL = () => "blob:test";
dom.window.URL.revokeObjectURL = () => {};
dom.window.jspdf = { jsPDF: CapturingPdf };
dom.window.eval(invoiceFontScript);
dom.window.eval(appScript);

if (typeof dom.window.downloadInvoicePdf !== "function") {
  throw new Error("De factuur-PDF-generator is niet beschikbaar.");
}

for (const employeeId of [1, 2, 3, 4]) {
  if (!dom.window.downloadInvoicePdf(employeeId)) {
    throw new Error(`De factuur-PDF voor medewerker ${employeeId} kon niet worden gemaakt.`);
  }
}

console.log(writtenPaths.join("\n"));
