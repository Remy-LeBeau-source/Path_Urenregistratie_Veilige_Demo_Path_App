import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const regular = readFileSync(new URL("assets/path-invoice-regular.ttf", root)).toString("base64");
const bold = readFileSync(new URL("assets/path-invoice-bold.ttf", root)).toString("base64");
const output = "window.PATH_INVOICE_FONTS = " + JSON.stringify({ regular, bold }) + ";\n";

writeFileSync(new URL("assets/invoice-fonts.js", root), output);
