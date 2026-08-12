// Navigation-only mapping for dashboard.feature.
// Native Playwright remains the executable source of truth; no Cucumber runner is used.

type StepPattern = string | RegExp;
type StepHandler = (...args: unknown[]) => unknown;

const Given = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const When = (_pattern: StepPattern, _handler: StepHandler) => undefined;
const Then = (_pattern: StepPattern, _handler: StepHandler) => undefined;

export const caseMappings = [
  { caseId: 'DASH-H-001', spec: 'dashboard.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then het dashboard toont admin-overzicht zonder consolefouten"] },
  { caseId: 'DASH-H-002', spec: 'dashboard.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then alleen medewerkersinformatie wordt getoond zonder consolefouten"] },
  { caseId: 'DASH-N-007', spec: 'dashboard.spec.ts', assertionCount: 1, acceptanceCriteria: ["Then alle zichtbare totalen blijven gelijk aan de concrete taakregels"] },
  { caseId: 'DASH-N-008', spec: 'dashboard.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then blijven de concrete taakregels leidend en verschijnt geen oude teller"] },
  { caseId: 'DASH-N-010', spec: 'dashboard.spec.ts', assertionCount: 14, acceptanceCriteria: ["And Stasjo voert daarna F5 uit","Then blijft de gewijzigde lokale teller zichtbaar en komt geen oude serversessie terug","And Backoffice kan Marc zijn klanturenstaat goedkeuren zonder statusrace"] },
  { caseId: 'DASH-H-008', spec: 'dashboard.spec.ts', assertionCount: 24, acceptanceCriteria: ["And Backoffice bevestigt iedere resterende zichtbare taak tot de werkvoorraad 0 is","Then wordt met Playwright-assertions bevestigd dat gUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice"] },
  { caseId: 'DASH-N-009', spec: 'dashboard.spec.ts', assertionCount: 5, acceptanceCriteria: ["Then blijft de teller gelijk en zijn er geen verborgen timesheet-reads"] },
  { caseId: 'DASH-H-012', spec: 'dashboard.spec.ts', assertionCount: 30, acceptanceCriteria: ["Then toont het dashboard zeven Backoffice-acties en vijf wachttaken zonder medewerkerbadge in het menu","And Teambeheer toont vier medewerkers en twee beheerders als zes actieve accounts","And Dashboard opent bovenaan terwijl eigenaarbolletjes gericht naar hun werkvoorraad springen"] },
  { caseId: 'DASH-H-013', spec: 'dashboard.spec.ts', assertionCount: 11, acceptanceCriteria: ["Then toont klanturenstaten een verkoopklaar kaartenoverzicht","And proces en team tonen zonder lege tussenruimte duidelijke kerninformatie en acties"] },
  { caseId: 'DASH-H-003', spec: 'dashboard.spec.ts', assertionCount: 6, acceptanceCriteria: ["Then blijven de maandnamen zichtbaar in donkere modus"] },
  { caseId: 'DASH-H-004', spec: 'dashboard.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then zijn de maandlabels nog zichtbaar in de maandkiezer"] },
  { caseId: 'DASH-H-005', spec: 'dashboard.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then is er een compacte open-maandenkaart zichtbaar met een directe maandknop"] },
  { caseId: 'DASH-H-014', spec: 'dashboard.spec.ts', assertionCount: 20, acceptanceCriteria: ["Then opent de hoofdactie exact de geprioriteerde maand en juiste taakroute"] },
  { caseId: 'DASH-N-015', spec: 'dashboard.spec.ts', assertionCount: 14, acceptanceCriteria: ["Then staat de urencorrectie vóór het document en kloppen de totalen","And bij een volledig afgeronde werkvoorraad verdwijnen taaklijst en prioriteitsdata"] },
  { caseId: 'DASH-H-006', spec: 'dashboard.spec.ts', assertionCount: 7, acceptanceCriteria: ["Then verschijnt september niet als open medewerkermaand"] },
  { caseId: 'DASH-H-007', spec: 'dashboard.spec.ts', assertionCount: 4, acceptanceCriteria: ["Then staat de periode op augustus en toont het overzicht geen toekomstige maanden"] },
] as const;
