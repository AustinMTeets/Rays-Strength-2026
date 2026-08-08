// ================= Rays S&C — Program Shell =================
// Loads the shared base program (Phase 1) plus an optional
// per-athlete override file, merges them, and renders the page.

(function () {
  "use strict";

  // ---------- sidebar / nav wiring (same behavior as before) ----------
  const navButtons = document.querySelectorAll('.sidebar-nav button[data-page]');
  const pages = document.querySelectorAll('.page');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');

  function showPage(id) {
    pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.page === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  }
  navButtons.forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.goto));
  });

  function openSidebar() { sidebar.classList.add('open'); scrim.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (scrim) scrim.addEventListener('click', closeSidebar);

  // ---------- athlete id from the URL ----------
  const params = new URLSearchParams(window.location.search);
  const athleteId = params.get('athlete');

  const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const bannerEl = document.getElementById('athlete-banner');
  const pillsEl = document.getElementById('p1-day-pills');
  const condCardEl = document.getElementById('p1-cond-card');
  const tableWrap = document.getElementById('p1-table-wrap');

  let BASE = null;       // base-program.json -> { phase, days: { MONDAY: {focus, conditioning, exercises} } }
  let ATHLETE = null;    // athlete override json, or null

  // ---------- helpers ----------
  function titleCase(str) {
    return str.replace(/\w\S*/g, t => t.charAt(0) + t.slice(1).toLowerCase());
  }
  function cleanText(str) {
    if (!str) return str;
    let s = str.trim();
    const opens = (s.match(/\(/g) || []).length;
    const closes = (s.match(/\)/g) || []).length;
    if (closes > opens && s.endsWith(')')) s = s.slice(0, -1);
    return s;
  }
  function formatCondValue(v1, v2) {
    if (typeof v1 === 'string' && v1.startsWith(':')) {
      const m = v1.match(/^:(\d+)([A-Za-z]+)/);
      if (m) return m[1] + ' ' + titleCase(m[2]);
      return v1;
    }
    if (v2 !== null && v2 !== undefined) return v1 + ' &times; ' + v2;
    return String(v1);
  }
  function formatWeekCell(w, weightOverride) {
    if (!w) return '<span class="set-main">&mdash;</span>';
    let out = '<span class="set-main">' + w.sets + ' &times; ' + w.reps + '</span>';
    if (w.tempo) out += '<div class="tempo-chip">Tempo ' + w.tempo + '</div>';
    if (weightOverride) out += '<div class="tempo-chip">' + weightOverride + '</div>';
    return out;
  }

  // Merge an athlete's per-day overrides (keyed by exercise tag) onto the base exercise list.
  function mergeExercises(baseExercises, dayOverrides) {
    if (!dayOverrides) return baseExercises.map(ex => ({ ex, weight: null }));
    return baseExercises.map(ex => {
      const o = dayOverrides[ex.tag];
      if (!o) return { ex, weight: null };
      const merged = Object.assign({}, ex);
      if (o.name) merged.name = o.name;
      if (o.note) merged.note = o.note;
      if (o.weeks) merged.weeks = o.weeks;
      return { ex: merged, weight: o.weight || null };
    });
  }

  function weightForWeek(weightOverride, weekKey) {
    if (!weightOverride) return null;
    if (typeof weightOverride === 'string') return weightOverride;
    return weightOverride[weekKey] || null;
  }

  function renderConditioning(day) {
    const c = BASE.days[day].conditioning;
    if (!c) { condCardEl.innerHTML = ''; return; }
    const title = titleCase(cleanText(c.title));
    const note = cleanText(c.note);
    const weeksHtml = c.weeks.map(w =>
      '<span><b>' + w.week + '</b>' + formatCondValue(w.v1, w.v2) + '</span>'
    ).join('');
    condCardEl.innerHTML =
      '<div class="cond-head"><span class="cond-title">' + title + '</span>' +
      (note ? '<span class="cond-note">' + titleCase(note) + '</span>' : '') + '</div>' +
      '<div class="cond-weeks">' + weeksHtml + '</div>';
  }

  function renderDay(day) {
    const info = BASE.days[day];
    renderConditioning(day);

    const dayOverrides = ATHLETE && ATHLETE.days ? ATHLETE.days[day] : null;
    const merged = mergeExercises(info.exercises, dayOverrides);

    const wkLabels = { WK1: 'Week 1', WK2: 'Week 2', WK3: 'Week 3', WK4: 'Week 4' };
    let rows = '';
    merged.forEach(({ ex, weight }) => {
      const weeks = {};
      ex.weeks.forEach(w => weeks[w.week] = w);
      rows += '<tr>';
      rows += '<td class="ex-cell"><span class="ex-tag">' + ex.tag.replace(')', '') + '</span><span class="ex-name">' + ex.name.trim() + '</span>' +
        (ex.note ? '<div class="ex-note">' + ex.note + '</div>' : '') + '</td>';
      ['WK1', 'WK2', 'WK3', 'WK4'].forEach(wk => {
        rows += '<td class="wk" data-label="' + wkLabels[wk] + '">' + formatWeekCell(weeks[wk], weightForWeek(weight, wk)) + '</td>';
      });
      rows += '</tr>';
    });

    tableWrap.innerHTML =
      '<table class="program"><thead><tr>' +
      '<th>' + day.charAt(0) + day.slice(1).toLowerCase() + ' &mdash; ' + info.focus + '</th>' +
      '<th class="wk">Week 1</th><th class="wk">Week 2</th><th class="wk">Week 3</th><th class="wk">Week 4</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderPills(active) {
    pillsEl.innerHTML = '';
    DAY_ORDER.forEach(day => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = day.charAt(0) + day.slice(1).toLowerCase();
      if (day === active) btn.classList.add('active');
      btn.addEventListener('click', () => { renderPills(day); renderDay(day); });
      pillsEl.appendChild(btn);
    });
  }

  function renderBanner() {
    if (!bannerEl) return;
    if (!athleteId) {
      bannerEl.className = 'athlete-banner warn';
      bannerEl.innerHTML = '<div><span class="name">No athlete selected</span></div>' +
        '<div class="notes">Open this page from the roster to see an individualized program, or add <code>?athlete=your-id</code> to the URL.</div>';
      return;
    }
    if (!ATHLETE) {
      bannerEl.className = 'athlete-banner error';
      bannerEl.innerHTML = '<div><span class="name">Athlete not found: ' + athleteId + '</span></div>' +
        '<div class="notes">Showing the base program. Check the roster for a valid link.</div>';
      return;
    }
    bannerEl.className = 'athlete-banner';
    bannerEl.innerHTML =
      '<div><span class="name">' + ATHLETE.name + '</span>' +
      (ATHLETE.position ? '<span class="pos">' + ATHLETE.position + '</span>' : '') + '</div>' +
      (ATHLETE.notes ? '<div class="notes">' + ATHLETE.notes + '</div>' : '');
  }

  // ---------- boot ----------
  async function boot() {
    try {
      const res = await fetch('data/base-program.json');
      BASE = await res.json();
    } catch (e) {
      tableWrap.innerHTML = '<p style="color:var(--muted)">Could not load the base program (' + e.message + ').</p>';
      return;
    }

    if (athleteId) {
      try {
        const res = await fetch('athletes/' + athleteId + '.json');
        if (res.ok) ATHLETE = await res.json();
      } catch (e) {
        ATHLETE = null;
      }
    }

    renderBanner();
    renderPills('MONDAY');
    renderDay('MONDAY');
  }

  if (tableWrap) boot();
})();
