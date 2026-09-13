const CONFIG = window.CX_CONFIG || { APPS_SCRIPT_URL: '' };
const API_URL = String(CONFIG.APPS_SCRIPT_URL || '').trim();

function normalizeId(v){ return String(v||'').trim().toUpperCase(); }
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function num(v, fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function pct(v){ return Math.max(0,Math.min(100,num(v))); }
function apiReady(){ return /^https:\/\/script\.google\.com\//.test(API_URL); }
function setBusy(btn,busy,label='Working…'){ if(!btn)return; if(busy){btn.dataset.old=btn.textContent;btn.disabled=true;btn.textContent=label}else{btn.disabled=false;btn.textContent=btn.dataset.old||btn.textContent} }
function showError(err){ alert(err?.message || String(err || 'Something went wrong.')); }
async function api(action,data={},token=''){
  if(!apiReady()) throw new Error('CREAIONX backend is not connected yet. Add the deployed Apps Script Web App URL to config.js.');
  const res = await fetch(API_URL,{method:'POST',body:JSON.stringify({action,data,token})});
  const out = await res.json();
  if(!out.ok) throw new Error(out.error || 'Request failed.');
  return out;
}
async function filePayload(file){
  if(!file) return null;
  if(file.size > 5*1024*1024) throw new Error(`${file.name} is larger than 5 MB.`);
  const dataUrl = await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  return {name:file.name,mimeType:file.type||'application/octet-stream',dataBase64:String(dataUrl).split(',')[1]};
}
function statusClass(v){ const s=String(v||'').toUpperCase(); return /VERIFIED|ACCEPTED|COMPLETE|HIRED|ACTIVE|PASS/.test(s)?'green':''; }

const applicationForm=document.getElementById('applicationForm');
if(applicationForm){
  applicationForm.addEventListener('submit',async e=>{
    e.preventDefault(); const btn=applicationForm.querySelector('button[type="submit"]'); setBusy(btn,true,'Submitting…');
    try{
      const fd=new FormData(applicationForm); const cv=applicationForm.querySelector('input[name="cv"]')?.files?.[0]; const doc=applicationForm.querySelector('input[name="document"]')?.files?.[0];
      const payload={}; for(const [k,v] of fd.entries()){ if(v instanceof File) continue; payload[k]=v; }
      payload.guardianConsent=!!applicationForm.querySelector('input[name="guardianConsent"]')?.checked;
      payload.cv=await filePayload(cv); payload.document=await filePayload(doc);
      const out=await api('submitApplication',payload);
      document.getElementById('generatedCandidateId').textContent=out.candidateId;
      const note=document.querySelector('#applicationSuccess .notice'); if(note) note.innerHTML=`Track: <b>${esc(out.track)}</b> · Onboarding payment: <b>${esc(out.paymentStatus)}</b>. Save this ID carefully.`;
      applicationForm.hidden=true; document.getElementById('applicationSuccess').hidden=false; window.scrollTo({top:0,behavior:'smooth'});
    }catch(err){showError(err)}finally{setBusy(btn,false)}
  });
}

const candidateLookup=document.getElementById('candidateLookup');
if(candidateLookup){
  candidateLookup.addEventListener('submit',async e=>{
    e.preventDefault(); const btn=candidateLookup.querySelector('button'); setBusy(btn,true,'Opening…');
    try{ const id=normalizeId(document.getElementById('candidateId').value); const out=await api('getCandidate',{candidateId:id}); renderCandidate(out.candidate); document.getElementById('candidateGate').hidden=true; document.getElementById('candidateDash').hidden=false; window.scrollTo({top:0}); }
    catch(err){showError(err)} finally{setBusy(btn,false)}
  });
  document.getElementById('candidateLogout')?.addEventListener('click',()=>{document.getElementById('candidateDash').hidden=true;document.getElementById('candidateGate').hidden=false});
}
function renderCandidate(c){
  const id=esc(c['Candidate ID']), name=esc((c['Full Name']||'Candidate').split(' ')[0]);
  const training=pct(c['Training Progress %']); const payment=esc(c['Payment Status']||'PENDING'); const field=esc(c['Recommended Field']||'Under review');
  const fieldDecision=esc(c['Field Decision']||'PENDING'); const hiring=esc(c['Hiring Status']||'NOT_HIRED'); const app=esc(c['Application Status']||'SUBMITTED'); const score=esc(c['Assessment Score']||'—');
  document.getElementById('candidateDash').innerHTML=`
  <div class="section-head" style="margin-bottom:30px"><div><div class="eyebrow mono">Candidate / ${id}</div><h2 style="font-size:56px">Welcome,<br>${name}.</h2></div><button class="btn btn-ghost" id="candidateLogout2">Exit profile</button></div>
  <div class="dashboard-grid">
    <section class="dash-card span-4"><div class="kicker">Training progress</div><h3>${training}% complete</h3><div class="meter"><span style="width:${training}%"></span></div></section>
    <section class="dash-card span-4"><div class="kicker">Field offered</div><h3>${field}</h3><span class="pill ${statusClass(fieldDecision)}" style="margin-top:14px">${fieldDecision}</span></section>
    <section class="dash-card span-4"><div class="kicker">Onboarding payment</div><h3>Rs. 500</h3><span class="pill ${statusClass(payment)}" style="margin-top:14px">${payment}</span></section>
    <section class="dash-card span-7"><div class="kicker">Your CREAIONX journey</div><div class="timeline">
      ${journeyItem('Application submitted',app,'Your CXW identity is active.',true)}
      ${journeyItem('Rs.500 onboarding',payment,'Verification is required before career review.',payment==='VERIFIED')}
      ${journeyItem('Field recommendation',field,'CREAIONX reviews your profile and offers a suitable path.',!!c['Recommended Field'])}
      ${journeyItem('Field decision',fieldDecision,'Accept the offered path before niche training begins.',fieldDecision==='ACCEPTED')}
      ${journeyItem('Training',training+'%','Complete your required niche modules.',training>=100)}
      ${journeyItem('Final evaluation',score,'Assessment follows training completion.',String(c['Assessment Score']||'')!=='')}
      ${journeyItem('CREAIONX employment',hiring,c['Employee ID']?('Employee ID: '+esc(c['Employee ID'])):'Successful candidates receive a CXE identity.',hiring==='HIRED')}
    </div></section>
    <section class="dash-card span-5"><div class="kicker">Current status</div><h3>${app}</h3><p style="color:var(--muted);line-height:1.6">Track: ${esc(c['Applicant Track']||'CREAIONX WORKSPACE')}</p>${c['Employee ID']?`<a class="btn btn-lime" href="employee.html" style="margin-top:18px">Open employee portal ↗</a>`:''}</section>
  </div>`;
  document.getElementById('candidateLogout2')?.addEventListener('click',()=>{document.getElementById('candidateDash').hidden=true;document.getElementById('candidateGate').hidden=false});
}
function journeyItem(title,status,desc,done){return `<div class="timeline-item ${done?'done':'active'}"><div class="timeline-dot">${done?'✓':''}</div><div><h4>${esc(title)}</h4><p><b>${esc(status)}</b> · ${esc(desc)}</p></div></div>`}

const employeeLookup=document.getElementById('employeeLookup');
if(employeeLookup){
  employeeLookup.addEventListener('submit',async e=>{e.preventDefault();const btn=employeeLookup.querySelector('button');setBusy(btn,true,'Opening…');try{const id=normalizeId(document.getElementById('employeeId').value);const out=await api('getEmployee',{employeeId:id});renderEmployee(out.employee);document.getElementById('employeeGate').hidden=true;document.getElementById('employeeDash').hidden=false;window.scrollTo({top:0})}catch(err){showError(err)}finally{setBusy(btn,false)}});
}
function renderEmployee(x){
  const p=pct(x['Performance Score']), a=pct(x['Attendance %']), tr=pct(x['Training Progress %']), pr=pct(x['Promotion Readiness %']);
  document.getElementById('employeeDash').innerHTML=`
  <div class="section-head" style="margin-bottom:30px"><div><div class="eyebrow mono">Employee / ${esc(x['Employee ID'])}</div><h2 style="font-size:56px">Your work.<br>Your growth.</h2></div><button class="btn btn-ghost" id="employeeLogout2">Exit</button></div>
  <div class="dashboard-grid">
    <section class="dash-card span-3"><div class="kicker">Role</div><h3>${esc(x['Role']||'Employee')}</h3><p style="color:var(--muted)">${esc(x['Department']||'')}</p></section>
    <section class="dash-card span-3"><div class="kicker">Performance</div><h3>${p||'—'}${p?' / 100':''}</h3><div class="meter"><span style="width:${p}%"></span></div></section>
    <section class="dash-card span-3"><div class="kicker">Attendance</div><h3>${a||'—'}${a?'%':''}</h3><div class="meter"><span style="width:${a}%"></span></div></section>
    <section class="dash-card span-3"><div class="kicker">Status</div><h3>${esc(x['Employment Status']||'ACTIVE')}</h3><span class="pill green" style="margin-top:12px">${esc(x['Level']||'CREAIONX')}</span></section>
    <section class="dash-card span-7"><div class="kicker">Career progression</div><h3>${esc(x['Role']||'Current role')} → ${esc(x['Next Role']||'Next level')}</h3><div class="meter"><span style="width:${pr}%"></span></div><table class="table"><tr><th>Metric</th><th>Score</th></tr><tr><td>Quality</td><td>${esc(x['Quality Score']||'—')}</td></tr><tr><td>Communication</td><td>${esc(x['Communication Score']||'—')}</td></tr><tr><td>Reliability</td><td>${esc(x['Reliability Score']||'—')}</td></tr><tr><td>Productivity</td><td>${esc(x['Productivity Score']||'—')}</td></tr></table></section>
    <section class="dash-card span-5"><div class="kicker">Development</div><h3>Training ${tr}%</h3><div class="meter"><span style="width:${tr}%"></span></div><p style="color:var(--muted);margin-top:18px">Tasks completed: ${esc(x['Tasks Completed']||0)}</p><div class="notice">Payroll details are intentionally hidden from ID-only access. They remain available to authorized management.</div></section>
  </div>`;
  document.getElementById('employeeLogout2')?.addEventListener('click',()=>{document.getElementById('employeeDash').hidden=true;document.getElementById('employeeGate').hidden=false});
}

const managementLogin=document.getElementById('managementLogin');
if(managementLogin){
  managementLogin.addEventListener('submit',async e=>{e.preventDefault();const btn=managementLogin.querySelector('button');setBusy(btn,true,'Authenticating…');try{const out=await api('managerLogin',{managementId:normalizeId(document.getElementById('managerId').value),password:document.getElementById('managerPassword').value});sessionStorage.setItem('cxmToken',out.token);sessionStorage.setItem('cxmInfo',JSON.stringify(out.management));renderManagementShell(out.management);if(String(out.management['Must Change Password']).toUpperCase()==='TRUE') renderPasswordChange(out.management);else loadManagementStats()}catch(err){showError(err)}finally{setBusy(btn,false)}});
  const token=sessionStorage.getItem('cxmToken'); const info=sessionStorage.getItem('cxmInfo'); if(token&&info){try{renderManagementShell(JSON.parse(info));loadManagementStats()}catch{}}
}
function renderManagementShell(m){
  const content=document.querySelector('.portal-content'); content.innerHTML=`<div id="mgmtDash"><div class="section-head" style="margin-bottom:30px"><div><div class="eyebrow mono">${esc(m['Management ID'])} / ${esc(m['Role'])}</div><h2 style="font-size:56px">${esc(m['Department'])}</h2></div><button class="btn btn-ghost" id="mgmtLogout">Secure logout</button></div><div id="mgmtBody"></div></div>`;
  document.getElementById('mgmtLogout').onclick=async()=>{try{await api('managerLogout',{},sessionStorage.getItem('cxmToken'))}catch{}sessionStorage.clear();location.reload()};
}
function renderPasswordChange(){ document.getElementById('mgmtBody').innerHTML=`<div class="login-wrap"><form class="login-card glass" id="pwChange"><div class="eyebrow mono">First login security</div><h1>Create a private password.</h1><p>Your bootstrap password expires after this change.</p><div class="field"><label>New password</label><input id="newPw" type="password" minlength="12" required></div><button class="btn btn-lime">Change password ↗</button></form></div>`;document.getElementById('pwChange').onsubmit=async e=>{e.preventDefault();try{await api('changeManagerPassword',{newPassword:document.getElementById('newPw').value},sessionStorage.getItem('cxmToken'));const m=JSON.parse(sessionStorage.getItem('cxmInfo'));m['Must Change Password']='FALSE';sessionStorage.setItem('cxmInfo',JSON.stringify(m));loadManagementStats()}catch(err){showError(err)}}; }
async function loadManagementStats(){try{const out=await api('managerStats',{},sessionStorage.getItem('cxmToken'));renderManagementDashboard(out)}catch(err){if(String(err.message).includes('PASSWORD_CHANGE_REQUIRED')){renderPasswordChange();return}showError(err)}}
function renderManagementDashboard(out){ const s=out.stats; document.getElementById('mgmtBody').innerHTML=`
  <div class="dashboard-grid">
    <section class="dash-card span-3"><div class="kicker">Candidates</div><h3>${s.candidates}</h3></section><section class="dash-card span-3"><div class="kicker">Payment pending</div><h3>${s.paymentPending}</h3></section><section class="dash-card span-3"><div class="kicker">In training</div><h3>${s.inTraining}</h3></section><section class="dash-card span-3"><div class="kicker">Active employees</div><h3>${s.employees}</h3></section>
    <section class="dash-card span-6"><div class="kicker">Candidate management</div><form id="mgmtCandidateSearch" style="display:flex;gap:10px"><input id="mgmtCandidateId" placeholder="CXW78956" required><button class="btn btn-lime">Open</button></form><div id="candidateEditor"></div></section>
    <section class="dash-card span-6"><div class="kicker">Employee management</div><form id="mgmtEmployeeSearch" style="display:flex;gap:10px"><input id="mgmtEmployeeId" placeholder="CXE01427" required><button class="btn btn-lime">Open</button></form><div id="employeeEditor"></div></section>
  </div>`;
  document.getElementById('mgmtCandidateSearch').onsubmit=loadCandidateEditor; document.getElementById('mgmtEmployeeSearch').onsubmit=loadEmployeeEditor;
}
async function loadCandidateEditor(e){e.preventDefault();try{const out=await api('managerGetCandidate',{candidateId:normalizeId(document.getElementById('mgmtCandidateId').value)},sessionStorage.getItem('cxmToken'));const c=out.candidate;document.getElementById('candidateEditor').innerHTML=`<div class="notice">${esc(c['Full Name'])} · ${esc(c['Applicant Track'])}</div>${editField('cPayment','Payment Status',c['Payment Status'])}${editField('cApp','Application Status',c['Application Status'])}${editField('cField','Recommended Field',c['Recommended Field'])}${editField('cDecision','Field Decision',c['Field Decision'])}${editField('cTraining','Training Progress %',c['Training Progress %'],'number')}${editField('cScore','Assessment Score',c['Assessment Score'],'number')}${editField('cHiring','Hiring Status',c['Hiring Status'])}${editField('cNotes','Admin Notes',c['Admin Notes'])}<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-lime" id="saveCandidate">Save candidate</button><button class="btn btn-ghost" id="hireCandidateBtn">Hire → CXE</button></div>`;document.getElementById('saveCandidate').onclick=()=>saveCandidate(c['Candidate ID']);document.getElementById('hireCandidateBtn').onclick=()=>hireCandidate(c['Candidate ID'])}catch(err){showError(err)}}
async function saveCandidate(id){try{const updates={'Payment Status':val('cPayment'),'Application Status':val('cApp'),'Recommended Field':val('cField'),'Field Decision':val('cDecision'),'Training Progress %':val('cTraining'),'Assessment Score':val('cScore'),'Hiring Status':val('cHiring'),'Admin Notes':val('cNotes')};await api('managerUpdateCandidate',{candidateId:id,updates},sessionStorage.getItem('cxmToken'));alert('Candidate updated.')}catch(err){showError(err)}}
async function hireCandidate(id){const department=prompt('Department / field for employee:');if(department===null)return;const role=prompt('Employee role:','Junior / Trainee');if(role===null)return;try{const out=await api('hireCandidate',{candidateId:id,employee:{department,role}},sessionStorage.getItem('cxmToken'));alert('Employee created: '+out.employeeId)}catch(err){showError(err)}}
async function loadEmployeeEditor(e){e.preventDefault();try{const out=await api('managerGetEmployee',{employeeId:normalizeId(document.getElementById('mgmtEmployeeId').value)},sessionStorage.getItem('cxmToken'));const x=out.employee;document.getElementById('employeeEditor').innerHTML=`<div class="notice">${esc(x['Full Name'])} · ${esc(x['Department'])}</div>${editField('eRole','Role',x['Role'])}${editField('eLevel','Level',x['Level'])}${editField('eStatus','Employment Status',x['Employment Status'])}${editField('eAttendance','Attendance %',x['Attendance %'],'number')}${editField('ePerformance','Performance Score',x['Performance Score'],'number')}${editField('eQuality','Quality Score',x['Quality Score'],'number')}${editField('eComm','Communication Score',x['Communication Score'],'number')}${editField('eReliability','Reliability Score',x['Reliability Score'],'number')}${editField('eProductivity','Productivity Score',x['Productivity Score'],'number')}${editField('eTraining','Training Progress %',x['Training Progress %'],'number')}${editField('ePromo','Promotion Readiness %',x['Promotion Readiness %'],'number')}${editField('eNext','Next Role',x['Next Role'])}${editField('eNotes','Manager Notes',x['Manager Notes'])}<button class="btn btn-lime" id="saveEmployee">Save employee</button>`;document.getElementById('saveEmployee').onclick=()=>saveEmployee(x['Employee ID'])}catch(err){showError(err)}}
async function saveEmployee(id){try{const updates={'Role':val('eRole'),'Level':val('eLevel'),'Employment Status':val('eStatus'),'Attendance %':val('eAttendance'),'Performance Score':val('ePerformance'),'Quality Score':val('eQuality'),'Communication Score':val('eComm'),'Reliability Score':val('eReliability'),'Productivity Score':val('eProductivity'),'Training Progress %':val('eTraining'),'Promotion Readiness %':val('ePromo'),'Next Role':val('eNext'),'Manager Notes':val('eNotes')};await api('managerUpdateEmployee',{employeeId:id,updates},sessionStorage.getItem('cxmToken'));alert('Employee updated.')}catch(err){showError(err)}}
function editField(id,label,value,type='text'){return `<div class="field"><label>${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`} function val(id){return document.getElementById(id)?.value??''}

if(apiReady()) document.querySelectorAll('.notice').forEach(n=>{if(/Demo:|Prototype mode|backend is connected/i.test(n.textContent)) n.style.display='none'});
