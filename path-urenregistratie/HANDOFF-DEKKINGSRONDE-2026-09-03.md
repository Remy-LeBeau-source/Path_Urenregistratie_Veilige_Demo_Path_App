# Handoff — dekkingsronde 3 september 2026

**Stand:** TEST draait **1.0.1**. PROD niet aangeraakt (staat op 0.9.156, wacht
op jouw Promote Prod). Alle commits op `main`, elke commit groen op
`npm run check`. Versieschema sinds nu: `1.0.x` (BESLISTABEL W10).

De volledige procedure en gebiedenlijst staat in **`DEKKINGSRONDE.md`**. Elke
sessie kan die oppakken. Trigger: de gebruiker zegt **"dekkingsronde"**.

---

## Gedaan in deze ronde

| Versie | Commit | Wat |
|---|---|---|
| 0.9.173 | Dekkingsronde 1 | `[TS-API-N-012]` optimistische vergrendeling urenstaat: tweede write met verouderde versie → 409 stale-version, DB houdt de waarden van de winnaar |
| **1.0.0** | Dekkingsronde 2 + versiesprong | Nieuwe suite `database-integrity.spec.ts`: `[DB-H-002]` 17 weesrij-controles · `[DB-H-003]` ON DELETE CASCADE-contract · `[DB-N-005]` medewerker verwijderen laat geen weesrijen + auditlog |
| 1.0.1 | Dekkingsronde 3 | 97 regels dode CSS weg (26 ongebruikte classes), CSS-bundel ~6,7 kB kleiner |
| 1.0.2 | Handoff | dit document |
| 1.0.3 | Dekkingsronde 4 | `[TS-API-N-013]` zes grenswaarden dagregels (>24u, negatief, datum buiten maand, niet-bestaand, billable-mismatch, negatief verlof) → 400, geen rij |
| 1.0.4 | Dekkingsronde 5 | `[AUD-H-011]` auditlog-cross-check: employee/company/timesheet-schrijfacties met juiste actor_id |
| 1.0.5 | Dekkingsronde 6 | `[MOB-H-021]` PWA-installatiecontract: sw.js + iOS-beginschermmeta, op Android én iOS |
| 1.0.6 | Dekkingsronde 7 | `[A11Y-H-004]` + fix: dialoog geeft focus terug naar de opener i.p.v. de body |
| 1.0.7 | Design 1 | `[A11Y-H-005]` + fix: één focus-visible-ring voor a/summary/[tabindex]/textarea |
| 1.0.8 | Opschonen | 5 ongebruikte functies + dode `.invoice-source-field` weg (~120 regels) |
| 1.0.9 | Handoff | dit document bijgewerkt |
| 1.0.10 | Dekkingsronde 8 | `[ROLE-N-004]` autorisatiematrix: medewerker krijgt 401/403 op elke beheerder-only schrijfactie + leesbron |

**Bevindingen tijdens de sweep (nog niet als case, wél noteren):**
- De app is al sterk gedekt (370 scenario's). Veel gebieden die ik nakeek
  (invoice-company-identity, customer-timesheet-api, notifications, mail-delivery)
  bleken al grondig.
- `[INV-ID-H-011]` (betalingstermijn uit instellingen → factuur-PDF) geprobeerd
  maar de `#save-settings`-POST vuurde niet betrouwbaar na een `<select>`-wijziging
  in de testcontext → teruggedraaid. Follow-up: uitzoeken of de settings-form de
  `#setting-payment-term`-select als "dirty" markeert; anders een kleine fix daar
  plus de case.
- `send_to_broker` dedup (commit 8fb340f) is alleen via een echte race te
  raken (statusguard `=== 'approved'` blokkeert een simpele tweede call).
  Geen deterministische case mogelijk zonder concurrency-harnas.

**Direct hiervoor in dezelfde sessie (0.9.157 → 0.9.172):** mobiele
document-flow, kruisjes, PWA-naam + navy statusbalk per omgeving, leesbaarheid,
accountuitnodiging (aanpasbare welkomsttekst + geen beheerder-throttle),
medewerkerdashboard-laadtoestand, klanturenstaat-desync, klikbare
factuurstatusstappen, herkomst bij "rechtstreeks gemaild", scroll-sluit-menu-fix,
`npm run version:set`-script, dekkingsronde als vaste werkwijze (W12).
Nieuwe cases daarbij: `DASH-N-018`, `DASH-N-019`, `DASH-H-020`, `INV-H-022`,
`INV-H-023`, `PWD-H-018`, `PWD-H-019`, `MOB-H-020`, `CTS-API-H-014`.

---

## Nog te doen — resterende plan

| # | Gebied | Wat nog | Grofweg |
|---|---|---|---|
| 2 | Database | audit_log-cross-check voor invoice / customer_timesheet / announcement; dubbele e-mail-afleveringen | 1–2 |
| 3 | Facturen & klanturenstaat | PDF-inhoud vs preview edge-cases, lock-transities, externe factuur formaten, broker-dedup rand | 3 |
| 4 | Mail | kanaalsjabloon-overerving, acceptatieconsole 5 scenario's, sandbox-omleiding, reset-throttle | 2 |
| 5 | Mededelingen/notificaties | stale-response breder, herstel-basismeldingen, teller-sync | 1 |
| 6 | Teambeheer & auth | dubbel e-mailadres varianten, rate-limits, rol-autorisatiematrix, admin verwijderen | 2 |
| 7 | Instellingen | bedrijfsidentiteit → factuur-PDF, betaaltermijn, merkkleuren → contrast | 1 |
| 11 | Design-verfijning (2–7) | knop-hiërarchie, spacing-ritme, lege-/laadtoestanden Facturen/Goedkeuringen, statuspillen, mobiel tabel→kaart, typografie — elk met test/contrastcheck | 3–5 |

**Gedaan van het plan:** gebied 1 (uren), 8 (PWA), 9 (a11y), 10 (opschonen JS+CSS),
design 1 (focusring). **Inschatting rest:** ~6–10 uur, ~15–22 commits.

## Bewust niet nu

- app.js opsplitsen / renderpijplijn herzien — te risicovol vlak vóór go-live.
  Wordt een bevindingenlijst, geen code, tot na 1.0.
- Echte visuele iPhone-check blijft mensenwerk (`mobile-safari` = WebKit-engine,
  geen toestel).

## Resume

`git pull`, lees `DEKKINGSRONDE.md`, ga verder bij gebied 1. Elke commit:
`npm run version:set 1.0.x` → `npm run check` → nieuwe/aangeraakte specs groen →
NL-commit zonder handtekening → push. PROD blijft van de gebruiker.
