'use strict';
/* ------------------------------------------------------------------
   PILOT-interactielaag voor de 1414-medewerkerpagina.
   Losstaand: geen import, geen fetch, geen gedeelde app-code. Alle
   data is vast (mockup-1:1) en leeft alleen in het geheugen van deze
   tab. CSP op TEST staat een same-origin <script src> toe; inline
   script niet, vandaar dit bestand.

   Wat het toevoegt aan de mockup-look:
   - maandkeuze in de topbar (Juli/Augustus = afgerond, September =
     lopend, Oktober = leeg);
   - per maand ALLE weken, met een ‹ › weeknavigatie in de weekkaart;
   - uren invullen per dag met - / + (stappen van 30 min) en een vrij
     invoerveld; geen voorgevulde "0" die je eerst moet weghalen
     (leeg veld + placeholder, selecteert bij focus);
   - weektotaal dat meeloopt;
   - "Indienen ter controle" dient de getoonde week in en springt naar
     de volgende open week; de wekenmeter telt de ingediende weken;
   - Klanturenstaat-kaart toont het vinkje alleen als de staat echt is
     verzonden (afgeronde maanden), anders "wacht op Backoffice".
   ------------------------------------------------------------------ */
(function () {
  var C = 659.7; // omtrek ring: 2 * pi * 105

  function row(a, b, c, d, e, f, g) { return [a, b, c, d, e, f, g]; }
  function empty() { return [null, null, null, null, null, null, null]; }

  function week(label, range, dates, days, onIndex, submitted) {
    return {
      label: label, range: range, dates: dates, days: days,
      onIndex: (onIndex == null ? -1 : onIndex), submitted: !!submitted
    };
  }

  var MONTHS = [
    { key: '2026-07', label: 'Juli 2026', kt: 'sent', past: true, weeks: [
      week('Week 27', '29 jun – 5 jul', row(29, 30, 1, 2, 3, 4, 5), row(8, 8, 8, 8, 8, null, null), -1, true),
      week('Week 28', '6 – 12 jul', row(6, 7, 8, 9, 10, 11, 12), row(8, 8, 8, 8, 4, null, null), -1, true),
      week('Week 29', '13 – 19 jul', row(13, 14, 15, 16, 17, 18, 19), row(8, 8, 8, 8, 8, null, null), -1, true),
      week('Week 30', '20 – 26 jul', row(20, 21, 22, 23, 24, 25, 26), row(8, 8, 8, 8, 6, null, null), -1, true),
      week('Week 31', '27 jul – 2 aug', row(27, 28, 29, 30, 31, 1, 2), row(8, 8, 8, 8, 8, null, null), -1, true)
    ] },
    { key: '2026-08', label: 'Augustus 2026', kt: 'sent', past: true, weeks: [
      week('Week 32', '3 – 9 aug', row(3, 4, 5, 6, 7, 8, 9), row(8, 8, 8, 8, 8, null, null), -1, true),
      week('Week 33', '10 – 16 aug', row(10, 11, 12, 13, 14, 15, 16), row(8, 8, 8, 8, 6, null, null), -1, true),
      week('Week 34', '17 – 23 aug', row(17, 18, 19, 20, 21, 22, 23), row(8, 8, 8, 8, 8, null, null), -1, true),
      week('Week 35', '24 – 30 aug', row(24, 25, 26, 27, 28, 29, 30), row(8, 8, 8, 8, 4, null, null), -1, true),
      week('Week 36', '31 aug – 6 sep', row(31, 1, 2, 3, 4, 5, 6), row(8, 8, 4, null, null, null, null), -1, true)
    ] },
    { key: '2026-09', label: 'September 2026', kt: 'pending', past: false, weeks: [
      week('Week 36', '31 aug – 6 sep', row(31, 1, 2, 3, 4, 5, 6), row(8, 8, 7, 7.5, null, null, null), 2, false),
      week('Week 37', '7 – 13 sep', row(7, 8, 9, 10, 11, 12, 13), empty(), -1, false),
      week('Week 38', '14 – 20 sep', row(14, 15, 16, 17, 18, 19, 20), empty(), -1, false),
      week('Week 39', '21 – 27 sep', row(21, 22, 23, 24, 25, 26, 27), empty(), -1, false),
      week('Week 40', '28 sep – 4 okt', row(28, 29, 30, 1, 2, 3, 4), empty(), -1, false)
    ] },
    { key: '2026-10', label: 'Oktober 2026', kt: 'pending', past: false, weeks: [
      week('Week 40', '28 sep – 4 okt', row(28, 29, 30, 1, 2, 3, 4), empty(), -1, false),
      week('Week 41', '5 – 11 okt', row(5, 6, 7, 8, 9, 10, 11), empty(), -1, false),
      week('Week 42', '12 – 18 okt', row(12, 13, 14, 15, 16, 17, 18), empty(), -1, false),
      week('Week 43', '19 – 25 okt', row(19, 20, 21, 22, 23, 24, 25), empty(), -1, false),
      week('Week 44', '26 okt – 1 nov', row(26, 27, 28, 29, 30, 31, 1), empty(), -1, false)
    ] }
  ];
  var DOW = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
  var DOW_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  var QUICK = ['8', '9']; // snelkeuze voor de twee veelgebruikte urenwaarden

  var state = { monthKey: '2026-09', weekIndex: 0 };

  function month() {
    for (var i = 0; i < MONTHS.length; i++) { if (MONTHS[i].key === state.monthKey) return MONTHS[i]; }
    return MONTHS[2];
  }
  function curWeek() { return month().weeks[state.weekIndex]; }
  function filledCount(m) {
    var n = 0;
    for (var i = 0; i < m.weeks.length; i++) { if (m.weeks[i].submitted) n++; }
    return n;
  }
  function firstOpen(m) {
    for (var i = 0; i < m.weeks.length; i++) { if (!m.weeks[i].submitted) return i; }
    return 0;
  }
  function weekReadOnly() { return month().past || curWeek().submitted; }
  function clamp(v) { return Math.max(0, Math.min(24, v)); }
  function parse(s) {
    if (s == null) return null;
    s = String(s).trim().replace(',', '.');
    if (s === '') return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : clamp(n);
  }
  function fmt(v) { return v == null ? '' : v.toFixed(2).replace('.', ','); }
  function sum(days) {
    var t = 0;
    for (var i = 0; i < days.length; i++) { t += (days[i] == null ? 0 : days[i]); }
    return t;
  }

  /* ---------- maandkeuze: vorige / volgende met pijltjes ---------- */
  function monthIndex() {
    for (var i = 0; i < MONTHS.length; i++) { if (MONTHS[i].key === state.monthKey) return i; }
    return 0;
  }
  function goMonth(delta) {
    var i = monthIndex() + delta;
    if (i < 0 || i > MONTHS.length - 1) return;
    state.monthKey = MONTHS[i].key;
    state.weekIndex = firstOpen(month());
    render();
  }
  function buildMonthNav() {
    var wrap = document.querySelector('.monthwrap');
    if (!wrap) return;
    var prev = wrap.querySelector('.mprev');
    var next = wrap.querySelector('.mnext');
    if (prev) prev.addEventListener('click', function () { goMonth(-1); });
    if (next) next.addEventListener('click', function () { goMonth(1); });
  }

  function renderMonthLabel() {
    var lbl = document.querySelector('.monthpick .mlabel');
    if (lbl) lbl.textContent = month().label;
    var i = monthIndex();
    var prev = document.querySelector('.monthwrap .mprev');
    var next = document.querySelector('.monthwrap .mnext');
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === MONTHS.length - 1;
  }

  /* ---------- weekkaart ---------- */
  function renderWeek() {
    var m = month();
    var w = curWeek();
    var last = m.weeks.length - 1;
    var ro = weekReadOnly();

    var wh = document.querySelector('.week .wh');
    if (wh) {
      wh.innerHTML =
        '<div class="wknav">' +
        '<button type="button" class="wnav-btn wprev" aria-label="Vorige week"' + (state.weekIndex === 0 ? ' disabled' : '') + '>‹</button>' +
        '<div><b>' + w.label + '</b><span>' + w.range + '</span></div>' +
        '<button type="button" class="wnav-btn wnext" aria-label="Volgende week"' + (state.weekIndex === last ? ' disabled' : '') + '>›</button>' +
        '</div>';
    }

    var ul = document.querySelector('.week ul');
    if (ul) {
      ul.innerHTML = w.days.map(function (v, i) {
        var cls = i === w.onIndex ? ' class="on"' : (v == null ? ' class="off"' : '');
        var left = '<span class="d">' + DOW[i] + ' <b>' + w.dates[i] + '</b></span>';
        var right, quick = '';
        if (ro) {
          right = '<span class="h">' + (v == null ? '—' : fmt(v)) + '</span>';
        } else {
          right = '<span class="ctrl">' +
            '<button type="button" class="st mns" data-i="' + i + '" aria-label="30 minuten eraf voor ' + DOW_LONG[i] + '">–</button>' +
            '<input class="hin" type="text" inputmode="decimal" data-i="' + i + '" placeholder="0,00" ' +
            'aria-label="Uren ' + DOW_LONG[i] + ' ' + w.dates[i] + '" value="' + fmt(v) + '">' +
            '<button type="button" class="st pls" data-i="' + i + '" aria-label="30 minuten erbij voor ' + DOW_LONG[i] + '">+</button>' +
            '</span>';
          quick = '<span class="quick">' + QUICK.map(function (qv) {
            return '<button type="button" class="q" data-i="' + i + '" data-v="' + qv + '" tabindex="-1" aria-label="' + qv + ' uur voor ' + DOW_LONG[i] + '">' + qv + '</button>';
          }).join('') + '</span>';
        }
        return '<li' + cls + '>' + left + right + quick + '</li>';
      }).join('');
    }

    var tval = document.querySelector('.week .total .tval');
    if (tval) tval.textContent = fmt(sum(w.days));

    var actions = document.querySelector('.week .actions');
    if (actions) {
      if (m.past) {
        actions.innerHTML = '<div class="done" tabindex="-1">✓ Maand afgerond · klanturenstaat verzonden</div>';
      } else if (w.submitted) {
        actions.innerHTML = '<div class="done" tabindex="-1">✓ Week ingediend · Backoffice controleert je uren</div>';
      } else {
        actions.innerHTML =
          '<button class="overview" type="button">' +
          '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Weekoverzicht</button>' +
          '<button class="save" type="button" title="Bewaar deze week als concept">↓ Opslaan</button>' +
          '<button class="submit" type="button" title="Dien deze week in bij Backoffice">✓ Indienen ter controle</button>';
      }
    }

    wireWeek();
  }

  function updateTotal() {
    var t = document.querySelector('.week .total .tval');
    if (t) t.textContent = fmt(sum(curWeek().days));
  }

  function wireWeek() {
    var prev = document.querySelector('.week .wprev');
    if (prev) prev.addEventListener('click', function () {
      if (state.weekIndex > 0) { state.weekIndex--; render(); }
    });
    var next = document.querySelector('.week .wnext');
    if (next) next.addEventListener('click', function () {
      if (state.weekIndex < month().weeks.length - 1) { state.weekIndex++; render(); }
    });

    if (weekReadOnly()) return;
    var w = curWeek();

    Array.prototype.forEach.call(document.querySelectorAll('.week .hin'), function (inp) {
      inp.addEventListener('focus', function () { try { inp.select(); } catch (e) {} });
      inp.addEventListener('input', function () {
        w.days[+inp.getAttribute('data-i')] = parse(inp.value);
        updateTotal();
      });
      inp.addEventListener('blur', function () {
        inp.value = fmt(w.days[+inp.getAttribute('data-i')]);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.week .st'), function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-i');
        var cur = w.days[i] == null ? 0 : w.days[i];
        var step = b.classList.contains('pls') ? 0.5 : -0.5;
        cur = clamp(Math.round((cur + step) * 100) / 100);
        w.days[i] = cur;
        var inp = document.querySelector('.week .hin[data-i="' + i + '"]');
        if (inp) inp.value = fmt(cur);
        updateTotal();
      });
    });

    // Snelkeuze: veelgebruikte urenwaarden in één tik (focus blijft op het veld)
    Array.prototype.forEach.call(document.querySelectorAll('.week .q'), function (q) {
      q.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var i = +q.getAttribute('data-i');
        w.days[i] = parse(q.getAttribute('data-v'));
        var inp = document.querySelector('.week .hin[data-i="' + i + '"]');
        if (inp) { inp.value = fmt(w.days[i]); try { inp.focus(); } catch (e2) {} }
        updateTotal();
      });
    });

    var save = document.querySelector('.week .save');
    if (save) {
      save.addEventListener('click', function () {
        var box = document.querySelector('.week .actions');
        if (!box || box.querySelector('.saved-note')) return;
        // Persistente bevestiging bóven de knoppen. De knoppen blijven staan
        // (geen focus-verstoring), de melding verdwijnt bij de volgende
        // hertekening van de weekkaart (week/maand wisselen).
        var note = document.createElement('div');
        note.className = 'done saved-note';
        note.textContent = '✓ Opgeslagen — je kunt later verder';
        box.insertBefore(note, box.firstChild);
      });
    }

    var sub = document.querySelector('.week .submit');
    if (sub) {
      sub.addEventListener('click', function () {
        var m = month();
        w.submitted = true;
        if (filledCount(m) > 0 && m.kt === 'pending') m.kt = 'review';
        var open = firstOpen(m);
        if (!m.weeks[open].submitted) state.weekIndex = open;
        render();
        var note = document.querySelector('.week .done');
        if (note) { try { note.focus(); } catch (e) {} }
      });
    }
  }

  /* ---------- voortgangsmeter (in weken) ---------- */
  function renderGauge() {
    var m = month();
    var filled = filledCount(m);
    var totalWeeks = m.weeks.length;
    var frac = totalWeeks ? filled / totalWeeks : 0;

    var val = document.querySelector('.gauge .ring .val');
    if (val) val.style.strokeDashoffset = String(Math.round(C * (1 - frac) * 10) / 10);

    var num = document.querySelector('.gauge .ring .num');
    if (num) num.textContent = String(filled);

    var of = document.querySelector('.gauge .ring .of');
    if (of) of.innerHTML = '/ ' + totalWeeks + ' <span class="g">weken</span>';

    var rest = document.querySelector('.gauge .rest');
    if (rest) {
      rest.textContent = filled >= totalWeeks
        ? 'Alle weken van deze maand zijn ingediend'
        : 'Nog ' + (totalWeeks - filled) + ' weken te gaan deze maand';
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
    var icon = kt.querySelector('.cta .send');
    var PLANE = '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>';
    var UPLOAD = '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>';

    if (m.kt === 'sent') {
      if (p) p.textContent = 'Gereed en verzonden via e-mail.';
      if (check) check.hidden = false;
      if (cta) cta.textContent = 'Bekijk klanturenstaat';
      if (icon) icon.innerHTML = PLANE;
    } else if (m.kt === 'review') {
      if (p) p.textContent = 'Ingediend — Backoffice controleert je uren.';
      if (check) check.hidden = true;
      if (cta) cta.textContent = 'Voorbeeld klanturenstaat';
      if (icon) icon.innerHTML = PLANE;
    } else {
      if (p) p.textContent = 'Nog niet verstuurd — voeg de klanturenstaat toe of wacht op Backoffice.';
      if (check) check.hidden = true;
      if (cta) cta.textContent = 'Klanturenstaat toevoegen';
      if (icon) icon.innerHTML = UPLOAD;
    }
  }

  /* ---------- 4-stappenstrip: status volgt de voortgang ---------- */
  var STEP_ICONS = null;
  var STEP_CHECK = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';
  function renderSteps() {
    var m = month();
    var filled = filledCount(m);
    var complete, current;
    if (m.kt === 'sent') { complete = 4; current = -1; }              // maand afgerond
    else if (filled >= m.weeks.length) { complete = 2; current = 2; } // alle weken ingediend -> wacht op Backoffice-controle
    else if (m.kt === 'review' || filled > 0) { complete = 1; current = 1; } // eerste week ingediend
    else { complete = 0; current = 0; }                               // nog aan het invullen

    var lis = document.querySelectorAll('.steps li');
    if (!STEP_ICONS && lis.length) {
      STEP_ICONS = [];
      for (var k = 0; k < lis.length; k++) {
        var ic0 = lis[k].querySelector('.ic');
        STEP_ICONS[k] = ic0 ? ic0.innerHTML : '';
      }
    }
    for (var i = 0; i < lis.length; i++) {
      var done = i < complete;
      lis[i].classList.toggle('is-done', done);
      lis[i].classList.toggle('is-current', i === current);
      var ic = lis[i].querySelector('.ic');
      if (ic && STEP_ICONS) ic.innerHTML = done ? STEP_CHECK : STEP_ICONS[i];
    }
  }

  function render() {
    renderMonthLabel();
    renderWeek();
    renderGauge();
    renderKt();
    renderSteps();
  }

  function wireHero() {
    var go = document.querySelector('.hero .go');
    if (!go) return;
    go.addEventListener('click', function () {
      var wk = document.querySelector('.week');
      if (wk && wk.scrollIntoView) wk.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = document.querySelector('.week .hin');
      if (first) { try { first.focus(); first.select(); } catch (e) {} }
    });
  }

  function init() {
    buildMonthNav();
    wireHero();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
