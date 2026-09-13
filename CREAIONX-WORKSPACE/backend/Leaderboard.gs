function getLeaderboardPublic_() {
  const candidates = sheetObjects_('Candidates')
    .map(row => {
      const assessmentRaw = String(row['Assessment Score'] ?? '').trim();
      const hasAssessment = assessmentRaw !== '' && Number.isFinite(Number(assessmentRaw));
      const assessment = hasAssessment ? clampScore_(Number(assessmentRaw)) : 0;
      const training = clampScore_(Number(row['Training Progress %'] || 0));
      return {
        row,
        hasAssessment,
        assessment,
        training
      };
    })
    .filter(item => {
      const row = item.row;
      return String(row['Payment Status'] || '').toUpperCase() === 'VERIFIED' &&
        String(row['Field Decision'] || '').toUpperCase() === 'ACCEPTED' &&
        String(row['Hiring Status'] || '').toUpperCase() !== 'HIRED' &&
        String(row['Recommended Field'] || '').trim() !== '' &&
        (item.hasAssessment || item.training > 0);
    })
    .sort((a, b) =>
      Number(b.hasAssessment) - Number(a.hasAssessment) ||
      b.assessment - a.assessment ||
      b.training - a.training ||
      String(a.row['Candidate ID'] || '').localeCompare(String(b.row['Candidate ID'] || ''))
    )
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      id: String(item.row['Candidate ID'] || ''),
      name: leaderboardDisplayName_(item.row['Full Name']),
      field: String(item.row['Recommended Field'] || 'CREAIONX'),
      assessmentScore: item.hasAssessment ? item.assessment : null,
      trainingProgress: item.training,
      metric: item.hasAssessment ? 'Assessment' : 'Training',
      metricValue: item.hasAssessment ? item.assessment : item.training,
      metricSuffix: item.hasAssessment ? '/100' : '%'
    }));

  const employees = sheetObjects_('Employees')
    .map(row => ({
      row,
      performance: clampScore_(Number(row['Performance Score'] || 0)),
      attendance: clampScore_(Number(row['Attendance %'] || 0)),
      readiness: clampScore_(Number(row['Promotion Readiness %'] || 0))
    }))
    .filter(item => {
      const status = String(item.row['Employment Status'] || 'ACTIVE').toUpperCase();
      return status !== 'TERMINATED' && status !== 'INACTIVE' &&
        (item.performance > 0 || item.attendance > 0 || item.readiness > 0);
    })
    .sort((a, b) =>
      b.performance - a.performance ||
      b.attendance - a.attendance ||
      b.readiness - a.readiness ||
      String(a.row['Employee ID'] || '').localeCompare(String(b.row['Employee ID'] || ''))
    )
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      id: String(item.row['Employee ID'] || ''),
      name: leaderboardDisplayName_(item.row['Full Name']),
      department: String(item.row['Department'] || 'CREAIONX'),
      role: String(item.row['Role'] || 'Employee'),
      performanceScore: item.performance,
      attendance: item.attendance,
      promotionReadiness: item.readiness,
      metric: 'Performance',
      metricValue: item.performance,
      metricSuffix: '/100'
    }));

  return {
    ok: true,
    candidates,
    employees,
    updatedAt: now_()
  };
}

function leaderboardDisplayName_(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CREAIONX Talent';
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}

function clampScore_(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}
