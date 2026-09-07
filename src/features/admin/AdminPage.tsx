import { BarChart3, BellRing, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, GraduationCap, MessageCircle, Plus, ShieldCheck, Users, UserX, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import { AppShell, SearchInput } from '../../components/layout/AppShell'
import { Card, EmptyState, Modal, SectionHeading, StatusPill } from '../../components/common/UI'
import { ProfileView } from '../profile/ProfileView'
import { TimetableView } from '../timetable/TimetableView'
import { ChatView } from '../chat/ChatView'
import { SettingsView } from '../settings/SettingsView'


function Metric({ icon: Icon, label, value, detail, tone = 'blue' }: {
  icon: LucideIcon; label: string; value: string; detail: string; tone?: string
}) {
  return (
    <Card className="metric-card">
      <div className={`metric-card__icon metric-card__icon--${tone}`}><Icon size={20} /></div>
      <div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>
    </Card>
  )
}

function AdminDashboard() {
  const { currentUser, data, teacherLeaves } = useApp()
  const pending = data.verifications.filter((item) => item.status === 'Pending').length
  const students = data.users.filter((u) => u.role === 'student')
  const teachers = data.users.filter((u) => u.role === 'teacher')
  const cancelledToday = data.timetable.filter((e) => e.status === 'Cancelled').length

  const todayStr = new Date().toISOString().split('T')[0]
  const college = currentUser?.college || 'Bonsalo College'
  const activeLeaves = (teacherLeaves || []).filter(
    (l) =>
      (!l.collegeId || l.collegeId === college) &&
      !l.actualReturnDate &&
      todayStr >= l.startDate &&
      todayStr <= l.endDate &&
      (l.status === 'ACTIVE' || l.status === 'UPCOMING')
  )

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">COLLEGE CONTROL CENTRE</span>
          <h2>Welcome back, {currentUser?.name?.split(' ')[0] ?? 'Admin'}.</h2>
          <p>Here is an overview of {currentUser?.college ?? 'your college'} today.</p>
        </div>
        <Link to="/admin/announcements" className="button button--primary">
          <Plus size={18} /> New announcement
        </Link>
      </section>

      <div className="metric-grid">
        <Metric
          icon={Users}
          label="Students"
          value={students.length > 0 ? `${students.length}` : '—'}
          detail="Enrolled this session"
        />
        <Metric
          icon={GraduationCap}
          label="Faculty members"
          value={teachers.length > 0 ? `${teachers.length}` : '—'}
          detail={`${pending} pending verification`}
          tone="purple"
        />
        <Metric
          icon={UserX}
          label="Faculty on leave"
          value={`${activeLeaves.length}`}
          detail={activeLeaves.length > 0 ? `${activeLeaves.length} faculty absent today` : 'All faculty active'}
          tone={activeLeaves.length > 0 ? 'orange' : 'green'}
        />
        <Metric
          icon={CalendarDays}
          label="Classes in timetable"
          value={`${data.timetable.length}`}
          detail={cancelledToday > 0 ? `${cancelledToday} cancelled today` : 'All running'}
          tone="blue"
        />
        <Metric
          icon={ShieldCheck}
          label="Verification queue"
          value={`${pending}`}
          detail={pending > 0 ? 'Needs your review' : 'All reviewed'}
          tone="green"
        />
      </div>

      <div className="dashboard-grid dashboard-grid--primary">
        <Card>
          <SectionHeading
            title="Verification requests"
            detail="Newest faculty onboarding requests"
            action={<Link to="/admin/verification" className="text-action">Review queue <ChevronRight size={16} /></Link>}
          />
          {data.verifications.length === 0
            ? <EmptyState title="No pending requests" detail="All teacher verifications are up to date." />
            : data.verifications.slice(0, 3).map((request) => (
              <div className="compact-row" key={request.id}>
                <span className="avatar avatar--small">
                  {request.name.split(' ').map((n) => n[0]).join('')}
                </span>
                <div>
                  <strong>{request.name}</strong>
                  <p>{request.department} · {request.appliedDate}</p>
                </div>
                <StatusPill tone={request.status === 'Pending' ? 'warning' : request.status === 'Approved' ? 'success' : 'danger'}>
                  {request.status}
                </StatusPill>
              </div>
            ))}
        </Card>
        <Card className="quick-card">
          <span className="card-label">ADMIN ACTIONS</span>
          <div className="quick-actions">
            <Link to="/admin/students"><Users size={18} /> Browse students</Link>
            <Link to="/admin/teachers"><GraduationCap size={18} /> Manage faculty</Link>
            <Link to="/admin/communication"><MessageCircle size={18} /> Messages & Groups</Link>
            <Link to="/admin/timetable?tab=leaves"><UserX size={18} /> Faculty Leaves & Return</Link>
            <Link to="/admin/timetable"><CalendarDays size={18} /> View timetable</Link>
            <Link to="/admin/statistics"><BarChart3 size={18} /> Open statistics</Link>
          </div>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <SectionHeading
            title="Latest announcements"
            action={<Link to="/admin/announcements" className="text-action">All announcements <ChevronRight size={16} /></Link>}
          />
          {data.announcements.length === 0
            ? <EmptyState title="No announcements" detail="Post the first college-wide update." />
            : (
              <div className="compact-list">
                {data.announcements.slice(0, 3).map((item) => (
                  <div className="compact-row" key={item.id}>
                    <span className="category-dot category-dot--general" />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.postedBy} · {item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>
        <Card>
          <SectionHeading title="Campus activity" />
          <div className="health-list">
            <div><span>Assignments pending</span><strong>{data.assignments.filter((a) => a.status === 'Pending').length}</strong></div>
            <div><span>Assignments submitted</span><strong>{data.assignments.filter((a) => a.status === 'Submitted').length}</strong></div>
            <div><span>Unanswered doubts</span><strong>{data.doubts.filter((d) => d.status === 'Pending').length}</strong></div>
            <div><span>Announcements posted</span><strong>{data.announcements.length}</strong></div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Students() {
  const { data } = useApp()
  const [query, setQuery] = useState('')
  const students = data.users.filter((u) => u.role === 'student')
  const rows = students.filter((student) =>
    `${student.name} ${student.identifier}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Student overview</h2>
          <p>Browse enrolled learners across the college.</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search student or roll number" />
      </section>
      <Card>
        <div className="responsive-table people-table">
          <div className="table-head">
            <span>Student</span><span>Roll number</span><span>College</span><span>Email</span>
          </div>
          {rows.length === 0
            ? <EmptyState title="No students found" detail="Students will appear here once enrolled." />
            : rows.map((student) => (
              <div className="table-row" key={student.id}>
                <strong data-label="Student">
                  <span className="avatar avatar--small">
                    {student.name.split(' ').map((part) => part[0]).join('')}
                  </span>
                  {student.name}
                </strong>
                <span data-label="Roll number">{student.identifier ?? '—'}</span>
                <span data-label="College">{student.college ?? '—'}</span>
                <span data-label="Email">{student.email ?? '—'}</span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}

function Teachers() {
  const { data } = useApp()
  const [query, setQuery] = useState('')
  // Combine real teacher users with approved verifications (for newly approved teachers not yet in users list)
  const teacherUsers = data.users.filter((u) => u.role === 'teacher')
  const approvedVerifications = data.verifications.filter((item) => item.status === 'Approved')

  const rows = [
    ...teacherUsers.map((t) => ({ name: t.name, id: t.identifier ?? t.id, department: '—', status: 'Verified' })),
    ...approvedVerifications
      .filter((v) => !teacherUsers.some((t) => t.identifier === v.employeeId))
      .map((item) => ({ name: item.name, id: item.employeeId, department: item.department, status: 'Verified' })),
  ].filter((teacher) => `${teacher.name} ${teacher.id}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Teacher overview</h2>
          <p>Faculty directory and verification status.</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search teacher or employee ID" />
      </section>
      <Card>
        <div className="responsive-table people-table">
          <div className="table-head">
            <span>Teacher</span><span>Employee ID</span><span>Department</span><span>Status</span>
          </div>
          {rows.length === 0
            ? <EmptyState title="No teachers found" detail="Verified teachers will appear here." />
            : rows.map((teacher) => (
              <div className="table-row" key={teacher.id}>
                <strong data-label="Teacher">
                  <span className="avatar avatar--small">
                    {teacher.name.split(' ').map((part) => part[0]).join('')}
                  </span>
                  {teacher.name}
                </strong>
                <span data-label="Employee ID">{teacher.id}</span>
                <span data-label="Department">{teacher.department}</span>
                <span data-label="Status"><StatusPill tone="success">{teacher.status}</StatusPill></span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}

function Verification() {
  const { data, updateVerification } = useApp()
  const [choice, setChoice] = useState<{ id: string; status: 'Approved' | 'Rejected' } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const target = data.verifications.find((item) => item.id === choice?.id)

  const handleDecision = async () => {
    if (!target || !choice) return
    setSubmitting(true)
    try {
      updateVerification(target.id, choice.status)
      setChoice(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="intro">
        <h2>Teacher verification</h2>
        <p>Approve or reject staff requests before enabling a faculty workspace.</p>
      </section>
      {data.verifications.length === 0
        ? <EmptyState title="No verification requests" detail="New teacher applications will appear here." />
        : (
          <Card>
            <div className="responsive-table people-table">
              <div className="table-head">
                <span>Applicant</span><span>Employee ID</span><span>Department</span><span>Applied</span><span>Decision</span>
              </div>
              {data.verifications.map((request) => (
                <div className="table-row" key={request.id}>
                  <strong data-label="Applicant">{request.name}</strong>
                  <span data-label="Employee ID">{request.employeeId}</span>
                  <span data-label="Department">{request.department}</span>
                  <span data-label="Applied">{request.appliedDate}</span>
                  <span data-label="Decision">
                    {request.status === 'Pending'
                      ? (
                        <span className="action-pair">
                          <button
                            className="button button--small button--primary"
                            onClick={() => setChoice({ id: request.id, status: 'Approved' })}
                          >
                            Approve
                          </button>
                          <button
                            className="button button--small button--danger"
                            onClick={() => setChoice({ id: request.id, status: 'Rejected' })}
                          >
                            Reject
                          </button>
                        </span>
                      )
                      : (
                        <StatusPill tone={request.status === 'Approved' ? 'success' : 'danger'}>
                          {request.status}
                        </StatusPill>
                      )}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      <Modal open={Boolean(target && choice)} title={`${choice?.status} teacher`} onClose={() => setChoice(null)}>
        {target && choice && (
          <>
            <p className="modal-copy">
              {choice.status === 'Approved'
                ? `Approve ${target.name} as a verified teacher? They will gain access to the teacher workspace.`
                : `Reject ${target.name}'s verification request? They will not gain teacher access.`}
            </p>
            <div className="modal-actions">
              <button className="button button--ghost" onClick={() => setChoice(null)} disabled={submitting}>Cancel</button>
              <button
                className={choice.status === 'Approved' ? 'button button--primary' : 'button button--danger'}
                onClick={handleDecision}
                disabled={submitting}
              >
                {submitting ? 'Updating…' : choice.status}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function Timetable() {
  return (
    <div className="page-stack">
      <TimetableView mode="admin" />
    </div>
  )
}

function Academic() {
  return (
    <div className="page-stack">
      <TimetableView mode="admin" defaultTab="academic" />
    </div>
  )
}

function Announcements() {
  const { currentUser, data, createAnnouncement } = useApp()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'Academic' | 'Event' | 'Urgent' | 'General'>('General')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (!description.trim()) { setError('Message is required.'); return }
    setSubmitting(true)
    try {
      createAnnouncement({ title: title.trim(), description: description.trim(), category, postedBy: currentUser?.name ?? 'Admin' })
      setTitle('')
      setDescription('')
      setError('')
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>College announcements</h2>
          <p>Publish official information to your campus community.</p>
        </div>
        <button className="button button--primary" onClick={() => setOpen(true)}>
          <Plus size={17} /> New announcement
        </button>
      </section>
      {data.announcements.length === 0
        ? <EmptyState title="No announcements" detail="Post the first college-wide update." />
        : (
          <div className="notice-list">
            {data.announcements.map((item) => (
              <Card className="notice-card" key={item.id}>
                <div className="notice-card__top">
                  <StatusPill tone={item.category === 'Urgent' ? 'danger' : 'info'}>{item.category}</StatusPill>
                  <span>{item.date}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="notice-card__bottom"><span>Posted by {item.postedBy}</span></div>
              </Card>
            ))}
          </div>
        )}
      <Modal open={open} title="New college announcement" onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              <option>General</option><option>Academic</option><option>Event</option><option>Urgent</option>
            </select>
          </label>
          <label className="field">
            <span>Message</span>
            <textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button--primary" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish announcement'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function Statistics() {
  const { data } = useApp()
  const totalAssignments = data.assignments.length
  const submitted = data.assignments.filter((a) => a.status === 'Submitted' || a.status === 'Graded').length
  const submissionRate = totalAssignments > 0 ? Math.round((submitted / totalAssignments) * 100) : 0
  const answeredDoubts = data.doubts.filter((d) => d.status === 'Answered').length
  const totalDoubts = data.doubts.length
  const doubtRate = totalDoubts > 0 ? Math.round((answeredDoubts / totalDoubts) * 100) : 0

  return (
    <div className="page-stack">
      <section className="intro">
        <h2>College statistics</h2>
        <p>Key academic metrics based on current session data.</p>
      </section>
      <div className="metric-grid">
        <Metric icon={Users} label="Students" value={`${data.users.filter((u) => u.role === 'student').length}`} detail="Enrolled this session" />
        <Metric icon={CheckCircle2} label="Submissions" value={`${submissionRate}%`} detail="Assignment submission rate" tone="green" />
        <Metric icon={BellRing} label="Announcements" value={`${data.announcements.length}`} detail="Posted this session" tone="purple" />
        <Metric icon={ClipboardCheck} label="Doubts answered" value={`${doubtRate}%`} detail={`${answeredDoubts} of ${totalDoubts} questions`} tone="orange" />
      </div>
      <Card>
        <SectionHeading title="Assignment activity" detail="Breakdown by status" />
        <div className="bar-chart">
          {[
            { label: 'Pending', value: data.assignments.filter((a) => a.status === 'Pending').length },
            { label: 'Submitted', value: data.assignments.filter((a) => a.status === 'Submitted').length },
            { label: 'Graded', value: data.assignments.filter((a) => a.status === 'Graded').length },
            { label: 'Late', value: data.assignments.filter((a) => a.status === 'Late').length },
          ].map((bar) => {
            const pct = totalAssignments > 0 ? Math.round((bar.value / totalAssignments) * 100) : 0
            return (
              <div className="bar-chart__row" key={bar.label}>
                <span>{bar.label}</span>
                <div><i style={{ width: `${pct}%` }} /></div>
                <strong>{bar.value}</strong>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function Profile() {
  return <ProfileView />
}

export function AdminPage() {
  return (
    <AppShell role="admin">
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="verification" element={<Verification />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="academic" element={<Academic />} />
        <Route path="academics" element={<Navigate to="/admin/academic" replace />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="communication" element={<ChatView />} />
        <Route path="communication/:conversationId" element={<ChatView />} />
        <Route path="messages/*" element={<Navigate to="/admin/communication" replace />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="preferences" element={<Navigate to="/admin/settings" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

