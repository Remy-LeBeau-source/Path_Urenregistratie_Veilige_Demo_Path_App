(() => {
  'use strict';

  const AMSTERDAM = 'Europe/Amsterdam';
  const API = {
    me: '/server/auth/me.php',
    csrf: '/server/auth/csrf.php',
    logout: '/server/auth/logout.php',
    bootstrap: '/server/api/bootstrap.php',
    timesheets: '/server/api/timesheets.php',
    customerTimesheets: '/server/api/customer-timesheets.php',
  };

  const state = {
    user: null,
    csrf: '',
    company: null,
    employee: null,
    assignment: null,
    periods: [],
    period: '',
    weeks: [],
    weekIndex: 0,
    timesheet: null,
    customerTimesheet: null,
    loading: false,
  };

  const monthFormatter = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric', timeZone: AMSTERDAM });
  const dateFormatter = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: AMSTERDAM });
  const numberFormatter = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const safeDownloadUrl = (value) => {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return url.origin === window.location.origin && url.pathname === '/server/api/customer-timesheets.php'
        ? `${url.pathname}${url.search}` : '';
    } catch { return ''; }
  };

  const currentPeriod = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: AMSTERDAM, year: 'numeric', month: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    return `${year}-${month}`;
  };

  const periodDate = (period) => {
    const [year, month] = String(period).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1, 12));
  };

  const periodLabel = (period) => {
    const label = monthFormatter.format(periodDate(period));
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const toIsoDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDays = (date, amount) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
  };

  const mondayOf = (date) => {
    const day = date.getUTCDay() || 7;
    return addDays(date, 1 - day);
  };

  const buildWeeks = (period) => {
    const [year, month] = period.split('-').map(Number);
    const first = new Date(Date.UTC(year, month - 1, 1, 12));
    const last = new Date(Date.UTC(year, month, 0, 12));
    const weeks = [];
    for (let cursor = mondayOf(first); cursor <= last; cursor = addDays(cursor, 7)) {
      weeks.push(Array.from({ length: 5 }, (_, index) => {
        const date = addDays(cursor, index);
        return { date, iso: toIsoDate(date), inPeriod: date.getUTCMonth() === month - 1 };
      }));
    }
    return weeks;
  };

  const businessDays = (period) => buildWeeks(period).flat().filter((day) => day.inPeriod).length;
  const contractHours = () => {
    if (state.timesheet?.contractual_hours !== undefined) return Number(state.timesheet.contractual_hours) || 0;
    const weekly = Number(state.employee?.weekly_contract_hours) || 40;
    return Math.round((businessDays(state.period) * weekly / 5) * 100) / 100;
  };

  const entries = () => Array.isArray(state.timesheet?.day_entries) ? state.timesheet.day_entries : [];
  const entryFor = (iso) => entries().find((entry) => String(entry.work_date) === iso) || null;
  const totalHours = () => Math.round(entries().reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0) * 100) / 100;
  const filledDays = () => new Set(entries().filter((entry) => Number(entry.hours) > 0).map((entry) => entry.work_date)).size;
  const timesheetStatus = () => String(state.timesheet?.status || 'draft');
  const documentStatus = () => String(state.customerTimesheet?.status || 'missing');
  const externallyConfirmed = () => documentStatus() === 'skipped' && String(state.customerTimesheet?.review_note || '').startsWith('Extern bevestigd:');
  const directlyMailed = () => documentStatus() === 'skipped' && !externallyConfirmed();
  const hoursEditable = () => ['draft', 'correction'].includes(timesheetStatus());
  const documentEditable = () => ['missing', 'draft', 'resubmit'].includes(documentStatus());

  const customerStatusView = () => {
    if (externallyConfirmed()) return { label: 'Extern bevestigd door Backoffice', tone: 'done' };
    const views = {
      missing: ['Nog aanleveren', 'waiting'], draft: ['Concept opgeslagen', 'waiting'],
      resubmit: ['Nieuwe versie gevraagd', 'waiting'], received: ['Bij Backoffice', 'active'],
      approved: ['Goedgekeurd', 'done'], sent: ['Verzonden', 'done'], sent_to_broker: ['Verzonden', 'done'],
      skipped: ['Rechtstreeks gemaild · bevestiging nodig', 'waiting'],
    };
    const [label, tone] = views[documentStatus()] || views.missing;
    return { label, tone };
  };

  const hoursStatusView = () => {
    const views = {
      draft: ['Concept', 'waiting'], correction: ['Correctie gevraagd', 'waiting'],
      submitted: ['Ingediend · wacht op Backoffice', 'active'], approved: ['Goedgekeurd', 'done'],
      invoiced: ['Afgerond', 'done'], rejected: ['Geblokkeerd', 'waiting'],
    };
    const [label, tone] = views[timesheetStatus()] || views.draft;
    return { label, tone };
  };

  const apiJson = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) {
      const error = new Error(String(body?.message || `De server gaf HTTP ${response.status}.`));
      error.status = response.status;
      error.code = String(body?.error || 'request-failed');
      throw error;
    }
    return body;
  };

  const csrf = async () => {
    if (state.csrf) return state.csrf;
    const body = await apiJson(API.csrf);
    state.csrf = String(body.csrf_token || '');
    if (!state.csrf) throw new Error('Beveiligingstoken ontbreekt. Ververs de pagina.');
    return state.csrf;
  };

  const setBusy = (busy) => {
    state.loading = busy;
    document.body.classList.toggle('portal-refreshing', busy);
    document.querySelectorAll('[data-portal-write]').forEach((button) => { button.disabled = busy; });
  };

  let toastTimer = 0;
  const toast = (message, error = false) => {
    const element = document.querySelector('.portal-toast');
    element.textContent = message;
    element.classList.toggle('error', error);
    element.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove('show'), 3300);
  };

  const placePopover = (popover, anchor) => {
    const rect = anchor.getBoundingClientRect();
    popover.style.left = `${Math.min(rect.left, window.innerWidth - popover.offsetWidth - 16)}px`;
    popover.style.top = `${rect.bottom + 8}px`;
  };

  const closePopovers = () => {
    document.querySelector('.portal-month-popover').hidden = true;
    document.querySelector('.portal-profile-popover').hidden = true;
  };

  const openDialog = (kind, content) => {
    const dialog = document.querySelector('.portal-dialog');
    dialog.dataset.kind = kind;
    dialog.innerHTML = content;
    document.querySelector('.portal-backdrop').classList.add('open');
    dialog.classList.add('open');
    dialog.setAttribute('aria-hidden', 'false');
    dialog.querySelector('input,select,button')?.focus();
  };

  const closeDialog = () => {
    document.querySelector('.portal-backdrop').classList.remove('open');
    const dialog = document.querySelector('.portal-dialog');
    dialog.classList.remove('open');
    dialog.setAttribute('aria-hidden', 'true');
  };

  const dialogHeader = (eyebrow, title) => `
    <div class="portal-dialog-head"><div><small>${escapeHtml(eyebrow)}</small><h2>${escapeHtml(title)}</h2></div>
    <button class="portal-close" type="button" data-close-dialog aria-label="Sluiten">×</button></div>`;

  const installChrome = () => {
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="portal-loading"><div class="portal-loader-card"><div class="portal-loader-mark"></div><strong>Jouw maand wordt geladen</strong></div></div>
      <div class="portal-gate" hidden><div class="portal-gate-card"><span class="eyebrow-c">Path medewerkerportal</span><h1></h1><p></p><a class="portal-primary" href="/">Naar veilig inloggen</a></div></div>`);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="portal-month-popover" hidden role="menu" aria-label="Kies een maand"></div>
      <div class="portal-profile-popover" hidden></div>
      <div class="portal-backdrop"></div>
      <section class="portal-dialog" role="dialog" aria-modal="true" aria-hidden="true"></section>
      <section class="portal-handoff" aria-hidden="true"><div class="portal-handoff-card"><small>Veilige overdracht</small><h2>Backoffice neemt het over</h2><p>Je uren zijn ingediend. Het dossier verschijnt bij de juiste volgende actie.</p><div class="portal-handoff-track"><span class="portal-handoff-live"></span><span class="portal-handoff-packet">✦</span></div></div></section>
      <div class="portal-toast" role="status" aria-live="polite"></div>`);
    document.querySelectorAll('.rail-curve path').forEach((path) => path.setAttribute('pathLength', '1'));
  };

  const showGate = (title, message, linkLabel = 'Naar veilig inloggen') => {
    document.querySelector('.portal-loading').hidden = true;
    const gate = document.querySelector('.portal-gate');
    gate.querySelector('h1').textContent = title;
    gate.querySelector('p').textContent = message;
    gate.querySelector('a').textContent = linkLabel;
    gate.hidden = false;
  };

  const initialiseSessionPeriod = () => {
    const userKey = String(state.user.id);
    const markerKey = 'path-1919-session-user';
    const periodKey = `path-1919-selected-period:${userKey}`;
    if (sessionStorage.getItem(markerKey) !== userKey) {
      sessionStorage.setItem(markerKey, userKey);
      sessionStorage.setItem(periodKey, currentPeriod());
    }
    const stored = String(sessionStorage.getItem(periodKey) || '');
    state.period = /^\d{4}-\d{2}$/.test(stored) && stored <= currentPeriod() ? stored : currentPeriod();
  };

  const saveSelectedPeriod = () => sessionStorage.setItem(`path-1919-selected-period:${state.user.id}`, state.period);

  const loadPeriod = async (period, { quiet = false } = {}) => {
    if (!quiet) setBusy(true);
    try {
      const employeeId = Number(state.employee.id);
      const assignmentId = Number(state.assignment?.id || 0);
      const params = new URLSearchParams({ period, employee_id: String(employeeId) });
      const customerParams = new URLSearchParams(params);
      if (assignmentId > 0) customerParams.set('assignment_id', String(assignmentId));
      const [timesheetResponse, customerResponse] = await Promise.all([
        apiJson(`${API.timesheets}?${params}`),
        apiJson(`${API.customerTimesheets}?${customerParams}`),
      ]);
      if (period !== state.period) return;
      state.timesheet = timesheetResponse.found ? timesheetResponse.timesheet : null;
      state.customerTimesheet = customerResponse.found ? customerResponse.customer_timesheet : null;
      state.weeks = buildWeeks(period);
      const now = new Date();
      const nowIso = new Intl.DateTimeFormat('en-CA', { timeZone: AMSTERDAM }).format(now);
      const activeWeek = state.weeks.findIndex((week) => week.some((day) => day.iso === nowIso));
      const entryWeek = state.weeks.findIndex((week) => week.some((day) => entryFor(day.iso)));
      state.weekIndex = activeWeek >= 0 ? activeWeek : (entryWeek >= 0 ? entryWeek : 0);
      render();
    } catch (error) {
      if (error.status === 401) {
        showGate('Log opnieuw in', 'Je sessie is verlopen. Log opnieuw in en open daarna de medewerkerportal.');
      } else {
        toast(error.message || 'De maand kon niet worden geladen.', true);
      }
    } finally {
      setBusy(false);
    }
  };

  const renderTopbar = () => {
    const topbar = document.querySelector('.topbar');
    topbar.querySelector('.pkg').innerHTML = '<b>Nieuwe portal</b> · Path Storyline — medewerker <span class="portal-env">TEST PILOT</span>';
    const oldChip = topbar.querySelector('.chip');
    const monthButton = document.createElement('button');
    monthButton.type = 'button';
    monthButton.className = 'chip';
    monthButton.id = 'pilot-month-button';
    monthButton.innerHTML = `${oldChip.querySelector('svg')?.outerHTML || ''}<span>${escapeHtml(periodLabel(state.period))}</span><span aria-hidden="true">⌄</span>`;
    oldChip.replaceWith(monthButton);

    const oldWho = topbar.querySelector('.who');
    const who = document.createElement('button');
    who.type = 'button';
    who.className = 'who';
    who.id = 'pilot-profile-button';
    const initials = String(state.user.display_name || '').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
    who.innerHTML = `<span class="av">${escapeHtml(initials)}</span><span>${escapeHtml(state.user.display_name)}</span><span aria-hidden="true">⌄</span>`;
    oldWho.replaceWith(who);

    const profile = document.querySelector('.portal-profile-popover');
    profile.innerHTML = `<strong>${escapeHtml(state.user.display_name)}</strong><small>${escapeHtml(state.user.email)}</small><hr>
      <a href="/">Bestaande app openen</a><button type="button" id="pilot-logout">Uitloggen</button>`;
  };

  const renderMonthMenu = () => {
    const current = currentPeriod();
    const keys = new Set(state.periods.map((period) => String(period.period_key || `${period.year}-${String(period.month).padStart(2, '0')}`)));
    keys.add(current);
    keys.add(state.period);
    const options = [...keys].filter((key) => /^\d{4}-\d{2}$/.test(key) && key <= current).sort().reverse();
    document.querySelector('.portal-month-popover').innerHTML = options.map((key) => `
      <button type="button" class="portal-month-option" role="menuitem" data-period="${key}" aria-current="${key === state.period}">
        <span>${escapeHtml(periodLabel(key))}</span><small>${key === current ? 'Actuele maand' : 'Eerdere maand'}</small>
      </button>`).join('');
  };

  const renderHero = () => {
    document.querySelector('.hero .eyebrow-c').textContent = periodLabel(state.period);
    document.querySelector('.hero h1').textContent = `Welkom, ${String(state.user.display_name || '').split(' ')[0]}`;
    const status = hoursStatusView();
    document.querySelector('.hero p').textContent = status.tone === 'done'
      ? `Je uren voor ${periodLabel(state.period).toLowerCase()} zijn afgerond.`
      : 'Registreer je uren per dag. Na indienen neemt Backoffice het veilig van je over.';
  };

  const renderWeek = () => {
    const section = document.querySelector('.chapter.navy');
    const week = state.weeks[state.weekIndex] || [];
    const first = week[0]?.date;
    const last = week[week.length - 1]?.date;
    const range = first && last ? `${dateFormatter.format(first)} – ${dateFormatter.format(last)}` : periodLabel(state.period);
    section.querySelector('.ch-eyebrow').textContent = `Week ${state.weekIndex + 1} · ${range}`;
    section.querySelector('h2').textContent = hoursEditable() ? 'Vul je uren in' : 'Jouw uren zijn ingediend';
    section.querySelector('.lead').textContent = hoursEditable()
      ? 'Open een werkdag, vul je uren in en sla tussentijds veilig op.'
      : 'Deze maand staat op slot. Backoffice controleert de ingediende uren.';
    const primary = section.querySelector('.btn-amber');
    primary.type = 'button';
    primary.dataset.openDay = week.find((day) => day.inPeriod && !entryFor(day.iso))?.iso || week.find((day) => day.inPeriod)?.iso || '';
    primary.disabled = !hoursEditable();
    primary.innerHTML = `${primary.querySelector('svg')?.outerHTML || ''}${hoursEditable() ? 'Werkdag invullen' : 'Ingediend bij Backoffice'}`;

    const weekElement = section.querySelector('.week');
    weekElement.innerHTML = week.map((day) => {
      const entry = day.inPeriod ? entryFor(day.iso) : null;
      const hours = Number(entry?.hours || 0);
      const labelParts = dateFormatter.formatToParts(day.date);
      const weekday = labelParts.find((part) => part.type === 'weekday')?.value || '';
      const dayNumber = labelParts.find((part) => part.type === 'day')?.value || '';
      const month = labelParts.find((part) => part.type === 'month')?.value || '';
      const empty = !entry || hours <= 0;
      const disabled = !day.inPeriod || !hoursEditable();
      return `<div class="day${day.inPeriod ? '' : ' outside'}"><div class="dh"><b>${escapeHtml(weekday.toUpperCase())}</b><span>${escapeHtml(`${dayNumber} ${month}`.toUpperCase())}</span></div>
        <button type="button" class="cell ${empty ? 'empty' : ''} ${disabled ? 'locked' : ''}" data-open-day="${day.iso}" ${disabled ? 'disabled' : ''}>
          <div class="h">${empty ? (day.inPeriod ? 'Nog leeg' : 'Andere maand') : `${numberFormatter.format(hours)} uur`}</div>
          <div class="u">${entry?.description ? escapeHtml(entry.description) : (day.inPeriod ? 'WERKDAG' : 'NIET IN DEZE MAAND')}</div>
        </button><div class="add">${disabled ? '' : '+ BEWERKEN'}</div></div>`;
    }).join('') + `<div class="day total"><div class="dh"><b>TOTAAL</b><span>&nbsp;</span></div><div class="cell"><div class="h">${numberFormatter.format(totalHours())}</div><div class="u">UREN</div></div></div>`;

    let tools = section.querySelector('.portal-week-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'portal-week-tools';
      weekElement.before(tools);
    }
    tools.innerHTML = `<button type="button" data-week-delta="-1" aria-label="Vorige week" ${state.weekIndex === 0 ? 'disabled' : ''}>←</button>
      <span>Week ${state.weekIndex + 1} van ${state.weeks.length}</span>
      <button type="button" data-week-delta="1" aria-label="Volgende week" ${state.weekIndex >= state.weeks.length - 1 ? 'disabled' : ''}>→</button>`;

    let summary = section.querySelector('.portal-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'portal-summary';
      section.querySelector('.ch-grid').after(summary);
    }
    const enabled = Boolean(Number(state.company?.leave_sick_entry_enabled));
    const tsStatus = hoursStatusView();
    const correction = timesheetStatus() === 'correction' ? String(state.timesheet?.review_note || state.timesheet?.latest_correction?.correction_message || '') : '';
    summary.innerHTML = `
      <div class="portal-summary-card"><small>Geregistreerd</small><strong>${numberFormatter.format(totalHours())} uur</strong><span>${filledDays()} werkdagen met uren</span></div>
      <div class="portal-summary-card"><label>Verlof <input id="pilot-leave" type="number" min="0" step="0.25" value="${Number(state.timesheet?.leave_hours || 0)}" ${enabled && hoursEditable() ? '' : 'disabled'}></label><span>${enabled ? 'Apart van klanturen' : 'Loopt buiten deze app'}</span></div>
      <div class="portal-summary-card"><label>Ziekte <input id="pilot-sick" type="number" min="0" step="0.25" value="${Number(state.timesheet?.sickness_hours || 0)}" ${enabled && hoursEditable() ? '' : 'disabled'}></label><span>${enabled ? 'Apart van klanturen' : 'Meld dit bij Backoffice'}</span></div>
      <div class="portal-summary-card wide"><div><small>Status uren</small><strong>${escapeHtml(tsStatus.label)}</strong>${correction ? `<span>${escapeHtml(correction)}</span>` : ''}</div><div class="portal-summary-actions">
        ${hoursEditable() ? '<button type="button" class="portal-secondary" data-portal-write="draft">Concept opslaan</button><button type="button" class="portal-primary" data-open-submit>Uren indienen</button>' : ''}
      </div></div>`;
    section.querySelector('.portal-status-banner')?.remove();
    if (!hoursEditable()) {
      const banner = document.createElement('div');
      banner.className = `portal-status-banner ${timesheetStatus()}`;
      banner.textContent = timesheetStatus() === 'submitted'
        ? 'Backoffice controleert je uren. Alleen na een correctieverzoek kun je ze opnieuw aanpassen.'
        : timesheetStatus() === 'approved' || timesheetStatus() === 'invoiced'
          ? 'Backoffice heeft je uren goedgekeurd. Deze maand blijft alleen-lezen.'
          : 'Deze maand is niet bewerkbaar.';
      summary.after(banner);
    }
  };

  const renderFlow = () => {
    const submitted = ['submitted', 'approved', 'invoiced'].includes(timesheetStatus());
    const approved = ['approved', 'invoiced'].includes(timesheetStatus());
    const doc = customerStatusView();
    const documentDone = doc.tone === 'done';
    const flowSteps = document.querySelectorAll('.flow .step');
    const arrows = document.querySelectorAll('.flow .arrow');
    const flow = document.querySelector('.flow');
    let progress = flow.querySelector('.portal-flow-progress');
    if (!progress) {
      progress = document.createElement('span');
      progress.className = 'portal-flow-progress';
      flow.prepend(progress);
    }
    progress.style.width = approved && documentDone ? 'calc(100% - 44px)' : (approved ? '48%' : (submitted ? '24%' : '0'));
    if (flowSteps[0]) flowSteps[0].dataset.state = approved ? 'done' : (submitted ? 'active' : 'neutral');
    if (flowSteps[1]) flowSteps[1].dataset.state = documentDone ? 'done' : (doc.tone === 'active' ? 'active' : 'waiting');
    if (flowSteps[2]) flowSteps[2].dataset.state = approved && documentDone ? 'done' : 'neutral';
    arrows.forEach((arrow, index) => { arrow.dataset.state = index === 0 && approved ? 'done' : (index === 1 && documentDone ? 'done' : 'neutral'); });

    const stops = document.querySelectorAll('.timeline .stop');
    stops.forEach((stop) => stop.classList.remove('portal-done', 'portal-active', 'portal-waiting'));
    if (stops[0]) stops[0].classList.add('portal-done');
    if (stops[1]) stops[1].classList.add(submitted ? 'portal-done' : 'portal-active');
    if (stops[2]) stops[2].classList.add(submitted ? 'portal-done' : (totalHours() > 0 ? 'portal-active' : 'portal-waiting'));
    if (stops[3]) stops[3].classList.add(approved ? 'portal-done' : (submitted ? 'portal-active' : 'portal-waiting'));
    if (stops[4]) stops[4].classList.add(documentDone ? 'portal-done' : (doc.tone === 'active' ? 'portal-active' : 'portal-waiting'));
  };

  const renderCustomer = () => {
    const section = document.querySelector('.chapter.dark');
    const view = customerStatusView();
    section.querySelector('.ch-eyebrow').textContent = `Klanturenstaat · ${periodLabel(state.period)}`;
    section.querySelector('h2').textContent = view.label;
    let note = 'Upload de officiële klanturenstaat als PDF, JPG of PNG, of registreer dat deze al rechtstreeks is gemaild.';
    if (documentStatus() === 'received') note = 'Je document staat bij Backoffice klaar voor controle.';
    if (directlyMailed()) note = 'Je registratie is ontvangen. Backoffice moet de externe bevestiging nog vastleggen.';
    if (externallyConfirmed()) note = 'Backoffice heeft de externe goedkeuring gecontroleerd en vastgelegd.';
    if (['approved', 'sent', 'sent_to_broker'].includes(documentStatus())) note = 'De officiële klanturenstaat is gecontroleerd en staat veilig vast.';
    if (documentStatus() === 'resubmit') note = `Backoffice vraagt een nieuwe versie: ${String(state.customerTimesheet?.review_note || 'controleer het document')}`;
    section.querySelector('.lead').textContent = note;
    let actions = section.querySelector('.portal-customer-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'portal-customer-actions';
      section.querySelector('.lead').after(actions);
    }
    const downloadUrl = safeDownloadUrl(state.customerTimesheet?.download_url);
    const canView = Boolean(downloadUrl && state.customerTimesheet?.storage_key);
    actions.innerHTML = `${documentEditable() ? '<button type="button" class="portal-primary" data-open-customer>Urenstaat aanleveren</button>' : ''}
      ${canView ? `<a class="portal-secondary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener">PDF bekijken</a>` : ''}
      ${directlyMailed() ? '<button type="button" class="portal-secondary" data-restore-customer>Registratie terugdraaien</button>' : ''}`;
    let status = section.querySelector('.portal-document-status');
    if (!status) {
      status = document.createElement('span');
      section.querySelector('.lead').after(status);
    }
    status.className = `portal-document-status ${view.tone}`;
    status.textContent = view.label;
  };

  const render = () => {
    renderMonthMenu();
    document.querySelector('#pilot-month-button span').textContent = periodLabel(state.period);
    renderHero();
    renderWeek();
    renderFlow();
    renderCustomer();
  };

  const dayDialog = (iso) => {
    const entry = entryFor(iso);
    const date = new Date(`${iso}T12:00:00Z`);
    openDialog('day', `${dialogHeader('Werkdag', dateFormatter.format(date))}
      <form class="portal-form" id="pilot-day-form" data-day="${iso}">
        <label>Uren<input id="pilot-day-hours" type="number" min="0" max="24" step="0.25" required value="${Number(entry?.hours || 0)}"></label>
        <label>Toelichting (optioneel)<textarea id="pilot-day-description" maxlength="200">${escapeHtml(entry?.description || '')}</textarea></label>
        <p class="portal-help">Gebruik 0 uur om deze dag leeg te maken. Concepten worden direct met dezelfde TEST-database gesynchroniseerd.</p>
        <p class="portal-error" hidden></p>
        <div class="portal-dialog-actions"><button type="button" class="portal-secondary" data-close-dialog>Annuleren</button><button type="submit" class="portal-primary" data-portal-write>Dag opslaan</button></div>
      </form>`);
  };

  const submitDialog = () => openDialog('submit', `${dialogHeader('Maand indienen', 'Weet je het zeker?')}
    <div class="portal-form"><p>Je dient ${numberFormatter.format(totalHours())} uur over ${filledDays()} werkdagen in voor ${periodLabel(state.period).toLowerCase()}.</p>
    <p class="portal-help">Na indienen neemt Backoffice het over. Je kunt de uren pas weer wijzigen wanneer Backoffice een correctie vraagt.</p>
    <p class="portal-error" hidden></p>
    <div class="portal-dialog-actions"><button type="button" class="portal-secondary" data-close-dialog>Nog controleren</button><button type="button" class="portal-primary" data-confirm-submit data-portal-write>Ja, uren indienen</button></div></div>`);

  const customerChoiceDialog = () => openDialog('customer-choice', `${dialogHeader('Klanturenstaat', 'Hoe lever je hem aan?')}
    <div class="portal-choice-grid"><button type="button" class="portal-choice" data-customer-choice="upload"><strong>PDF of afbeelding uploaden</strong><span>PDF, JPG of PNG tot maximaal 2 MB. Afbeeldingen worden veilig als PDF opgeslagen.</span></button>
    <button type="button" class="portal-choice" data-customer-choice="mailed"><strong>Al rechtstreeks gemaild</strong><span>Leg verplicht vast hoe de goedkeuring is aangeleverd. Backoffice bevestigt dit daarna.</span></button></div>`);

  const uploadDialog = () => openDialog('customer-upload', `${dialogHeader('Klanturenstaat', documentStatus() === 'draft' || documentStatus() === 'resubmit' ? 'Document vervangen' : 'Document uploaden')}
    <form class="portal-form" id="pilot-upload-form"><label class="portal-file">Kies PDF, JPG of PNG<input id="pilot-customer-file" type="file" accept="application/pdf,image/jpeg,image/png" ${state.customerTimesheet?.storage_key ? '' : 'required'}></label>
    <p class="portal-help">Concept opslaan houdt het document bij jou. Indienen zet het direct bij Backoffice klaar voor controle.</p><p class="portal-error" hidden></p>
    <div class="portal-dialog-actions"><button type="button" class="portal-secondary" data-close-dialog>Annuleren</button><button type="button" class="portal-secondary" data-upload-action="save_draft" data-portal-write>Concept opslaan</button><button type="button" class="portal-primary" data-upload-action="submit" data-portal-write>Indienen bij Backoffice</button></div></form>`);

  const mailedDialog = () => openDialog('customer-mailed', `${dialogHeader('Rechtstreeks gemaild', 'Leg de reden vast')}
    <form class="portal-form" id="pilot-mailed-form"><label>Reden<select id="pilot-mailed-reason" required>
      <option value="">Kies een reden…</option><option>Goedkeuring van de uren rechtstreeks per e-mail ontvangen</option>
      <option>Klant heeft de uren in het eigen portaal bevestigd</option><option>Bevestiging is rechtstreeks naar Backoffice gestuurd</option><option value="Anders">Anders, namelijk…</option>
    </select></label><label id="pilot-mailed-other-wrap" hidden>Toelichting<textarea id="pilot-mailed-other" maxlength="2000"></textarea></label>
    <p class="portal-help">Dit blijft oranje en blokkerend totdat Backoffice de externe bevestiging zelf heeft gecontroleerd.</p><p class="portal-error" hidden></p>
    <div class="portal-dialog-actions"><button type="button" class="portal-secondary" data-close-dialog>Annuleren</button><button type="submit" class="portal-primary" data-portal-write>Registreren</button></div></form>`);

  const currentPayload = (action) => {
    const currentEntries = entries().filter((entry) => Number(entry.hours) > 0).map((entry) => ({
      work_date: String(entry.work_date), hours: Number(entry.hours), description: String(entry.description || 'Webapp daginvoer'),
    }));
    const payload = {
      action, period: state.period, employee_id: Number(state.employee.id), contractual_hours: contractHours(),
      billable_hours: Math.round(currentEntries.reduce((sum, entry) => sum + entry.hours, 0) * 100) / 100,
      leave_hours: Number(document.querySelector('#pilot-leave')?.value ?? state.timesheet?.leave_hours ?? 0) || 0,
      sickness_hours: Number(document.querySelector('#pilot-sick')?.value ?? state.timesheet?.sickness_hours ?? 0) || 0,
      day_entries: currentEntries,
    };
    if (Number(state.timesheet?.version) > 0) payload.expected_version = Number(state.timesheet.version);
    return payload;
  };

  const writeTimesheet = async (action, mutate) => {
    if (!hoursEditable()) throw new Error('Deze urenstaat staat bij Backoffice en kan niet worden gewijzigd.');
    const snapshot = state.timesheet ? JSON.parse(JSON.stringify(state.timesheet)) : null;
    if (typeof mutate === 'function') mutate();
    setBusy(true);
    try {
      const body = await apiJson(API.timesheets, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify(currentPayload(action)),
      });
      state.timesheet = body.timesheet;
      render();
      return body;
    } catch (error) {
      state.timesheet = snapshot;
      if (error.code === 'stale-version') await loadPeriod(state.period, { quiet: true });
      else render();
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const writeCustomer = async (action, { file = null, reviewNote = '' } = {}) => {
    setBusy(true);
    try {
      const data = new FormData();
      data.append('action', action); data.append('period', state.period); data.append('employee_id', String(state.employee.id));
      if (state.assignment?.id) data.append('assignment_id', String(state.assignment.id));
      if (reviewNote) data.append('review_note', reviewNote);
      if (file) data.append('file', file, file.name || 'klanturenstaat');
      const body = await apiJson(API.customerTimesheets, { method: 'POST', headers: { 'X-CSRF-Token': await csrf() }, body: data });
      state.customerTimesheet = body.customer_timesheet;
      render();
      return body;
    } finally {
      setBusy(false);
    }
  };

  const showHandoff = async () => {
    const element = document.querySelector('.portal-handoff');
    element.classList.add('show');
    element.setAttribute('aria-hidden', 'false');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    await new Promise((resolve) => window.setTimeout(resolve, reduced ? 450 : 2100));
    element.classList.remove('show');
    element.setAttribute('aria-hidden', 'true');
    if (!reduced) await new Promise((resolve) => window.setTimeout(resolve, 360));
  };

  const showDialogError = (error) => {
    const element = document.querySelector('.portal-dialog .portal-error');
    if (element) { element.textContent = error.message || 'De actie is mislukt.'; element.hidden = false; }
    else toast(error.message || 'De actie is mislukt.', true);
  };

  const bindEvents = () => {
    document.addEventListener('click', async (event) => {
      const target = event.target.closest('button,a');
      if (!target) return;
      try {
        if (target.matches('#pilot-month-button')) {
          const popover = document.querySelector('.portal-month-popover');
          const open = popover.hidden;
          closePopovers(); popover.hidden = !open; if (open) placePopover(popover, target);
        } else if (target.matches('#pilot-profile-button')) {
          const popover = document.querySelector('.portal-profile-popover');
          const open = popover.hidden;
          closePopovers(); popover.hidden = !open; if (open) placePopover(popover, target);
        } else if (target.matches('[data-period]')) {
          const next = String(target.dataset.period);
          closePopovers();
          if (next !== state.period) { state.period = next; saveSelectedPeriod(); await loadPeriod(next); }
        } else if (target.matches('[data-week-delta]')) {
          state.weekIndex = Math.max(0, Math.min(state.weeks.length - 1, state.weekIndex + Number(target.dataset.weekDelta)));
          renderWeek();
        } else if (target.matches('[data-open-day]') && !target.disabled) {
          dayDialog(String(target.dataset.openDay));
        } else if (target.matches('[data-open-submit]')) {
          submitDialog();
        } else if (target.matches('[data-confirm-submit]')) {
          await writeTimesheet('submit'); closeDialog(); await showHandoff(); toast('Uren ingediend. Backoffice ziet de controle nu direct.');
        } else if (target.matches('[data-portal-write="draft"]')) {
          await writeTimesheet('save_draft'); toast('Concept opgeslagen in de gedeelde TEST-omgeving.');
        } else if (target.matches('[data-open-customer]')) {
          customerChoiceDialog();
        } else if (target.matches('[data-customer-choice="upload"]')) {
          uploadDialog();
        } else if (target.matches('[data-customer-choice="mailed"]')) {
          mailedDialog();
        } else if (target.matches('[data-upload-action]')) {
          const input = document.querySelector('#pilot-customer-file');
          const file = input?.files?.[0] || null;
          if (!file && !state.customerTimesheet?.storage_key) throw new Error('Kies eerst een PDF, JPG of PNG.');
          if (file && file.size > 2 * 1024 * 1024) throw new Error('Het bestand mag maximaal 2 MB groot zijn.');
          await writeCustomer(String(target.dataset.uploadAction), { file }); closeDialog();
          toast(target.dataset.uploadAction === 'submit' ? 'Klanturenstaat ingediend bij Backoffice.' : 'Concept-klanturenstaat opgeslagen.');
        } else if (target.matches('[data-restore-customer]')) {
          await writeCustomer('restore_missing'); toast('De registratie is teruggedraaid; je kunt nu een document uploaden.');
        } else if (target.matches('[data-close-dialog]')) {
          closeDialog();
        } else if (target.matches('#pilot-logout')) {
          setBusy(true);
          await apiJson(API.logout, { method: 'POST', headers: { 'X-CSRF-Token': await csrf() } });
          sessionStorage.removeItem('path-1919-session-user');
          sessionStorage.removeItem(`path-1919-selected-period:${state.user.id}`);
          window.location.assign('/');
        }
      } catch (error) {
        showDialogError(error);
      }
    });

    document.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        if (event.target.matches('#pilot-day-form')) {
          const iso = String(event.target.dataset.day);
          const hours = Number(document.querySelector('#pilot-day-hours').value);
          const description = String(document.querySelector('#pilot-day-description').value || '').trim();
          if (!Number.isFinite(hours) || hours < 0 || hours > 24) throw new Error('Vul tussen 0 en 24 uur in.');
          await writeTimesheet('save_draft', () => {
            const list = entries().filter((entry) => String(entry.work_date) !== iso);
            if (hours > 0) list.push({ work_date: iso, hours: Math.round(hours * 100) / 100, description: description || 'Webapp daginvoer' });
            if (!state.timesheet) state.timesheet = { status: 'draft', day_entries: [], leave_hours: 0, sickness_hours: 0 };
            state.timesheet.day_entries = list.sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)));
          });
          closeDialog(); toast('Werkdag opgeslagen.');
        } else if (event.target.matches('#pilot-mailed-form')) {
          const reason = String(document.querySelector('#pilot-mailed-reason').value || '');
          const other = String(document.querySelector('#pilot-mailed-other').value || '').trim();
          const note = reason === 'Anders' ? other : reason;
          if (!note) throw new Error('Kies een reden of vul een toelichting in.');
          await writeCustomer('mark_skipped', { reviewNote: note }); closeDialog();
          toast('Rechtstreeks gemaild geregistreerd. Backoffice moet dit nog extern bevestigen.');
        }
      } catch (error) {
        showDialogError(error);
      }
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('#pilot-mailed-reason')) {
        const wrap = document.querySelector('#pilot-mailed-other-wrap');
        wrap.hidden = event.target.value !== 'Anders';
        if (!wrap.hidden) document.querySelector('#pilot-mailed-other').focus();
      }
    });
    document.querySelector('.portal-backdrop').addEventListener('click', closeDialog);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closePopovers(); closeDialog(); } });
    window.addEventListener('resize', closePopovers, { passive: true });
  };

  const boot = async () => {
    installChrome();
    bindEvents();
    try {
      const me = await apiJson(API.me);
      if (!me.authenticated || !me.user) {
        showGate('Log eerst veilig in', 'Deze nieuwe portal gebruikt dezelfde beveiligde sessie als de bestaande app. Log daar in als medewerker en open daarna deze pilot-URL.');
        return;
      }
      if (String(me.user.role) !== 'employee') {
        showGate('Alleen voor medewerkers', 'Je bent ingelogd als beheerder. Gebruik de bestaande app voor Backoffice of log in als medewerker in een ander browserprofiel.', 'Bestaande beheeromgeving openen');
        return;
      }
      state.user = me.user;
      state.csrf = String(me.csrf_token || '');
      const bootstrap = await apiJson(API.bootstrap);
      state.company = bootstrap.companies?.[0] || {};
      state.employee = bootstrap.employees?.find((employee) => Number(employee.user_id) === Number(state.user.id));
      if (!state.employee) throw new Error('Aan dit account is geen medewerkerprofiel gekoppeld.');
      state.assignment = bootstrap.assignments?.find((assignment) => Number(assignment.employee_id) === Number(state.employee.id)) || null;
      state.periods = Array.isArray(bootstrap.periods) ? bootstrap.periods : [];
      initialiseSessionPeriod();
      renderTopbar();
      renderMonthMenu();
      document.body.classList.add('portal-ready');
      await loadPeriod(state.period);
      document.querySelector('.portal-loading').hidden = true;
    } catch (error) {
      showGate('Portal kon niet starten', error.message || 'De gegevens konden niet veilig worden geladen.', 'Terug naar de bestaande app');
    }
  };

  boot();
})();
