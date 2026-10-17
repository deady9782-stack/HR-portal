'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  Fingerprint,
  Gauge,
  Menu,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  X,
} from 'lucide-react';

type Department = 'Moderator' | 'Administrator' | 'HR' | 'FTO' | 'Police' | 'Fire' | 'EMS' | 'DOT' | 'SWAT' | 'K9' | 'Traffic Enforcement' | 'Judge' | 'CSI' | 'Detective' | 'Coroner';
type Section = 'overview' | 'applications' | 'personnel' | 'activity';
type SignupRole = 'Employee' | 'FTO staff' | 'HR staff';
type StaffMember = { name: string; rank: string; department: Department; badge: string; status: 'On duty' | 'Off duty'; strikes: number };
type ActivityItem = { title: string; detail: string; time: string; status: 'Needs review' | 'Logged' };

const departments: Department[] = ['Moderator', 'Administrator', 'HR', 'FTO', 'Police', 'Fire', 'EMS', 'DOT', 'SWAT', 'K9', 'Traffic Enforcement', 'Judge', 'CSI', 'Detective', 'Coroner'];
const ranks: Record<Department, string[]> = {
  Moderator: ['Trial Moderator', 'Moderator', 'Senior Moderator'],
  Administrator: ['Trial Administrator', 'Administrator', 'Senior Administrator', 'Owner'],
  HR: ['HR Assistant', 'HR Officer', 'HR Supervisor', 'HR Director'],
  FTO: ['Probationary FTO', 'Field Training Officer', 'FTO Supervisor'],
  Police: ['Probationary Officer', 'Police Officer I', 'Police Officer II', 'Police Officer III', 'Corporal', 'Sergeant', 'Lieutenant', 'Captain', 'Deputy Chief', 'Chief of Police'],
  Fire: ['Probationary Firefighter', 'Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Assistant Chief', 'Fire Marshal'],
  EMS: ['Probationary EMT', 'EMT', 'Paramedic', 'Field Supervisor', 'EMS Chief'],
  DOT: ['Probationary Technician', 'DOT Technician I', 'DOT Technician II', 'DOT Technician III', 'Supervisor', 'Director'],
  SWAT: ['Probationary SWAT', 'SWAT Operator', 'Corporal', 'Sergeant', 'Team Leader', 'Commander'],
  K9: ['Probationary K9 Handler', 'K9 Handler', 'Corporal', 'Sergeant', 'Unit Supervisor'],
  'Traffic Enforcement': ['Probationary Traffic Officer', 'Traffic Officer', 'Senior Traffic Officer', 'Sergeant', 'Supervisor'],
  Judge: ['Probationary Judge', 'Judge', 'Senior Judge', 'Chief Judge'],
  CSI: ['Probationary CSI', 'CSI I', 'CSI II', 'CSI III', 'Supervisor', 'Chief Investigator'],
  Detective: ['Probationary Detective', 'Detective I', 'Detective II', 'Detective III', 'Sergeant', 'Chief Detective'],
  Coroner: ['Probationary Coroner', 'Coroner I', 'Coroner II', 'Coroner III', 'Chief Coroner'],
};
const initialStaff: StaffMember[] = [
  { name: 'D. Eady', rank: 'Probationary Officer', department: 'Police', badge: '0974', status: 'Off duty', strikes: 0 },
  { name: 'M. Alvarez', rank: 'Sergeant', department: 'Police', badge: '0318', status: 'On duty', strikes: 1 },
  { name: 'R. Bennett', rank: 'Firefighter', department: 'Fire', badge: '1420', status: 'On duty', strikes: 0 },
  { name: 'T. Morgan', rank: 'Paramedic', department: 'EMS', badge: '2086', status: 'Off duty', strikes: 0 },
  { name: 'S. Patel', rank: 'DOT Technician II', department: 'DOT', badge: '3841', status: 'Off duty', strikes: 2 },
  { name: 'A. Brooks', rank: 'SWAT Operator', department: 'SWAT', badge: '0716', status: 'On duty', strikes: 0 },
  { name: 'C. Nguyen', rank: 'K9 Handler', department: 'K9', badge: '1613', status: 'Off duty', strikes: 0 },
  { name: 'J. Rivera', rank: 'Detective II', department: 'Detective', badge: '0442', status: 'Off duty', strikes: 0 },
];

function localTimestamp(date: Date) {
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function displayRank(name: string) {
  return name.replace('Probationary Officer', 'Probationary');
}

export default function Home() {
  const [section, setSection] = useState<Section>('overview');
  const [staff, setStaff] = useState(initialStaff);
  const [activities, setActivities] = useState<ActivityItem[]>([
    { title: 'Shift note submitted', detail: 'M. Alvarez · Police · Awaiting supervisor review', time: 'Today, 14:22', status: 'Needs review' },
    { title: 'Application received', detail: 'New applicant · Fire Department', time: 'Today, 13:54', status: 'Needs review' },
    { title: 'Shift completed', detail: 'R. Bennett · Fire · 02h 18m logged', time: 'Today, 12:46', status: 'Logged' },
    { title: 'Activity sync', detail: 'Last simulated check · Manual review required', time: 'Today, 12:10', status: 'Logged' },
  ]);
  const [activeFilter, setActiveFilter] = useState('All departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [signature, setSignature] = useState('');
  const [shiftNote, setShiftNote] = useState('');
  const [shiftStartedAt, setShiftStartedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [applicationOpen, setApplicationOpenState] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<SignupRole | null>(null);
  const [accessRequestUsername, setAccessRequestUsername] = useState('');
  const [accessRequestReason, setAccessRequestReason] = useState('');
  const [toast, setToast] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [applicant, setApplicant] = useState({ username: '', password: '', department: 'Police' as Department, characterName: '', characterAge: '', experience: '', motivation: '', scenario: '' });

  function setApplicationOpen(isOpen: boolean) {
    setRolePickerOpen(isOpen);
    setApplicationOpenState(false);
    setSignupRole(null);
    setAccessRequestUsername('');
    setAccessRequestReason('');
  }

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (signupRole === 'Employee' && !rolePickerOpen) setApplicationOpenState(true);
  }, [rolePickerOpen, signupRole]);

  const me = staff[0];
  const onDutyCount = staff.filter((member) => member.status === 'On duty').length;
  const needsReview = activities.filter((item) => item.status === 'Needs review').length;
  const visibleStaff = staff.filter((member) => {
    const matchesDepartment = activeFilter === 'All departments' || member.department === activeFilter;
    const matchesSearch = `${member.name} ${member.rank} ${member.department} ${member.badge}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }

  function handleClockIn() {
    if (!signature.trim()) {
      notify('Enter your signature before clocking in.');
      return;
    }
    const started = new Date();
    setShiftStartedAt(started);
    setStaff((current) => current.map((member, index) => index === 0 ? { ...member, status: 'On duty' } : member));
    setActivities((current) => [{ title: 'Shift started', detail: `${signature.trim()} · ${me.department} · Device-local timestamp`, time: localTimestamp(started), status: 'Logged' }, ...current]);
    notify('Shift started. Device time is recorded for this demo session.');
  }

  function handleClockOut() {
    if (!signature.trim()) {
      notify('Enter your signature before clocking out.');
      return;
    }
    if (!shiftNote.trim()) {
      notify('Add an end-of-shift note before clocking out.');
      return;
    }
    const ended = new Date();
    setStaff((current) => current.map((member, index) => index === 0 ? { ...member, status: 'Off duty' } : member));
    setActivities((current) => [{ title: 'Shift note submitted', detail: `${signature.trim()} · ${me.department} · Awaiting supervisor review`, time: localTimestamp(ended), status: 'Needs review' }, ...current]);
    setShiftStartedAt(null);
    setShiftNote('');
    notify('Shift note queued for supervisor review.');
  }

  function handleApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const experience = applicant.experience.toLowerCase();
    const policeRank = /chief/.test(experience) ? 8
      : /captain|capt\b/.test(experience) ? 7
      : /lieutenant|\blt\b/.test(experience) ? 6
      : /sergeant|\bsgt\b/.test(experience) ? 5
      : /corporal|\bcpl\b/.test(experience) ? 4
      : /police (officer )?(iii|3)\b/.test(experience) ? 3
      : /police (officer )?(ii|2)\b/.test(experience) ? 2
      : /police (officer )?(i|1)\b/.test(experience) ? 1
      : -1;
    const weeks = Number(experience.match(/(\d+(?:\.\d+)?)\s*weeks?/)?.[1] ?? 0);
    const isEntryDepartment = ['Police', 'Fire', 'EMS', 'DOT'].includes(applicant.department);
    const meetsRequirement = isEntryDepartment
      || (['SWAT', 'K9'].includes(applicant.department) && policeRank >= 4)
      || (applicant.department === 'Traffic Enforcement' && policeRank >= 2)
      || (!isEntryDepartment && !['SWAT', 'K9', 'Traffic Enforcement'].includes(applicant.department) && weeks >= 3);
    if (!meetsRequirement) {
      setApplicant((current) => ({ ...current, password: '' }));
      setApplicationOpen(false);
      setActivities((current) => [{ title: 'Application declined', detail: `${applicant.username || 'Applicant'} · ${applicant.department} · Minimum requirement not met`, time: localTimestamp(new Date()), status: 'Logged' }, ...current]);
      notify('This application does not meet the listed minimum requirements.');
      return;
    }
    setApplicant((current) => ({ ...current, password: '' }));
    setApplicationOpen(false);
    setActivities((current) => [{ title: 'Application received', detail: `${applicant.username || 'New applicant'} · ${applicant.department} · Interview review pending`, time: localTimestamp(new Date()), status: 'Needs review' }, ...current]);
    notify('Demo application recorded in this session. Account creation is not connected.');
  }

  function handleAccessRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signupRole || signupRole === 'Employee' || !accessRequestUsername.trim() || !accessRequestReason.trim()) return;
    setActivities((current) => [{
      title: `${signupRole} access requested`,
      detail: `${accessRequestUsername.trim()} · ${accessRequestReason.trim()} · Awaiting authorized administrator review`,
      time: localTimestamp(new Date()),
      status: 'Needs review',
    }, ...current]);
    setApplicationOpenState(false);
    setRolePickerOpen(false);
    setSignupRole(null);
    notify('Access request recorded for review. No HR or FTO permissions were granted.');
  }

  function reviewActivity(index: number) {
    setActivities((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'Logged' } : item));
  }

  function syncActivity() {
    const syncedAt = new Date();
    setActivities((current) => [{ title: 'Activity sync requested', detail: 'No game connection configured · Verify attendance manually', time: localTimestamp(syncedAt), status: 'Needs review' }, ...current]);
    notify('Demo activity check added to the review queue.');
  }

  const shiftDuration = shiftStartedAt && now ? Math.max(0, Math.floor((now.getTime() - shiftStartedAt.getTime()) / 1000)) : 0;
  const hours = String(Math.floor(shiftDuration / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((shiftDuration % 3600) / 60)).padStart(2, '0');
  const seconds = String(shiftDuration % 60).padStart(2, '0');
  const promotionProgress = Math.min(100, Math.round((shiftDuration / 7200) * 100));

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Shield size={19} strokeWidth={2.1} /></div>
          <div><span className="brand-name">Staff Operations</span></div>
          <button className="icon-button close-nav" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="agency-switcher"><span className="agency-symbol"><Siren size={16} /></span><span><strong>Northstar County</strong><small>Roleplay services</small></span><ChevronDown size={14} className="muted-icon" /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={section === 'overview' ? 'nav-item active' : 'nav-item'} onClick={() => { setSection('overview'); setMobileNavOpen(false); }}><Gauge size={17} /><span>Command overview</span><span className="nav-count">01</span></button>
          <button className={section === 'applications' ? 'nav-item active' : 'nav-item'} onClick={() => { setSection('applications'); setMobileNavOpen(false); }}><ClipboardList size={17} /><span>Applications</span>{needsReview > 0 && <span className="nav-dot" />}</button>
          <button className={section === 'personnel' ? 'nav-item active' : 'nav-item'} onClick={() => { setSection('personnel'); setMobileNavOpen(false); }}><Users size={17} /><span>Personnel roster</span></button>
          <button className={section === 'activity' ? 'nav-item active' : 'nav-item'} onClick={() => { setSection('activity'); setMobileNavOpen(false); }}><Activity size={17} /><span>Activity &amp; review</span><span className="nav-count alert-count">{needsReview}</span></button>
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-label">QUICK ACCESS</div>
        <button className="nav-item quiet" onClick={() => setApplicationOpen(true)}><Plus size={17} /><span>Start an application</span></button>
        <div className="sidebar-spacer" />
        <div className="sidebar-status"><span className="status-light" /><span>Personnel system</span><span className="status-live">DEMO</span></div>
        <button className="profile-card" onClick={() => notify('Demo profile settings are not connected.')}>
          <div className="avatar-initial">DE</div><span className="profile-copy"><strong>{me.name}</strong><small>{displayRank(me.rank)} · {me.department}</small></span><ChevronDown size={14} className="muted-icon" />
        </button>
      </aside>

      <section className={`workspace workspace-${section}`}>
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Northstar County</span><span className="crumb-slash">/</span><strong>{section === 'overview' ? 'Command overview' : section === 'personnel' ? 'Personnel roster' : section === 'applications' ? 'Applications' : 'Activity & review'}</strong></div>
          <div className="topbar-right"><span className="system-status"><i /> SYSTEM OPERATIONAL</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setSection('activity')}><Bell size={18} />{needsReview > 0 && <i />}</button><span className="topbar-divider" /><div className="date-display"><CalendarDays size={15} /><span>{now ? now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'Loading date'}</span></div></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> PERSONNEL OPERATIONS <span className="eyebrow-sep">/</span> {now ? now.toLocaleDateString([], { month: 'long', year: 'numeric' }).toUpperCase() : 'LIVE DESK'}</div><h1>{section === 'overview' ? `Welcome, ${me.badge} | ${me.name} | ${me.department}` : section === 'personnel' ? 'Personnel roster' : section === 'applications' ? 'Applications' : 'Activity & review'}</h1><p>{section === 'overview' ? 'Your department status, applications, and shift record.' : section === 'personnel' ? 'Search assignments and check current department status.' : section === 'applications' ? 'Review new applicants and guide them through onboarding.' : 'Inspect shift records and activity before taking personnel action.'}</p></div>
            <div className="heading-actions"><button className="button button-secondary" onClick={syncActivity}><Activity size={15} /> Sync activity</button><button className="button button-primary" onClick={() => setApplicationOpen(true)}><Plus size={16} /> New application</button></div>
          </div>

          <div className="demo-banner"><span className="demo-banner-icon"><ShieldAlert size={15} /></span><span><strong>Prototype mode</strong> · Sample roster and actions stay in this browser session. Discord, Roblox, secure sign-in, and trusted attendance are not connected.</span><button aria-label="Dismiss prototype notice" onClick={(event) => event.currentTarget.parentElement?.remove()}><X size={15} /></button></div>

          {section === 'overview' && <>
            <div className="metric-grid">
              <article className="metric-card"><div className="metric-top"><span>ON DUTY</span><span className="metric-icon green"><ShieldCheck size={16} /></span></div><div className="metric-value">{onDutyCount}<span className="metric-total"> / {staff.length}</span></div><div className="metric-foot"><span className="metric-dot green-dot" /> Across <strong>{new Set(staff.filter((member) => member.status === 'On duty').map((member) => member.department)).size}</strong> departments</div></article>
              <article className="metric-card"><div className="metric-top"><span>AWAITING REVIEW</span><span className="metric-icon amber"><ClipboardList size={16} /></span></div><div className="metric-value">{needsReview.toString().padStart(2, '0')}</div><div className="metric-foot"><span className="metric-dot amber-dot" /> Applications, notes, activity</div></article>
              <article className="metric-card"><div className="metric-top"><span>DEPARTMENTS</span><span className="metric-icon blue"><BriefcaseBusiness size={16} /></span></div><div className="metric-value">{departments.length.toString().padStart(2, '0')}</div><div className="metric-foot"><span className="metric-dot blue-dot" /> Personnel pathways configured</div></article>
              <article className="metric-card"><div className="metric-top"><span>YOUR SHIFT</span><span className="metric-icon rose"><Clock3 size={16} /></span></div><div className="metric-value metric-clock">{shiftStartedAt ? `${hours}:${minutes}:${seconds}` : '00:00:00'}</div><div className="metric-foot"><span className={`metric-dot ${shiftStartedAt ? 'green-dot' : ''}`} /> {shiftStartedAt ? 'Clocked in · device-local timer' : 'Not currently clocked in'}</div></article>
            </div>

            <div className="dashboard-grid">
              <div className="main-column">
                <section className="panel shift-panel">
                  <div className="panel-heading"><div><div className="section-kicker">SHIFT CONTROL <span>01</span></div><h2>Attendance record</h2></div><span className={shiftStartedAt ? 'pill pill-green' : 'pill pill-neutral'}><i />{shiftStartedAt ? 'ON DUTY' : 'OFF DUTY'}</span></div>
                  <div className="shift-body"><div className="shift-timer-wrap"><span className="timer-caption">ELAPSED SHIFT</span><div className="timer-display">{hours}<span>:</span>{minutes}<span>:</span>{seconds}</div><div className="timer-subtitle">{shiftStartedAt ? `Started ${localTimestamp(shiftStartedAt)}` : 'A signature is required to start a shift'}</div></div><div className="shift-progress"><div className="progress-label"><span>Next rank review</span><strong>{shiftStartedAt ? `${Math.min(120, Math.floor(shiftDuration / 60))} / 120 min` : '0 / 120 min'}</strong></div><div className="progress-track"><span style={{ width: `${promotionProgress}%` }} /></div><p>Two hours of verified in-game activity is a minimum eligibility threshold, not an automatic promotion.</p></div></div>
                  <div className="shift-fields"><label className="field-label" htmlFor="signature">EMPLOYEE SIGNATURE <span>Required for both actions</span></label><div className="signature-input-wrap"><Fingerprint size={17} /><input id="signature" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Type your full roleplay name" /><span className="signature-mark">e-sign</span></div><label className="field-label note-label" htmlFor="shift-note">END-OF-SHIFT NOTE <span>Required to clock out</span></label><textarea id="shift-note" value={shiftNote} onChange={(event) => setShiftNote(event.target.value)} placeholder="Summary, calls handled, handoff details, or items for supervisor review…" rows={2} /><div className="shift-actions"><span className="timestamp-note"><Clock3 size={13} /> Device time: {now ? localTimestamp(now) : 'Reading local clock'} <span>· not independently verified</span></span><div className="button-pair"><button className="button button-clock-in" disabled={!!shiftStartedAt} onClick={handleClockIn}><ArrowDownRight size={15} /> Clock in</button><button className="button button-clock-out" disabled={!shiftStartedAt} onClick={handleClockOut}><ArrowUpRight size={15} /> Clock out</button></div></div></div>
                </section>

                <section className="panel roster-panel">
                  <div className="panel-heading roster-heading"><div><div className="section-kicker">LIVE PERSONNEL <span>02</span></div><h2>Department roster</h2></div><button className="text-button" onClick={() => setSection('personnel')}>View full roster <span>→</span></button></div>
                  <div className="roster-table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>CALLSIGN / BADGE</th><th>STATUS</th></tr></thead><tbody>{staff.slice(0, 5).map((member, index) => <tr key={member.badge}><td><div className="table-person"><span className={`mini-avatar avatar-${index % 4}`}>{member.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{member.name}</strong><small>{displayRank(member.rank)}</small></span></div></td><td><span className="dept-tag">{member.department}</span></td><td className="callsign-cell">{member.rank.split(' ')[0]} · {member.name.replace('.', '')} <span>#{member.badge}</span></td><td><span className={`table-status ${member.status === 'On duty' ? 'status-on' : 'status-off'}`}><i />{member.status}</span></td></tr>)}</tbody></table></div>
                </section>

                <section className="panel dept-panel"><div className="panel-heading"><div><div className="section-kicker">ASSIGNMENTS <span>03</span></div><h2>Department readiness</h2></div><span className="panel-meta">{departments.length} units</span></div><div className="department-grid">{departments.slice(0, 6).map((department, index) => { const count = staff.filter((member) => member.department === department && member.status === 'On duty').length; return <button key={department} className="department-tile" onClick={() => { setActiveFilter(department); setSection('personnel'); }}><span className={`dept-symbol dept-symbol-${index}`}><Shield size={15} /></span><span className="dept-tile-name">{department}<small>{count ? `${count} unit${count > 1 ? 's' : ''} active` : 'No active units'}</small></span><span className={`dept-count ${count ? 'count-active' : ''}`}>{String(count).padStart(2, '0')}</span></button>; })}</div></section>
              </div>

              <aside className="right-column">
                <section className="panel profile-panel"><div className="profile-panel-top"><div><div className="section-kicker">MY PERSONNEL FILE</div><h2>Profile summary</h2></div><button className="icon-button small-icon" aria-label="Open profile menu" onClick={() => notify('Profile settings are not connected.')}><ChevronDown size={16} /></button></div><div className="profile-identity"><div className="profile-avatar">DE<span><BadgeCheck size={13} /></span></div><div><h3>{me.name}</h3><span className="identity-rank">{displayRank(me.rank)}</span><span className="identity-dept">{me.department} Department</span></div></div><div className="identity-meta"><div><span>BADGE NO.</span><strong>{me.badge}</strong></div><div><span>CALLSIGN</span><strong>PO · D.Eady</strong></div><div><span>RANK TRACK</span><strong>Probationary <span className="track-arrow">→</span> Police I</strong></div></div><div className="profile-foot"><span><span className="metric-dot green-dot" /> {me.strikes} active strikes</span><button onClick={() => setSection('personnel')}>View file <span>→</span></button></div></section>

                <section className="panel recent-panel"><div className="panel-heading"><div><div className="section-kicker">REVIEW QUEUE</div><h2>Needs attention</h2></div><span className="queue-count">{needsReview}</span></div><div className="activity-list">{activities.filter((item) => item.status === 'Needs review').slice(0, 3).map((item) => <div className="activity-item" key={`${item.title}-${item.time}`}><span className="activity-marker"><FileText size={14} /></span><div className="activity-copy"><strong>{item.title}</strong><p>{item.detail}</p><small>{item.time}</small></div></div>)}{needsReview === 0 && <p className="empty-note">Nothing waiting for review.</p>}</div><button className="panel-footer-link" onClick={() => setSection('activity')}>Open review queue <span>→</span></button></section>

                <section className="policy-panel"><div className="policy-title"><ShieldAlert size={15} /><strong>Promotion policy</strong></div><p>Two hours of in-game activity is only one eligibility check. Department prerequisites, rank history, and supervisor review still apply.</p><div className="policy-rule"><span>POLICE / FIRE / EMS / DOT</span><strong>Entry-level welcome</strong></div><div className="policy-rule"><span>SWAT / K9</span><strong>Police Corporal+</strong></div><div className="policy-rule"><span>TRAFFIC ENFORCEMENT</span><strong>Police Officer II+</strong></div><div className="policy-rule"><span>OTHER SPECIALTIES</span><strong>3 weeks RP experience</strong></div></section>
              </aside>
            </div>
          </>}

          {section === 'personnel' && <section className="panel directory-panel"><div className="directory-tools"><label className="search-box"><Search size={16} /><input aria-label="Search personnel" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search name, rank, callsign, badge…" /></label><select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)} aria-label="Filter by department"><option>All departments</option>{departments.map((department) => <option key={department}>{department}</option>)}</select><span className="directory-count">{visibleStaff.length} personnel</span></div><div className="roster-table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>RANK</th><th>CALLSIGN / BADGE</th><th>STATUS</th><th>STRIKES</th></tr></thead><tbody>{visibleStaff.map((member, index) => <tr key={member.badge}><td><div className="table-person"><span className={`mini-avatar avatar-${index % 4}`}>{member.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{member.name}</strong><small>Character profile · Demo record</small></span></div></td><td><span className="dept-tag">{member.department}</span></td><td>{displayRank(member.rank)}</td><td className="callsign-cell">{member.rank.split(' ')[0]} · {member.name.replace('.', '')} <span>#{member.badge}</span></td><td><span className={`table-status ${member.status === 'On duty' ? 'status-on' : 'status-off'}`}><i />{member.status}</span></td><td><span className={member.strikes ? 'strike-count has-strikes' : 'strike-count'}>{member.strikes} / 6</span></td></tr>)}</tbody></table>{visibleStaff.length === 0 && <div className="empty-state">No personnel match those filters.</div>}</div><div className="rank-ladders"><div className="section-kicker">RANK PATHWAYS</div><div className="rank-grid">{departments.map((department) => <div key={department} className="rank-path"><strong>{department}</strong><p>{ranks[department].join('  /  ')}</p></div>)}</div></div></section>}

          {section === 'applications' && <div className="application-layout"><section className="panel application-panel"><div className="panel-heading"><div><div className="section-kicker">ONBOARDING WORKFLOW <span>01</span></div><h2>Applicant pipeline</h2></div><button className="button button-primary" onClick={() => setApplicationOpen(true)}><Plus size={15} /> Start application</button></div><div className="pipeline-steps"><div className="pipeline-step current"><span>01</span><div><strong>Application</strong><small>Account &amp; department</small></div></div><div className="pipeline-connector" /><div className="pipeline-step"><span>02</span><div><strong>Interview</strong><small>Structured review</small></div></div><div className="pipeline-connector" /><div className="pipeline-step"><span>03</span><div><strong>Character setup</strong><small>Profile &amp; identity</small></div></div><div className="pipeline-connector" /><div className="pipeline-step"><span>04</span><div><strong>Supervisor review</strong><small>Final assignment</small></div></div></div><div className="application-empty"><div className="empty-illustration"><ClipboardList size={23} /></div><h3>No live applications connected</h3><p>Start a demo application to preview the intake questions. Real accounts, AI interviews, and Discord delivery require a configured backend.</p><button className="button button-secondary" onClick={() => setApplicationOpen(true)}><Plus size={15} /> Create demo application</button></div></section><aside className="panel requirements-panel"><div className="section-kicker">ENTRY REQUIREMENTS</div><h2>Department pathways</h2><div className="requirement-row"><strong>Police · Fire · EMS · DOT</strong><span>Open entry; begin at probationary rank.</span></div><div className="requirement-row"><strong>SWAT · K9</strong><span>Police Corporal or higher.</span></div><div className="requirement-row"><strong>Traffic Enforcement</strong><span>Police Officer II or higher.</span></div><div className="requirement-row"><strong>Judge · CSI · Detective · Coroner</strong><span>Three weeks of server roleplay experience.</span></div><div className="requirement-callout"><ShieldCheck size={16} /><p>High-command applications require documented qualifications and approval by an authorized reviewer.</p></div></aside></div>}

          {section === 'activity' && <section className="panel activity-page-panel"><div className="panel-heading"><div><div className="section-kicker">AUDIT DESK <span>01</span></div><h2>Activity review</h2></div><button className="button button-secondary" onClick={syncActivity}><Activity size={15} /> Sync activities</button></div><div className="review-warning"><ShieldAlert size={17} /><div><strong>Review before personnel action</strong><p>Browser timestamps and simulated activity are not verified game telemetry. Review context before applying a strike or changing employment status.</p></div></div><div className="activity-table"><div className="activity-table-head"><span>EVENT</span><span>DETAIL</span><span>TIME</span><span>STATUS / ACTION</span></div>{activities.map((item, index) => <div className="activity-table-row" key={`${item.title}-${item.time}-${index}`}><span className="event-title"><span className={`event-icon ${item.status === 'Needs review' ? 'event-review' : ''}`}>{item.status === 'Needs review' ? <FileText size={15} /> : <Check size={15} />}</span><strong>{item.title}</strong></span><span className="event-detail">{item.detail}</span><span className="event-time">{item.time}</span><span>{item.status === 'Needs review' ? <button className="review-button" onClick={() => reviewActivity(index)}>Mark reviewed <Check size={13} /></button> : <span className="pill pill-neutral">LOGGED</span>}</span></div>)}</div><div className="strike-policy"><div className="strike-policy-icon"><ShieldAlert size={18} /></div><div><strong>Strike policy · 6 total triggers a review</strong><p>Inactivity flags should be reviewed by an authorized supervisor. Demotion or termination is never applied automatically in this prototype.</p></div><button className="button button-secondary" onClick={() => notify('Strike review requires an authorized backend role.')}>Review personnel flags</button></div></section>}

          <footer className="page-footer"><span>© 2026 NORTHSTAR COUNTY ROLEPLAY</span><span>PERSONNEL CAD <i /> PROTOTYPE BUILD 0.1</span><span>LOCAL DEVICE TIME · NOT AN OFFICIAL RECORD</span></footer>
        </div>
      </section>

      {applicationOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setApplicationOpen(false); }}><section className="application-modal" role="dialog" aria-modal="true" aria-labelledby="application-title"><div className="modal-heading"><div><div className="section-kicker">NEW PERSONNEL FILE</div><h2 id="application-title">Start your application</h2><p>Demo intake only. Do not enter a real password.</p></div><button className="icon-button" aria-label="Close application" onClick={() => setApplicationOpen(false)}><X size={18} /></button></div><form onSubmit={handleApplication}><div className="form-grid"><label>Portal username<input required value={applicant.username} onChange={(event) => setApplicant({ ...applicant, username: event.target.value })} placeholder="Choose a username" /></label><label>Demo password<input required type="password" autoComplete="new-password" value={applicant.password} onChange={(event) => setApplicant({ ...applicant, password: event.target.value })} placeholder="Not saved or transmitted" /></label><label>Department<select value={applicant.department} onChange={(event) => setApplicant({ ...applicant, department: event.target.value as Department })}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label><label>Character name<input value={applicant.characterName} onChange={(event) => setApplicant({ ...applicant, characterName: event.target.value })} placeholder="Roleplay character name" /></label><label>Character age<input type="number" min="1" max="120" value={applicant.characterAge} onChange={(event) => setApplicant({ ...applicant, characterAge: event.target.value })} placeholder="In-character age" /></label><label>Prior server RP experience<input value={applicant.experience} onChange={(event) => setApplicant({ ...applicant, experience: event.target.value })} placeholder="Example: 3 weeks, Police II" /></label></div><div className="interview-prompts"><div className="section-kicker">STRUCTURED INTERVIEW PROMPTS</div><label>Why are you applying to this department?<textarea required value={applicant.motivation} onChange={(event) => setApplicant({ ...applicant, motivation: event.target.value })} rows={3} placeholder="Share your motivation and relevant experience…" /></label><label>Scenario: you receive conflicting information during an active call. What do you do first, and how do you communicate your decision?<textarea required value={applicant.scenario} onChange={(event) => setApplicant({ ...applicant, scenario: event.target.value })} rows={3} placeholder="Describe your approach…" /></label><p>Interview responses require a human reviewer. This prototype does not use an AI model to pass or deny applicants.</p></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setApplicationOpen(false)}>Cancel</button><button type="submit" className="button button-primary"><FileText size={15} /> Submit demo application</button></div></form></section></div>}
      {rolePickerOpen && <div className="role-picker-backdrop" role="presentation"><section className="role-picker-card" role="dialog" aria-modal="true" aria-labelledby="role-picker-title"><div className="role-picker-heading"><div><div className="section-kicker">ACCOUNT SETUP</div><h2 id="role-picker-title">Choose your portal role</h2></div><button className="icon-button role-picker-close" aria-label="Cancel signup" onClick={() => setApplicationOpen(false)}><X size={18} /></button></div>{signupRole && signupRole !== 'Employee' ? <form className="role-request-form" onSubmit={handleAccessRequest}><p className="role-request-notice">{signupRole} access requires approval from an authorized administrator. This request does not grant permissions.</p><label className="role-request-field">Portal username<input required maxLength={40} value={accessRequestUsername} onChange={(event) => setAccessRequestUsername(event.target.value)} placeholder="Your portal username" /></label><label className="role-request-field">Reason for access<textarea required maxLength={400} rows={3} value={accessRequestReason} onChange={(event) => setAccessRequestReason(event.target.value)} placeholder="Describe your role and who can verify it" /></label><div className="role-request-actions"><button type="button" className="button button-secondary" onClick={() => setSignupRole(null)}>Back</button><button type="submit" className="button button-primary">Request {signupRole} access</button></div></form> : <div className="role-choice-list"><p>Select Employee to apply for a department. HR and FTO accounts need administrator approval.</p><button className="role-choice" onClick={() => { setSignupRole('Employee'); setRolePickerOpen(false); }}><span className="role-choice-icon"><Users size={18} /></span><span><strong>Employee</strong><small>Apply to a department and start onboarding</small></span><span className="role-choice-arrow">→</span></button><button className="role-choice" onClick={() => setSignupRole('FTO staff')}><span className="role-choice-icon"><Siren size={18} /></span><span><strong>FTO staff</strong><small>Request field training access</small></span><span className="role-choice-arrow">→</span></button><button className="role-choice" onClick={() => setSignupRole('HR staff')}><span className="role-choice-icon"><ClipboardList size={18} /></span><span><strong>HR staff</strong><small>Request personnel administration access</small></span><span className="role-choice-arrow">→</span></button></div>}</section></div>}
      {toast && <div className="toast-message" role="status"><Check size={16} />{toast}</div>}
    </main>
  );
}
