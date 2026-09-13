# CREAIONX WORKSPACE

**Pakistani Talent. Building Pakistan.**

CREAIONX WORKSPACE is the candidate-to-employee platform for CREAIONX. Applicants receive a `CXW#####` identity, progress through review, niche training and evaluation, and successful hires receive a `CXE#####` employee identity. Management uses secured `CXM#####` accounts.

## Stack
- Frontend: static HTML/CSS/JS
- Hosting: Vercel
- Source control: GitHub / Codespaces
- API: Google Apps Script Web App
- Database: Google Sheets
- Private files: Google Drive

## Live Google backend
Spreadsheet ID: `14vdZTRN7rbfYd9IJH8o1xZc389phuetddTVpthoKY_k`

The master Sheet already contains Candidates, Employees, Management Accounts, Payments, Training, Assessments, Attendance, Performance, Tasks, Payroll, Leave Requests, Audit Logs, Settings and Sessions.

## Apps Script deployment
1. Create a new Apps Script project at script.google.com.
2. Replace `Code.gs` with `backend/Code.gs`.
3. Set the project manifest from `backend/appsscript.json` if desired.
4. Deploy > New deployment > Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Copy the `/exec` Web App URL.
8. Paste it into `config.js` as `APPS_SCRIPT_URL`.

## Security
- Candidate and employee public lookups never return Drive document URLs or payroll data.
- Management passwords are stored only as salted SHA-256 hashes in Sheets.
- First CXM login forces a password change.
- Five failed logins lock the management account temporarily.
- Management sessions store only token hashes.
- Do not commit `INITIAL-CXM-CREDENTIALS.txt` to GitHub.

## Local preview
```bash
python3 -m http.server 8080
```
