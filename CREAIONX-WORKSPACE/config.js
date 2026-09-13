window.CX_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxWZLpE9APX0G9K1YPSFknwt_uHuuWaRQB96I28x3wlSTaAv6qb6vV6Go7iOyeeDWffTA/exec"
};

// Apply-page submission controller.
// This runs before app.js and owns application submission completely so a
// successful application always becomes a dedicated confirmation screen.
(() => {
  const form = document.getElementById('applicationForm');
  if (!form) return;

  const API_URL = String(window.CX_CONFIG.APPS_SCRIPT_URL || '').trim();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
  }

  async function filePayload(file) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} is larger than 5 MB.`);
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataBase64: String(dataUrl).split(',')[1]
    };
  }

  async function submitApplication(payload) {
    if (!/^https:\/\/script\.google\.com\//.test(API_URL)) {
      throw new Error('CREAIONX backend is not connected.');
    }
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'submitApplication', data: payload, token: '' })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Application submission failed.');
    return result;
  }

  function renderSuccess(result, fullName) {
    const candidateId = String(result.candidateId || '').trim();
    const track = String(result.track || 'CREAIONX WORKSPACE').trim();
    const paymentStatus = String(result.paymentStatus || 'PENDING').trim();
    const firstName = String(fullName || 'Candidate').trim().split(/\s+/)[0] || 'Candidate';
    const content = document.querySelector('.portal-content');
    const navStatus = document.querySelector('.portal-nav .status');

    if (!content) {
      alert(`Application submitted successfully. Your candidate ID is ${candidateId}`);
      return;
    }

    sessionStorage.setItem('cxwRecentCandidateId', candidateId);

    if (navStatus) {
      navStatus.innerHTML = '<i class="status-dot"></i> Application submitted';
    }

    content.innerHTML = `
      <section style="min-height:calc(100vh - 140px);display:grid;place-items:center;padding:24px 0 70px">
        <div style="width:min(1000px,100%);display:grid;gap:18px">
          <div class="dash-card" style="padding:clamp(30px,5vw,64px);text-align:center;border-color:var(--lime)">
            <div class="eyebrow mono" style="justify-content:center;margin-bottom:18px">✓ APPLICATION RECEIVED</div>
            <h1 style="font-size:clamp(44px,7vw,86px);line-height:.96;margin:0 0 18px">You're officially<br>in the system.</h1>
            <p style="max-width:650px;margin:0 auto;color:var(--muted);font-size:16px;line-height:1.7">${escapeHtml(firstName)}, your CREAIONX application has been saved successfully. Keep the candidate ID below safe — you will use it throughout your journey.</p>

            <div style="margin:36px auto 22px;padding:28px 20px;border:1px solid var(--border);background:rgba(255,255,255,.025);max-width:640px">
              <div class="kicker" style="margin-bottom:10px">YOUR CANDIDATE ID</div>
              <div id="successCandidateId" style="font:700 clamp(40px,7vw,76px) 'JetBrains Mono',monospace;color:var(--lime);letter-spacing:-.04em;word-break:break-word">${escapeHtml(candidateId)}</div>
              <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:20px">
                <button class="btn btn-ghost" id="copyCandidateId" type="button">Copy ID</button>
                <a class="btn btn-lime" href="candidate.html">Open Candidate Portal ↗</a>
              </div>
            </div>

            <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
              <span>Track: <b style="color:var(--text)">${escapeHtml(track)}</b></span>
              <span>Application: <b style="color:var(--text)">SUBMITTED</b></span>
              <span>Payment: <b style="color:var(--text)">${escapeHtml(paymentStatus)}</b></span>
            </div>
          </div>

          <div class="dash-card">
            <div class="kicker">WHAT HAPPENS NEXT</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:18px">
              <div class="notice"><b>01 / Save your ID</b><br>${escapeHtml(candidateId)} is your permanent candidate identity.</div>
              <div class="notice"><b>02 / Complete onboarding</b><br>Open your Candidate Portal and submit the Rs. 500 onboarding payment proof.</div>
              <div class="notice"><b>03 / Profile review</b><br>CREAIONX reviews your background and recommends a suitable career field.</div>
              <div class="notice"><b>04 / Train & qualify</b><br>Accept your field, complete training and qualify for employment on merit.</div>
            </div>
            <div style="text-align:center;margin-top:22px"><a class="btn btn-ghost" href="index.html">Back Home</a></div>
          </div>
        </div>
      </section>`;

    const copyButton = document.getElementById('copyCandidateId');
    copyButton?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(candidateId);
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = candidateId;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      copyButton.textContent = 'Copied ✓';
      setTimeout(() => { copyButton.textContent = 'Copy ID'; }, 1800);
    });

    document.title = `${candidateId} — Application Submitted`;
    window.scrollTo(0, 0);
  }

  // Capture phase + stopImmediatePropagation prevents the legacy app.js
  // submit handler from running on the Apply page.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const button = form.querySelector('button[type="submit"]');
    const originalButtonText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Submitting…';
    }

    try {
      const formData = new FormData(form);
      const payload = {};
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) continue;
        payload[key] = value;
      }

      payload.guardianConsent = !!form.querySelector('input[name="guardianConsent"]')?.checked;
      payload.cv = await filePayload(form.querySelector('input[name="cv"]')?.files?.[0]);
      payload.document = await filePayload(form.querySelector('input[name="document"]')?.files?.[0]);

      const result = await submitApplication(payload);
      renderSuccess(result, payload.fullName);
    } catch (error) {
      alert(error?.message || String(error || 'Application submission failed.'));
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText || 'Complete submission ↗';
      }
    }
  }, true);
})();
