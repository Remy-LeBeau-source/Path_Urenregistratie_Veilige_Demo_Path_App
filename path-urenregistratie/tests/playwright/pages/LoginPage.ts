import { expect, type Page } from '@playwright/test';
import { appConfig, requirePassword } from '../fixtures/appConfig';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(appConfig.baseUrl);
    await this.waitForAuthModeReady();
    // waitForAuthModeReady() only checks that the auth backend answered, not
    // who it says is logged in. Under heavy load a session from a step just
    // before this one can still resolve as valid for a moment, auto-logging
    // the browser straight back into the app shell instead of the login
    // screen -- login() then fails confusingly deep inside itself. Assert the
    // actual destination here, with room for a slow-but-correct check.
    await expect(this.page.locator('#login-screen')).toBeVisible({ timeout: 15_000 });
  }

  async loginAsAdmin(): Promise<void> {
    await this.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  }

  async loginAsEmployee(): Promise<void> {
    await this.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  }

  async logout(): Promise<void> {
    // Een open hulp-paneel overlapt op een smalle (mobiele) viewport de
    // header en onderschept daarmee de klik op de uitlogknop hieronder.
    // Kort en falend-stil: tussen deze check en de klik kan het paneel al
    // vanzelf gesloten zijn (bv. na een navigatie-knop erin) -- dan is er
    // niets meer te sluiten, en een lange actionability-wait op een element
    // dat nooit meer stabiel wordt, mag de test niet laten vastlopen.
    // Op zichtbaarheid toetsen, niet op .is-open: openHelp() haalt hidden meteen weg
    // maar zet is-open pas in de volgende animatieframe. Direct na het openen vond
    // deze check daardoor niets, sloeg het sluiten over, en een frame later lag het
    // paneel over #switch-role ([HELP-N-001] op mobile-safari, 14 sep; lokaal
    // gemeten: direct na de klik is-open 0, zichtbaar 1).
    if (await this.page.locator('#help-panel:not([hidden])').count()) {
      const sluitFout = await this.page.locator('#help-close').click({ timeout: 3_000 }).then(() => '', e => (e as Error).message.split('\n')[0]);
      // Diagnose (14 sep): in [HELP-N-001] op mobile-safari bleef het paneel na deze
      // stap open en blokkeerde het 15 s lang de klik op #switch-role, zonder te zeggen
      // waarom. Een sluitknop die op WebKit soms niet sluit kan een echt iOS-probleem
      // zijn, dus hier geen stille herhaalpoging die dat maskeert: blijft het paneel
      // open, dan faalt de stap hier met wat er gebeurde.
      // closeHelp() haalt is-open synchroon in de klikhandler weg, dus direct na een
      // geslaagde klik hoort deze selector al niets meer te vinden.
      if (await this.page.locator('#help-panel.is-open:not([hidden])').count()) {
        const staat = await this.page.evaluate(() => {
          const knop = document.querySelector('#help-close')?.getBoundingClientRect();
          const paneel = document.querySelector('#help-panel')?.getBoundingClientRect();
          return { knop: knop && [knop.x, knop.y, knop.width, knop.height].map(Math.round), paneel: paneel && [paneel.x, paneel.y, paneel.width, paneel.height].map(Math.round), viewport: [innerWidth, innerHeight], scrollY: Math.round(scrollY) };
        }).catch(() => null);
        throw new Error(`Hulppaneel bleef open na #help-close (klikfout: ${sluitFout || 'geen, klik uitgevoerd'}). Staat: ${JSON.stringify(staat)}`);
      }
    }

    const desktop = this.page.locator('#switch-role');
    const mobile = this.page.locator('#mobile-switch-role');

    if (await desktop.isVisible()) {
      await desktop.click();
    } else if (await mobile.isVisible()) {
      await mobile.click();
    } else {
      throw new Error('Geen zichtbare logout/switch-role knop gevonden.');
    }
    // The app's logout() is async (requestAuthLogout → .finally → logoutLocal).
    // Wait explicitly for the login screen to appear before returning.
    await expect(this.page.locator('#login-screen')).toBeVisible({ timeout: 15_000 });
    await expect(this.page.locator('#auth-login-submit')).toBeVisible({ timeout: 15_000 });
  }

  async assertLoggedOut(): Promise<void> {
    await expect(this.page.locator('#login-screen')).toBeVisible();
    await expect(this.page.locator('#auth-login-submit')).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await expect(this.page.locator('#login-screen')).toBeVisible();
    await this.waitForAuthModeReady();
    await expect(this.page.locator('#auth-login-submit')).toBeEnabled();
    await this.page.locator('#auth-login-email').fill(email);
    await this.page.locator('#auth-login-password').fill(password);
    // Diagnose, verandert niets aan het verloop: legt vast welke events de klik
    // oplevert en op welk element. Zie de toelichting bij de time-out hieronder.
    await this.page.evaluate(() => {
      const w = window as unknown as { __inlogEvents?: string[] };
      w.__inlogEvents = [];
      for (const type of ['pointerdown', 'mousedown', 'focus', 'scroll', 'pointerup', 'mouseup', 'click', 'submit']) {
        // scroll vuurt op window/document, focus bubbelt niet: beide via capture.
        document.addEventListener(type, event => {
          const doel = event.target as Element | Document | null;
          const naam = doel && 'tagName' in doel ? `${doel.tagName.toLowerCase()}${doel.id ? '#' + doel.id : ''}` : 'document';
          // scrollY en de bovenkant van de knop per event: CI (0ba8c066) liet zien
          // dat indrukken op de knop landt en loslaten op #auth-forgot-password
          // eronder. Dit onderscheidt scrollen van een layoutverschuiving.
          const knopTop = Math.round(document.querySelector('#auth-login-submit')?.getBoundingClientRect().top ?? -1);
          const muisY = 'clientY' in event ? Math.round((event as MouseEvent).clientY) : -1;
          w.__inlogEvents?.push(`${type}@${naam}${event.defaultPrevented ? '(prevented)' : ''}[sy${Math.round(scrollY)},kt${knopTop},my${muisY}]`);
        }, { capture: true });
      }
    }).catch(() => undefined);
    // Knop eerst naar het midden, dan pas klikken (14 sep). In CI op mobile-safari
    // (d13089a9, zes vangsten) zette Playwrights eigen scroll de knop precies tegen
    // de onderrand (bovenkant 613 in een viewport van 664), waarna de pagina tussen
    // indrukken en loslaten 29-39 px doorscrolde: loslaten viel onder de knop, dus
    // geen click en geen submit. Lokaal (Windows-WebKit) scrolt er bij geen enkele
    // randpositie iets, dus dit is een hypothese die CI moet bevestigen: sinds 13 sep
    // gemiddeld ~2 van deze uitvallers per release. Het blijft een echte klik op de
    // echte knop; de diagnose hierboven blijft staan voor als het toch terugkomt.
    //
    // Bijstelling na CI op herontwerp 3205146a (acht vangsten, mét de centrering):
    // de scroll-events tonen een zachte animatie die al loopt vóór het indrukken en
    // steeds eindigt op dezelfde stand (sy422, knop tegen de onderrand). Centreren
    // alleen hielp dus niet: Playwrights eigen "scroll into view" bij click() werd
    // een animatie (html { scroll-behavior: smooth } -- de reduced-motion-emulatie
    // lijkt in CI-WebKit niet te gelden, de diagnose legt dat nu vast) en de klik
    // viel midden in die beweging. Daarom: zelf centreren, wachten tot de scroll
    // echt stilstaat, controleren dat de knop volledig in beeld is, en dan met de
    // muis op het midden klikken -- een klik die zelf niet meer scrollt. Het blijft
    // een echte muisklik op de echte knop.
    const inlogKnop = this.page.locator('#auth-login-submit');
    await expect(inlogKnop).toBeVisible();
    await inlogKnop.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })).catch(() => undefined);
    await this.page.evaluate(() => new Promise<void>(resolve => {
      // Stil = tien opeenvolgende frames dezelfde scrollY, met een plafond van 3 s.
      let vorige = scrollY;
      let stil = 0;
      const einde = performance.now() + 3_000;
      const stap = () => {
        stil = scrollY === vorige ? stil + 1 : 0;
        vorige = scrollY;
        if (stil >= 10 || performance.now() > einde) resolve();
        else requestAnimationFrame(stap);
      };
      requestAnimationFrame(stap);
    }));
    const vak = await inlogKnop.boundingBox();
    const viewport = this.page.viewportSize();
    if (vak && viewport && vak.y >= 0 && vak.y + vak.height <= viewport.height) {
      await this.page.mouse.click(vak.x + vak.width / 2, vak.y + vak.height / 2);
    } else {
      await inlogKnop.click();
    }

    // Hoe lang we op de uitkomst van het inloggen wachten. 30 s, en dat is geen
    // verzwakking.
    //
    // De voorwaarde hieronder blijft ongewijzigd: geslaagd is "#app-shell is niet
    // meer hidden", mislukt is "de knop staat weer aan én er staat een echte
    // foutmelding". Een echte loginfout wordt dus nog steeds meteen herkend en
    // gegooid; alleen het geduld op een trage omgeving wordt ruimer.
    //
    // Waarom dit uitmaakt (13 sep 2026, gemeten door de vormgevingslane): dit is
    // de eerste stap van vrijwel elke case in de suite. Is de machine bezet, dan
    // knapt deze begroting als eerste -- en dan lijkt de case eronder stuk
    // terwijl hij nooit voorbij het inlogscherm is gekomen. Op webkit kost één
    // case op die machine 50-60 s; drie cases die samen rood waren, bleken los
    // alle drie groen. Een vaste begroting die niet over de omgeving heen past
    // is dezelfde fout als die vandaag ook in MOB-H-030, DASH-N-007 en
    // DASH-H-017 zat -- en deze zit in gedeelde infrastructuur, dus hij raakt
    // elke case, altijd bij de eerste stap, waar hij het minst op zichzelf lijkt
    // te wijzen.
    const LOGIN_UITKOMST_TIMEOUT_MS = 30_000;
    const outcome = await this.page.waitForFunction(() => {
      const shell = document.querySelector('#app-shell');
      if (shell && !shell.hasAttribute('hidden')) return { type: 'success', message: '' };

      const submit = document.querySelector('#auth-login-submit');
      const feedback = document.querySelector('#auth-login-feedback');
      const submitEnabled = Boolean(submit && !submit.hasAttribute('disabled'));
      const message = String(feedback?.textContent || '').trim();
      if (submitEnabled && message && message !== 'Inloggen...') {
        return { type: 'error', message };
      }

      return null;
      // 30 s in plaats van 12 s (zie de toelichting boven deze aanroep).
    }, undefined, { timeout: LOGIN_UITKOMST_TIMEOUT_MS }).catch(async error => {
      // Alleen diagnose, de uitkomst blijft een fout. Op mobile-safari verlaat het
      // inlogverzoek soms de browser niet (MASTERCHECKLIST, 14 sep). Deze momentopname
      // onderscheidt de kandidaten: leeg of ongeldig veld (native validatie blokkeert),
      // knop uitgeschakeld (verzending loopt nog of hangt), of alles in orde en toch
      // geen verzending. In dat laatste geval zegt de eventreeks waar het strandt:
      // geen mouseup op de knop (verschuiving tussen indrukken en loslaten), geen
      // click, of click zonder submit. Tot nu toe (34 keer in 18 releases, alleen
      // mobile-safari) toonde het snapshot velden gevuld, knop actief met focus,
      // geen melding: de handler is dus nooit bereikt.
      const staat = await this.page.evaluate(() => {
        const email = document.querySelector<HTMLInputElement>('#auth-login-email');
        const wachtwoord = document.querySelector<HTMLInputElement>('#auth-login-password');
        const knop = document.querySelector<HTMLButtonElement>('#auth-login-submit');
        const formulier = document.querySelector<HTMLFormElement>('#auth-login-form');
        return {
          emailGevuld: Boolean(email?.value),
          wachtwoordLengte: wachtwoord?.value.length ?? -1,
          formulierGeldig: formulier ? formulier.checkValidity() : null,
          knopUit: knop ? knop.disabled : null,
          melding: String(document.querySelector('#auth-login-feedback')?.textContent || '').trim(),
          authModus: document.querySelector('#auth-mode-indicator')?.textContent?.trim() ?? '',
          inlogschermZichtbaar: !document.querySelector('#login-screen')?.hasAttribute('hidden'),
          events: (window as unknown as { __inlogEvents?: string[] }).__inlogEvents ?? null,
          minderBeweging: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          scrollGedrag: getComputedStyle(document.documentElement).scrollBehavior,
        };
      }).catch(() => null);
      throw new Error(`${(error as Error).message}\nInlogstaat bij time-out: ${JSON.stringify(staat)}`);
    });

    const result = await outcome.jsonValue() as { type: 'success' | 'error'; message: string };
    if (result.type === 'error') {
      throw new Error('Login faalde: ' + (result.message || 'Onbekende loginfout'));
    }
  }

  private async waitForAuthModeReady(): Promise<void> {
    const indicator = this.page.locator('#auth-mode-indicator');
    const submit = this.page.locator('#auth-login-submit');

    await expect(this.page.locator('html')).toHaveAttribute(
      'data-app-interactive',
      'true',
      { timeout: 20_000 }
    );

    // Klaar zijn betekent: je kunt inloggen. Dat is de knop, niet het tekstje
    // ernaast. Hier stond eerst een eis dat de indicator zichtbaar moest zijn
    // voordat er verder werd gekeken, en die viel af en toe om op een trage
    // machine -- terwijl het inlogscherm gewoon werkte. Een test die omvalt zonder
    // dat er iets mis is, kost je het vertrouwen in de hele suite.
    await expect(submit).toBeEnabled({ timeout: 20_000 });

    // De indicator wordt daarna nog wel nagelopen, want hij vertelt in welke modus
    // je zit -- en op productie mag daar nooit "Lokale demo-modus" staan. Alleen de
    // volgorde is omgedraaid: eerst werkt het, dan pas wat het erover zegt.
    await expect(indicator).toContainText(
      /Auth-modus actief|Lokale demo-modus actief|Controle van auth-sessie wordt uitgevoerd\./,
      { timeout: 10_000 }
    );
  }
}
