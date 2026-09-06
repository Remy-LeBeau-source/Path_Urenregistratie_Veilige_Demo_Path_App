'use strict';
/* ------------------------------------------------------------------
   PILOT-interactielaag voor de statische 1414-medewerkerpagina.
   Losstaand: geen import, geen fetch, geen gedeelde app-code. Alle
   data is vast (mockup-1:1) en leeft alleen in het geheugen van deze
   tab. CSP op TEST staat een same-origin <script src> toe; inline
   script niet, vandaar dit bestand.
   Wat het toevoegt aan de mockup-look:
   - maandkeuze in de topbar (Juli/Augustus = afgerond, September =
     lopend, Oktober = leeg);
   - uren invullen per dag met + / - (stappen van 30 min) en een vrij
     invoerveld; geen voorgevulde "0" die je eerst moet weghalen
     (leeg veld + placeholder, selecteert bij focus);
   - weektotaal dat meeloopt;
   - "Indienen ter controle" vergrendelt de maand;
   - Klanturenstaat-kaart toont het vinkje alleen als de staat echt
     is verzonden (afgeronde maanden), anders "wacht op Backoffice".
   ------------------------------------------------------------------ */
(function () {
  var C = 659.7; // omtrek ring: 2 * pi * 105

  var MONTHS = [
    { key: '2026-07', label: 'Juli 2026', weekLabel: 'Week 27', weekRange: '29 jun – 5 jul',
      dates: [29, 30, 1, 2, 3, 4, 5], days: [8, 8, 8, 8, 4, null, null], onIndex: -1,
      weeksFilled: 5, weeksTotal: 5, locked: true, kt: 'sent' },
    { key: '2026-08', label: 'Augustus 2026', weekLabel: 'Week 32', weekRange: '3 – 9 aug',
      dates: [3, 4, 5, 6, 7, 8, 9], days: [8, 8, 7.5, 8, 6, null, null], onIndex: -1,
      weeksFilled: 5, weeksTotal: 5, locked: true, kt: 'sent' },
    { key: '2026-09', label: 'September 2026', weekLabel: 'Week 36', weekRange: '31 aug – 6 sep',
      dates: [31, 1, 2, 3, 4, 5, 6], days: [8, 8, 7, 7.3, null, null, null], onIndex: 2,
      weeksFilled: 1, weeksTotal: 5, locked: false, kt: 'pending' },
    { key: '2026-10', label: 'Oktober 2026', weekLabel: 'Week 40', weekRange: '28 sep – 4 okt',
      dates: [28, 29, 30, 1, 2, 3, 4], days: [null, null, null, null, null, null, null], onIndex: -1,
      weeksFilled: 0, weeksTotal: 5, locked: false, kt: 'pending' }
  ];
  var DOW = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
  var DOW_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

  var state = { monthKey: '2026-09' };

  function month() {
    for (var i = 0; i < MONTHS.length; i++) { if (MONTHS[i].key === state.monthKey) return MONTHS[i]; }
    return MONTHS[2];
  }
  function clamp(v) { return Math.max(0, Math.min(24, v)); }
  function parse(str) {
    if (str == null) return null;
    var s = String(str).trim().replace(',', '.');
    if (s === '') return null;
    var n = parseFloat(s);
    if (isNaN(n)) return null;
    return clamp(n);
  }
  function fmt(v) { return v == null ? '' : v.toFixed(2).replace('.', ','); }
  function total(days) {
    var t = 0;
    for (var i = 0; i < days.length; i++) { t += (days[i] == null ? 0 : days[i]); }
    return t;
  }

  /* ---------- maandkeuze ---------- */
  function buildMonthPicker() {
    var wrap = document.querySelector('.monthwrap');
    if (!wrap) return;
    var btn = wrap.querySelector('.monthpick');
    var menu = wrap.querySelector('.monthmenu');
    if (!btn || !menu) return;

    menu.innerHTML = MONTHS.map(function (m) {
      return '<li role="option" data-key="' + m.key + '" aria-selected="' +
        (m.key === state.monthKey) + '">' + m.label + '</li>';
    }).join('');

    function close() {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hasAttribute('hidden')) {
        menu.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        close();
      }
    });
    menu.addEventListener('click', function (e) {
      var li = e.target.closest('li[data-key]');
      if (!li) return;
      state.monthKey = li.getAttribute('data-key');
      close();
      render();
    });
    document.addEventListener('click', function () {
      if (!menu.hasAttribute('hidden')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hasAttribute('hidden')) close();
    });
  }

  function renderMonthLabel() {
    var lbl = document.querySelector('.monthpick .mlabel');
    if (lbl) lbl.textContent = month().label;
    var menu = document.querySelector('.monthmenu');
    if (menu) {
      Array.prototype.forEach.call(menu.querySelectorAll('li'), function (li) {
        li.setAttribute('aria-selected', String(li.getAttribute('data-key') === state.monthKey));
      });
    }
  }

  /* ---------- weekkaart ---------- */
  function renderWeek() {
    var m = month();

    var wh = document.querySelector('.week .wh');
    if (wh) wh.innerHTML = '<b>' + m.weekLabel + '</b><span>' + m.weekRange + '</span>';

    var ul = document.querySelector('.week ul');
    if (ul) {
      ul.innerHTML = m.days.map(function (v, i) {
        var cls = i === m.onIndex ? ' class="on"' : (v == null ? ' class="off"' : '');
        var left = '<span class="d">' + DOW[i] + ' <b>' + m.dates[i] + '</b></span>';
        var right;
        if (m.locked) {
          right = '<span class="h">' + (v == null ? '—' : fmt(v)) + '</span>';
        } else {
          right = '<span class="ctrl">' +
            '<button type="button" class="st mns" data-i="' + i + '" aria-label="30 minuten eraf voor ' + DOW_LONG[i] + '">–</button>' +
            '<input class="hin" type="text" inputmode="decimal" data-i="' + i + '" placeholder="0,00" ' +
            'aria-label="Uren ' + DOW_LONG[i] + ' ' + m.dates[i] + '" value="' + fmt(v) + '">' +
            '<button type="button" class="st pls" data-i="' + i + '" aria-label="30 minuten erbij voor ' + DOW_LONG[i] + '">+</button>' +
            '</span>';
        }
        return '<li' + cls + '>' + left + right + '</li>';
      }).join('');
    }

    var tval = document.querySelector('.week .total .tval');
    if (tval) tval.textContent = fmt(total(m.days));

    var actions = document.querySelector('.week .actions');
    if (actions) {
      if (m.locked) {
        actions.innerHTML = '<div class="done" tabindex="-1">✓ Ingediend · Backoffice controleert je uren</div>';
      } else {
        actions.innerHTML =
          '<button class="overview" type="button">' +
          '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Weekoverzicht</button>' +
          '<button class="submit" type="button">Indienen ter controle</button>';
      }
    }
    wireWeek();
  }

  function updateTotal() {
    var t = document.querySelector('.week .total .tval');
    if (t) t.textContent = fmt(total(month().days));
  }

  function wireWeek() {
    var m = month();
    if (m.locked) return;

    Array.prototype.forEach.call(document.querySelectorAll('.week .hin'), function (inp) {
      inp.addEventListener('focus', function () { try { inp.select(); } catch (e) {} });
      inp.addEventListener('input', function () {
        m.days[+inp.getAttribute('data-i')] = parse(inp.value);
        updateTotal();
      });
      inp.addEventListener('blur', function () {
        inp.value = fmt(m.days[+inp.getAttribute('data-i')]);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.week .st'), function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-i');
        var cur = m.days[i] == null ? 0 : m.days[i];
        var step = b.classList.contains('pls') ? 0.5 : -0.5;
        cur = clamp(Math.round((cur + step) * 100) / 100);
        m.days[i] = cur;
        var inp = document.querySelector('.week .hin[data-i="' + i + '"]');
        if (inp) inp.value = fmt(cur);
        updateTotal();
      });
    });

    var sub = document.querySelector('.week .submit');
    if (sub) {
      sub.addEventListener('click', function () {
        m.locked = true;
        m.weeksFilled = m.weeksTotal;
        m.kt = 'review';
        render();
        var note = document.querySelector('.week .done');
        if (note) { try { note.focus(); } catch (e) {} }
      });
    }
  }

  /* ---------- voortgangsmeter (in weken) ---------- */
  function renderGauge() {
    var m = month();
    var frac = m.weeksTotal ? m.weeksFilled / m.weeksTotal : 0;

    var val = document.querySelector('.gauge .ring .val');
    if (val) val.style.strokeDashoffset = String(Math.round(C * (1 - frac) * 10) / 10);

    var num = document.querySelector('.gauge .ring .num');
    if (num) num.textContent = String(m.weeksFilled);

    var of = document.querySelector('.gauge .ring .of');
    if (of) of.innerHTML = '/ ' + m.weeksTotal + ' <span class="g">weken</span>';

    var rest = document.querySelector('.gauge .rest');
    if (rest) {
      rest.textContent = m.weeksFilled >= m.weeksTotal
        ? 'Alle weken van deze maand zijn ingevuld'
        : 'Nog ' + (m.weeksTotal - m.weeksFilled) + ' weken te gaan deze maand';
    }

    var bar = document.querySelector('.gauge .bar i');
    if (bar) bar.style.width = Math.round(frac * 100) + '%';

    var pct = document.querySelector('.gauge .pct');
    if (pct) pct.textContent = Math.round(frac * 100) + '%';
  }

  /* ---------- Klanturenstaat-kaart ---------- */
  function renderKt() {
    var m = month();
    var kt = document.querySelector('.kt');
    if (!kt) return;
    kt.setAttribute('data-state', m.kt);

    var p = kt.querySelector('.txt p');
    var check = kt.querySelector('.check');
    var cta = kt.querySelector('.cta .lbl');

    if (m.kt === 'sent') {
      if (p) p.textContent = 'Gereed en verzonden via e-mail.';
      if (check) check.hidden = false;
      if (cta) cta.textContent = 'Bekijk klanturenstaat';
    } else if (m.kt === 'review') {
      if (p) p.textContent = 'Ingediend — Backoffice controleert je uren.';
      if (check) check.hidden = true;
      if (cta) cta.textContent = 'Voorbeeld klanturenstaat';
    } else {
      if (p) p.textContent = 'Nog niet verstuurd — volgt na je indiening.';
      if (check) check.hidden = true;
      if (cta) cta.textContent = 'Voorbeeld klanturenstaat';
    }
  }

  function render() {
    renderMonthLabel();
    renderWeek();
    renderGauge();
    renderKt();
  }

  function wireHero() {
    var go = document.querySelector('.hero .go');
    if (!go) return;
    go.addEventListener('click', function () {
      var week = document.querySelector('.week');
      if (week && week.scrollIntoView) week.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = document.querySelector('.week .hin');
      if (first) { try { first.focus(); first.select(); } catch (e) {} }
    });
  }

  function init() {
    buildMonthPicker();
    wireHero();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
