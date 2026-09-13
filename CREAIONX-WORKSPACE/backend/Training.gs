const CX_TRAINING_CATALOG = {
  'Creative': [
    { id: 'CRT-01', name: 'Creative Foundations' },
    { id: 'CRT-02', name: 'Canva / Figma Production Workflow' },
    { id: 'CRT-03', name: 'Social Media Ad Design' },
    { id: 'CRT-04', name: 'Brand Consistency' },
    { id: 'CRT-05', name: 'Practical Campaign Challenge' }
  ]
};

function getCandidateTraining_(candidateId) {
  candidateId = normalizeId_(candidateId, 'CXW');
  const candidate = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!candidate) throw new Error('Candidate ID not found.');
  if (String(candidate.object['Payment Status']).toUpperCase() !== 'VERIFIED') throw new Error('Onboarding payment must be verified before training.');
  if (String(candidate.object['Field Decision']).toUpperCase() !== 'ACCEPTED') throw new Error('Accept your offered field before training begins.');

  const field = String(candidate.object['Recommended Field'] || '').trim();
  if (!CX_TRAINING_CATALOG[field]) throw new Error('Training modules have not been published for this field yet.');

  ensureTrainingAssignments_(candidateId, field);
  const records = sheetObjects_('Training').filter(x => String(x['Candidate ID']).toUpperCase() === candidateId);
  const completed = records.filter(x => String(x['Status']).toUpperCase() === 'COMPLETED').length;
  const progress = records.length ? Math.round((completed / records.length) * 100) : 0;

  if (progress < 100 && String(candidate.object['Application Status']).toUpperCase() !== 'TRAINING') {
    updateObjectRow_('Candidates', candidate.row, { 'Application Status': 'TRAINING', 'Training Progress %': progress, 'Last Updated': now_() });
  }

  return {
    ok: true,
    candidateId,
    field,
    progress,
    modules: records.map(trainingPublic_)
  };
}

function submitTraining_(d) {
  const candidateId = normalizeId_(d.candidateId, 'CXW');
  const candidate = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!candidate) throw new Error('Candidate ID not found.');
  if (String(candidate.object['Payment Status']).toUpperCase() !== 'VERIFIED') throw new Error('Onboarding payment must be verified before training.');
  if (String(candidate.object['Field Decision']).toUpperCase() !== 'ACCEPTED') throw new Error('Field must be accepted before training submissions.');

  const recordId = String(d.recordId || '').trim().toUpperCase();
  if (!recordId) throw new Error('Training record ID is required.');
  const found = findRow_('Training', 'Training Record ID', recordId);
  if (!found || String(found.object['Candidate ID']).toUpperCase() !== candidateId) throw new Error('Training module not found.');
  if (String(found.object['Status']).toUpperCase() === 'COMPLETED') throw new Error('This module is already complete.');
  if (!d.submission || !d.submission.dataBase64) throw new Error('Upload your practical submission file.');

  const root = DriveApp.getFolderById(CX.TRAINING_SUBMISSIONS_FOLDER_ID);
  const folders = root.getFoldersByName(candidateId);
  const folder = folders.hasNext() ? folders.next() : root.createFolder(candidateId);
  const file = saveBase64File_(folder, d.submission);
  const submittedAt = now_();

  updateObjectRow_('Training', found.row, {
    'Status': 'SUBMITTED',
    'Progress %': 75,
    'Submission URL': file.getUrl(),
    'Submission Notes': String(d.notes || '').trim(),
    'Submitted At': submittedAt,
    'Updated At': submittedAt
  });
  updateObjectRow_('Candidates', candidate.row, { 'Application Status': 'TRAINING', 'Last Updated': submittedAt });
  audit_('CANDIDATE', candidateId, 'TRAINING_SUBMITTED', 'Training', recordId, '', 'SUBMITTED', '');
  return { ok: true, recordId, status: 'SUBMITTED' };
}

function managerGetTraining_(token, candidateId) {
  requireManager_(token, 'VIEW_CANDIDATE');
  candidateId = normalizeId_(candidateId, 'CXW');
  const candidate = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!candidate) throw new Error('Candidate ID not found.');
  const field = String(candidate.object['Recommended Field'] || '').trim();
  if (String(candidate.object['Field Decision']).toUpperCase() === 'ACCEPTED' && CX_TRAINING_CATALOG[field]) ensureTrainingAssignments_(candidateId, field);
  const records = sheetObjects_('Training').filter(x => String(x['Candidate ID']).toUpperCase() === candidateId);
  return { ok: true, candidateId, field, modules: records };
}

function managerReviewTraining_(token, recordId, status, score, feedback) {
  const manager = requireManager_(token, 'UPDATE_CANDIDATE');
  recordId = String(recordId || '').trim().toUpperCase();
  status = String(status || '').trim().toUpperCase();
  if (!['COMPLETED', 'REVISION_REQUIRED'].includes(status)) throw new Error('Training review status must be COMPLETED or REVISION_REQUIRED.');

  const found = findRow_('Training', 'Training Record ID', recordId);
  if (!found) throw new Error('Training record not found.');
  const candidateId = normalizeId_(found.object['Candidate ID'], 'CXW');
  const candidate = findRow_('Candidates', 'Candidate ID', candidateId);
  if (!candidate) throw new Error('Candidate ID not found.');

  let numericScore = '';
  if (score !== '' && score !== null && score !== undefined) {
    numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) throw new Error('Score must be between 0 and 100.');
  }

  const reviewedAt = now_();
  updateObjectRow_('Training', found.row, {
    'Status': status,
    'Progress %': status === 'COMPLETED' ? 100 : 50,
    'Score': numericScore,
    'Completed At': status === 'COMPLETED' ? reviewedAt : '',
    'Trainer ID': manager['Management ID'],
    'Feedback': String(feedback || '').trim(),
    'Updated At': reviewedAt
  });

  const records = sheetObjects_('Training').filter(x => String(x['Candidate ID']).toUpperCase() === candidateId);
  const completed = records.filter(x => String(x['Status']).toUpperCase() === 'COMPLETED').length;
  const progress = records.length ? Math.round((completed / records.length) * 100) : 0;
  const applicationStatus = progress >= 100 ? 'TRAINING_COMPLETE' : 'TRAINING';
  updateObjectRow_('Candidates', candidate.row, {
    'Training Progress %': progress,
    'Application Status': applicationStatus,
    'Last Updated': reviewedAt
  });
  audit_('MANAGEMENT', manager['Management ID'], 'TRAINING_REVIEWED', 'Training', recordId, '', status, '');

  return { ok: true, recordId, status, progress, applicationStatus };
}

function ensureTrainingAssignments_(candidateId, field) {
  const catalog = CX_TRAINING_CATALOG[field] || [];
  const existing = sheetObjects_('Training').filter(x => String(x['Candidate ID']).toUpperCase() === candidateId);
  const existingIds = new Set(existing.map(x => String(x['Module ID'])));
  const assignedAt = now_();

  catalog.forEach(module => {
    if (existingIds.has(module.id)) return;
    appendObject_('Training', {
      'Training Record ID': 'TRN-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
      'Candidate ID': candidateId,
      'Employee ID': '',
      'Field': field,
      'Module ID': module.id,
      'Module Name': module.name,
      'Status': 'ASSIGNED',
      'Progress %': 0,
      'Score': '',
      'Assigned At': assignedAt,
      'Completed At': '',
      'Trainer ID': '',
      'Feedback': '',
      'Submission URL': '',
      'Submission Notes': '',
      'Submitted At': '',
      'Updated At': assignedAt
    });
  });
}

function trainingPublic_(r) {
  return pick_(r, [
    'Training Record ID', 'Field', 'Module ID', 'Module Name', 'Status', 'Progress %', 'Score',
    'Assigned At', 'Completed At', 'Feedback', 'Submission Notes', 'Submitted At'
  ]);
}
