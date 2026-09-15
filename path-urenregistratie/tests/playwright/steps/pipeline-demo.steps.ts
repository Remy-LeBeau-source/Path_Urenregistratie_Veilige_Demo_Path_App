// Navigation-only mapping for pipeline-demo.feature.
// Native Playwright remains the executable source of truth.
// Executable test: tests/playwright/pipeline-demo.spec.ts
/// <reference path="../pipeline-demo.spec.ts" />

export {};

const navigate = (_text: string) => undefined;
const Given = navigate;
const When = navigate;
const Then = navigate;
const And = navigate;

Given('de zelfstandige TEST-only pipelinepagina');
When('de pipelinepagina is geladen');
Then('staan de vier afgesproken fasen en vijf vaste tickets in beeld');
And('Kennisbank en Testbeheer projecteren dezelfde traceerbare inhoud');
Given('een nieuwe vraag met acceptatiecriterium');
When('de volledige pipeline automatisch wordt uitgevoerd');
Then('komt de testcase in Zephyr en de oplevering in de begrensde Living Doc');
Given('veertien lokale Living Doc-regels op een telefoonviewport');
When('de Kennisbank op de telefoon wordt geopend');
Then('worden alleen de laatste vijf lokale regels getoond en tien lokaal bewaard');
And('de pagina heeft geen horizontale overflow of gedeelde appcode');
