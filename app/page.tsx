"use client";

import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileText,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { getFirebaseServices, isFirebaseConfigured } from "@/lib/firebase";

type Profile = {
  displayName: string;
  discordId: string;
  staffStatus: "applicant" | "active";
  department?: string;
  jobTitle?: string;
};

type Application = {
  id: string;
  applicantUid: string;
  applicantName: string;
  applicantDiscordId: string;
  department: string;
  jobTitle: string;
  experience: string;
  motivation: string;
  status: "submitted" | "reviewing" | "interview" | "accepted" | "declined";
  createdAt?: { toDate: () => Date };
};

type Shift = {
  id: string;
  employeeUid?: string;
  employeeName?: string;
  department?: string;
  startedAt?: { toDate: () => Date };
  endedAt?: { toDate: () => Date };
  status: "on-duty" | "ended";
  endNote?: string;
};

type PersonnelRecord = {
  uid: string;
  displayName: string;
  discordId: string;
  department?: string;
  jobTitle?: string;
};

const statusLabel: Record<Application["status"], string> = {
  submitted: "Submitted",
  reviewing: "In review",
  interview: "Interview",
  accepted: "Accepted",
  declined: "Not selected",
};

function readableError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    const messages: Record<string, string> = {
      "auth/invalid-custom-token": "Discord sign-in could not be completed. Please try again.",
      "auth/custom-token-mismatch": "This Discord account is not configured for this portal.",
      "auth/too-many-requests": "Too many attempts. Wait a while and try again.",
      "auth/network-request-failed": "Network error. Check your connection and try again.",
      "permission-denied": "You don’t have permission to do that.",
    };
    if (messages[code]) return messages[code];
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function formatDate(value?: { toDate: () => Date }) {
  return value ? value.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Just now";
}

function toApplication(id: string, data: DocumentData): Application {
  return { id, ...data } as Application;
}

function toShift(id: string, data: DocumentData): Shift {
  return { id, ...data } as Shift;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isHr, setIsHr] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(() => isFirebaseConfigured());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (authError) {
      const messages: Record<string, string> = {
        discord_cancelled: "Discord sign-in was cancelled.",
        discord_failed: "Discord sign-in could not be completed. Please try again.",
        discord_not_configured: "Discord sign-in is not configured yet. Contact the portal administrator.",
      };
      const message = messages[authError] ?? messages.discord_failed;
      window.setTimeout(() => setError(message), 0);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfile(null);
      setIsHr(false);
      setApplications([]);
      setPersonnel([]);
      setRecentShifts([]);
      setShifts([]);
      setActiveShift(null);
      setLoading(Boolean(currentUser));
      setError("");
      setNotice("");
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [{ db }, token] = await Promise.all([
          Promise.resolve(getFirebaseServices()),
          currentUser.getIdTokenResult(),
        ]);
        setIsHr(token.claims.hr === true || token.claims.admin === true);
        const profileSnapshot = await getDoc(doc(db, "users", currentUser.uid));
        if (!profileSnapshot.exists()) throw new Error("Your account profile could not be found.");
        setProfile(profileSnapshot.data() as Profile);
      } catch (loadError) {
        setError(readableError(loadError));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const { db } = getFirebaseServices();
    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const nextProfile = snapshot.data() as Profile;
          setProfile(nextProfile);
          if (nextProfile.staffStatus !== "active") {
            setShifts([]);
            setActiveShift(null);
          }
        }
      },
      (snapshotError) => setError(readableError(snapshotError)),
    );
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    const { db } = getFirebaseServices();
    const applicationQuery = isHr
      ? query(collection(db, "applications"), orderBy("createdAt", "desc"))
      : query(collection(db, "applications"), where("applicantUid", "==", user.uid));
    const unsubscribeApplications = onSnapshot(
      applicationQuery,
      (snapshot) => setApplications(snapshot.docs.map((item) => toApplication(item.id, item.data()))),
      (snapshotError) => setError(readableError(snapshotError)),
    );

    if (isHr) {
      const unsubscribePersonnel = onSnapshot(
        query(collection(db, "users"), where("staffStatus", "==", "active")),
        (snapshot) => setPersonnel(snapshot.docs.map((item) => ({
          uid: item.id,
          ...item.data(),
        }) as PersonnelRecord)),
        (snapshotError) => setError(readableError(snapshotError)),
      );
      const unsubscribeRecentShifts = onSnapshot(
        query(collection(db, "shifts"), orderBy("startedAt", "desc"), limit(25)),
        (snapshot) => setRecentShifts(snapshot.docs.map((item) => toShift(item.id, item.data()))),
        (snapshotError) => setError(readableError(snapshotError)),
      );

      if (profile.staffStatus !== "active") {
        return () => {
          unsubscribeApplications();
          unsubscribePersonnel();
          unsubscribeRecentShifts();
        };
      }
    }

    if (profile.staffStatus !== "active") {
      return unsubscribeApplications;
    }

    const shiftQuery = query(
      collection(db, "shifts"),
      where("employeeUid", "==", user.uid),
      orderBy("startedAt", "desc"),
    );
    const unsubscribeShifts = onSnapshot(
      shiftQuery,
      (snapshot) => {
        const records = snapshot.docs.map((item) => toShift(item.id, item.data()));
        setShifts(records);
        setActiveShift(records.find((item) => item.status === "on-duty") ?? null);
      },
      (snapshotError) => setError(readableError(snapshotError)),
    );
    return () => {
      unsubscribeApplications();
      if (isHr) {
        setPersonnel([]);
        setRecentShifts([]);
      }
      unsubscribeShifts();
    };
  }, [user, profile, isHr]);

  function beginDiscordAuth() {
    setBusy(true);
    setError("");
    setNotice("");
    window.location.href = new URL("/api/auth/discord/start", window.location.origin).toString();
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      await addDoc(collection(getFirebaseServices().db, "applications"), {
        applicantUid: user.uid,
        applicantName: profile.displayName,
        applicantDiscordId: profile.discordId,
        department: String(form.get("department") ?? "").trim(),
        jobTitle: String(form.get("jobTitle") ?? "").trim(),
        experience: String(form.get("experience") ?? "").trim(),
        motivation: String(form.get("motivation") ?? "").trim(),
        status: "submitted",
        createdAt: serverTimestamp(),
      });
      event.currentTarget.reset();
      setNotice("Application submitted. You can track its review status here.");
    } catch (submitError) {
      setError(readableError(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function updateApplication(application: Application, status: Application["status"]) {
    setBusy(true);
    setError("");
    try {
      const { db } = getFirebaseServices();
      const batch = writeBatch(db);
      if (status === "accepted") {
        batch.update(doc(db, "users", application.applicantUid), {
          staffStatus: "active",
          department: application.department,
          jobTitle: application.jobTitle,
          activatedAt: serverTimestamp(),
        });
      }
      batch.update(doc(db, "applications", application.id), {
        status,
        reviewedAt: serverTimestamp(),
      });
      await batch.commit();
      setNotice(`Application marked ${statusLabel[status].toLowerCase()}.`);
    } catch (reviewError) {
      setError(readableError(reviewError));
    } finally {
      setBusy(false);
    }
  }

  async function startShift() {
    if (!user || profile?.staffStatus !== "active") return;
    setBusy(true);
    setError("");
    try {
      const { db } = getFirebaseServices();
      const profileRef = doc(db, "users", user.uid);
      const shiftRef = doc(collection(db, "shifts"));
      await runTransaction(db, async (transaction) => {
        const profileSnapshot = await transaction.get(profileRef);
        if (!profileSnapshot.exists() || profileSnapshot.data().staffStatus !== "active") {
          throw new Error("Only active personnel can start a shift.");
        }
        if (profileSnapshot.data().activeShiftId) {
          throw new Error("You already have an active shift.");
        }

        transaction.set(shiftRef, {
          employeeUid: user.uid,
          employeeName: profile.displayName,
          department: profile.department ?? "",
          startedAt: serverTimestamp(),
          endedAt: null,
          endNote: "",
          status: "on-duty",
        });
        transaction.update(profileRef, { activeShiftId: shiftRef.id });
      });
      setNotice("Shift started.");
    } catch (shiftError) {
      setError(readableError(shiftError));
    } finally {
      setBusy(false);
    }
  }

  async function endShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeShift || !user) return;
    setBusy(true);
    setError("");
    const note = String(new FormData(event.currentTarget).get("endNote") ?? "").trim();
    try {
      const { db } = getFirebaseServices();
      const profileRef = doc(db, "users", user.uid);
      const shiftRef = doc(db, "shifts", activeShift.id);
      await runTransaction(db, async (transaction) => {
        const [profileSnapshot, shiftSnapshot] = await Promise.all([
          transaction.get(profileRef),
          transaction.get(shiftRef),
        ]);
        if (!profileSnapshot.exists() || profileSnapshot.data().activeShiftId !== activeShift.id) {
          throw new Error("This shift is no longer active on your account.");
        }
        if (!shiftSnapshot.exists() || shiftSnapshot.data().status !== "on-duty") {
          throw new Error("This shift has already ended.");
        }

        transaction.update(shiftRef, {
          endedAt: serverTimestamp(),
          endNote: note,
          status: "ended",
        });
        transaction.update(profileRef, { activeShiftId: null });
      });
      setNotice("Shift ended and recorded.");
    } catch (shiftError) {
      setError(readableError(shiftError));
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <main className="setup-page">
        <div className="setup-card">
          <div className="brand-mark"><BriefcaseBusiness size={20} /></div>
          <p className="eyebrow">CIVIC OPERATIONS</p>
          <h1>Portal setup required</h1>
          <p>Connect Firebase and Discord OAuth to enable secure account registration, applications, and personnel records.</p>
          <ol>
            <li>Create a Firebase project and add a Web app.</li>
            <li>Register a Discord OAuth application with the portal callback URL.</li>
            <li>Copy the Web app values to the <code>NEXT_PUBLIC_FIREBASE_*</code> environment variables.</li>
            <li>Set the server-side Discord and Firebase Admin credentials, then deploy Firestore rules.</li>
          </ol>
          <p className="setup-note">Accounts use Discord identity. The portal does not request email or date of birth, or impose an 18+ check. Users must meet Discord’s minimum age for their region.</p>
        </div>
      </main>
    );
  }

  if (!user || loading) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <div className="brand-lockup"><span className="brand-mark"><BriefcaseBusiness size={19} /></span><span>CIVIC OPERATIONS</span></div>
          <div className="intro-copy">
            <p className="eyebrow">PERSONNEL SERVICES</p>
            <h1>A clear path to serving your community.</h1>
            <p>Submit an application, follow its progress, and access your personnel workspace after approval.</p>
          </div>
          <div className="intro-foot"><ShieldCheck size={16} /> Discord identity · Staff access by approval</div>
        </section>
        <section className="auth-panel">
          <div className="auth-form-wrap">
            {loading ? <div className="loading"><span className="spinner" /> Loading secure workspace…</div> : (
              <>
                <p className="eyebrow">{mode === "signin" ? "WELCOME BACK" : "GET STARTED"}</p>
                <h2>{mode === "signin" ? "Sign in to your account" : "Create your applicant account"}</h2>
                <p className="form-subtitle">{mode === "signin" ? "Continue securely with your Discord account." : "Your Discord account creates an applicant profile. Staff access requires approval."}</p>
                {error && <div className="alert alert-error" role="alert">{error}</div>}
                {notice && <div className="alert alert-success" role="status">{notice}</div>}
                <button className="primary-button full-button discord-button" type="button" disabled={busy} onClick={beginDiscordAuth}>{busy ? "Connecting to Discord…" : mode === "signin" ? "Continue with Discord" : "Create account with Discord"} <ArrowRight size={16} /></button>
                <div className="switch-auth">{mode === "signin" ? "New to Civic Operations?" : "Already have an account?"} <button className="text-button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>{mode === "signin" ? "Create account" : "Sign in"}</button></div>
                <p className="privacy-note"><ShieldCheck size={14} /> No email or 18+ check. You must meet Discord’s minimum age for your region.</p>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  const ownApplications = applications.filter((application) => application.applicantUid === user.uid);
  const latestApplication = ownApplications.sort(
    (left, right) => (right.createdAt?.toDate().getTime() ?? 0) - (left.createdAt?.toDate().getTime() ?? 0),
  )[0];

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark"><BriefcaseBusiness size={19} /></span><span>CIVIC OPERATIONS</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="nav-link nav-link-active"><Activity size={17} /> Overview</div>
        {isHr ? <div className="nav-link"><Users size={17} /> Applications & personnel</div> : <div className="nav-link"><FileText size={17} /> My applications</div>}
        {profile?.staffStatus === "active" && <div className="nav-link"><Clock3 size={17} /> Shift records</div>}
        <div className="sidebar-bottom">
          <div className="secure-label"><ShieldCheck size={15} /> Secure workspace</div>
          <div className="user-card"><span className="avatar">{(profile?.displayName ?? "U").slice(0, 1).toUpperCase()}</span><span className="user-details"><strong>{profile?.displayName}</strong><small>{isHr ? "HR reviewer" : profile?.staffStatus === "active" ? profile.jobTitle ?? "Personnel" : "Applicant"}</small></span><button aria-label="Sign out" className="icon-button" onClick={() => signOut(getFirebaseServices().auth)}><LogOut size={17} /></button></div>
        </div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><div><span className="breadcrumb">Personnel services</span><span className="breadcrumb-separator">/</span><strong>Overview</strong></div><div className="topbar-right"><span className="verified-pill"><BadgeCheck size={14} /> Discord connected</span><button className="icon-button mobile-signout" aria-label="Sign out" onClick={() => signOut(getFirebaseServices().auth)}><LogOut size={17} /></button></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">PERSONNEL WORKSPACE</p><h1>Welcome, {profile?.displayName}</h1><p className="page-description">{profile?.staffStatus === "active" ? `${profile.department ?? "Personnel"} · ${profile.jobTitle ?? "Staff member"}` : "Your applications and account status, in one place."}</p></div><span className={`status-pill ${profile?.staffStatus === "active" ? "status-active" : "status-pending"}`}><span />{profile?.staffStatus === "active" ? "Active personnel" : "Applicant account"}</span></div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}
          {isHr ? (
            <section className="section-block">
              <div className="section-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Applications</h2></div><span className="count-pill">{applications.length} total</span></div>
              {applications.length === 0 ? <div className="empty-card"><div className="empty-icon"><FileText size={20} /></div><h3>No applications yet</h3><p>Applicants who sign in with Discord will appear here after submitting an application.</p></div> : <div className="application-list">{applications.map((application) => <article className="application-card" key={application.id}><div className="application-top"><div><span className="application-role">{application.jobTitle} · {application.department}</span><h3>{application.applicantName}</h3><p>Discord ID: {application.applicantDiscordId} · {formatDate(application.createdAt)}</p></div><span className={`application-status status-${application.status}`}>{statusLabel[application.status]}</span></div><div className="application-copy"><div><strong>Relevant experience</strong><p>{application.experience}</p></div><div><strong>Why this role</strong><p>{application.motivation}</p></div></div>{!["accepted", "declined"].includes(application.status) && <div className="review-actions"><button disabled={busy} className="secondary-button" onClick={() => updateApplication(application, "reviewing")}>Mark in review</button><button disabled={busy} className="secondary-button" onClick={() => updateApplication(application, "interview")}>Invite to interview</button><button disabled={busy} className="primary-button" onClick={() => updateApplication(application, "accepted")}><Check size={15} /> Approve & activate</button><button disabled={busy} className="danger-button" onClick={() => updateApplication(application, "declined")}>Decline</button></div>}</article>)}</div>}
            </section>
          ) : profile?.staffStatus === "active" ? (
            <div className="dashboard-grid">
              <section className="section-block shift-section">
                <div className="section-heading"><div><p className="eyebrow">ATTENDANCE</p><h2>Shift control</h2></div><span className={`status-pill ${activeShift ? "status-active" : "status-neutral"}`}><span />{activeShift ? "On duty" : "Off duty"}</span></div>
                <div className="shift-card">{activeShift ? <><div className="shift-time"><span>SHIFT STARTED</span><strong>{formatDate(activeShift.startedAt)}</strong></div><form className="form-stack" onSubmit={endShift}><label>End-of-shift handoff note<textarea name="endNote" rows={3} maxLength={1000} placeholder="Summarize work completed and any handoff details." /></label><button className="primary-button" disabled={busy} type="submit">End shift <ArrowRight size={15} /></button></form></> : <><div className="shift-empty"><span className="empty-icon"><Clock3 size={21} /></span><div><h3>Ready when you are</h3><p>Your shift begins when you clock in. Add a handoff note when you finish.</p></div></div><button className="primary-button" disabled={busy} onClick={startShift}><Plus size={16} /> Clock in</button></>}</div>
              </section>
              <section className="section-block">
                <div className="section-heading"><div><p className="eyebrow">YOUR HISTORY</p><h2>Recent shifts</h2></div></div>
                {shifts.length === 0 ? <div className="empty-card compact-empty"><p>No shifts recorded yet.</p></div> : <div className="shift-list">{shifts.slice(0, 6).map((shift) => <div className="shift-row" key={shift.id}><span className="shift-dot" /><div><strong>{formatDate(shift.startedAt)}</strong><small>{shift.status === "on-duty" ? "Currently on duty" : `Ended ${formatDate(shift.endedAt)}`}</small>{shift.endNote && <p>{shift.endNote}</p>}</div></div>)}</div>}
              </section>
            </div>
          ) : (
            <div className="dashboard-grid applicant-grid">
              <section className="section-block application-section">
                <div className="section-heading"><div><p className="eyebrow">APPLICATION</p><h2>{latestApplication ? "Your application" : "Start your application"}</h2></div><span className="count-pill">{ownApplications.length} submitted</span></div>
                {latestApplication ? <div className="application-card own-application"><div className="application-top"><div><span className="application-role">{latestApplication.jobTitle} · {latestApplication.department}</span><h3>{statusLabel[latestApplication.status]}</h3><p>Submitted {formatDate(latestApplication.createdAt)}</p></div><span className={`application-status status-${latestApplication.status}`}>{statusLabel[latestApplication.status]}</span></div><div className="timeline"><span className="timeline-check"><Check size={14} /></span><div><strong>Application received</strong><p>Your application is in the review process. Status updates will appear here.</p></div></div></div> : <form className="application-form" onSubmit={submitApplication}><div className="form-row"><label>Department<input name="department" required minLength={2} maxLength={80} placeholder="e.g. Police, Fire, EMS" /></label><label>Position applying for<input name="jobTitle" required minLength={2} maxLength={80} placeholder="e.g. Officer, Dispatcher" /></label></div><label>Relevant roleplay experience<textarea name="experience" rows={4} required minLength={20} maxLength={2000} placeholder="Describe relevant roleplay experience, training, or qualifications. Do not include real-life sensitive personal information." /></label><label>Why are you interested in this position?<textarea name="motivation" rows={4} required minLength={20} maxLength={2000} placeholder="Tell us why you’d like to join and what you’d bring to the team." /></label><button className="primary-button" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"} <ArrowRight size={16} /></button><p className="form-hint">By submitting, you confirm the information is accurate and agree it may be reviewed by authorized staff. Do not include real-life sensitive personal information.</p></form>}
              </section>
                  <section className="section-block guidance-section"><div className="section-heading"><div><p className="eyebrow">NEXT STEPS</p><h2>Application process</h2></div></div><div className="step-list"><div className="step-item step-complete"><span className="step-marker"><Check size={14} /></span><div><strong>Discord identity</strong><p>Your Discord account is linked to your secure portal account.</p></div></div><div className={`step-item ${latestApplication ? "step-complete" : ""}`}><span className="step-marker">{latestApplication ? <Check size={14} /> : "2"}</span><div><strong>Submit application</strong><p>Provide your experience and the role you’re interested in.</p></div></div><div className="step-item"><span className="step-marker">3</span><div><strong>Staff review</strong><p>Authorized reviewers assess applications and may invite you to interview.</p></div></div><div className="step-item"><span className="step-marker">4</span><div><strong>Decision & onboarding</strong><p>Approved applicants receive personnel access after review.</p></div></div></div><div className="info-note"><ShieldCheck size={16} /><p>Staff access is granted by authorized reviewers only. Signup never grants HR or admin permissions.</p></div></section>
            </div>
          )}
          {isHr && <div className="dashboard-grid hr-data-grid"><section className="section-block"><div className="section-heading"><div><p className="eyebrow">STAFF DIRECTORY</p><h2>Active personnel</h2></div><span className="count-pill">{personnel.length} active</span></div>{personnel.length === 0 ? <div className="empty-card compact-empty"><p>No active personnel yet.</p></div> : <div className="personnel-list">{personnel.map((member) => <div className="personnel-row" key={member.uid}><span className="avatar">{member.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{member.displayName}</strong><small>{member.jobTitle ?? "Staff"} · {member.department ?? "Unassigned"}</small><small>Discord ID: {member.discordId}</small></div><span className="status-pill status-active"><span />Active</span></div>)}</div>}</section><section className="section-block"><div className="section-heading"><div><p className="eyebrow">ATTENDANCE</p><h2>Recent shifts</h2></div><span className="count-pill">Last 25</span></div>{recentShifts.length === 0 ? <div className="empty-card compact-empty"><p>No shift records yet.</p></div> : <div className="shift-list">{recentShifts.map((shift) => <div className="shift-row" key={shift.id}><span className={`shift-dot ${shift.status === "on-duty" ? "shift-dot-active" : ""}`} /><div><strong>{shift.employeeName} · {shift.department}</strong><small>{shift.status === "on-duty" ? "On duty" : `Ended ${formatDate(shift.endedAt)}`}</small><small>Started {formatDate(shift.startedAt)}</small>{shift.endNote && <p>{shift.endNote}</p>}</div></div>)}</div>}</section></div>}
          {isHr && <section className="section-block hr-note"><div className="section-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Personnel access</h2></div><span className="verified-pill"><ShieldCheck size={14} /> HR restricted</span></div><p>Approving an application activates the applicant’s personnel profile. HR access is controlled by Firebase custom claims and cannot be requested through public signup.</p></section>}
          <footer className="workspace-footer"><span><ShieldCheck size={14} /> Secure personnel workspace</span><span>For authorized applicants and staff</span></footer>
        </div>
      </section>
    </main>
  );
}
