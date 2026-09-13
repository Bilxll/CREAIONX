(() => {
  if (typeof window.renderEmployee !== 'function') return;

  const valueExists = v => String(v ?? '').trim() !== '';
  const initials = name => String(name || 'CX').trim().split(/\s+/).slice(0,2).map(x => x[0] || '').join('').toUpperCase() || 'CX';
  const cleanLabel = v => String(v || '—').replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());
  const metricValue = v => valueExists(v) ? pct(v) : 0;
  const metricText = (v, suffix='') => valueExists(v) ? `${pct(v)}${suffix}` : 'Not scored yet';

  function performanceItem(label, raw) {
    const has = valueExists(raw);
    const score = metricValue(raw);
    return `<div class="performance-item ${has ? '' : 'empty'}">
      <div class="performance-item-head"><span>${esc(label)}</span><span class="performance-score">${has ? `${score}/100` : 'Pending'}</span></div>
      <div class="meter"><span style="width:${score}%"></span></div>
    </div>`;
  }

  window.renderEmployee = function(x) {
    const employeeId = esc(x['Employee ID'] || '');
    const fullName = esc(x['Full Name'] || 'CREAIONX Employee');
    const department = esc(x['Department'] || 'CREAIONX');
    const role = esc(x['Role'] || 'Employee');
    const level = esc(x['Level'] || 'CREAIONX');
    const statusRaw = String(x['Employment Status'] || 'ACTIVE').toUpperCase();
    const status = esc(cleanLabel(statusRaw));
    const isActive = /ACTIVE|PROBATION|EMPLOYED/.test(statusRaw);
    const performance = metricValue(x['Performance Score']);
    const attendance = metricValue(x['Attendance %']);
    const training = metricValue(x['Training Progress %']);
    const readiness = metricValue(x['Promotion Readiness %']);
    const nextRole = esc(x['Next Role'] || 'Next level');
    const tasks = valueExists(x['Tasks Completed']) ? esc(x['Tasks Completed']) : '0';
    const joinDate = valueExists(x['Join Date']) ? esc(x['Join Date']) : 'Not recorded';
    const manager = valueExists(x['Manager ID']) ? esc(x['Manager ID']) : 'Not assigned';
    const lastUpdated = valueExists(x['Last Updated']) ? esc(x['Last Updated']) : 'Not available';
    const candidateId = valueExists(x['Candidate ID']) ? esc(x['Candidate ID']) : '—';

    const dash = document.getElementById('employeeDash');
    if (!dash) return;

    dash.innerHTML = `
      <div class="employee-hero">
        <div>
          <div class="employee-identity">
            <div class="employee-avatar">${esc(initials(x['Full Name']))}</div>
            <div class="employee-idblock"><strong>${fullName}</strong><span>${employeeId} / ${department}</span></div>
          </div>
          <h2>Your work.<br>Your growth.</h2>
          <div class="employee-meta">
            <span class="employee-chip">${role}</span>
            <span class="employee-chip">${level}</span>
            <span class="employee-chip ${isActive ? 'green' : ''}">${status}</span>
          </div>
        </div>
        <button class="btn btn-ghost" id="employeeLogout2">Exit profile</button>
      </div>

      <div class="dashboard-grid employee-dashboard-grid">
        <section class="dash-card span-3 employee-metric">
          <div><div class="kicker">Current role</div><div class="metric-value">${role}</div><div class="metric-sub">${department}</div></div>
          <span class="pill ${isActive ? 'green' : ''}">${status}</span>
        </section>
        <section class="dash-card span-3 employee-metric">
          <div><div class="kicker">Performance</div><div class="metric-value">${metricText(x['Performance Score'])}</div><div class="metric-sub">Overall tracked score</div></div>
          <div class="meter"><span style="width:${performance}%"></span></div>
        </section>
        <section class="dash-card span-3 employee-metric">
          <div><div class="kicker">Attendance</div><div class="metric-value">${metricText(x['Attendance %'],'%')}</div><div class="metric-sub">Recorded attendance rate</div></div>
          <div class="meter"><span style="width:${attendance}%"></span></div>
        </section>
        <section class="dash-card span-3 employee-metric">
          <div><div class="kicker">Tasks completed</div><div class="metric-value">${tasks}</div><div class="metric-sub">Completed assigned work</div></div>
          <span class="employee-chip">${level}</span>
        </section>

        <section class="dash-card span-7 employee-progress-card">
          <div class="kicker">Career progression</div>
          <div class="career-route">
            <div class="career-role"><div class="label">Current role</div><strong>${role}</strong></div>
            <div class="career-arrow">→</div>
            <div class="career-role"><div class="label">Next role</div><strong>${nextRole}</strong></div>
          </div>
          <div class="readiness-row"><div><div class="kicker">Promotion readiness</div><strong>${valueExists(x['Promotion Readiness %']) ? `${readiness}%` : 'Not assessed'}</strong></div><span class="employee-chip ${readiness >= 80 ? 'green' : ''}">${readiness >= 80 ? 'High readiness' : readiness > 0 ? 'In progress' : 'Awaiting review'}</span></div>
          <div class="meter"><span style="width:${readiness}%"></span></div>
          <div class="readiness-copy">Progress reflects the employee record maintained by CREAIONX management. Promotion decisions remain subject to role requirements, performance, availability and leadership review.</div>
        </section>

        <section class="dash-card span-5">
          <div class="kicker">Development</div>
          <h3>Training ${valueExists(x['Training Progress %']) ? `${training}%` : 'not scored'}</h3>
          <div class="meter"><span style="width:${training}%"></span></div>
          <div class="employee-detail-list">
            <div class="employee-detail"><span>Manager</span><strong>${manager}</strong></div>
            <div class="employee-detail"><span>Join date</span><strong>${joinDate}</strong></div>
            <div class="employee-detail"><span>Originating candidate</span><strong>${candidateId}</strong></div>
          </div>
          <div class="employee-privacy"><b>Private by design.</b> Payroll, compensation, private documents and sensitive HR data are not exposed through CXE ID-only access.</div>
        </section>

        <section class="dash-card span-12">
          <div class="kicker">Performance breakdown</div>
          <div class="performance-grid">
            ${performanceItem('Quality', x['Quality Score'])}
            ${performanceItem('Communication', x['Communication Score'])}
            ${performanceItem('Reliability', x['Reliability Score'])}
            ${performanceItem('Productivity', x['Productivity Score'])}
          </div>
          <div class="employee-updated">Employee record last updated: ${lastUpdated}</div>
        </section>
      </div>`;

    document.getElementById('employeeLogout2')?.addEventListener('click', () => {
      document.getElementById('employeeDash').hidden = true;
      document.getElementById('employeeGate').hidden = false;
      const input = document.getElementById('employeeId');
      if (input) input.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
})();
