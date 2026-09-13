const CX = {
  SPREADSHEET_ID: '14vdZTRN7rbfYd9IJH8o1xZc389phuetddTVpthoKY_k',
  CANDIDATE_DOCS_FOLDER_ID: '15iyHuOnE7R2oBYX3Xa6tNtXd5-Gu-A5D',
  PAYMENT_PROOFS_FOLDER_ID: '1duXeYAfiTYfqqiKVsJ6Y_3ZXATnrRj9x',
  TRAINING_SUBMISSIONS_FOLDER_ID: '1ZyE5-K6WqYPj9xS0KgDdIQBPan6ThKfP',
  EMPLOYEE_FILES_FOLDER_ID: '11rHXGUbv5N0v1y9Bh0cbHXZc6Ro1VwwI',
  SESSION_TTL_MINUTES: 480,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
  TZ: 'Asia/Karachi'
};

function doGet() {
  return json_({ ok: true, service: 'CREAIONX WORKSPACE API', version: '1.1.0', time: now_() });
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '').trim();
    const data = body.data || {};
    const token = body.token || '';
    const routes = {
      submitApplication: () => submitApplication_(data),
      submitPayment: () => submitPayment_(data),
      candidateFieldDecision: () => candidateFieldDecision_(data.candidateId, data.decision),
      getCandidate: () => getCandidatePublic_(data.candidateId),
      getCandidateTraining: () => getCandidateTraining_(data.candidateId),
      submitTraining: () => submitTraining_(data),
      getEmployee: () => getEmployeePublic_(data.employeeId),
      managerLogin: () => managerLogin_(data.managementId, data.password),
      managerLogout: () => managerLogout_(token),
      changeManagerPassword: () => changeManagerPassword_(token, data.newPassword),
      managerGetCandidate: () => managerGetCandidate_(token, data.candidateId),
      managerUpdateCandidate: () => managerUpdateCandidate_(token, data.candidateId, data.updates || {}),
      managerGetTraining: () => managerGetTraining_(token, data.candidateId),
      managerReviewTraining: () => managerReviewTraining_(token, data.recordId, data.status, data.score, data.feedback),
      managerGetEmployee: () => managerGetEmployee_(token, data.employeeId),
      managerUpdateEmployee: () => managerUpdateEmployee_(token, data.employeeId, data.updates || {}),
      hireCandidate: () => hireCandidate_(token, data.candidateId, data.employee || {}),
      managerStats: () => managerStats_(token)
    };
    if (!routes[action]) throw new Error('Unknown action.');
    return json_(routes[action]());
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function submitApplication_(d) {
  const required = ['fullName','phone','dob','city','province','education'];
  required.forEach(k => { if (!String(d[k] || '').trim()) throw new Error('Missing required field: ' + k); });
  const age = ageFromDob_(d.dob);
  const isJunior = age < 18;
  if (isJunior && !d.guardianConsent) throw new Error('Guardian consent is required for applicants under 18.');

  const candidateId = uniqueId_('Candidates', 'Candidate ID', 'CXW');
  const createdAt = now_();
  const root = DriveApp.getFolderById(CX.CANDIDATE_DOCS_FOLDER_ID);
  const folder = root.createFolder(candidateId);
  let cvUrl = '';
  if (d.cv && d.cv.dataBase64) cvUrl = saveBase64File_(folder, d.cv).getUrl();
  if (d.document && d.document.dataBase64) saveBase64File_(folder, d.document);

  appendObject_('Candidates', {
    'Candidate ID': candidateId,
    'Created At': createdAt,
    'Full Name': d.fullName,
    'Father/Guardian Name': d.fatherGuardianName || '',
    'Date of Birth': d.dob,
    'Age': age,
    'CNIC/B-Form': d.cnicBForm || '',
    'Phone': d.phone,
    'Email': d.email || '',
    'City': d.city,
    'Province': d.province,
    'Education Level': d.education,
    'Institution': d.institution || '',
    'Experience Summary': d.experience || '',
    'Skills': d.skills || '',
    'Interests': d.interest || '',
    'Preferred Work Type': d.preferredWorkType || '',
    'CV URL': cvUrl,
    'Documents Folder URL': folder.getUrl(),
    'Payment Status': 'PENDING',
    'Payment Proof URL': '',
    'Application Status': 'SUBMITTED',
    'Recommended Field': '',
    'Field Decision': 'PENDING',
    'Training Progress %': 0,
    'Assessment Score': '',
    'Hiring Status': isJunior ? 'JUNIOR_TRAINING_ONLY' : 'NOT_HIRED',
    'Employee ID': '',
    'Last Updated': createdAt,
    'Admin Notes': '',
    'Applicant Track': isJunior ? 'CREAIONX JUNIOR' : 'CREAIONX WORKSPACE',
    'Current Status': d.status || '',
    'English Confidence': d.english || '',
    'Availability': d.availability || '',
    'Guardian Consent': isJunior ? 'YES' : 'N/A'
  });
  audit_('CANDIDATE', candidateId, 'APPLICATION_SUBMITTED', 'Candidate', candidateId, '', 'SUBMITTED', '');
  return { ok: true, candidateId, track: isJunior ? 'CREAIONX JUNIOR' : 'CREAIONX WORKSPACE', paymentStatus: 'PENDING' };
}

function submitPayment_(d) {
  const candidateId = normalizeId_(d.candidateId, 'CXW');
  const found = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!found) throw new Error('Candidate ID not found.');
  if (!d.method || !d.transactionId) throw new Error('Payment method and transaction ID are required.');
  if (!d.proof || !d.proof.dataBase64) throw new Error('Payment proof is required.');

  const root = DriveApp.getFolderById(CX.PAYMENT_PROOFS_FOLDER_ID);
  const folders = root.getFoldersByName(candidateId);
  const folder = folders.hasNext() ? folders.next() : root.createFolder(candidateId);
  const proofFile = saveBase64File_(folder, d.proof);
  const paymentId = 'PAY-' + Utilities.getUuid().slice(0,8).toUpperCase();
  appendObject_('Payments', {
    'Payment ID': paymentId,
    'Candidate ID': candidateId,
    'Submitted At': now_(),
    'Method': d.method,
    'Amount': 500,
    'Transaction ID': d.transactionId,
    'Proof URL': proofFile.getUrl(),
    'Status': 'UNDER_REVIEW',
    'Verified By': '',
    'Verified At': '',
    'Notes': ''
  });
  updateObjectRow_('Candidates', found.row, { 'Payment Status':'UNDER_REVIEW', 'Payment Proof URL':proofFile.getUrl(), 'Last Updated':now_() });
  audit_('CANDIDATE', candidateId, 'PAYMENT_SUBMITTED', 'Payment', paymentId, '', 'UNDER_REVIEW', '');
  return { ok:true, paymentId, status:'UNDER_REVIEW' };
}

function candidateFieldDecision_(candidateId, decision) {
  candidateId = normalizeId_(candidateId, 'CXW');
  decision = String(decision || '').trim().toUpperCase();
  if (!['ACCEPTED','DECLINED'].includes(decision)) throw new Error('Invalid field decision.');
  const found = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!found) throw new Error('Candidate ID not found.');
  if (!String(found.object['Recommended Field'] || '').trim()) throw new Error('No field has been offered yet.');
  if (String(found.object['Field Decision'] || '').toUpperCase() !== 'PENDING') throw new Error('A field decision has already been recorded.');
  const applicationStatus = decision === 'ACCEPTED' ? 'FIELD_ACCEPTED' : 'FIELD_DECLINED';
  updateObjectRow_('Candidates', found.row, { 'Field Decision':decision, 'Application Status':applicationStatus, 'Last Updated':now_() });
  audit_('CANDIDATE', candidateId, 'FIELD_' + decision, 'Candidate', candidateId, 'PENDING', decision, '');
  return { ok:true, decision, applicationStatus };
}

function getCandidatePublic_(candidateId) {
  candidateId = normalizeId_(candidateId, 'CXW');
  const record = findObject_('Candidates', 'Candidate ID', candidateId);
  if (!record) throw new Error('Candidate ID not found.');
  return { ok: true, candidate: pick_(record, [
    'Candidate ID','Full Name','Applicant Track','Payment Status','Application Status','Recommended Field','Field Decision',
    'Training Progress %','Assessment Score','Hiring Status','Employee ID','Current Status','Last Updated'
  ]) };
}

function getEmployeePublic_(employeeId) {
  employeeId = normalizeId_(employeeId, 'CXE');
  const record = findObject_('Employees', 'Employee ID', employeeId);
  if (!record) throw new Error('Employee ID not found.');
  return { ok: true, employee: pick_(record, [
    'Employee ID','Candidate ID','Full Name','Department','Role','Level','Manager ID','Employment Status','Join Date',
    'Attendance %','Performance Score','Quality Score','Communication Score','Reliability Score','Productivity Score',
    'Training Progress %','Promotion Readiness %','Next Role','Tasks Completed','Last Updated'
  ]) };
}

function managerLogin_(managementId, password) {
  managementId = normalizeId_(managementId, 'CXM');
  if (!password) throw new Error('Password is required.');
  const found = findRow_('Management Accounts', 'Management ID', managementId);
  if (!found) throw new Error('Invalid management ID or password.');
  const r = found.object;
  if (String(r['Status']).toUpperCase() !== 'ACTIVE') throw new Error('This management account is not active.');
  const lockedUntil = r['Locked Until'] ? new Date(r['Locked Until']) : null;
  if (lockedUntil && lockedUntil > new Date()) throw new Error('Account temporarily locked. Try again later.');

  const expected = String(r['Password Hash'] || '');
  const actual = hash_(String(r['Password Salt'] || '') + ':' + password);
  if (actual !== expected) {
    const attempts = Number(r['Failed Attempts'] || 0) + 1;
    const updates = { 'Failed Attempts': attempts };
    if (attempts >= CX.MAX_LOGIN_ATTEMPTS) updates['Locked Until'] = new Date(Date.now() + CX.LOCK_MINUTES * 60000).toISOString();
    updateObjectRow_('Management Accounts', found.row, updates);
    audit_('MANAGEMENT', managementId, 'LOGIN_FAILED', 'Management', managementId, '', '', '');
    throw new Error('Invalid management ID or password.');
  }

  updateObjectRow_('Management Accounts', found.row, { 'Failed Attempts': 0, 'Locked Until': '', 'Last Login': now_() });
  const rawToken = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
  appendObject_('Sessions', {
    'Session Token Hash': hash_(rawToken),
    'Management ID': managementId,
    'Created At': now_(),
    'Expires At': new Date(Date.now() + CX.SESSION_TTL_MINUTES * 60000).toISOString(),
    'Revoked': 'FALSE',
    'Last Seen At': now_()
  });
  audit_('MANAGEMENT', managementId, 'LOGIN_SUCCESS', 'Management', managementId, '', '', hash_(rawToken).slice(0,12));
  return {
    ok: true,
    token: rawToken,
    management: pick_(r, ['Management ID','Department','Role','Access Scope','Must Change Password'])
  };
}

function managerLogout_(token) {
  if (!token) return { ok: true };
  const found = findRow_('Sessions', 'Session Token Hash', hash_(token));
  if (found) updateObjectRow_('Sessions', found.row, { 'Revoked': 'TRUE', 'Last Seen At': now_() });
  return { ok: true };
}

function changeManagerPassword_(token, newPassword) {
  const manager = requireManager_(token, 'CHANGE_PASSWORD');
  if (!newPassword || String(newPassword).length < 12) throw new Error('New password must be at least 12 characters.');
  const account = findRow_('Management Accounts', 'Management ID', manager['Management ID']);
  const salt = Utilities.getUuid().replace(/-/g,'').slice(0,32);
  updateObjectRow_('Management Accounts', account.row, {
    'Password Salt': salt,
    'Password Hash': hash_(salt + ':' + newPassword),
    'Must Change Password': 'FALSE',
    'Failed Attempts': 0,
    'Locked Until': ''
  });
  audit_('MANAGEMENT', manager['Management ID'], 'PASSWORD_CHANGED', 'Management', manager['Management ID'], '', '', '');
  return { ok: true };
}

function managerGetCandidate_(token, candidateId) {
  const manager = requireManager_(token, 'VIEW_CANDIDATE');
  const record = findObject_('Candidates', 'Candidate ID', normalizeId_(candidateId, 'CXW'));
  if (!record) throw new Error('Candidate ID not found.');
  return { ok: true, manager: managerPublic_(manager), candidate: record };
}

function managerUpdateCandidate_(token, candidateId, updates) {
  const manager = requireManager_(token, 'UPDATE_CANDIDATE');
  candidateId = normalizeId_(candidateId, 'CXW');
  const found = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!found) throw new Error('Candidate ID not found.');
  const allowed = ['Payment Status','Application Status','Recommended Field','Field Decision','Training Progress %','Assessment Score','Hiring Status','Admin Notes'];
  const safe = filterKeys_(updates, allowed);

  if (safe['Payment Status'] !== undefined) {
    const paymentStatus = String(safe['Payment Status'] || '').trim().toUpperCase();
    if (!['PENDING','UNDER_REVIEW','VERIFIED','REJECTED'].includes(paymentStatus)) throw new Error('Invalid payment status.');
    if (!['SUPER_ADMIN','HR'].includes(String(manager['Role']).toUpperCase())) throw new Error('Only HR or Super Admin can change payment status.');
    safe['Payment Status'] = paymentStatus;
    syncLatestPaymentStatus_(candidateId, paymentStatus, manager['Management ID']);
  }

  safe['Last Updated'] = now_();
  updateObjectRow_('Candidates', found.row, safe);
  audit_('MANAGEMENT', manager['Management ID'], 'CANDIDATE_UPDATED', 'Candidate', candidateId, '', JSON.stringify(safe), '');
  return { ok: true, candidate: findObject_('Candidates','Candidate ID',candidateId) };
}

function managerGetEmployee_(token, employeeId) {
  const manager = requireManager_(token, 'VIEW_EMPLOYEE');
  employeeId = normalizeId_(employeeId, 'CXE');
  const record = findObject_('Employees', 'Employee ID', employeeId);
  if (!record) throw new Error('Employee ID not found.');
  if (!managerCanSeeEmployee_(manager, record)) throw new Error('You do not have access to this employee.');
  return { ok: true, manager: managerPublic_(manager), employee: record };
}

function managerUpdateEmployee_(token, employeeId, updates) {
  const manager = requireManager_(token, 'UPDATE_EMPLOYEE');
  employeeId = normalizeId_(employeeId, 'CXE');
  const found = findRow_('Employees', 'Employee ID', employeeId);
  if (!found) throw new Error('Employee ID not found.');
  if (!managerCanSeeEmployee_(manager, found.object)) throw new Error('You do not have access to this employee.');
  let allowed = ['Role','Level','Employment Status','Attendance %','Performance Score','Quality Score','Communication Score','Reliability Score','Productivity Score','Training Progress %','Promotion Readiness %','Next Role','Tasks Completed','Manager Notes'];
  if (['SUPER_ADMIN','HR'].includes(String(manager['Role']).toUpperCase())) allowed = allowed.concat(['Department','Manager ID','Join Date','Probation End','Work Email']);
  if (['SUPER_ADMIN','FINANCE'].includes(String(manager['Role']).toUpperCase())) allowed = allowed.concat(['Base Salary','Bonus']);
  const safe = filterKeys_(updates, allowed);
  safe['Last Updated'] = now_();
  updateObjectRow_('Employees', found.row, safe);
  audit_('MANAGEMENT', manager['Management ID'], 'EMPLOYEE_UPDATED', 'Employee', employeeId, '', JSON.stringify(safe), '');
  return { ok: true, employee: findObject_('Employees','Employee ID',employeeId) };
}

function hireCandidate_(token, candidateId, e) {
  const manager = requireManager_(token, 'HIRE_CANDIDATE');
  const role = String(manager['Role']).toUpperCase();
  if (!['SUPER_ADMIN','HR'].includes(role)) throw new Error('Only HR or Super Admin can hire candidates.');
  candidateId = normalizeId_(candidateId, 'CXW');
  const cFound = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!cFound) throw new Error('Candidate ID not found.');
  if (String(cFound.object['Applicant Track']) === 'CREAIONX JUNIOR') throw new Error('Junior-track applicants cannot be converted to regular employees through this action.');
  if (cFound.object['Employee ID']) return { ok: true, employeeId: cFound.object['Employee ID'], alreadyHired: true };

  const employeeId = uniqueId_('Employees', 'Employee ID', 'CXE');
  const createdAt = now_();
  appendObject_('Employees', {
    'Employee ID': employeeId,
    'Candidate ID': candidateId,
    'Full Name': cFound.object['Full Name'],
    'Department': e.department || cFound.object['Recommended Field'] || '',
    'Role': e.role || 'Trainee / Junior',
    'Level': e.level || 'Junior',
    'Manager ID': e.managerId || '',
    'Employment Status': e.employmentStatus || 'ACTIVE',
    'Join Date': e.joinDate || Utilities.formatDate(new Date(), CX.TZ, 'yyyy-MM-dd'),
    'Probation End': e.probationEnd || '',
    'Base Salary': e.baseSalary || '',
    'Bonus': 0,
    'Attendance %': '',
    'Performance Score': '',
    'Quality Score': '',
    'Communication Score': '',
    'Reliability Score': '',
    'Productivity Score': '',
    'Training Progress %': 100,
    'Promotion Readiness %': 0,
    'Next Role': '',
    'Tasks Completed': 0,
    'Leave Balance': e.leaveBalance || '',
    'Work Email': e.workEmail || '',
    'Last Updated': createdAt,
    'Manager Notes': ''
  });
  updateObjectRow_('Candidates', cFound.row, { 'Hiring Status':'HIRED', 'Employee ID':employeeId, 'Application Status':'COMPLETED', 'Last Updated':createdAt });
  audit_('MANAGEMENT', manager['Management ID'], 'CANDIDATE_HIRED', 'Candidate', candidateId, '', employeeId, '');
  return { ok: true, employeeId };
}

function managerStats_(token) {
  const manager = requireManager_(token, 'VIEW_STATS');
  const candidates = sheetObjects_('Candidates');
  const employees = sheetObjects_('Employees');
  return { ok:true, manager: managerPublic_(manager), stats: {
    candidates: candidates.length,
    paymentPending: candidates.filter(x => ['PENDING','UNDER_REVIEW'].includes(String(x['Payment Status']).toUpperCase())).length,
    inTraining: candidates.filter(x => String(x['Application Status']).includes('TRAIN') || (Number(x['Training Progress %']||0) > 0 && Number(x['Training Progress %']||0) < 100)).length,
    hired: candidates.filter(x => x['Hiring Status']==='HIRED').length,
    employees: employees.filter(x => String(x['Employment Status']).toUpperCase() !== 'TERMINATED').length
  }};
}

function requireManager_(token, action) {
  if (!token) throw new Error('Management session required.');
  const session = findRow_('Sessions', 'Session Token Hash', hash_(token));
  if (!session || String(session.object['Revoked']).toUpperCase()==='TRUE') throw new Error('Session expired. Please log in again.');
  if (new Date(session.object['Expires At']) <= new Date()) throw new Error('Session expired. Please log in again.');
  updateObjectRow_('Sessions', session.row, { 'Last Seen At': now_() });
  const manager = findObject_('Management Accounts','Management ID',session.object['Management ID']);
  if (!manager || String(manager['Status']).toUpperCase() !== 'ACTIVE') throw new Error('Management account unavailable.');
  const role = String(manager['Role']).toUpperCase();
  if (String(manager['Must Change Password']).toUpperCase()==='TRUE' && action !== 'CHANGE_PASSWORD') throw new Error('PASSWORD_CHANGE_REQUIRED');
  const rules = {
    VIEW_CANDIDATE:['SUPER_ADMIN','HR','TRAINER'],
    UPDATE_CANDIDATE:['SUPER_ADMIN','HR','TRAINER'],
    HIRE_CANDIDATE:['SUPER_ADMIN','HR'],
    VIEW_EMPLOYEE:['SUPER_ADMIN','HR','TRAINER','MANAGER','FINANCE'],
    UPDATE_EMPLOYEE:['SUPER_ADMIN','HR','TRAINER','MANAGER','FINANCE'],
    VIEW_STATS:['SUPER_ADMIN','HR','TRAINER','MANAGER','FINANCE'],
    CHANGE_PASSWORD:['SUPER_ADMIN','HR','TRAINER','MANAGER','FINANCE']
  };
  if (rules[action] && !rules[action].includes(role)) throw new Error('Permission denied.');
  return manager;
}

function managerCanSeeEmployee_(manager, employee) {
  const role = String(manager['Role']).toUpperCase();
  if (['SUPER_ADMIN','HR','FINANCE','TRAINER'].includes(role)) return true;
  if (role === 'MANAGER') return normalizeDept_(manager['Access Scope']) === normalizeDept_(employee['Department']);
  return false;
}

function managerPublic_(m) { return pick_(m,['Management ID','Department','Role','Access Scope','Must Change Password']); }
function normalizeDept_(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

function syncLatestPaymentStatus_(candidateId, status, managerId) {
  const s = sheet_('Payments');
  if (s.getLastRow() < 2) return;
  const h = headers_(s);
  const candidateCol = h.indexOf('Candidate ID') + 1;
  if (!candidateCol) return;
  const matches = s.getRange(2, candidateCol, s.getLastRow()-1, 1).createTextFinder(candidateId).matchEntireCell(true).findAll();
  if (!matches || !matches.length) return;
  const row = matches[matches.length - 1].getRow();
  const updates = { 'Status': status };
  if (status === 'VERIFIED' || status === 'REJECTED') {
    updates['Verified By'] = managerId;
    updates['Verified At'] = now_();
  } else {
    updates['Verified By'] = '';
    updates['Verified At'] = '';
  }
  updateObjectRow_('Payments', row, updates);
}

function saveBase64File_(folder, f) {
  const bytes = Utilities.base64Decode(String(f.dataBase64).replace(/^data:[^;]+;base64,/,''));
  const blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', sanitizeFileName_(f.name || 'upload.bin'));
  return folder.createFile(blob);
}
function sanitizeFileName_(name){ return String(name).replace(/[\\/:*?"<>|]/g,'_').slice(0,120); }

function uniqueId_(sheetName, header, prefix) {
  for (let i=0;i<100;i++) {
    const id = prefix + String(Math.floor(Math.random()*100000)).padStart(5,'0');
    if (!findObject_(sheetName, header, id)) return id;
  }
  throw new Error('Could not generate a unique ID.');
}
function normalizeId_(v,prefix){ const s=String(v||'').trim().toUpperCase(); if(!new RegExp('^'+prefix+'\\d{5}$').test(s)) throw new Error('Invalid '+prefix+' ID.'); return s; }
function ageFromDob_(dob){ const b=new Date(dob+'T00:00:00'); if(isNaN(b)) throw new Error('Invalid date of birth.'); const n=new Date(); let a=n.getFullYear()-b.getFullYear(); const m=n.getMonth()-b.getMonth(); if(m<0 || (m===0 && n.getDate()<b.getDate())) a--; if(a<10 || a>90) throw new Error('Please enter a valid date of birth.'); return a; }

function ss_(){ return SpreadsheetApp.openById(CX.SPREADSHEET_ID); }
function sheet_(name){ const s=ss_().getSheetByName(name); if(!s) throw new Error('Missing sheet: '+name); return s; }
function headers_(s){ return s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String); }
function appendObject_(sheetName,obj){ const s=sheet_(sheetName), h=headers_(s); s.appendRow(h.map(k => obj[k] !== undefined ? obj[k] : '')); }
function sheetObjects_(sheetName){ const s=sheet_(sheetName); if(s.getLastRow()<2) return []; const h=headers_(s), vals=s.getRange(2,1,s.getLastRow()-1,h.length).getValues(); return vals.map(r => Object.fromEntries(h.map((k,i)=>[k,r[i]]))); }
function findRow_(sheetName,header,value){ const s=sheet_(sheetName), h=headers_(s), col=h.indexOf(header)+1; if(!col) throw new Error('Missing header '+header); if(s.getLastRow()<2) return null; const finder=s.getRange(2,col,s.getLastRow()-1,1).createTextFinder(String(value)).matchEntireCell(true).findNext(); if(!finder) return null; const row=finder.getRow(), vals=s.getRange(row,1,1,h.length).getValues()[0]; return {row, object:Object.fromEntries(h.map((k,i)=>[k,vals[i]]))}; }
function findObject_(sheetName,header,value){ const f=findRow_(sheetName,header,value); return f?f.object:null; }
function updateObjectRow_(sheetName,row,updates){ const s=sheet_(sheetName), h=headers_(s); Object.keys(updates).forEach(k=>{ const i=h.indexOf(k); if(i>=0) s.getRange(row,i+1).setValue(updates[k]); }); }
function filterKeys_(obj,allowed){ const o={}; allowed.forEach(k=>{ if(obj[k]!==undefined) o[k]=obj[k]; }); return o; }
function pick_(obj,keys){ const o={}; keys.forEach(k=>o[k]=obj[k]===undefined?'':obj[k]); return o; }

function audit_(actorType,actorId,action,targetType,targetId,previousValue,newValue,session){ appendObject_('Audit Logs',{
  'Log ID':'LOG-'+Utilities.getUuid().slice(0,8).toUpperCase(),'Timestamp':now_(),'Actor Type':actorType,'Actor ID':actorId,'Action':action,
  'Target Type':targetType,'Target ID':targetId,'Previous Value':previousValue,'New Value':newValue,'IP/Session':session,'Notes':''
}); }
function hash_(s){ const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8); return bytes.map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join(''); }
function now_(){ return new Date().toISOString(); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
