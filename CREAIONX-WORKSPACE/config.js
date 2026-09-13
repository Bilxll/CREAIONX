window.CX_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxWZLpE9APX0G9K1YPSFknwt_uHuuWaRQB96I28x3wlSTaAv6qb6vV6Go7iOyeeDWffTA/exec"
};

// Application completion experience.
// app.js performs the backend submission. When that submission succeeds it
// reveals #applicationSuccess. We watch that state change and replace the
// entire application content area with a dedicated confirmation screen.
(() => {
  const form = document.getElementById('applicationForm');
  const success = document.getElementById('applicationSuccess');
  if (!form || !success) return;

  let rendered = false;

  const renderCompletion = () => {
    if (rendered || success.hidden) return;
    rendered = true;

    const candidateId = String(document.getElementById('generatedCandidateId')?.textContent || '').trim();
    const applicantName = String(form.elements.fullName?.value || 'Candidate').trim();
    const statusBits = success.querySelectorAll('.notice b');
    const track = String(statusBits[0]?.textContent || 'CREAIONX WORKSPACE').trim();
    const paymentStatus = String(statusBits[1]?.textContent || 'PENDING').trim();
    const firstName = applicantName.split(/\s+/)[0] || 'Candidate';

    const content = document.querySelector('.portal-content');
    const navStatus = document.querySelector('.portal-nav .status');
    if (!content) return;

    if (navStatus) {
      navStatus.innerHTML = '<i class="status-dot"></i> Application submitted';
    }

    content.innerHTML = `
      <section style="min-height:calc(100vh - 150px);display:grid;place-items:center;padding:34px 0 70px">
        <div style="width:min(980px,100%);display:grid;gap:18px">
          <div class="dash-card" style="padding:clamp(28px,5vw,58px);text-align:center;border-color:var(--lime)">
            <div class="eyebrow mono" style="justify-content:center;margin-bottom:18px">✓ APPLICATION RECEIVED</div>
            <h1 style="font-size:clamp(42px,7vw,84px);line-height:.96;margin:0 0 18px">You're in the<br>CREAIONX system.</h1>
            <p style="max-width:620px;margin:0 auto;color:var(--muted);font-size:16px;line-height:1.7">${escHtml(firstName)}, your application has been successfully saved. Keep your candidate ID safe — it is your identity throughout the CREAIONX WORKSPACE process.</p>

            <div style="margin:34px auto 20px;padding:26px 20px;border:1px solid var(--border);background:rgba(255,255,255,.025);max-width:620px">
              <div class="kicker" style="margin-bottom:10px">YOUR CANDIDATE ID</div>
              <div style="font:700 clamp(38px,7vw,72px) 'JetBrains Mono',monospace;color:var(--lime);letter-spacing:-.04em;word-break:break-word">${escHtml(candidateId)}</div>
              <button class="btn btn-ghost" id="copyCandidateId" type="button" style="margin-top:18px">Copy ID</button>
            </div>

            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px">
              <a class="btn btn-lime" href="candidate.html">Open Candidate Portal ↗</a>
              <a class="btn btn-ghost" href="index.html">Back Home</a>
            </div>
          </div>

          <div class="dashboard-grid">
            <section class="dash-card span-4">
              <div class="kicker">Applicant track</div>
              <h3 style="margin-top:8px">${escHtml(track)}</h3>
              <p style="color:var(--muted);line-height:1.6">Your application has been placed in the correct CREAIONX pathway.</p>
            </section>
            <section class="dash-card span-4">
              <div class="kicker">Application status</div>
              <h3 style="margin-top:8px">SUBMITTED</h3>
              <p style="color:var(--muted);line-height:1.6">Your profile is now recorded and ready for the onboarding process.</p>
            </section>
            <section class="dash-card span-4">
              <div class="kicker">Onboarding payment</div>
              <h3 style="margin-top:8px">${escHtml(paymentStatus)}</h3>
              <p style="color:var(--muted);line-height:1.6">Rs. 500 onboarding must be completed and verified before career review.</p>
            </section>
          </div>

          <div class="dash-card">
            <div class="kicker">WHAT HAPPENS NEXT</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:18px">
              <div class="notice"><b>01 / Save your ID</b><br>Use ${escHtml(candidateId)} whenever you access your candidate profile.</div>
              <div class="notice"><b>02 / Complete onboarding</b><br>Open the Candidate Portal and submit your Rs. 500 payment proof.</div>
              <div class="notice"><b>03 / CREAIONX review</b><br>Our team reviews your profile and recommends a suitable career field.</div>
              <div class="notice"><b>04 / Training & evaluation</b><br>Accept your field, complete training and qualify for employment on merit.</div>
            </div>
          </div>
        </div>
      </section>`;

    const copyButton = document.getElementById('copyCandidateId');
    copyButton?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(candidateId);
        copyButton.textContent = 'Copied ✓';
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = candidateId;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        copyButton.textContent = 'Copied ✓';
      }
      setTimeout(() => { if (copyButton) copyButton.textContent = 'Copy ID'; }, 1800);
    });

    document.title = `${candidateId} — Application Submitted`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  function escHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
  }

  const observer = new MutationObserver(renderCompletion);
  observer.observe(success, { attributes: true, attributeFilter: ['hidden'] });
  renderCompletion();
})();
