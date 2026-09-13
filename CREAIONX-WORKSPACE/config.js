window.CX_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxWZLpE9APX0G9K1YPSFknwt_uHuuWaRQB96I28x3wlSTaAv6qb6vV6Go7iOyeeDWffTA/exec"
};

// Global CREAIONX custom dropdown system.
// Native selects remain in the DOM for form submission/backend compatibility,
// while the visible opened menu is fully rendered in the site theme.
(() => {
  const style = document.createElement('style');
  style.id = 'cx-custom-dropdown-theme';
  style.textContent = `
    .cx-select {
      position: relative;
      width: 100%;
      margin-top: 8px;
      isolation: isolate;
    }

    .cx-native-select {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -1 !important;
    }

    .cx-select-trigger {
      width: 100%;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 13px 15px 13px 16px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 14px;
      background: rgba(255,255,255,.035);
      color: var(--text, #ebebeb);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.3;
      text-align: left;
      cursor: pointer;
      outline: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.02);
      transition: border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .2s ease;
    }

    .cx-select-trigger:hover {
      border-color: rgba(204,255,0,.38);
      background: rgba(204,255,0,.035);
    }

    .cx-select.open .cx-select-trigger,
    .cx-select-trigger:focus-visible {
      border-color: #ccff00;
      background: rgba(204,255,0,.045);
      box-shadow: 0 0 0 4px rgba(204,255,0,.07), 0 0 30px rgba(204,255,0,.08);
    }

    .cx-select-trigger.is-placeholder .cx-select-value {
      color: rgba(235,235,235,.48);
    }

    .cx-select-chevron {
      width: 29px;
      height: 29px;
      flex: 0 0 29px;
      display: grid;
      place-items: center;
      border-left: 1px solid rgba(255,255,255,.08);
      color: #ccff00;
      padding-left: 12px;
      margin-left: auto;
    }

    .cx-select-chevron::before {
      content: '';
      width: 7px;
      height: 7px;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(45deg) translate(-1px,-1px);
      transition: transform .2s ease;
    }

    .cx-select.open .cx-select-chevron::before {
      transform: rotate(225deg) translate(-1px,-1px);
    }

    .cx-select-menu {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 8px);
      z-index: 10000;
      display: none;
      max-height: 290px;
      overflow-y: auto;
      padding: 7px;
      border: 1px solid rgba(204,255,0,.28);
      border-radius: 16px;
      background: rgba(8,8,8,.98);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 24px 70px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.025) inset, 0 0 34px rgba(204,255,0,.055);
      transform-origin: top center;
      animation: cxSelectIn .16s ease-out;
    }

    .cx-select.open .cx-select-menu {
      display: block;
    }

    .cx-select-option {
      width: 100%;
      min-height: 42px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      margin: 1px 0;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      color: rgba(235,235,235,.78);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background .14s ease, color .14s ease, border-color .14s ease, transform .14s ease;
    }

    .cx-select-option:hover,
    .cx-select-option.keyboard-active {
      background: rgba(255,255,255,.06);
      border-color: rgba(255,255,255,.07);
      color: #fff;
      transform: translateX(2px);
    }

    .cx-select-option.selected {
      background: #ccff00;
      border-color: #ccff00;
      color: #000;
      font-weight: 700;
    }

    .cx-select-option.selected::after {
      content: '✓';
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 800;
    }

    .cx-select-option:disabled {
      opacity: .34;
      cursor: not-allowed;
      transform: none;
    }

    .cx-select-group {
      padding: 10px 12px 5px;
      color: rgba(204,255,0,.62);
      font: 600 9px 'JetBrains Mono', monospace;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    .cx-select-menu::-webkit-scrollbar { width: 8px; }
    .cx-select-menu::-webkit-scrollbar-track { background: transparent; }
    .cx-select-menu::-webkit-scrollbar-thumb {
      background: rgba(204,255,0,.22);
      border: 2px solid #080808;
      border-radius: 99px;
    }
    .cx-select-menu::-webkit-scrollbar-thumb:hover { background: rgba(204,255,0,.42); }
    .cx-select-menu { scrollbar-width: thin; scrollbar-color: rgba(204,255,0,.28) transparent; }

    .cx-select.disabled { opacity: .48; }
    .cx-select.disabled .cx-select-trigger { cursor: not-allowed; }

    @keyframes cxSelectIn {
      from { opacity: 0; transform: translateY(-5px) scale(.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (max-width: 640px) {
      .cx-select-trigger { min-height: 48px; font-size: 16px; padding-left: 14px; }
      .cx-select-option { min-height: 46px; font-size: 15px; }
      .cx-select-menu { max-height: 260px; }
    }
  `;
  document.head.appendChild(style);

  const closeAll = except => {
    document.querySelectorAll('.cx-select.open').forEach(wrapper => {
      if (wrapper !== except) {
        wrapper.classList.remove('open');
        wrapper.querySelector('.cx-select-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
  };

  function enhanceSelect(select) {
    if (!select || select.dataset.cxEnhanced === 'true') return;
    select.dataset.cxEnhanced = 'true';
    select.classList.add('cx-native-select');

    const wrapper = document.createElement('div');
    wrapper.className = 'cx-select';
    if (select.disabled) wrapper.classList.add('disabled');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cx-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const value = document.createElement('span');
    value.className = 'cx-select-value';
    const chevron = document.createElement('span');
    chevron.className = 'cx-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    trigger.append(value, chevron);

    const menu = document.createElement('div');
    menu.className = 'cx-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.tabIndex = -1;

    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select, trigger, menu);

    let keyboardIndex = -1;

    const optionNodes = () => [...menu.querySelectorAll('.cx-select-option:not(:disabled)')];

    const renderOptions = () => {
      menu.innerHTML = '';
      [...select.children].forEach(child => {
        if (child.tagName === 'OPTGROUP') {
          const group = document.createElement('div');
          group.className = 'cx-select-group';
          group.textContent = child.label;
          menu.appendChild(group);
          [...child.children].forEach(option => addOption(option));
        } else if (child.tagName === 'OPTION') {
          addOption(child);
        }
      });
      syncFromNative();
    };

    const addOption = option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cx-select-option';
      item.setAttribute('role', 'option');
      item.dataset.value = option.value;
      item.textContent = option.textContent;
      item.disabled = option.disabled;
      item.addEventListener('click', () => {
        if (option.disabled) return;
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncFromNative();
        closeAll();
        trigger.focus();
      });
      menu.appendChild(item);
    };

    const syncFromNative = () => {
      const chosen = select.options[select.selectedIndex];
      value.textContent = chosen ? chosen.textContent : 'Select';
      trigger.classList.toggle('is-placeholder', !chosen || chosen.value === '');
      trigger.disabled = select.disabled;
      wrapper.classList.toggle('disabled', select.disabled);
      [...menu.querySelectorAll('.cx-select-option')].forEach(item => {
        const active = item.dataset.value === select.value;
        item.classList.toggle('selected', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    };

    const openMenu = () => {
      if (select.disabled) return;
      const willOpen = !wrapper.classList.contains('open');
      closeAll(wrapper);
      wrapper.classList.toggle('open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        const nodes = optionNodes();
        keyboardIndex = Math.max(0, nodes.findIndex(node => node.dataset.value === select.value));
        setKeyboardActive(nodes);
        menu.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
      }
    };

    const setKeyboardActive = nodes => {
      nodes.forEach((node, i) => node.classList.toggle('keyboard-active', i === keyboardIndex));
      nodes[keyboardIndex]?.scrollIntoView({ block: 'nearest' });
    };

    trigger.addEventListener('click', openMenu);
    trigger.addEventListener('keydown', event => {
      const nodes = optionNodes();
      if (!nodes.length) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!wrapper.classList.contains('open')) openMenu();
        keyboardIndex = event.key === 'ArrowDown'
          ? Math.min(nodes.length - 1, keyboardIndex + 1)
          : Math.max(0, keyboardIndex - 1);
        setKeyboardActive(nodes);
      } else if ((event.key === 'Enter' || event.key === ' ') && wrapper.classList.contains('open')) {
        event.preventDefault();
        nodes[keyboardIndex]?.click();
      } else if (event.key === 'Escape') {
        closeAll();
      }
    });

    select.addEventListener('change', syncFromNative);
    renderOptions();

    const nativeObserver = new MutationObserver(renderOptions);
    nativeObserver.observe(select, { childList: true, subtree: true, attributes: true });
  }

  const enhanceAll = root => {
    if (root?.matches?.('select')) enhanceSelect(root);
    root?.querySelectorAll?.('select').forEach(enhanceSelect);
  };

  enhanceAll(document);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) enhanceAll(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    if (!event.target.closest('.cx-select')) closeAll();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAll();
  });
})();

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
