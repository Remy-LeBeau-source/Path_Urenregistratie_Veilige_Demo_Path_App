'use strict';
/* ------------------------------------------------------------------
   PILOT-interactielaag voor de 1414/1919-ADMIN-pagina.
   Losstaand: geen import, geen fetch, geen gedeelde app-code. Alle
   data is vast (mockup-1:1) en leeft alleen in het geheugen van deze
   tab. CSP op TEST staat een same-origin <script src> toe.

   Wat het toevoegt aan de statische plaat:
   - een medewerkerrij aanklikken -> markering verspringt en het
     verhaalpaneel eronder toont het verhaal van die medewerker;
   - maand ‹ › in de topbar wisselt het maandlabel en de filterchip.
   Verder verandert er niets: geen echte acties, geen server.
   ------------------------------------------------------------------ */
(function () {
  var CHECK = '<path d="M5 13l4 4L19 7"/>';
  var PLANE = '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>';
  var WARN = '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>';
  var PAUSE = '<path d="M9 5v14M15 5v14"/>';
  var SEARCH = '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>';
  var DOC = '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5M9 13h6M9 17h6"/>';

  var MONTHS = ['Juli 2026', 'Augustus 2026', 'September 2026', 'Oktober 2026'];
  var state = { month: 2, emp: 'shawn' };

  var EMP = {
    shawn: {
      name: 'Shawn–Douglas Nahar', role: 'Consultant', av: 'SN',
      started: '31 aug 2026', status: 'In behandeling', statusClass: 'amber',
      cards: [
        { c: 'done', ic: CHECK, h: 'Uren goedgekeurd', wk: 'Week 36 · 31 aug – 6 sep 2026',
          p: 'Alle uren zijn geregistreerd en goedgekeurd door Shawn–Douglas Nahar.',
          ts: '02 sep 2026 · 09:12', pill: 'Gereed', pc: 'ok' },
        { c: 'done', ic: PLANE, h: 'Klanturenstaat direct gemaild',
          p: 'De klanturenstaat is rechtstreeks per e-mail naar de klant verzonden.',
          ts: '02 sep 2026 · 09:17', pill: 'Gereed', pc: 'ok' },
        { c: 'warn', ic: WARN, h: 'Extern bevestigen ontbreekt',
          p: 'Backoffice wacht op externe bevestiging van de klanturenstaat door de klant.',
          ts: '02 sep 2026 · 09:27', pill: 'Actie vereist', pc: 'warn' },
        { c: 'paused', ic: PAUSE, h: 'Factuurconcept gepauzeerd',
          p: 'Het factuurconcept is aangemaakt, maar in de wacht gezet totdat de externe bevestiging is ontvangen.',
          reason: 'Klanturenstaat niet rechtstreeks gemaild',
          ts: '02 sep 2026 · 09:35', pill: 'In behandeling', pc: 'warn',
          cta: 'Verhaal vervolgen: extern bevestigen' }
      ]
    },
    marc: {
      name: 'Marc de Roon', role: 'Finance', av: 'MR',
      started: '31 aug 2026', status: 'Wachten op extern', statusClass: 'muted',
      cards: [
        { c: 'done', ic: CHECK, h: 'Uren goedgekeurd', wk: 'Week 36 · 31 aug – 6 sep 2026',
          p: 'Alle uren zijn geregistreerd en goedgekeurd door Marc de Roon.',
          ts: '01 sep 2026 · 16:40', pill: 'Gereed', pc: 'ok' },
        { c: 'done', ic: PLANE, h: 'Klanturenstaat direct gemaild',
          p: 'De klanturenstaat is rechtstreeks per e-mail naar de klant verzonden.',
          ts: '02 sep 2026 · 08:55', pill: 'Gereed', pc: 'ok' },
        { c: 'warn', ic: WARN, h: 'Extern bevestigen ontbreekt',
          p: 'De klant heeft de klanturenstaat nog niet bevestigd. Backoffice kan een herinnering sturen.',
          ts: '02 sep 2026 · 09:05', pill: 'Actie vereist', pc: 'warn',
          cta: 'Verhaal vervolgen: herinnering sturen' },
        { c: 'done', ic: DOC, h: 'Factuur nog niet gestart',
          p: 'Het factuurconcept begint zodra de externe bevestiging binnen is.',
          ts: '—', pill: 'Nog niet gestart', pc: 'muted' }
      ]
    },
    brian: {
      name: 'Brian Hek', role: 'Consultancy', av: 'BH',
      started: '31 aug 2026', status: 'Concept gereed', statusClass: 'muted',
      cards: [
        { c: 'done', ic: CHECK, h: 'Uren goedgekeurd', wk: 'Week 36 · 31 aug – 6 sep 2026',
          p: 'Alle uren zijn geregistreerd en goedgekeurd door Brian Hek.',
          ts: '01 sep 2026 · 14:10', pill: 'Gereed', pc: 'ok' },
        { c: 'warn', ic: PLANE, h: 'Klanturenstaat concept gereed',
          p: 'Het concept staat klaar. Controleer en verstuur de klanturenstaat naar de klant.',
          ts: '02 sep 2026 · 09:20', pill: 'Actie vereist', pc: 'warn',
          cta: 'Verhaal vervolgen: klanturenstaat versturen' },
        { c: 'done', ic: WARN, h: 'Extern bevestigen nog niet gestart',
          p: 'Volgt zodra de klanturenstaat is verstuurd.',
          ts: '—', pill: 'Nog niet gestart', pc: 'muted' },
        { c: 'done', ic: DOC, h: 'Factuur nog niet gestart',
          p: 'Volgt na de externe bevestiging.',
          ts: '—', pill: 'Nog niet gestart', pc: 'muted' }
      ]
    },
    stasjo: {
      name: 'Stasjo van Bakel', role: 'IT', av: 'SB',
      started: '31 aug 2026', status: 'Registratie actief', statusClass: 'green',
      cards: [
        { c: 'warn', ic: SEARCH, h: 'Uren in registratie', wk: 'Week 36 · 31 aug – 6 sep 2026',
          p: 'Stasjo van Bakel vult de uren nog in. Nog niet ingediend ter controle.',
          ts: '02 sep 2026 · 09:30', pill: 'Loopt', pc: 'warn' },
        { c: 'done', ic: PLANE, h: 'Klanturenstaat nog niet gestart',
          p: 'Volgt na goedkeuring van de uren.',
          ts: '—', pill: 'Nog niet gestart', pc: 'muted' },
        { c: 'done', ic: WARN, h: 'Extern bevestigen nog niet gestart',
          p: 'Volgt na de klanturenstaat.',
          ts: '—', pill: 'Nog niet gestart', pc: 'muted' },
        { c: 'done', ic: DOC, h: 'Factuur nog niet gestart',
          p: 'Volgt na de externe bevestiging.',
          ts: '—', pill: 'Nog niet gestart', pc: 'muted' }
      ]
    }
  };
  var ORDER = ['shawn', 'marc', 'brian', 'stasjo'];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function renderStory() {
    var e = EMP[state.emp];
    if (!e) return;
    var head = document.querySelector('.story .story-head');
    if (head) {
      head.innerHTML =
        '<div class="who2"><span class="av">' + e.av + '</span>' +
        '<span><b>' + esc(e.name) + '</b><span>' + esc(e.role) + '</span></span></div>' +
        '<div class="meta"><b>Verhaal gestart</b>' + esc(e.started) + '</div>' +
        '<span class="grow"></span>' +
        '<div class="status">Huidige status<b>' + esc(e.status) + '</b></div>';
    }
    var cards = document.querySelector('.story .cards');
    if (cards) {
      cards.innerHTML = e.cards.map(function (c) {
        return '<article class="card ' + c.c + '">' +
          '<span class="ic"><svg viewBox="0 0 24 24">' + c.ic + '</svg></span>' +
          '<h3>' + esc(c.h) + '</h3>' +
          (c.wk ? '<div class="wk">' + esc(c.wk) + '</div>' : '') +
          '<p>' + esc(c.p) + '</p>' +
          (c.reason
            ? '<div class="reason"><label>Vereiste reden</label>' +
              '<select disabled aria-label="Vereiste reden"><option>' + esc(c.reason) + '</option></select></div>'
            : '') +
          '<div class="foot"><span class="ts">' + esc(c.ts) + '</span>' +
          '<span class="pill ' + c.pc + '">' + esc(c.pill) + '</span></div>' +
          (c.cta
            ? '<div class="story-cta"><button type="button">' +
              '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' + esc(c.cta) + '</button></div>'
            : '') +
          '</article>';
      }).join('');
    }
  }

  function renderQueue() {
    var rows = document.querySelectorAll('.queue .emp-row');
    Array.prototype.forEach.call(rows, function (row) {
      row.classList.toggle('is-selected', row.getAttribute('data-emp') === state.emp);
    });
  }

  function renderMonth() {
    var lbl = document.querySelector('.mbox .mlabel');
    if (lbl) lbl.textContent = MONTHS[state.month];
    var chip = document.querySelector('.ffilter span');
    if (chip) chip.textContent = MONTHS[state.month];
    var prev = document.querySelector('.mstep .nav.mprev');
    var next = document.querySelector('.mstep .nav.mnext');
    if (prev) prev.setAttribute('aria-disabled', String(state.month === 0));
    if (next) next.setAttribute('aria-disabled', String(state.month === MONTHS.length - 1));
  }

  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll('.queue .emp-row'), function (row) {
      function pick() {
        var key = row.getAttribute('data-emp');
        if (!key || !EMP[key]) return;
        state.emp = key;
        renderQueue();
        renderStory();
      }
      row.addEventListener('click', pick);
      row.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
      });
    });

    var prev = document.querySelector('.mstep .nav.mprev');
    var next = document.querySelector('.mstep .nav.mnext');
    if (prev) prev.addEventListener('click', function () {
      if (state.month > 0) { state.month--; renderMonth(); }
    });
    if (next) next.addEventListener('click', function () {
      if (state.month < MONTHS.length - 1) { state.month++; renderMonth(); }
    });
  }

  function init() {
    wire();
    renderQueue();
    renderStory();
    renderMonth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
