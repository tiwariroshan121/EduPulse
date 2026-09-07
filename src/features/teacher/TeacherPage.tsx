import { BookOpen, CalendarDays, ChevronRight, ClipboardCheck, Download, FileText, HelpCircle, Plus, Send, Upload, Users, UserCheck, UserX, type LucideIcon } from 'lucide-react'
import { useState, useMemo, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import { AppShell, ClassStatus, SearchInput } from '../../components/layout/AppShell'
import { Card, EmptyState, Modal, SectionHeading, StatusPill } from '../../components/common/UI'
import { ChatView } from '../chat/ChatView'
import { ProfileView } from '../profile/ProfileView'
import { TimetableView } from '../timetable/TimetableView'
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

function getTodayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function TeacherDashboard() {
  const { currentUser, data, resolveTodaySchedule, getTeacherAvailability, teacherLeaves } = useApp()
  const todayResolved = resolveTodaySchedule(currentUser)
  const isHoliday = todayResolved.isHoliday
  const holidayName = todayResolved.holidayName
  const sessions = todayResolved.entries
  const allSessions = data.timetable.filter((item) => item.teacher === currentUser?.name || (item as any).teacherId === currentUser?.id)
  const openDoubts = data.doubts.filter((item) => item.status === 'Pending')
  const cancelledToday = sessions.filter((s) => s.status === 'Cancelled').length

  const todayStr = new Date().toISOString().split('T')[0]
  const myAvailability = currentUser ? getTeacherAvailability(currentUser.id, todayStr) : { onLeave: false, statusLabel: 'Available' }
  const myActiveLeave = (teacherLeaves || []).find(
    (l) =>
      l.teacherId === currentUser?.id &&
      !l.actualReturnDate &&
      todayStr >= l.startDate &&
      todayStr <= l.endDate &&
      (l.status === 'ACTIVE' || l.status === 'UPCOMING')
  )

  // Count unique students from timetable data (approximation until real DB)
  const classNames = [...new Set(allSessions.map((s) => s.className || `${(s as any).course || ''} S${(s as any).semester || ''}`).filter(Boolean))]

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <span className="eyebrow">TEACHER WORKSPACE</span>
          <h2>Good morning, {currentUser?.name?.split(' ')[0] ?? 'there'}.</h2>
          <p>Here is your teaching overview for today.</p>
        </div>
        <Link className="button button--primary" to="/teacher/assignments">
          <Plus size={18} /> Create assignment
        </Link>
      </section>

      {/* Faculty Availability & Leave Status (Feature #21) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px',
          borderRadius: 12,
          background: myAvailability.onLeave
            ? 'rgba(245, 158, 11, 0.12)'
            : 'rgba(34, 197, 94, 0.08)',
          border: `1px solid ${
            myAvailability.onLeave
              ? 'rgba(245, 158, 11, 0.35)'
              : 'rgba(34, 197, 94, 0.25)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: myAvailability.onLeave
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(34, 197, 94, 0.2)',
              color: myAvailability.onLeave ? '#f59e0b' : '#22c55e',
            }}
          >
            {myAvailability.onLeave ? <UserX size={20} /> : <UserCheck size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {myAvailability.onLeave ? 'Status: On Approved Leave' : 'Status: Available & Active'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {myAvailability.onLeave && myActiveLeave
                ? `${myActiveLeave.reason} · Leave Period: ${myActiveLeave.startDate} to ${myActiveLeave.endDate}`
                : 'All recurring lecture commitments are active and scheduled as usual.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to="/teacher/timetable?tab=leaves"
            className="button button--secondary"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            {myAvailability.onLeave ? 'View Leave Details' : 'Record Leave / Availability'}
          </Link>
        </div>
      </div>

      <div className="metric-grid">
        <Metric
          icon={CalendarDays}
          label="Today's classes"
          value={isHoliday ? 'Holiday' : `${sessions.length}`}
          detail={isHoliday ? (holidayName || 'Official Holiday') : (cancelledToday > 0 ? `${cancelledToday} cancelled` : 'All scheduled')}
        />
        <Metric
          icon={Users}
          label="Classes"
          value={`${classNames.length}`}
          detail={classNames[0] ?? 'No classes assigned'}
          tone="purple"
        />
        <Metric
          icon={ClipboardCheck}
          label="Submitted work"
          value={`${data.assignments.filter((a) => a.status === 'Submitted').length}`}
          detail="Awaiting review"
          tone="orange"
        />
        <Metric
          icon={HelpCircle}
          label="Open doubts"
          value={`${openDoubts.length}`}
          detail="Teacher response needed"
          tone="green"
        />
      </div>

      <div className="dashboard-grid dashboard-grid--primary">
        <Card>
          <SectionHeading
            title="Today's teaching schedule"
            detail={isHoliday ? `Campus Holiday — ${holidayName || 'Holiday'}` : getTodayLabel()}
            action={<Link to="/teacher/timetable" className="text-action">Manage <ChevronRight size={16} /></Link>}
          />
          <div className="schedule-list">
            {isHoliday ? (
              <EmptyState title={`Campus Holiday: ${holidayName || 'Official Holiday'}`} detail="All lecture sessions are suspended today." />
            ) : sessions.length === 0
              ? <EmptyState title="No classes today" detail="Your schedule is clear for today." />
              : sessions.map((entry) => (
                <div className="schedule-row" key={entry.id}>
                  <div className="schedule-row__time">{entry.time || `${entry.startTime} – ${entry.endTime}`}</div>
                  <div>
                    <strong>{entry.subjectName || entry.subject}</strong>
                    <p>{entry.className || `${entry.course} Sem ${entry.semester} Div ${entry.division}`} · Room {entry.room}</p>
                    {entry.substituteTeacherName && <small style={{ color: 'var(--primary)' }}>Substitute: {entry.substituteTeacherName} </small>}
                    {entry.reason && <small style={{ color: 'var(--text-muted)' }}>({entry.reason})</small>}
                  </div>
                  <ClassStatus cancelled={entry.status === 'Cancelled'} />
                </div>
              ))}
          </div>
        </Card>
        <Card className="quick-card">
          <span className="card-label">QUICK ACTIONS</span>
          <div className="quick-actions">
            <Link to="/teacher/materials"><Upload size={18} /> Upload material</Link>
            <Link to="/teacher/students"><Users size={18} /> View students</Link>
            <Link to="/teacher/announcements"><Send size={18} /> Send announcement</Link>
            <Link to="/teacher/doubts"><HelpCircle size={18} /> Answer doubts</Link>
            <Link to="/teacher/timetable?tab=leaves"><CalendarDays size={18} /> Faculty Leaves & Return</Link>
          </div>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <SectionHeading
            title="Needs your attention"
            action={<Link to="/teacher/doubts" className="text-action">All doubts <ChevronRight size={16} /></Link>}
          />
          {openDoubts.length
            ? (
              <div className="compact-list">
                {openDoubts.map((doubt) => (
                  <div className="compact-row" key={doubt.id}>
                    <span className="avatar avatar--small">
                      {doubt.studentName.split(' ').map((part) => part[0]).join('')}
                    </span>
                    <div>
                      <strong>{doubt.question}</strong>
                      <p>{doubt.studentName} · {doubt.subject}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
            : <EmptyState title="No unanswered doubts" detail="Your student questions are all up to date." />}
        </Card>
        <Card>
          <SectionHeading
            title="Recent announcements"
            action={<Link to="/teacher/announcements" className="text-action">Open <ChevronRight size={16} /></Link>}
          />
          {data.announcements.length === 0
            ? <EmptyState title="No announcements" detail="Post an update to your class." />
            : (
              <div className="compact-list">
                {data.announcements.slice(0, 3).map((announcement) => (
                  <div className="compact-row" key={announcement.id}>
                    <span className="category-dot category-dot--general" />
                    <div>
                      <strong>{announcement.title}</strong>
                      <p>{announcement.postedBy} · {announcement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>
    </div>
  )
}

function Classes() {
  const { currentUser, data } = useApp()
  const [open, setOpen] = useState(false)
  const sessions = data.timetable.filter((item) => item.teacher === currentUser?.name)
  const classNames = [...new Set(sessions.map((s) => s.className))]

  return (
    <div className="page-stack">
      <section className="intro">
        <h2>My classes</h2>
        <p>Open a class to see its members, schedule, coursework, materials, and announcements.</p>
      </section>
      {classNames.length === 0
        ? <EmptyState title="No classes assigned" detail="Contact your administrator to assign you to a class." />
        : classNames.map((className) => (
          <Card className="class-card" key={className}>
            <div className="class-card__header">
              <div>
                <span className="eyebrow">ACTIVE CLASS</span>
                <h2>{className}</h2>
                <p>
                  {sessions.filter((s) => s.className === className).map((s) => s.subject).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
                </p>
              </div>
              <button className="button button--ghost" onClick={() => setOpen((v) => !v)}>
                {open ? 'Close class' : 'Open class'} <ChevronRight size={17} />
              </button>
            </div>
            {open && (
              <div className="class-details">
                <div>
                  <Users size={20} />
                  <strong>Students</strong>
                  <span>View current class roster</span>
                  <Link to="/teacher/students">Open students</Link>
                </div>
                <div>
                  <CalendarDays size={20} />
                  <strong>Weekly timetable</strong>
                  <span>Scheduled sessions and rooms</span>
                  <Link to="/teacher/timetable">Open timetable</Link>
                </div>
                <div>
                  <ClipboardCheck size={20} />
                  <strong>Assignments</strong>
                  <span>Create and review coursework</span>
                  <Link to="/teacher/assignments">Open assignments</Link>
                </div>
                <div>
                  <BookOpen size={20} />
                  <strong>Materials</strong>
                  <span>Resources shared with students</span>
                  <Link to="/teacher/materials">Open materials</Link>
                </div>
              </div>
            )}
          </Card>
        ))}
    </div>
  )
}

function Students() {
  const { data } = useApp()
  const [query, setQuery] = useState('')

  // Use actual users from data with role 'student'
  const students = data.users.filter((u) => u.role === 'student')
  const result = students.filter((student) =>
    `${student.name} ${student.identifier}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Students</h2>
          <p>Students enrolled in your assigned classes.</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or roll number" />
      </section>
      <Card>
        <div className="responsive-table people-table">
          <div className="table-head">
            <span>Student</span><span>Roll number</span><span>Class</span><span>Status</span>
          </div>
          {result.length === 0
            ? <EmptyState title="No students found" detail="No students are enrolled in your class yet." />
            : result.map((student) => (
              <div className="table-row" key={student.id}>
                <strong data-label="Student">
                  <span className="avatar avatar--small">
                    {student.name.split(' ').map((part) => part[0]).join('')}
                  </span>
                  {student.name}
                </strong>
                <span data-label="Roll number">{student.identifier ?? '—'}</span>
                <span data-label="Class">{student.college ?? '—'}</span>
                <span data-label="Status"><StatusPill tone="success">Active</StatusPill></span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}

function TeacherTimetable() {
  return (
    <div className="page-stack">
      <TimetableView mode="teacher" />
    </div>
  )
}

function Materials() {
  const { currentUser, data, createMaterial, isFirebaseMode, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Get subjects from this teacher's timetable
  const mySubjects = [...new Set(
    data.timetable.filter((e) => e.teacher === currentUser?.name).map((e) => e.subject),
  )]
  const myClasses = [...new Set(
    data.timetable.filter((e) => e.teacher === currentUser?.name).map((e) => e.className),
  )]

  const resetForm = () => { setTitle(''); setDescription(''); setSubject(''); setFile(null); setError('') }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { setError('Add a material title.'); return }
    if (!subject) { setError('Select a subject.'); return }
    if (!description.trim()) { setError('Add a short description.'); return }
    if (!file) { setError('Select a file to upload.'); return }

    setUploading(true)
    try {
      let fileName = file.name
      let fileType = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'

      if (isFirebaseMode) {
        const { uploadFile, generateMaterialPath, validateFile } = await import('../../services/firebase/storage')
        const validation = validateFile(file, { maxSizeMB: 20 })
        if (!validation.valid) {
          setError(validation.error ?? 'Invalid file.')
          setUploading(false)
          return
        }
        const materialId = `mat-${Date.now()}`
        const collegeId = currentUser?.college ?? 'college-1'
        const path = generateMaterialPath(collegeId, materialId, file.name)
        const result = await uploadFile(path, file)
        fileName = result.downloadURL   // store the real download URL
        fileType = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
      }

      createMaterial({
        title: title.trim(),
        description: description.trim(),
        fileName,
        fileType,
        subject: subject || mySubjects[0] || 'General',
        className: myClasses[0] || 'General',
        teacher: currentUser?.name ?? 'Teacher',
      })
      resetForm()
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const handleView = (material: typeof data.materials[0]) => {
    if (material.fileName?.startsWith('http')) {
      window.open(material.fileName, '_blank', 'noopener,noreferrer')
    } else {
      notify('This material has no downloadable file.', 'info')
    }
  }

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Materials</h2>
          <p>Resources shared with your classes.</p>
        </div>
        <button className="button button--primary" onClick={() => setOpen(true)}>
          <Upload size={17} /> Upload material
        </button>
      </section>
      {data.materials.length === 0
        ? <EmptyState title="No materials yet" detail="Upload the first resource for your class." />
        : (
          <div className="material-grid">
            {data.materials.map((material) => (
              <Card className="material-card" key={material.id}>
                <div className="material-card__top">
                  <span className="file-badge file-badge--large">{material.fileType}</span>
                  <span>{material.date}</span>
                </div>
                <h3>{material.title}</h3>
                <p>{material.description}</p>
                <div className="material-meta">
                  <span>{material.subject}</span>
                  <span>{material.fileName?.startsWith('http') ? 'File attached' : 'No file'}</span>
                </div>
                <button
                  className="button button--ghost button--full"
                  onClick={() => handleView(material)}
                  disabled={!material.fileName?.startsWith('http')}
                >
                  View / download
                </button>
              </Card>
            ))}
          </div>
        )}

      <Modal open={open} title="Upload material" onClose={() => { resetForm(); setOpen(false) }}>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Material title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Graph traversal notes"
            />
          </label>
          <label className="field">
            <span>Subject</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="">Select subject</option>
              {mySubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
          <label className="file-picker">
            <Upload size={22} />
            <span>{file?.name ?? 'Select PDF, DOCX, PPTX or image'}</span>
            <small>{file ? `${Math.ceil(file.size / 1024)} KB` : 'Max 20 MB'}</small>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button--primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload material'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function Assignments() {
  const { currentUser, data, createAssignment } = useApp()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({ title: '', description: '', subject: '', className: '', dueDate: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const mySubjects = [...new Set(
    data.timetable.filter((e) => e.teacher === currentUser?.name).map((e) => e.subject),
  )]
  const myClasses = [...new Set(
    data.timetable.filter((e) => e.teacher === currentUser?.name).map((e) => e.className),
  )]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!values.title.trim()) { setError('Add an assignment title.'); return }
    if (!values.description.trim()) { setError('Add an assignment description.'); return }
    if (!values.subject) { setError('Select a subject.'); return }
    if (!values.className) { setError('Select a class.'); return }
    if (!values.dueDate) { setError('Set a due date.'); return }
    if (new Date(values.dueDate) <= new Date()) { setError('Choose a future due date.'); return }
    setError('')
    setSubmitting(true)
    try {
      createAssignment({
        ...values,
        teacher: currentUser?.name ?? 'Teacher',
        dueDate: new Date(values.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      })
      setValues({ title: '', description: '', subject: '', className: '', dueDate: '' })
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Assignments</h2>
          <p>Create coursework and keep the class brief in one place.</p>
        </div>
        <button className="button button--primary" onClick={() => setOpen(true)}>
          <Plus size={17} /> Create assignment
        </button>
      </section>
      {data.assignments.length === 0
        ? <EmptyState title="No assignments yet" detail="Create the first assignment for your class." />
        : (
          <div className="assignment-list">
            {data.assignments.map((assignment) => (
              <Card className="assignment-card" key={assignment.id}>
                <div>
                  <StatusPill tone={assignment.status === 'Graded' ? 'success' : assignment.status === 'Submitted' ? 'info' : 'warning'}>
                    {assignment.status}
                  </StatusPill>
                  <h3>{assignment.title}</h3>
                  <p>{assignment.description}</p>
                  <div className="metadata">
                    <span>{assignment.subject}</span>
                    <span>{assignment.className}</span>
                    <span>Due {assignment.dueDate}</span>
                  </div>
                </div>
                <Link to="/teacher/submissions" className="button button--ghost">
                  Submissions <ChevronRight size={17} />
                </Link>
              </Card>
            ))}
          </div>
        )}
      <Modal open={open} title="Create assignment" onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows={4} value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
          </label>
          <label className="field">
            <span>Subject</span>
            <select value={values.subject} onChange={(event) => setValues({ ...values, subject: event.target.value })}>
              <option value="">Select subject</option>
              {mySubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Class</span>
            <select value={values.className} onChange={(event) => setValues({ ...values, className: event.target.value })}>
              <option value="">Select class</option>
              {myClasses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={values.dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(event) => setValues({ ...values, dueDate: event.target.value })}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button--primary" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish assignment'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function Submissions() {
  const { data, gradeAssignment } = useApp()
  const [selectedSubmission, setSelectedSubmission] = useState<typeof data.assignments[0] | null>(null)
  const [marks, setMarks] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Show assignments that have been submitted or graded
  const submissions = data.assignments.filter((item) => item.status === 'Submitted' || item.status === 'Graded')

  const handleOpenGrade = (assignment: typeof data.assignments[0]) => {
    setSelectedSubmission(assignment)
    setMarks(assignment.marks ?? '')
    setFeedback(assignment.feedback ?? '')
    setError('')
  }

  const handleSaveGrade = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedSubmission) return
    if (!marks.trim()) {
      setError('Please provide marks or grade.')
      return
    }
    setSubmitting(true)
    try {
      gradeAssignment(selectedSubmission.id, marks.trim(), feedback.trim())
      setSelectedSubmission(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="intro">
        <h2>Submissions</h2>
        <p>Review student submissions, evaluate work, and record feedback.</p>
      </section>
      <Card>
        {submissions.length === 0
          ? <EmptyState title="No submissions yet" detail="Student submissions will appear here when they submit their work." />
          : (
            <div className="responsive-table people-table">
              <div className="table-head">
                <span>Assignment</span><span>Student</span><span>File</span><span>Status</span><span>Action</span>
              </div>
              {submissions.map((assignment) => (
                <div className="table-row" key={assignment.id}>
                  <strong data-label="Assignment">
                    {assignment.title}
                    <small>{assignment.subject}</small>
                  </strong>
                  <span data-label="Student">
                    {data.users.find((u) => u.role === 'student')?.name ?? 'Student'}
                  </span>
                  <span data-label="File">
                    {assignment.submissionFileName
                      ? (
                        assignment.submissionFileName.startsWith('http')
                          ? (
                            <a
                              href={assignment.submissionFileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-button"
                            >
                              Open file
                            </a>
                          )
                          : assignment.submissionFileName
                      )
                      : <span style={{ color: 'var(--text-muted)' }}>No file</span>}
                  </span>
                  <span data-label="Status">
                    <StatusPill tone={assignment.status === 'Graded' ? 'success' : 'info'}>
                      {assignment.status}
                    </StatusPill>
                  </span>
                  <span data-label="Action">
                    {assignment.status === 'Graded'
                      ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{assignment.marks}</span>
                          <button className="link-button" style={{ fontSize: '11px' }} onClick={() => handleOpenGrade(assignment)}>
                            Edit
                          </button>
                        </div>
                      )
                      : (
                        <button className="button button--small button--primary" onClick={() => handleOpenGrade(assignment)}>
                          Grade
                        </button>
                      )}
                  </span>
                </div>
              ))}
            </div>
          )}
      </Card>

      <Modal open={Boolean(selectedSubmission)} title="Grade submission" onClose={() => setSelectedSubmission(null)}>
        {selectedSubmission && (
          <form className="form-stack" onSubmit={handleSaveGrade}>
            <p className="modal-copy">
              Evaluating submission for <strong>{selectedSubmission.title}</strong> ({selectedSubmission.subject}).
            </p>
            {selectedSubmission.submissionFileName && (
              <div className="compact-row" style={{ background: 'var(--surface-muted)', padding: '10px 14px', borderRadius: '8px' }}>
                <span className="file-badge">FILE</span>
                <div>
                  <strong>{selectedSubmission.submissionFileName}</strong>
                  {selectedSubmission.submissionFileName.startsWith('http') && (
                    <a href={selectedSubmission.submissionFileName} target="_blank" rel="noopener noreferrer" className="link-button" style={{ fontSize: '12px', marginTop: '4px' }}>
                      Open attached work ↗
                    </a>
                  )}
                </div>
              </div>
            )}
            <label className="field">
              <span>Marks / Grade</span>
              <input
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                placeholder="e.g. 18 / 20 or A"
                required
              />
            </label>
            <label className="field">
              <span>Teacher feedback (optional)</span>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add comments on strengths, areas to improve..."
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="button button--ghost" onClick={() => setSelectedSubmission(null)}>
                Cancel
              </button>
              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save grade'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function Doubts() {
  const { currentUser, data, answerDoubt, timetableEntries } = useApp()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterScope, setFilterScope] = useState<'my' | 'all'>('my')

  // Identify subjects taught by this teacher from the academic timetable
  const teacherSubjects = useMemo(() => {
    const subs = new Set<string>()
    timetableEntries.forEach((e) => {
      if (
        e.teacherId === currentUser?.id ||
        (currentUser?.name && (e.teacherName === currentUser.name || (e as any).teacher === currentUser.name))
      ) {
        const sub = e.subjectName || e.subject
        if (sub) subs.add(sub.toLowerCase())
      }
    })
    return Array.from(subs)
  }, [timetableEntries, currentUser])

  // Filter doubts according to teacher's scope
  const filteredDoubts = useMemo(() => {
    if (filterScope === 'all') return data.doubts
    return data.doubts.filter((d) => {
      if (d.teacherId && currentUser?.id && d.teacherId === currentUser.id) return true
      if (d.teacherName && currentUser?.name && d.teacherName.toLowerCase() === currentUser.name.toLowerCase()) return true
      if (d.subject && teacherSubjects.includes(d.subject.toLowerCase())) return true
      return false
    })
  }, [data.doubts, filterScope, currentUser, teacherSubjects])

  const active = data.doubts.find((item) => item.id === activeId)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!active) return
    if (!answer.trim() || answer.trim().length < 5) { setError('Write a proper answer (at least 5 characters).'); return }
    setSubmitting(true)
    try {
      answerDoubt(active.id, answer.trim())
      setAnswer('')
      setError('')
      setActiveId(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="intro">
        <h2>Student doubts</h2>
        <p>Doubts routed specifically to your assigned classes and academic subjects.</p>
      </section>

      {/* Scope Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className={`button ${filterScope === 'my' ? 'button--primary' : ''}`}
          onClick={() => setFilterScope('my')}
          style={{ minHeight: '36px', fontSize: '13px', padding: '6px 14px' }}
        >
          My Classes & Subjects ({data.doubts.filter((d) => (d.teacherId === currentUser?.id) || (d.teacherName && currentUser?.name && d.teacherName.toLowerCase() === currentUser.name.toLowerCase()) || (d.subject && teacherSubjects.includes(d.subject.toLowerCase()))).length})
        </button>
        <button
          type="button"
          className={`button ${filterScope === 'all' ? 'button--primary' : ''}`}
          onClick={() => setFilterScope('all')}
          style={{ minHeight: '36px', fontSize: '13px', padding: '6px 14px' }}
        >
          All Campus Doubts ({data.doubts.length})
        </button>
      </div>

      {filteredDoubts.length === 0
        ? (
          <EmptyState
            title={filterScope === 'my' ? "No doubts for your subjects" : "No doubts yet"}
            detail={filterScope === 'my' ? "You're all caught up on questions for your classes. Click 'All Campus Doubts' to see college-wide questions." : "Student questions will appear here."}
          />
        )
        : (
          <div className="doubt-list">
            {filteredDoubts.map((doubt) => (
              <Card key={doubt.id}>
                <div className="doubt-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusPill tone={doubt.status === 'Answered' ? 'success' : 'warning'}>{doubt.status}</StatusPill>
                    <span>{doubt.subject} {doubt.className ? `(${doubt.className})` : ''} · {doubt.date}</span>
                  </div>
                  {doubt.teacherName && (
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                      Routed to: {doubt.teacherName}
                    </span>
                  )}
                </div>
                <h3 style={{ marginTop: '8px', marginBottom: '4px' }}>{doubt.question}</h3>
                <p className="muted" style={{ margin: '4px 0 8px', fontSize: '12px' }}>
                  Asked by {doubt.studentName}
                </p>

                {/* Attached Media / Files Preview */}
                {doubt.attachmentUrl && (
                  <div style={{ margin: '10px 0' }}>
                    {doubt.attachmentType === 'image' ? (
                      <div style={{ maxWidth: '260px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                        <a href={doubt.attachmentUrl} target="_blank" rel="noreferrer" title="Click to view full image">
                          <img
                            src={doubt.attachmentUrl}
                            alt={doubt.attachmentName || 'Doubt attachment'}
                            style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                        </a>
                      </div>
                    ) : (
                      <a
                        href={doubt.attachmentUrl}
                        download={doubt.attachmentName || 'doubt_attachment'}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text)', fontSize: '12px', fontWeight: 600 }}
                      >
                        <FileText size={16} />
                        <span>{doubt.attachmentName || 'Download attachment'}</span>
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                )}

                {doubt.response
                  ? (
                    <div className="answer-box">
                      <strong>Answer ({doubt.teacherName || 'Faculty'})</strong>
                      <p>{doubt.response}</p>
                    </div>
                  )
                  : (
                    <button
                      className="button button--primary"
                      onClick={() => { setActiveId(doubt.id); setAnswer(''); setError('') }}
                      style={{ marginTop: '6px' }}
                    >
                      Answer doubt
                    </button>
                  )}
              </Card>
            ))}
          </div>
        )}

      <Modal open={Boolean(active)} title="Answer doubt" onClose={() => { setActiveId(null); setError('') }}>
        {active && (
          <form className="form-stack" onSubmit={submit}>
            <div className="modal-copy" style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <strong>{active.subject} {active.className ? `(${active.className})` : ''}</strong>
                <span>Student: {active.studentName}</span>
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>{active.question}</p>

              {active.attachmentUrl && (
                <div style={{ marginTop: '10px' }}>
                  {active.attachmentType === 'image' ? (
                    <div style={{ maxWidth: '240px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                      <a href={active.attachmentUrl} target="_blank" rel="noreferrer">
                        <img
                          src={active.attachmentUrl}
                          alt="Student attachment"
                          style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }}
                        />
                      </a>
                    </div>
                  ) : (
                    <a
                      href={active.attachmentUrl}
                      download={active.attachmentName || 'attachment'}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}
                    >
                      <FileText size={15} /> {active.attachmentName || 'Download attachment'}
                    </a>
                  )}
                </div>
              )}
            </div>

            <label className="field">
              <span>Your response</span>
              <textarea
                rows={5}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Explain the concept clearly with steps or references…"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button--primary" disabled={submitting}>
              {submitting ? 'Sharing…' : 'Share answer'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}

function Announcements() {
  const { currentUser, data, createAnnouncement } = useApp()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'Academic' | 'Event' | 'Urgent' | 'General'>('Academic')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { setError('Add a title.'); return }
    if (!description.trim()) { setError('Add a message.'); return }
    setSubmitting(true)
    try {
      createAnnouncement({ title: title.trim(), description: description.trim(), category, postedBy: currentUser?.name ?? 'Teacher' })
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
          <h2>Announcements</h2>
          <p>Send an official update to your class group.</p>
        </div>
        <button className="button button--primary" onClick={() => setOpen(true)}>
          <Plus size={17} /> New announcement
        </button>
      </section>
      {data.announcements.length === 0
        ? <EmptyState title="No announcements" detail="Post the first update to your class." />
        : (
          <div className="notice-list">
            {data.announcements.map((announcement) => (
              <Card className="notice-card" key={announcement.id}>
                <div className="notice-card__top">
                  <StatusPill tone={announcement.category === 'Urgent' ? 'danger' : 'info'}>
                    {announcement.category}
                  </StatusPill>
                  <span>{announcement.date}</span>
                </div>
                <h3>{announcement.title}</h3>
                <p>{announcement.description}</p>
                <div className="notice-card__bottom"><span>Posted by {announcement.postedBy}</span></div>
              </Card>
            ))}
          </div>
        )}
      <Modal open={open} title="New announcement" onClose={() => setOpen(false)}>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              <option>Academic</option><option>Event</option><option>Urgent</option><option>General</option>
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

function Communication() {
  return <ChatView />
}

function Profile() {
  return <ProfileView />
}

export function TeacherPage() {
  return (
    <AppShell role="teacher">
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="classes" element={<Classes />} />
        <Route path="students" element={<Students />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="materials" element={<Materials />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="doubts" element={<Doubts />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="communication" element={<Communication />} />
        <Route path="communication/:conversationId" element={<Communication />} />
        <Route path="messages/*" element={<Navigate to="/teacher/communication" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="preferences" element={<Navigate to="/teacher/settings" replace />} />
        <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

