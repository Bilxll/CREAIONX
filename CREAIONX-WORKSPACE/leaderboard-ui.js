(() => {
  const API_URL = String(window.CX_CONFIG?.APPS_SCRIPT_URL || '').trim();
  const candidateHost = document.getElementById('candidateLeaderboard');
  const employeeHost = document.getElementById('employeeLeaderboard');
  const updatedHost = document.getElementById('leaderboardUpdated');
  if (!candidateHost || !employeeHost) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch]));

  function loadingRows() {
    return [1,2,3].map(rank => `
      <div class="leaderboard-row rank-${rank}">
        <div class="leaderboard-rank">0${rank}</div>
        <div class="leaderboard-person"><strong>Loading talent</strong><span>Loading field</span></div>
        <div class="leaderboard-score"><strong>00</strong><span>Score</span></div>
      </div>`).join('');
  }

  function emptyState(message) {
    return `<div class="leaderboard-empty">${esc(message)}</div>`;
  }

  function renderRows(items, type) {
    if (!Array.isArray(items) || !items.length) {
      return emptyState(type === 'candidate'
        ? 'Candidate rankings will appear once verified candidates begin receiving training or assessment scores.'
        : 'Employee rankings will appear once performance metrics are recorded.');
    }

    return items.map((item, i) => {
      const rank = Number(item.rank || i + 1);
      const subtitle = type === 'candidate'
        ? item.field || 'CREAIONX'
        : [item.department, item.role].filter(Boolean).join(' · ') || 'CREAIONX';
      const metricLabel = item.metric || (type === 'candidate' ? 'Progress' : 'Performance');
      const suffix = item.metricSuffix || '';
      const score = item.metricValue ?? 0;

      return `
        <div class="leaderboard-row rank-${rank}">
          <div class="leaderboard-rank">0${rank}</div>
          <div class="leaderboard-person">
            <strong>${esc(item.name || 'CREAIONX Talent')}</strong>
            <span>${esc(subtitle)}</span>
            <small>${esc(item.id || '')}</small>
          </div>
          <div class="leaderboard-score">
            <strong>${esc(score)}${esc(suffix)}</strong>
            <span>${esc(metricLabel)}</span>
          </div>
        </div>`;
    }).join('');
  }

  async function loadLeaderboard() {
    candidateHost.classList.add('leaderboard-loading');
    employeeHost.classList.add('leaderboard-loading');
    candidateHost.innerHTML = loadingRows();
    employeeHost.innerHTML = loadingRows();

    try {
      if (!/^https:\/\/script\.google\.com\//.test(API_URL)) {
        throw new Error('Leaderboard backend unavailable.');
      }
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getLeaderboard', data: {}, token: '' })
      });
      const out = await response.json();
      if (!out.ok) throw new Error(out.error || 'Leaderboard request failed.');

      candidateHost.innerHTML = renderRows(out.candidates, 'candidate');
      employeeHost.innerHTML = renderRows(out.employees, 'employee');

      if (updatedHost && out.updatedAt) {
        const date = new Date(out.updatedAt);
        updatedHost.textContent = Number.isNaN(date.getTime())
          ? 'Live rankings'
          : `Updated ${date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
      }
    } catch (error) {
      const message = /Unknown action/i.test(String(error?.message || ''))
        ? 'Leaderboard is being activated. Rankings will appear after the latest backend deployment.'
        : 'Leaderboard is temporarily unavailable. Please check again shortly.';
      candidateHost.innerHTML = emptyState(message);
      employeeHost.innerHTML = emptyState(message);
      if (updatedHost) updatedHost.textContent = 'Live rankings unavailable';
    } finally {
      candidateHost.classList.remove('leaderboard-loading');
      employeeHost.classList.remove('leaderboard-loading');
    }
  }

  loadLeaderboard();
})();
