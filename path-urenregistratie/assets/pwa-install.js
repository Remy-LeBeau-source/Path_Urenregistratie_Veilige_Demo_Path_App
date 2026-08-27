// PWA: service worker registration + install-prompt banner.
//
// Extracted from an inline <script> in index.html. The public CSP uses
// script-src 'self' with no unsafe-inline/hash/nonce, so on TEST and PROD the
// inline block was blocked outright: the service worker never registered and
// the install banner never wired up. As an external file it complies.
// Defensive: registration failure/unsupported browsers must never affect the app itself.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Uitnodiging om te installeren.
//
// Android meldt via beforeinstallprompt dat installeren kan; die melding vangen
// we op zodat we zelf bepalen wanneer we het vragen, in plaats van dat de
// browser er ongevraagd overheen valt. iOS kent die melding niet: daar kan
// alleen een instructie, want installeren gaat via het deelmenu van Safari.
//
// Alles staat in een try/catch en faalt stil: een browser die dit niet kent mag
// nooit de app zelf raken.
(function () {
  var AFGEWEZEN = "path-install-afgewezen";
  var balk = document.querySelector("#install-banner");
  var hint = document.querySelector("#install-banner-hint");
  var accepteren = document.querySelector("#install-banner-accept");
  var wegklikken = document.querySelector("#install-banner-dismiss");
  if (!balk || !accepteren || !wegklikken) return;

  var bewaardeMelding = null;
  var verdwijntimer = null;

  // Wie "Niet nu" kiest wil de vraag niet meteen terug, maar ook niet nooit meer.
  // Dertig dagen: lang genoeg om niet te zeuren, kort genoeg om het aanbod terug
  // te laten komen. Wie de app installeert en later verwijdert, krijgt de vraag
  // sowieso weer, want bij installeren wissen we deze keuze.
  var AFWIJSDUUR = 30 * 24 * 60 * 60 * 1000;

  function alAfgewezen() {
    try {
      var opgeslagen = window.localStorage.getItem(AFGEWEZEN);
      if (!opgeslagen) return false;
      var moment = Number(opgeslagen);
      // Oude versies bewaarden "1"; die behandelen we als vervallen.
      if (!Number.isFinite(moment) || moment <= 0) {
        window.localStorage.removeItem(AFGEWEZEN);
        return false;
      }
      if (Date.now() - moment > AFWIJSDUUR) {
        window.localStorage.removeItem(AFGEWEZEN);
        return false;
      }
      return true;
    } catch (fout) {
      return false;
    }
  }

  function draaitAlsApp() {
    try {
      return window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true;
    } catch (fout) {
      return false;
    }
  }

  function verbergen() {
    balk.setAttribute("hidden", "");
    document.body.classList.remove("toont-installatieaanbod");
    if (verdwijntimer) {
      window.clearTimeout(verdwijntimer);
      verdwijntimer = null;
    }
  }

  function opTelefoon() {
    // Alleen op smalle schermen aanbieden. Op een laptop biedt Chrome het zelf al
    // aan met een icoontje in de adresbalk, en daar is het verschil tussen een
    // tabblad en een eigen venster ook klein. Een eigen balk zou daar een tweede
    // aanbod zijn voor iets wat de browser al doet.
    try {
      return window.matchMedia("(max-width: 720px)").matches;
    } catch (fout) {
      return false;
    }
  }

  // Het menu-item is de vaste plek. De melding van de browser komt op zijn eigen
  // momenten en blijft na het verwijderen van de app een tijd weg; dan moet je het
  // nog steeds zelf kunnen opzoeken.
  function werkMenuBij() {
    var item = document.querySelector("#profile-action-install");
    if (!item) return;
    if (draaitAlsApp()) item.setAttribute("hidden", "");
    else item.removeAttribute("hidden");
  }

  window.pathInstallatieAanbod = {
    beschikbaar: function () {
      return bewaardeMelding !== null;
    },
    start: function () {
      if (!bewaardeMelding) return false;
      var melding = bewaardeMelding;
      bewaardeMelding = null;
      verbergen();
      try {
        melding.prompt();
        return true;
      } catch (fout) {
        return false;
      }
    }
  };

  werkMenuBij();

  function dialoogOpen() {
    return document.querySelectorAll(".modal-backdrop:not([hidden])").length > 0;
  }

  function tonen() {
    if (alAfgewezen() || draaitAlsApp() || !opTelefoon()) return;
    // Niet vragen terwijl iemand met een dialoogvenster bezig is.
    if (dialoogOpen()) return;
    balk.removeAttribute("hidden");
    // Zolang hij staat krijgt de pagina er onderaan ruimte bij, zodat er aan
    // het eind van de pagina niets onder valt.
    document.body.classList.add("toont-installatieaanbod");

    // En hij gaat vanzelf weer weg. Een balk die blijft hangen dekt op elke
    // scrollpositie iets af; twaalf seconden is genoeg om hem te lezen. Wie
    // hem daarna alsnog wil, vindt Op startscherm zetten in het profielmenu.
    if (verdwijntimer) window.clearTimeout(verdwijntimer);
    verdwijntimer = window.setTimeout(function () {
      verdwijntimer = null;
      verbergen();
    }, 12000);
  }

  window.addEventListener("beforeinstallprompt", function (gebeurtenis) {
    gebeurtenis.preventDefault();
    bewaardeMelding = gebeurtenis;
    werkBalkBij();
    tonen();
  });

  window.addEventListener("appinstalled", function () {
    bewaardeMelding = null;
    verbergen();
    // Wie hem installeert heeft de vraag beantwoord. Verwijdert hij de app later,
    // dan hoort het aanbod gewoon weer te kunnen komen.
    try {
      window.localStorage.removeItem(AFGEWEZEN);
    } catch (fout) {
      // opslag geblokkeerd; dan valt er ook niets te wissen
    }
    werkMenuBij();
  });

  function meldAanGebruiker(tekst) {
    // toast() komt uit app.js. Is die er niet, dan is de balktekst zelf het
    // laatste redmiddel -- stil blijven mag niet.
    if (typeof window.toast === "function") {
      window.toast(tekst);
      return;
    }
    if (hint) hint.textContent = tekst;
  }

  accepteren.addEventListener("click", function () {
    if (!bewaardeMelding) {
      // Geen bruikbare melding van de browser: dan is uitleggen het enige wat
      // kan. Nooit stil niets doen.
      werkBalkBij();
      meldAanGebruiker(uitlegVoorDezeBrowser());
      return;
    }

    var melding = bewaardeMelding;
    bewaardeMelding = null;
    verbergen();

    try {
      var uitkomst = melding.prompt();
      // Chrome geeft via userChoice terug wat de gebruiker koos. Zonder deze
      // terugkoppeling lijkt wegklikken van het venster op "er gebeurt niets".
      if (melding.userChoice && typeof melding.userChoice.then === "function") {
        melding.userChoice.then(function (keuze) {
          if (keuze && keuze.outcome === "accepted") return;
          werkBalkBij();
          tonen();
          meldAanGebruiker("Niet geinstalleerd. Je kunt het altijd opnieuw doen via het profielmenu.");
        }).catch(function () {
          // Geen terugkoppeling beschikbaar; de balk staat er weer, dat volstaat.
          werkBalkBij();
          tonen();
        });
      }
      if (uitkomst && typeof uitkomst.catch === "function") uitkomst.catch(function () {});
    } catch (fout) {
      // Starten lukte niet; dan alsnog uitleggen in plaats van niets doen.
      werkBalkBij();
      tonen();
      meldAanGebruiker(uitlegVoorDezeBrowser());
    }
  });
  wegklikken.addEventListener("click", function () {
    verbergen();
    try {
      window.localStorage.setItem(AFGEWEZEN, String(Date.now()));
    } catch (fout) {
      // Zonder opslag komt de vraag later terug; hinderlijker, maar niet stuk.
    }
  });

  // Hoe je installeert verschilt per browser, en alleen Chrome-achtigen laten
  // ons het zelf starten. Zonder die mogelijkheid is uitleggen het enige wat
  // kan -- maar dan nog steeds zichtbaar, niet weggestopt.
  function uitlegVoorDezeBrowser() {
    var ua = navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(ua);
    if (isIOS) return "Tik onderin op Delen en kies Zet op beginscherm.";
    return "Open het menu van je browser (drie puntjes) en kies App installeren.";
  }

  function werkBalkBij() {
    if (bewaardeMelding) {
      if (hint) hint.textContent = "Dan open je hem als app, zonder adresbalk.";
      accepteren.removeAttribute("hidden");
    } else {
      if (hint) hint.textContent = uitlegVoorDezeBrowser();
      accepteren.setAttribute("hidden", "");
    }
  }

  // Niet meteen bij binnenkomst: eerst even laten zien wat de app is. En niet
  // wachten op de browser, want dat signaal komt na een eerdere installatie
  // lang niet meer.
  window.setTimeout(function () {
    werkBalkBij();
    tonen();
  }, 3000);
})();
