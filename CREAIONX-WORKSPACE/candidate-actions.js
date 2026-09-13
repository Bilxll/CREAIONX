(() => {
  const baseRenderCandidate = window.renderCandidate;
  if (typeof baseRenderCandidate !== 'function') return;

  const pretty = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  function toast(message, type = 'success') {
    document.querySelector('.candidate-toast')?.remove();
    const node = document.createElement('div');
    node.className = `candidate-toast${type === 'error' ? ' error' : ''}`;
    node.textContent = message;
    document.body.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 260);
    }, 2800);
  }

  function decorateCandidate(c) {
    const dash = document.getElementById('candidateDash');
    if (!dash) return;

    const cards = [...dash.querySelectorAll('.dashboard-grid > .dash-card')];
    cards.slice(0, 3).forEach(card => card.classList.add('candidate-summary-card'));
    const journeyCard = dash.querySelector('.dashboard-grid > .span-7');
    const statusCard = dash.querySelector('.dashboard-grid > .span-5');
    journeyCard?.classList.add('candidate-journey-card');
    statusCard?.classList.add('candidate-status-card');

    if (statusCard) {
      const h3 = statusCard.querySelector('h3');
      if (h3) h3.textContent = pretty(h3.textContent);
    }

    dash.querySelectorAll('.pill').forEach(pill => {
      pill.textContent = pretty(pill.textContent);
    });

    const timeline = [...dash.querySelectorAll('.timeline-item')];
    const unfinished = timeline.filter(item => !item.classList.contains('done'));
    timeline.forEach(item => {
      if (!item.classList.contains('done')) item.classList.remove('active');
      item.classList.remove('pending');
      const status = item.querySelector('p b');
      if (status) status.textContent = pretty(status.textContent);
    });
    if (unfinished.length) {
      unfinished[0].classList.add('active');
      unfinished.slice(1).forEach(item => item.classList.add('pending'));
    }
  }

  window.renderCandidate = function(c) {
    baseRenderCandidate(c);
    decorateCandidate(c);

    const card = document.querySelector('#candidateDash .dashboard-grid .span-5');
    if (!card) return;
    const payment = String(c['Payment Status'] || '').toUpperCase();
    const decision = String(c['Field Decision'] || 'PENDING').toUpperCase();

    if (payment === 'PENDING') {
      const box = document.createElement('div');
      box.className = 'candidate-action-panel';
      box.innerHTML = `
        <div class="action-title">Complete onboarding payment</div>
        <p class="action-copy">Submit your Rs.500 payment proof. CREAIONX will verify it before your career review continues.</p>
        <form id="candidatePaymentForm">
          <div class="field"><label>Payment method</label><select id="payMethod" required><option value="">Select</option><option>Easypaisa</option><option>JazzCash</option><option>Bank Transfer</option></select></div>
          <div class="field"><label>Transaction ID</label><input id="payTransaction" required></div>
          <div class="field"><label>Payment proof</label><input id="payProof" type="file" accept=".jpg,.jpeg,.png,.pdf" required></div>
          <button class="btn btn-lime" style="margin-top:14px">Submit Rs.500 proof</button>
        </form>`;
      card.appendChild(box);
      const form = document.getElementById('candidatePaymentForm');
      form.onsubmit = async e => {
        e.preventDefault();
        const btn = form.querySelector('button');
        setBusy(btn, true, 'Uploading…');
        try {
          const proof = await filePayload(document.getElementById('payProof').files[0]);
          await api('submitPayment', {
            candidateId: c['Candidate ID'],
            method: document.getElementById('payMethod').value,
            transactionId: document.getElementById('payTransaction').value,
            proof
          });
          toast('Payment proof submitted. CREAIONX will review it shortly.');
          const fresh = await api('getCandidate', { candidateId: c['Candidate ID'] });
          window.renderCandidate(fresh.candidate);
        } catch (err) {
          toast(err?.message || String(err), 'error');
        } finally {
          setBusy(btn, false);
        }
      };
    }

    if (c['Recommended Field'] && decision === 'PENDING') {
      const box = document.createElement('div');
      box.className = 'candidate-action-panel';
      box.innerHTML = `
        <div class="action-title">Field offered: ${esc(c['Recommended Field'])}</div>
        <p class="action-copy">Review the recommended path and choose whether you want to continue into this training track.</p>
        <div class="action-buttons">
          <button class="btn btn-lime" id="acceptField">Accept field</button>
          <button class="btn btn-ghost" id="declineField">Decline</button>
        </div>`;
      card.appendChild(box);
      const decide = async choice => {
        if (!confirm(`${choice === 'ACCEPTED' ? 'Accept' : 'Decline'} ${c['Recommended Field']}?`)) return;
        try {
          await api('candidateFieldDecision', { candidateId: c['Candidate ID'], decision: choice });
          toast(choice === 'ACCEPTED' ? 'Field accepted. Your training path is now active.' : 'Field declined. CREAIONX will review the next step.');
          const fresh = await api('getCandidate', { candidateId: c['Candidate ID'] });
          window.renderCandidate(fresh.candidate);
        } catch (err) {
          toast(err?.message || String(err), 'error');
        }
      };
      document.getElementById('acceptField').onclick = () => decide('ACCEPTED');
      document.getElementById('declineField').onclick = () => decide('DECLINED');
    }
  };
})();
