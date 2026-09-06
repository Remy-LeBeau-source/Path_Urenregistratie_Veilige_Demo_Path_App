(() => {
  'use strict';

  const AMSTERDAM = 'Europe/Amsterdam';
  const API = {
    me: '/server/auth/me.php', csrf: '/server/auth/csrf.php', logout: '/server/auth/logout.php',
    bootstrap: '/server/api/bootstrap.php', timesheets: '/server/api/timesheets.php',
    customer: '/server/api/customer-timesheets.php', invoices: '/server/api/invoices.php',
  };
  const state = { user: null, csrf: '', company: null, periods: [], employees: [], assignments: [], period: '', dossiers: [], selectedId: 0, sort: 'urgency', busy: false };
  const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric', timeZone: AMSTERDAM });
  const numFmt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });
  const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const safeDownloadUrl = (value) => {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return url.origin === window.location.origin && url.pathname === '/server/api/customer-timesheets.php' ? `${url.pathname}${url.search}` : '';
    } catch { return ''; }
  };
  const currentPeriod = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: AMSTERDAM }).formatToParts(new Date());
    return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
  };
  const periodLabel = (key) => {
    const [year, month] = key.split('-').map(Number);
    const label = monthFmt.format(new Date(Date.UTC(year, month - 1, 1, 12)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?';

  const apiJson = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) {
      const error = new Error(String(body?.message || `De server gaf HTTP ${response.status}.`));
      error.status = response.status; error.code = String(body?.error || 'request-failed'); throw error;
    }
    return body;
  };
  const csrf = async () => {
    if (state.csrf) return state.csrf;
    const body = await apiJson(API.csrf); state.csrf = String(body.csrf_token || '');
    if (!state.csrf) throw new Error('Beveiligingstoken ontbreekt.'); return state.csrf;
  };
  const setBusy = (busy) => { state.busy = busy; document.body.classList.toggle('busy', busy); document.querySelectorAll('[data-write]').forEach((el) => { el.disabled = busy; }); };
  let toastTimer = 0;
  const toast = (message, isError = false) => {
    const el = document.querySelector('#admin-toast'); el.textContent = message; el.classList.toggle('error', isError); el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el.classList.remove('show'), 3300);
  };
  const gate = (title, message, label = 'Naar veilig inloggen') => {
    document.querySelector('#admin-boot').hidden = true; const el = document.querySelector('#admin-gate'); el.hidden = false;
    el.querySelector('h1').textContent = title; el.querySelector('p').textContent = message; el.querySelector('a').textContent = label;
  };
  const closePopovers = () => { document.querySelector('#admin-month-popover').hidden = true; document.querySelector('#admin-profile-popover').hidden = true; };
  const placePopover = (popover, anchor) => {
    const rect = anchor.getBoundingClientRect(); popover.style.top = `${rect.bottom + 7}px`;
    popover.style.left = `${Math.min(rect.left, window.innerWidth - popover.offsetWidth - 14)}px`;
  };
  const openDialog = (html) => {
    const dialog = document.querySelector('#admin-dialog'); dialog.innerHTML = html; dialog.classList.add('open'); dialog.setAttribute('aria-hidden', 'false');
    document.querySelector('#admin-backdrop').classList.add('open'); dialog.querySelector('input,select,button')?.focus();
  };
  const closeDialog = () => { document.querySelector('#admin-dialog').classList.remove('open'); document.querySelector('#admin-dialog').setAttribute('aria-hidden', 'true'); document.querySelector('#admin-backdrop').classList.remove('open'); };
  const dialogHead = (small, title) => `<div class="dialog-head"><div><small>${escapeHtml(small)}</small><h2>${escapeHtml(title)}</h2></div><button class="dialog-close" type="button" data-close aria-label="Sluiten">×</button></div>`;
  const dialogError = (error) => { const el = document.querySelector('#admin-dialog .error'); if (el) { el.textContent = error.message || 'Actie mislukt.'; el.hidden = false; } else toast(error.message || 'Actie mislukt.', true); };

  const customerExternallyConfirmed = (customer) => String(customer?.status || '') === 'skipped' && String(customer?.review_note || '').startsWith('Extern bevestigd:');
  const statusTone = (dossier) => {
    const ts = String(dossier.timesheet?.status || 'draft'); const cs = String(dossier.customer?.status || 'missing'); const inv = String(dossier.invoice?.status || 'concept');
    if (['sent', 'paid'].includes(inv)) return { label: 'Gereed', tone: 'done', priority: 9 };
    if (ts === 'submitted') return { label: 'Uren controleren', tone: 'active', priority: 1 };
    if (cs === 'received') return { label: 'Urenstaat controleren', tone: 'active', priority: 2 };
    if (cs === 'skipped' && !customerExternallyConfirmed(dossier.customer)) return { label: 'Extern bevestigen', tone: 'waiting', priority: 0 };
    if (['approved', 'invoiced'].includes(ts) && (['approved', 'sent', 'sent_to_broker'].includes(cs) || customerExternallyConfirmed(dossier.customer))) return { label: 'Factuur controleren', tone: 'waiting', priority: 3 };
    if (ts === 'correction' || ['missing', 'draft', 'resubmit'].includes(cs)) return { label: 'Wacht op medewerker', tone: 'neutral', priority: 7 };
    return { label: 'Registratie actief', tone: 'neutral', priority: 8 };
  };
  const hoursTone = (status) => ['approved', 'invoiced'].includes(status) ? 'done' : status === 'submitted' ? 'active' : status === 'correction' ? 'waiting' : 'neutral';
  const customerTone = (customer) => {
    const status = String(customer?.status || 'missing'); if (customerExternallyConfirmed(customer) || ['approved', 'sent', 'sent_to_broker'].includes(status)) return 'done';
    if (status === 'received') return 'active'; if (status === 'skipped' || status === 'resubmit') return 'waiting'; return 'neutral';
  };
  const invoiceTone = (invoice) => invoice && ['sent', 'paid'].includes(String(invoice.status)) ? 'done' : invoice ? 'waiting' : 'neutral';
  const labelHours = (status) => ({ draft: 'Concept', correction: 'Correctie', submitted: 'Ingediend', approved: 'Goedgekeurd', invoiced: 'Gefactureerd' }[status] || 'Nog niet gestart');
  const labelCustomer = (customer) => {
    if (customerExternallyConfirmed(customer)) return 'Extern bevestigd';
    return ({ missing: 'Ontbreekt', draft: 'Concept', resubmit: 'Nieuwe versie nodig', received: 'Ontvangen', approved: 'Goedgekeurd', sent: 'Verzonden', sent_to_broker: 'Verzonden', skipped: 'Rechtstreeks gemaild' }[String(customer?.status || 'missing')] || 'Ontbreekt');
  };
  const labelInvoice = (invoice) => invoice ? ({ concept: 'Concept', locked: 'Definitief', sent: 'Verzonden', paid: 'Betaald' }[String(invoice.status)] || String(invoice.status)) : 'Nog niet aangemaakt';

  const loadDossier = async (employee, invoices) => {
    const assignment = state.assignments.find((item) => Number(item.employee_id) === Number(employee.id)) || null;
    const base = new URLSearchParams({ period: state.period, employee_id: String(employee.id) });
    const customerParams = new URLSearchParams(base); if (assignment?.id) customerParams.set('assignment_id', String(assignment.id));
    const [timesheetBody, customerBody] = await Promise.all([apiJson(`${API.timesheets}?${base}`), apiJson(`${API.customer}?${customerParams}`)]);
    return { employee, assignment, timesheet: timesheetBody.found ? timesheetBody.timesheet : null, customer: customerBody.found ? customerBody.customer_timesheet : null, invoice: invoices.find((item) => Number(item.employee_id) === Number(employee.id)) || null };
  };

  const loadAll = async ({ retainSelection = true } = {}) => {
    setBusy(true);
    try {
      const invoicesBody = await apiJson(`${API.invoices}?period=${encodeURIComponent(state.period)}`);
      const active = state.employees.filter((employee) => Number(employee.active) !== 0);
      state.dossiers = await Promise.all(active.map((employee) => loadDossier(employee, invoicesBody.items || [])));
      if (!retainSelection || !state.dossiers.some((d) => Number(d.employee.id) === Number(state.selectedId))) {
        state.selectedId = Number([...state.dossiers].sort((a, b) => statusTone(a).priority - statusTone(b).priority)[0]?.employee.id || 0);
      }
      render();
    } catch (error) {
      if (error.status === 401) gate('Log opnieuw in', 'Je beheerderssessie is verlopen.'); else toast(error.message || 'De werkvoorraad kon niet worden geladen.', true);
    } finally { setBusy(false); }
  };

  const sortedDossiers = () => [...state.dossiers].sort((a, b) => state.sort === 'name'
    ? String(a.employee.full_name).localeCompare(String(b.employee.full_name), 'nl')
    : statusTone(a).priority - statusTone(b).priority || String(a.employee.full_name).localeCompare(String(b.employee.full_name), 'nl'));
  const selected = () => state.dossiers.find((d) => Number(d.employee.id) === Number(state.selectedId)) || state.dossiers[0] || null;

  const renderSummary = () => {
    document.querySelector('#stat-employees').textContent = String(state.dossiers.length);
    const review = state.dossiers.filter((d) => ['active', 'waiting'].includes(statusTone(d).tone)).length;
    document.querySelector('#stat-review').textContent = String(review); document.querySelector('#stat-review-note').textContent = review === 1 ? 'actie in deze maand' : 'acties in deze maand';
    document.querySelector('#stat-hours').textContent = numFmt.format(state.dossiers.filter((d) => ['approved', 'invoiced'].includes(String(d.timesheet?.status))).reduce((sum, d) => sum + Number(d.timesheet?.billable_hours || 0), 0));
    document.querySelector('#stat-invoices').textContent = String(state.dossiers.filter((d) => d.invoice).length);
  };
  const renderList = () => {
    document.querySelector('.queue h2').textContent = periodLabel(state.period);
    document.querySelector('#admin-employee-list').innerHTML = sortedDossiers().map((d) => {
      const view = statusTone(d); return `<button class="employee-card ${Number(d.employee.id) === Number(state.selectedId) ? 'selected' : ''}" type="button" data-employee="${d.employee.id}">
        <span class="avatar">${escapeHtml(initials(d.employee.full_name))}</span><span><b>${escapeHtml(d.employee.full_name)}</b><small>${escapeHtml(d.employee.job_title || d.assignment?.assignment_name || 'Medewerker')}</small></span>
        <span class="meta">${numFmt.format(Number(d.timesheet?.billable_hours || 0))} uur<b class="tone-${view.tone}">${escapeHtml(view.label)}</b></span></button>`;
    }).join('') || '<p>Geen actieve medewerkers gevonden.</p>';
  };
  const setNode = (name, tone, label) => { const node = document.querySelector(`.node-${name}`); node.className = `node node-${name} ${tone}`; node.querySelector('span').textContent = label; const live = document.querySelector(`.live-${({ hours: 'a', project: 'b', customer: 'c', external: 'd' })[name]}`); if (live) live.setAttribute('class', `live live-${({ hours: 'a', project: 'b', customer: 'c', external: 'd' })[name]} ${tone}`); };

  const nextAction = (d) => {
    const ts = String(d.timesheet?.status || 'draft'); const cs = String(d.customer?.status || 'missing');
    if (ts === 'submitted') return { title: 'Uren controleren', note: 'Controleer dag- en maandtotalen en kies goedkeuren of correctie.', controls: `<button type="button" data-action="review-hours">Uren beoordelen →</button>` };
    if (cs === 'received') return { title: 'Klanturenstaat controleren', note: 'Open het PDF-document vóór je een besluit vastlegt.', controls: `<button type="button" data-action="review-customer">Document beoordelen →</button>` };
    if (cs === 'skipped' && !customerExternallyConfirmed(d.customer)) return { title: 'Externe bevestiging vereist', note: 'Rechtstreeks gemaild is nog niet groen. Controleer bewijs en leg een reden vast.', controls: `<button type="button" data-action="confirm-external">Extern bevestigen →</button>` };
    if (['approved', 'invoiced'].includes(ts) && (['approved', 'sent', 'sent_to_broker'].includes(cs) || customerExternallyConfirmed(d.customer))) return { title: d.invoice ? 'Factuur controleren' : 'Factuur aanmaken', note: 'De beveiligde factuur- en mailcontrole blijft tijdens deze pilot in de bestaande Backoffice.', controls: `${customerExternallyConfirmed(d.customer) ? '<button type="button" class="secondary" data-action="restore-external">Bevestiging terugdraaien</button>' : ''}<a href="/">Open facturatie →</a>` };
    if (ts === 'correction') return { title: 'Wacht op gecorrigeerde uren', note: String(d.timesheet?.review_note || 'De medewerker verwerkt het correctieverzoek.'), controls: '' };
    if (cs === 'resubmit') return { title: 'Wacht op nieuw document', note: String(d.customer?.review_note || 'De medewerker levert een nieuwe klanturenstaat aan.'), controls: '' };
    return { title: 'Wacht op medewerker', note: 'De medewerker vult de uren of klanturenstaat verder aan.', controls: '' };
  };

  const renderSelected = () => {
    const d = selected(); if (!d) return;
    const ts = String(d.timesheet?.status || 'draft'); const ht = hoursTone(ts); const ct = customerTone(d.customer); const it = invoiceTone(d.invoice);
    document.querySelector('#story-period').textContent = periodLabel(state.period); document.querySelector('#story-name').textContent = d.employee.full_name;
    document.querySelector('#story-role').textContent = d.employee.job_title || d.assignment?.assignment_name || 'Medewerker';
    document.querySelector('#story-avatar').textContent = initials(d.employee.full_name); document.querySelector('#story-person').textContent = d.employee.full_name;
    document.querySelector('#story-total').textContent = `${numFmt.format(Number(d.timesheet?.billable_hours || 0))} uur geregistreerd`;
    const badgeHours = document.querySelector('#badge-hours'); badgeHours.textContent = `Uren · ${labelHours(ts)}`; badgeHours.className = `tone-${ht}`;
    const badgeCustomer = document.querySelector('#badge-customer'); badgeCustomer.textContent = `Urenstaat · ${labelCustomer(d.customer)}`; badgeCustomer.className = `tone-${ct}`;
    const badgeInvoice = document.querySelector('#badge-invoice'); badgeInvoice.textContent = `Factuur · ${labelInvoice(d.invoice)}`; badgeInvoice.className = `tone-${it}`;
    setNode('hours', ht, `${numFmt.format(Number(d.timesheet?.billable_hours || 0))} uur · ${labelHours(ts)}`);
    setNode('project', d.assignment ? 'done' : 'neutral', d.assignment?.assignment_name || 'Niet gekoppeld');
    setNode('customer', ct, labelCustomer(d.customer)); setNode('external', customerExternallyConfirmed(d.customer) ? 'done' : (String(d.customer?.status) === 'skipped' ? 'waiting' : 'neutral'), customerExternallyConfirmed(d.customer) ? 'Vastgelegd' : String(d.customer?.status) === 'skipped' ? 'Reden vereist' : 'Niet van toepassing');
    const action = nextAction(d); document.querySelector('#next-title').textContent = action.title; document.querySelector('#next-note').textContent = action.note; document.querySelector('#next-controls').innerHTML = action.controls;
    document.querySelector('#detail-name').textContent = d.employee.full_name;
    document.querySelector('#admin-details').innerHTML = `<dt>Periode</dt><dd>${escapeHtml(periodLabel(state.period))}</dd><dt>Functie</dt><dd>${escapeHtml(d.employee.job_title || '—')}</dd><dt>Opdracht</dt><dd>${escapeHtml(d.assignment?.assignment_name || '—')}</dd><dt>Uren</dt><dd class="tone-${ht}">${escapeHtml(labelHours(ts))} · ${numFmt.format(Number(d.timesheet?.billable_hours || 0))} uur</dd><dt>Klanturenstaat</dt><dd class="tone-${ct}">${escapeHtml(labelCustomer(d.customer))}</dd><dt>Factuur</dt><dd class="tone-${it}">${escapeHtml(labelInvoice(d.invoice))}</dd>`;
    const timeline = [
      { label: 'Uren ontvangen', tone: ['submitted', 'approved', 'invoiced'].includes(ts) ? 'done' : ts === 'correction' ? 'active' : '' },
      { label: 'Controle Backoffice', tone: ['approved', 'invoiced'].includes(ts) ? 'done' : ts === 'submitted' ? 'active' : '' },
      { label: 'Klanturenstaat', tone: ct === 'done' ? 'done' : ct === 'active' || ct === 'waiting' ? 'active' : '' },
      { label: 'Factuur en verzending', tone: it === 'done' ? 'done' : it === 'waiting' ? 'active' : '' },
    ];
    document.querySelector('#admin-timeline').innerHTML = timeline.map((row) => `<div class="audit-row ${row.tone}"><b>${escapeHtml(row.label)}</b><small>${row.tone === 'done' ? 'Gereed' : row.tone === 'active' ? 'Actie vereist' : 'Nog niet gestart'}</small></div>`).join('');
  };

  const renderMonths = () => {
    const current = currentPeriod(); const keys = new Set(state.periods.map((p) => String(p.period_key || `${p.year}-${String(p.month).padStart(2, '0')}`))); keys.add(current); keys.add(state.period);
    document.querySelector('#admin-month-popover').innerHTML = [...keys].filter((key) => /^\d{4}-\d{2}$/.test(key) && key <= current).sort().reverse().map((key) => `<button type="button" data-period="${key}" aria-current="${key === state.period}"><span>${escapeHtml(periodLabel(key))}</span><small>${key === current ? 'Actuele maand' : 'Eerdere maand'}</small></button>`).join('');
    document.querySelector('#admin-month-button').textContent = `${periodLabel(state.period)} ⌄`;
  };
  const render = () => { renderMonths(); renderSummary(); renderList(); renderSelected(); };

  const reviewHoursDialog = (d) => openDialog(`${dialogHead('Urencontrole', d.employee.full_name)}<form id="hours-review-form"><p class="help">${numFmt.format(Number(d.timesheet?.billable_hours || 0))} uur over ${d.timesheet?.day_entries?.length || 0} geregistreerde werkdagen. Controleer eerst de dagregels.</p><div class="audit">${(d.timesheet?.day_entries || []).map((entry) => `<div class="audit-row done"><b>${escapeHtml(entry.work_date)} · ${numFmt.format(Number(entry.hours))} uur</b><small>${escapeHtml(entry.description || '')}</small></div>`).join('')}</div><label>Correctiereden<textarea id="hours-correction-note" maxlength="2000" placeholder="Verplicht wanneer je een correctie vraagt"></textarea></label><p class="error" hidden></p><div class="dialog-actions"><button type="button" class="secondary" data-close>Annuleren</button><button type="button" class="secondary" data-write data-hours-decision="correction">Correctie vragen</button><button type="button" class="primary" data-write data-hours-decision="approve">Uren goedkeuren</button></div></form>`);
  const reviewCustomerDialog = (d) => { const downloadUrl = safeDownloadUrl(d.customer?.download_url); openDialog(`${dialogHead('Klanturenstaat', d.employee.full_name)}<form id="customer-review-form">${downloadUrl ? `<a class="primary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener">PDF eerst openen</a>` : ''}<label>Reden voor nieuwe versie<textarea id="customer-resubmit-note" maxlength="2000" placeholder="Verplicht wanneer je een nieuwe versie vraagt"></textarea></label><p class="error" hidden></p><div class="dialog-actions"><button type="button" class="secondary" data-close>Annuleren</button><button type="button" class="secondary" data-write data-customer-decision="resubmit">Nieuwe versie vragen</button><button type="button" class="primary" data-write data-customer-decision="approve">Goedkeuren</button></div></form>`); };
  const externalDialog = (d) => openDialog(`${dialogHead('Extern bevestigen', d.employee.full_name)}<form id="external-form"><p class="help">Medewerkerregistratie: ${escapeHtml(d.customer?.review_note || 'Rechtstreeks gemaild')}. Dit is pas groen nadat Backoffice het bewijs heeft gecontroleerd.</p><label>Verplichte reden<select id="external-reason"><option value="">Kies een reden…</option><option>Goedkeuring van de uren ontvangen van de klant</option><option>Klantportaal toont de uren als goedgekeurd</option><option>Bevestiging rechtstreeks bij Backoffice ontvangen</option><option value="Anders">Anders, namelijk…</option></select></label><label id="external-other-wrap" hidden>Toelichting<textarea id="external-other" maxlength="2000"></textarea></label><p class="error" hidden></p><div class="dialog-actions"><button type="button" class="secondary" data-close>Annuleren</button><button type="submit" class="primary" data-write>Extern bevestigd vastleggen</button></div></form>`);
  const restoreExternalDialog = (d) => openDialog(`${dialogHead('Bevestiging terugdraaien', d.employee.full_name)}<div><p class="help">Weet je het zeker? De klanturenstaat wordt weer als ontbrekend getoond. De medewerker kan daarna opnieuw een PDF uploaden of rechtstreeks gemaild registreren.</p><p class="error" hidden></p><div class="dialog-actions"><button type="button" class="secondary" data-close>Annuleren</button><button type="button" class="primary" data-confirm-restore data-write>Ja, bevestiging terugdraaien</button></div></div>`);

  const postJson = async (url, payload) => apiJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify(payload) });
  const postCustomer = async (action, d, reviewNote = '') => {
    const form = new FormData(); form.append('action', action); form.append('period', state.period); form.append('employee_id', String(d.employee.id));
    if (d.assignment?.id) form.append('assignment_id', String(d.assignment.id)); if (reviewNote) form.append('review_note', reviewNote);
    return apiJson(API.customer, { method: 'POST', headers: { 'X-CSRF-Token': await csrf() }, body: form });
  };

  const bind = () => {
    document.addEventListener('click', async (event) => {
      const target = event.target.closest('button,a'); if (!target) return;
      try {
        if (target.matches('#admin-month-button')) { const pop = document.querySelector('#admin-month-popover'); const open = pop.hidden; closePopovers(); pop.hidden = !open; if (open) placePopover(pop, target); }
        else if (target.matches('#admin-profile-button')) { const pop = document.querySelector('#admin-profile-popover'); const open = pop.hidden; closePopovers(); pop.hidden = !open; if (open) placePopover(pop, target); }
        else if (target.matches('[data-period]')) { closePopovers(); state.period = String(target.dataset.period); sessionStorage.setItem(`path-1919-admin-period:${state.user.id}`, state.period); await loadAll({ retainSelection: false }); }
        else if (target.matches('[data-employee]')) { state.selectedId = Number(target.dataset.employee); renderList(); renderSelected(); document.querySelector('.story-panel').animate([{ opacity: .72, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' }); }
        else if (target.matches('#admin-refresh')) { await loadAll(); toast('Werkvoorraad opnieuw gelezen uit de server.'); }
        else if (target.matches('[data-action="review-hours"]')) reviewHoursDialog(selected());
        else if (target.matches('[data-action="review-customer"]')) reviewCustomerDialog(selected());
        else if (target.matches('[data-action="confirm-external"]')) externalDialog(selected());
        else if (target.matches('[data-action="restore-external"]')) restoreExternalDialog(selected());
        else if (target.matches('[data-confirm-restore]')) {
          setBusy(true); await postCustomer('restore_missing', selected()); closeDialog(); await loadAll(); toast('Externe bevestiging teruggedraaid; de klanturenstaat ontbreekt weer.');
        }
        else if (target.matches('[data-hours-decision]')) {
          const d = selected(); const decision = String(target.dataset.hoursDecision); const note = String(document.querySelector('#hours-correction-note')?.value || '').trim();
          if (decision === 'correction' && !note) throw new Error('Vul een concrete correctiereden in.'); setBusy(true);
          await postJson(API.timesheets, { action: decision === 'approve' ? 'approve' : 'request_correction', period: state.period, employee_id: Number(d.employee.id), expected_version: Number(d.timesheet.version), ...(decision === 'correction' ? { correction_message: note } : {}) });
          closeDialog(); await loadAll(); toast(decision === 'approve' ? 'Uren goedgekeurd.' : 'Correctieverzoek bij medewerker geplaatst.');
        } else if (target.matches('[data-customer-decision]')) {
          const d = selected(); const decision = String(target.dataset.customerDecision); const note = String(document.querySelector('#customer-resubmit-note')?.value || '').trim();
          if (decision === 'resubmit' && !note) throw new Error('Vul in waarom een nieuwe versie nodig is.'); setBusy(true);
          await postCustomer(decision === 'approve' ? 'approve' : 'request_resubmit', d, note); closeDialog(); await loadAll(); toast(decision === 'approve' ? 'Klanturenstaat goedgekeurd.' : 'Nieuwe versie bij medewerker gevraagd.');
        } else if (target.matches('[data-close]')) closeDialog();
        else if (target.matches('#admin-logout')) { setBusy(true); await apiJson(API.logout, { method: 'POST', headers: { 'X-CSRF-Token': await csrf() } }); sessionStorage.removeItem('path-1919-admin-session'); sessionStorage.removeItem(`path-1919-admin-period:${state.user.id}`); location.assign('/'); }
      } catch (error) { dialogError(error); setBusy(false); }
    });
    document.addEventListener('submit', async (event) => {
      event.preventDefault(); if (!event.target.matches('#external-form')) return;
      try {
        const reason = String(document.querySelector('#external-reason').value || ''); const other = String(document.querySelector('#external-other').value || '').trim(); const note = reason === 'Anders' ? other : reason;
        if (!note) throw new Error('Kies een reden of vul een toelichting in.'); setBusy(true); await postCustomer('confirm_external', selected(), note); closeDialog(); await loadAll(); toast('Externe bevestiging vastgelegd; de status is nu terecht groen.');
      } catch (error) { dialogError(error); setBusy(false); }
    });
    document.addEventListener('change', (event) => {
      if (event.target.matches('#admin-sort')) { state.sort = event.target.value; renderList(); }
      if (event.target.matches('#external-reason')) { const wrap = document.querySelector('#external-other-wrap'); wrap.hidden = event.target.value !== 'Anders'; if (!wrap.hidden) document.querySelector('#external-other').focus(); }
    });
    document.querySelector('#admin-backdrop').addEventListener('click', closeDialog); window.addEventListener('resize', closePopovers, { passive: true });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDialog(); closePopovers(); } });
  };

  const boot = async () => {
    bind();
    try {
      const me = await apiJson(API.me); if (!me.authenticated || !me.user) { gate('Log eerst veilig in', 'Deze beheerpilot gebruikt dezelfde beveiligde sessie als de bestaande app.'); return; }
      if (String(me.user.role) !== 'administrator') { gate('Alleen voor Backoffice', 'Je bent als medewerker ingelogd. Open de medewerkerpilot, of gebruik een ander browserprofiel voor beheer.', 'Bestaande app openen'); return; }
      state.user = me.user; state.csrf = String(me.csrf_token || ''); const bootstrap = await apiJson(API.bootstrap);
      state.company = bootstrap.companies?.[0] || {}; state.periods = bootstrap.periods || []; state.employees = bootstrap.employees || []; state.assignments = bootstrap.assignments || [];
      const marker = 'path-1919-admin-session'; const userKey = String(state.user.id); const periodKey = `path-1919-admin-period:${userKey}`;
      if (sessionStorage.getItem(marker) !== userKey) { sessionStorage.setItem(marker, userKey); sessionStorage.setItem(periodKey, currentPeriod()); }
      const storedPeriod = String(sessionStorage.getItem(periodKey) || ''); state.period = /^\d{4}-\d{2}$/.test(storedPeriod) && storedPeriod <= currentPeriod() ? storedPeriod : currentPeriod();
      document.querySelector('#admin-profile-button span').textContent = initials(state.user.display_name); document.querySelector('#admin-profile-button b').textContent = state.user.display_name;
      document.querySelector('#admin-profile-popover').innerHTML = `<strong>${escapeHtml(state.user.display_name)}</strong><small>${escapeHtml(state.user.email)}</small><hr><a href="/">Bestaande app openen</a><button type="button" id="admin-logout">Uitloggen</button>`;
      document.querySelector('#admin-app').hidden = false; await loadAll({ retainSelection: false }); document.querySelector('#admin-boot').hidden = true;
    } catch (error) { gate('Beheerpilot kon niet starten', error.message || 'De werkvoorraad kon niet veilig worden geladen.', 'Terug naar bestaande app'); }
  };
  boot();
})();
