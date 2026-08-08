(async function () {
  "use strict";
  const gridEl = document.getElementById('roster-grid');
  if (!gridEl) return;

  try {
    const res = await fetch('data/roster.json');
    const roster = await res.json();

    if (!roster.length) {
      gridEl.innerHTML = '<div class="roster-empty">No athletes added yet.</div>';
      return;
    }

    gridEl.innerHTML = roster.map(a =>
      '<a class="roster-card" href="program.html?athlete=' + encodeURIComponent(a.id) + '">' +
      '<div class="name">' + a.name + '</div>' +
      (a.position ? '<div class="pos">' + a.position + '</div>' : '') +
      '</a>'
    ).join('');
  } catch (e) {
    gridEl.innerHTML = '<div class="roster-empty">Could not load the roster (' + e.message + ').</div>';
  }
})();
