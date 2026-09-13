(() => {
  const baseRenderCandidate = window.renderCandidate;
  if (typeof baseRenderCandidate !== 'function') return;

  window.renderCandidate = function(c) {
    baseRenderCandidate(c);
    const card = document.querySelector('#candidateDash .dashboard-grid .span-5');
    if (!card) return;
    const payment = String(c['Payment Status'] || '').toUpperCase();
    const decision = String(c['Field Decision'] || 'PENDING').toUpperCase();

    if (payment === 'PENDING') {
      const box = document.createElement('div');
      box.className = 'notice';
      box.innerHTML = `<b>Onboarding payment pending.</b><form id="candidatePaymentForm"><div class="field"><label>Payment method</label><select id="payMethod" required><option value="">Select</option><option>Easypaisa</option><option>JazzCash</option><option>Bank Transfer</option></select></div><div class="field"><label>Transaction ID</label><input id="payTransaction" required></div><div class="field"><label>Payment proof</label><input id="payProof" type="file" accept=".jpg,.jpeg,.png,.pdf" required></div><button class="btn btn-lime" style="margin-top:14px">Submit Rs.500 proof</button></form>`;
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
          alert('Payment proof submitted for review.');
          const fresh = await api('getCandidate', { candidateId: c['Candidate ID'] });
          window.renderCandidate(fresh.candidate);
        } catch (err) { showError(err); }
        finally { setBusy(btn, false); }
      };
    }

    if (c['Recommended Field'] && decision === 'PENDING') {
      const box = document.createElement('div');
      box.className = 'notice';
      box.innerHTML = `<b>Field offered:</b> ${esc(c['Recommended Field'])}<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-lime" id="acceptField">Accept field</button><button class="btn btn-ghost" id="declineField">Decline</button></div>`;
      card.appendChild(box);
      const decide = async choice => {
        if (!confirm(`${choice === 'ACCEPTED' ? 'Accept' : 'Decline'} ${c['Recommended Field']}?`)) return;
        try {
          await api('candidateFieldDecision', { candidateId: c['Candidate ID'], decision: choice });
          const fresh = await api('getCandidate', { candidateId: c['Candidate ID'] });
          window.renderCandidate(fresh.candidate);
        } catch (err) { showError(err); }
      };
      document.getElementById('acceptField').onclick = () => decide('ACCEPTED');
      document.getElementById('declineField').onclick = () => decide('DECLINED');
    }
  };
})();
