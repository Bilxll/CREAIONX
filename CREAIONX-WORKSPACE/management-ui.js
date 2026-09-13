(() => {
  if (typeof window.renderManagementDashboard !== 'function') return;

  const label = value => String(value || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  function getManagerInfo() {
    try { return JSON.parse(sessionStorage.getItem('cxmInfo') || '{}'); }
    catch { return {}; }
  }

  window.renderManagementShell = function(manager) {
    const content = document.querySelector('.portal-content');
    if (!content) return;

    const managementId = esc(manager?.['Management ID'] || 'CXM');
    const role = esc(label(manager?.['Role'] || 'Management'));
    const department = esc(label(manager?.['Department'] || 'CREAIONX'));
    const scope = esc(label(manager?.['Access Scope'] || 'Authorized access'));

    content.innerHTML = `
      <div id="mgmtDash">
        <div class="mgmt-shell-head">
          <div>
            <div class="eyebrow mono">${managementId} / Management Console</div>
            <h2>${department}</h2>
            <div class="mgmt-shell-meta">
              <span class="mgmt-role-chip">${role}</span>
              <span class="mgmt-scope-chip">${scope}</span>
            </div>
          </div>
          <button class="btn btn-ghost" id="mgmtLogout">Secure logout</button>
        </div>
        <div id="mgmtBody"></div>
      </div>`;

    document.getElementById('mgmtLogout').onclick = async () => {
      const button = document.getElementById('mgmtLogout');
      setBusy(button, true, 'Signing out…');
      try { await api('managerLogout', {}, sessionStorage.getItem('cxmToken')); }
      catch {}
      sessionStorage.removeItem('cxmToken');
      sessionStorage.removeItem('cxmInfo');
      location.reload();
    };
  };

  window.renderManagementDashboard = function(out) {
    const stats = out?.stats || {};
    const body = document.getElementById('mgmtBody');
    if (!body) return;

    const candidateCount = Number(stats.candidates || 0);
    const paymentPending = Number(stats.paymentPending || 0);
    const inTraining = Number(stats.inTraining || 0);
    const employees = Number(stats.employees || 0);

    body.innerHTML = `
      <div class="mgmt-stat-grid">
        <section class="dash-card mgmt-stat-card">
          <div><div class="kicker">Candidates</div><div class="mgmt-stat-value">${candidateCount}</div></div>
          <div class="mgmt-stat-note">Profiles currently registered in WORKSPACE.</div>
        </section>
        <section class="dash-card mgmt-stat-card">
          <div><div class="kicker">Payment pending</div><div class="mgmt-stat-value">${paymentPending}</div></div>
          <div class="mgmt-stat-note">Onboarding payments awaiting completion or verification.</div>
        </section>
        <section class="dash-card mgmt-stat-card">
          <div><div class="kicker">In training</div><div class="mgmt-stat-value">${inTraining}</div></div>
          <div class="mgmt-stat-note">Candidates currently progressing through assigned training.</div>
        </section>
        <section class="dash-card mgmt-stat-card">
          <div><div class="kicker">Active employees</div><div class="mgmt-stat-value">${employees}</div></div>
          <div class="mgmt-stat-note">CREAIONX employees currently recorded in the system.</div>
        </section>
      </div>

      <div class="mgmt-workbench-grid">
        <section class="dash-card mgmt-workbench">
          <div class="mgmt-workbench-head">
            <div class="mgmt-workbench-title">
              <div class="kicker">Candidate operations</div>
              <h3>Candidate Management</h3>
              <p>Review onboarding, assign a field, update assessment status, review training and complete hiring actions.</p>
            </div>
            <div class="mgmt-workbench-icon">CXW</div>
          </div>
          <form id="mgmtCandidateSearch" class="mgmt-search">
            <input id="mgmtCandidateId" placeholder="CXW00000" autocomplete="off" required>
            <button class="btn btn-lime" type="submit">Open candidate</button>
          </form>
          <div id="candidateEditor" class="mgmt-editor">
            <div class="mgmt-empty-state"><div><strong>No candidate selected.</strong><span>Enter a CXW identity above to open the authorized candidate record.</span></div></div>
          </div>
        </section>

        <section class="dash-card mgmt-workbench">
          <div class="mgmt-workbench-head">
            <div class="mgmt-workbench-title">
              <div class="kicker">Employee operations</div>
              <h3>Employee Management</h3>
              <p>Open a CXE record to maintain role, department metrics, progression, performance and employment status.</p>
            </div>
            <div class="mgmt-workbench-icon">CXE</div>
          </div>
          <form id="mgmtEmployeeSearch" class="mgmt-search">
            <input id="mgmtEmployeeId" placeholder="CXE00000" autocomplete="off" required>
            <button class="btn btn-lime" type="submit">Open employee</button>
          </form>
          <div id="employeeEditor" class="mgmt-editor">
            <div class="mgmt-empty-state"><div><strong>No employee selected.</strong><span>Enter a CXE identity above to open the authorized employee record.</span></div></div>
          </div>
        </section>
      </div>

      <section class="dash-card mgmt-security-strip">
        <div>
          <div class="kicker">Restricted system</div>
          <p>Management actions use role-scoped authorization, active session checks and audit logging. Use only the controls available to your assigned management account.</p>
        </div>
        <div class="mgmt-security-badge">Session protected</div>
      </section>`;

    const candidateForm = document.getElementById('mgmtCandidateSearch');
    const employeeForm = document.getElementById('mgmtEmployeeSearch');
    if (candidateForm) candidateForm.onsubmit = event => window.loadCandidateEditor(event);
    if (employeeForm) employeeForm.onsubmit = event => window.loadEmployeeEditor(event);
  };

  // app.js may restore an existing CXM session before this polish layer loads.
  // Re-render once with the production shell so resumed sessions look identical
  // to fresh logins.
  const token = sessionStorage.getItem('cxmToken');
  const info = getManagerInfo();
  if (token && info?.['Management ID']) {
    window.renderManagementShell(info);
    setTimeout(() => {
      if (typeof window.loadManagementStats === 'function') window.loadManagementStats();
    }, 0);
  }
})();
