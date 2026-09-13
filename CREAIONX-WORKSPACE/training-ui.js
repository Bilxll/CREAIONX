(() => {
  const instructions = {
    'CRT-01': 'Create a one-page visual study showing strong hierarchy, spacing, typography and color choices. Submit PNG, JPG or PDF.',
    'CRT-02': 'Recreate a professional reference creative in Canva or Figma with clean alignment and export-ready structure. Submit PNG, JPG or PDF.',
    'CRT-03': 'Create a matching social-media ad set: one 1:1 post and one 9:16 story/reel creative. Package both in one PDF or ZIP if needed.',
    'CRT-04': 'Create three variations that clearly belong to the same brand system while changing layout or message emphasis.',
    'CRT-05': 'Build a mini campaign with at least three finished creatives and a short rationale explaining the concept and audience. Submit PDF or ZIP.'
  };

  function moduleStatusClass(v) {
    const s = String(v || '').toUpperCase();
    return s === 'COMPLETED' ? 'green' : '';
  }

  async function renderCandidateTraining(candidate) {
    if (String(candidate['Field Decision'] || '').toUpperCase() !== 'ACCEPTED') return;
    const dash = document.getElementById('candidateDash');
    if (!dash) return;

    let host = document.getElementById('candidateTrainingPanel');
    if (!host) {
      host = document.createElement('section');
      host.id = 'candidateTrainingPanel';
      host.className = 'dash-card';
      host.style.marginTop = '20px';
      dash.appendChild(host);
    }

    host.innerHTML = '<div class="kicker">Training</div><h3>Loading your modules…</h3>';
    try {
      const out = await api('getCandidateTraining', { candidateId: candidate['Candidate ID'] });
      const modules = out.modules || [];
      host.innerHTML = `
        <div class="kicker">${esc(out.field)} training</div>
        <div class="section-head" style="margin:8px 0 22px;align-items:flex-end">
          <div><h3 style="margin:0">Required modules</h3><p style="color:var(--muted);margin:8px 0 0">Complete all modules before final evaluation unlocks.</p></div>
          <div class="pill ${out.progress >= 100 ? 'green' : ''}">${esc(out.progress)}% complete</div>
        </div>
        <div class="meter" style="margin-bottom:22px"><span style="width:${pct(out.progress)}%"></span></div>
        <div id="trainingModuleList" style="display:grid;gap:14px"></div>`;

      const list = host.querySelector('#trainingModuleList');
      modules.forEach((m, index) => {
        const status = String(m['Status'] || 'ASSIGNED').toUpperCase();
        const card = document.createElement('div');
        card.className = 'notice';
        card.style.margin = '0';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
            <div>
              <div class="kicker">Module ${String(index + 1).padStart(2,'0')} / ${esc(m['Module ID'])}</div>
              <h4 style="font-size:20px;margin:7px 0">${esc(m['Module Name'])}</h4>
            </div>
            <span class="pill ${moduleStatusClass(status)}">${esc(status)}</span>
          </div>
          <p style="color:var(--muted);line-height:1.65">${esc(instructions[m['Module ID']] || 'Complete the assigned practical exercise and submit your work for trainer review.')}</p>
          ${m['Feedback'] ? `<div class="notice" style="margin:12px 0 0"><b>Trainer feedback:</b> ${esc(m['Feedback'])}</div>` : ''}
          ${status === 'COMPLETED' ? `<div style="margin-top:12px"><b>Score:</b> ${esc(m['Score'] || '—')} / 100</div>` : ''}
          ${status !== 'COMPLETED' && status !== 'SUBMITTED' ? `
            <form class="trainingSubmitForm" data-record-id="${esc(m['Training Record ID'])}" style="margin-top:16px">
              <div class="field"><label>Submission notes <span style="opacity:.55">(optional)</span></label><textarea class="trainingNotes" rows="3" placeholder="Briefly explain what you created or include any relevant context."></textarea></div>
              <div class="field"><label>Upload practical work</label><input class="trainingFile" type="file" accept=".png,.jpg,.jpeg,.pdf,.zip" required></div>
              <button class="btn btn-lime" type="submit">Submit module ↗</button>
            </form>` : status === 'SUBMITTED' ? `<div class="notice" style="margin-top:14px"><b>Submitted for review.</b> Your trainer will score this module or request a revision.</div>` : ''}`;
        list.appendChild(card);
      });

      host.querySelectorAll('.trainingSubmitForm').forEach(form => {
        form.addEventListener('submit', async e => {
          e.preventDefault();
          const btn = form.querySelector('button');
          setBusy(btn, true, 'Uploading…');
          try {
            const submission = await filePayload(form.querySelector('.trainingFile').files[0]);
            await api('submitTraining', {
              candidateId: candidate['Candidate ID'],
              recordId: form.dataset.recordId,
              notes: form.querySelector('.trainingNotes').value,
              submission
            });
            alert('Training module submitted for review.');
            await renderCandidateTraining(candidate);
          } catch (err) {
            showError(err);
          } finally {
            setBusy(btn, false);
          }
        });
      });
    } catch (err) {
      host.innerHTML = `<div class="kicker">Training</div><div class="notice">${esc(err.message || err)}</div>`;
    }
  }

  const baseRenderCandidate = window.renderCandidate;
  if (typeof baseRenderCandidate === 'function') {
    window.renderCandidate = function(candidate) {
      baseRenderCandidate(candidate);
      renderCandidateTraining(candidate);
    };
  }

  async function renderManagerTraining(candidateId) {
    const editor = document.getElementById('candidateEditor');
    if (!editor) return;
    let host = document.getElementById('managerTrainingPanel');
    if (!host) {
      host = document.createElement('div');
      host.id = 'managerTrainingPanel';
      host.style.marginTop = '20px';
      editor.appendChild(host);
    }
    host.innerHTML = '<div class="kicker">Training review</div><div class="notice">Loading training records…</div>';
    try {
      const out = await api('managerGetTraining', { candidateId }, sessionStorage.getItem('cxmToken'));
      if (!(out.modules || []).length) {
        host.innerHTML = '<div class="kicker">Training review</div><div class="notice">No training modules assigned yet.</div>';
        return;
      }
      host.innerHTML = `<div class="kicker">Training review</div><h3 style="margin:8px 0 16px">${esc(out.field)} modules</h3><div id="managerTrainingList" style="display:grid;gap:12px"></div>`;
      const list = host.querySelector('#managerTrainingList');
      out.modules.forEach(m => {
        const status = String(m['Status'] || 'ASSIGNED').toUpperCase();
        const card = document.createElement('div');
        card.className = 'notice';
        card.style.margin = '0';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
            <div><b>${esc(m['Module ID'])} · ${esc(m['Module Name'])}</b></div>
            <span class="pill ${moduleStatusClass(status)}">${esc(status)}</span>
          </div>
          ${m['Submission URL'] ? `<p style="margin:12px 0"><a class="btn btn-ghost" href="${esc(m['Submission URL'])}" target="_blank" rel="noopener">Open submission ↗</a></p>` : '<p style="color:var(--muted)">No submission uploaded yet.</p>'}
          ${m['Submission Notes'] ? `<p style="color:var(--muted);line-height:1.55"><b>Candidate notes:</b> ${esc(m['Submission Notes'])}</p>` : ''}
          <div class="field"><label>Score / 100</label><input class="reviewScore" type="number" min="0" max="100" value="${esc(m['Score'] || '')}"></div>
          <div class="field"><label>Trainer feedback</label><textarea class="reviewFeedback" rows="3">${esc(m['Feedback'] || '')}</textarea></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-lime reviewComplete" type="button">Mark complete</button>
            <button class="btn btn-ghost reviewRevision" type="button">Request revision</button>
          </div>`;
        const review = async statusChoice => {
          const button = statusChoice === 'COMPLETED' ? card.querySelector('.reviewComplete') : card.querySelector('.reviewRevision');
          setBusy(button, true, 'Saving…');
          try {
            await api('managerReviewTraining', {
              recordId: m['Training Record ID'],
              status: statusChoice,
              score: card.querySelector('.reviewScore').value,
              feedback: card.querySelector('.reviewFeedback').value
            }, sessionStorage.getItem('cxmToken'));
            await renderManagerTraining(candidateId);
          } catch (err) {
            showError(err);
          } finally {
            setBusy(button, false);
          }
        };
        card.querySelector('.reviewComplete').onclick = () => review('COMPLETED');
        card.querySelector('.reviewRevision').onclick = () => review('REVISION_REQUIRED');
        list.appendChild(card);
      });
    } catch (err) {
      host.innerHTML = `<div class="kicker">Training review</div><div class="notice">${esc(err.message || err)}</div>`;
    }
  }

  const baseLoadCandidateEditor = window.loadCandidateEditor;
  if (typeof baseLoadCandidateEditor === 'function') {
    window.loadCandidateEditor = async function(e) {
      await baseLoadCandidateEditor(e);
      const id = normalizeId(document.getElementById('mgmtCandidateId')?.value);
      if (id) await renderManagerTraining(id);
    };
  }
})();
