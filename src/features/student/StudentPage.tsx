import { ChevronRight, CircleAlert, Download, ExternalLink, FileText, ImageIcon, Paperclip, Send, Upload, X } from 'lucide-react'
import { useState, useMemo, useRef, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import { AppShell } from '../../components/layout/AppShell'
import { Button, Card, EmptyState, Modal, SectionHeading, StatusPill } from '../../components/common/UI'
import { ChatView } from '../chat/ChatView'
import { ProfileView } from '../profile/ProfileView'
import { SettingsView } from '../settings/SettingsView'
import { StudentDashboardView } from './StudentDashboardView'
import { TimetableView } from '../timetable/TimetableView'
import type { AssignmentStatus } from '../../types/domain'

const statusTone = (status: AssignmentStatus) =>
  status === 'Graded' || status === 'Submitted' ? 'success' : status === 'Late' ? 'danger' : 'warning'

function StudentDashboard() {
  return <StudentDashboardView />
}

function StudentTimetable() {
  return (
    <div className="page-stack">
      <TimetableView mode="student" />
    </div>
  )
}

function Notices() {
  const { currentUser, data, markAnnouncementRead } = useApp()
  const [activeId, setActiveId] = useState<string | null>(null)
  const notice = data.announcements.find((item) => item.id === activeId)

  return (
    <div className="page-stack">
      <section className="intro">
        <h2>Campus notices</h2>
        <p>Official updates from your teachers and college administration.</p>
      </section>
      {data.announcements.length === 0
        ? <EmptyState title="No announcements" detail="Campus notices will appear here when published." />
        : (
          <div className="notice-list">
            {data.announcements.map((item) => {
              const read = currentUser?.id ? item.readBy.includes(currentUser.id) : false
              return (
                <Card className={!read ? 'notice-card notice-card--unread' : 'notice-card'} key={item.id}>
                  <div className="notice-card__top">
                    <StatusPill tone={item.category === 'Urgent' ? 'danger' : 'info'}>{item.category}</StatusPill>
                    <span>{item.date}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="notice-card__bottom">
                    <span>Posted by {item.postedBy}</span>
                    <div>
                      <button className="link-button" onClick={() => { setActiveId(item.id); markAnnouncementRead(item.id) }}>
                        Open notice
                      </button>
                      {!read && (
                        <button className="link-button" onClick={() => markAnnouncementRead(item.id)}>
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      <Modal open={Boolean(notice)} title={notice?.title ?? ''} onClose={() => setActiveId(null)}>
        {notice && (
          <div className="modal-copy">
            <StatusPill tone="info">{notice.category}</StatusPill>
            <p>{notice.description}</p>
            <small>Posted by {notice.postedBy} · {notice.date}</small>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Materials() {
  const { data, notify } = useApp()
  const [subject, setSubject] = useState('All subjects')
  const subjects = ['All subjects', ...new Set(data.materials.map((item) => item.subject))]
  const entries = subject === 'All subjects'
    ? data.materials
    : data.materials.filter((item) => item.subject === subject)

  const handleView = (material: typeof data.materials[0]) => {
    if (material.fileName && material.fileName.startsWith('http')) {
      // Real Firebase Storage URL — open in new tab
      window.open(material.fileName, '_blank', 'noopener,noreferrer')
    } else if (material.downloadUrl) {
      window.open(material.downloadUrl, '_blank', 'noopener,noreferrer')
    } else {
      notify('This material was uploaded without a file. Contact your teacher.', 'info')
    }
  }

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Notes & materials</h2>
          <p>Teacher-shared resources for your current classes.</p>
        </div>
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          aria-label="Filter materials by subject"
        >
          {subjects.map((item) => <option key={item}>{item}</option>)}
        </select>
      </section>
      {entries.length === 0
        ? <EmptyState title="No materials found" detail="Choose another subject to see available class materials." />
        : (
          <div className="material-grid">
            {entries.map((material) => (
              <Card className="material-card" key={material.id}>
                <div className="material-card__top">
                  <span className="file-badge file-badge--large">{material.fileType}</span>
                  <span>{material.date}</span>
                </div>
                <h3>{material.title}</h3>
                <p>{material.description}</p>
                <div className="material-meta">
                  <span>{material.subject}</span>
                  <span>{material.teacher}</span>
                </div>
                <button
                  className="button button--ghost button--full"
                  onClick={() => handleView(material)}
                >
                  {(material.fileName?.startsWith('http') || material.downloadUrl)
                    ? <><ExternalLink size={17} /> Open material</>
                    : <><Download size={17} /> View material</>}
                </button>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

function Assignments() {
  const { data } = useApp()
  const [query, setQuery] = useState('')
  const filtered = data.assignments.filter((item) =>
    `${item.title} ${item.subject}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="page-stack">
      <section className="filter-row">
        <div>
          <h2>Assignments</h2>
          <p>Track work, submissions, feedback, and marks.</p>
        </div>
        <input
          className="plain-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assignments"
        />
      </section>
      {filtered.length === 0
        ? <EmptyState title="No assignments found" detail="Try searching by another title or subject." />
        : (
          <div className="assignment-list">
            {filtered.map((assignment) => (
              <Card className="assignment-card" key={assignment.id}>
                <div>
                  <StatusPill tone={statusTone(assignment.status)}>{assignment.status}</StatusPill>
                  <h3>{assignment.title}</h3>
                  <p>{assignment.description}</p>
                  <div className="metadata">
                    <span>{assignment.subject}</span>
                    <span>{assignment.teacher}</span>
                    <span>Due {assignment.dueDate}</span>
                  </div>
                </div>
                <Link to={`/student/assignments/${assignment.id}`} className="button button--ghost">
                  Open <ChevronRight size={17} />
                </Link>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

function AssignmentDetails() {
  const { id } = useParams()
  const { data, submitAssignment, notify, isFirebaseMode, currentUser } = useApp()
  const assignment = data.assignments.find((item) => item.id === id)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  if (!assignment) return <Navigate to="/student/assignments" replace />

  const canSubmit = assignment.status === 'Pending' || assignment.status === 'Late'

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    try {
      if (isFirebaseMode) {
        // Firebase upload path (will work once Firebase Storage is configured)
        const { uploadFile, generateAssignmentPath, validateFile } = await import('../../services/firebase/storage')
        const validation = validateFile(file, {
          maxSizeMB: 20,
          allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'image/*'],
        })
        if (!validation.valid) {
          notify(validation.error ?? 'Invalid file.', 'error')
          setUploading(false)
          return
        }
        const collegeId = currentUser?.college ?? 'college-1'
        const studentId = currentUser?.id ?? 'student-1'
        const path = generateAssignmentPath(collegeId, assignment.id, studentId, file.name)
        const uploadResult = await uploadFile(path, file)
        submitAssignment(assignment.id, file.name, uploadResult.downloadURL)
      } else {
        // Dev mode — store filename only
        submitAssignment(assignment.id, file.name)
      }
      setFile(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      notify(message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page-stack">
      <button className="back-link" onClick={() => navigate('/student/assignments')}>← Back to assignments</button>
      <div className="detail-grid">
        <Card className="detail-card">
          <div className="detail-card__top">
            <StatusPill tone={statusTone(assignment.status)}>{assignment.status}</StatusPill>
            <span>Due {assignment.dueDate}</span>
          </div>
          <h2>{assignment.title}</h2>
          <div className="metadata">
            <span>{assignment.subject}</span>
            <span>{assignment.teacher}</span>
            <span>{assignment.className}</span>
          </div>
          <hr />
          <h3>Assignment brief</h3>
          <p>{assignment.description}</p>
          {assignment.marks && (
            <div className="feedback-box">
              <strong>{assignment.marks}</strong>
              <p>{assignment.feedback}</p>
            </div>
          )}
        </Card>

        <Card className="submission-card">
          <h3>{canSubmit ? 'Submit your work' : 'Submission status'}</h3>
          {canSubmit ? (
            <>
              <label className="file-picker">
                <Upload size={22} />
                <span>{file ? file.name : 'Select a file'}</span>
                <small>{file ? `${Math.ceil(file.size / 1024)} KB` : 'PDF, DOCX, ZIP or image · max 20 MB'}</small>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {file && (
                <button className="link-button" onClick={() => setFile(null)}>
                  <X size={15} /> Remove selected file
                </button>
              )}
              <Button
                className="button--primary button--full"
                disabled={!file || uploading}
                onClick={handleSubmit}
              >
                {uploading ? 'Uploading…' : 'Submit assignment'}
              </Button>
            </>
          ) : (
            <div className="submission-summary">
              <StatusPill tone="success">{assignment.status}</StatusPill>
              <p>
                {assignment.submissionUrl ? (
                  <a
                    href={assignment.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'underline', color: 'var(--primary)' }}
                  >
                    {assignment.submissionFileName ?? 'View submitted file'}
                  </a>
                ) : (
                  assignment.submissionFileName ?? 'No file was attached.'
                )}
              </p>
              {assignment.marks && (
                <div className="feedback-box">
                  <strong>Grade: {assignment.marks}</strong>
                  {assignment.feedback && <p>{assignment.feedback}</p>}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Doubts() {
  const { currentUser, data, createDoubt, classes, timetableEntries } = useApp()
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attachment, setAttachment] = useState<{
    url: string
    name: string
    type: 'image' | 'pdf' | 'document'
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Resolve student's enrolled academic class
  const studentClass = useMemo(() => {
    return (classes || []).find((c) => c.id === currentUser?.academicClassId) || null
  }, [classes, currentUser?.academicClassId])

  // 2. Class lectures
  const studentLectures = useMemo(() => {
    return (timetableEntries || []).filter((e) =>
      (currentUser?.academicClassId && e.academicClassId === currentUser.academicClassId) ||
      (studentClass && e.course === studentClass.courseName && e.semester === studentClass.semester && e.division === studentClass.division) ||
      (currentUser?.course && e.course === currentUser.course && e.semester === currentUser.semester && e.division === currentUser.division)
    )
  }, [timetableEntries, currentUser, studentClass])

  // 3. Subjects available for this student's class
  const availableSubjects = useMemo(() => {
    const set = new Set<string>()
    studentLectures.forEach((e) => {
      const s = e.subjectName || e.subject
      if (s) set.add(s)
    })
    if (set.size === 0) {
      data.timetable.forEach((e) => { if (e.subject) set.add(e.subject) })
    }
    return Array.from(set).sort()
  }, [studentLectures, data.timetable])

  // 4. Resolve the subject teacher specifically for this class
  const assignedTeacher = useMemo(() => {
    if (!subject) return null
    const lecture = studentLectures.find((e) => (e.subjectName || e.subject)?.toLowerCase() === subject.toLowerCase())
    if (lecture && (lecture.teacherId || (lecture as any).teacher || lecture.teacherName)) {
      const teacherUser = data.users.find(
        (u) => u.id === lecture.teacherId || u.name === lecture.teacherName || u.name === (lecture as any).teacher
      )
      return {
        id: lecture.teacherId || teacherUser?.id,
        name: lecture.teacherName || (lecture as any).teacher || teacherUser?.name || 'Subject Faculty',
      }
    }
    const deptTeacher = data.users.find(
      (u) => u.role === 'teacher' && (u.department?.toLowerCase().includes(subject.toLowerCase()) || u.name)
    )
    if (deptTeacher) {
      return { id: deptTeacher.id, name: deptTeacher.name }
    }
    return null
  }, [subject, studentLectures, data.users])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Attachment file size exceeds 5MB limit.')
      return
    }
    const isImg = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    const type: 'image' | 'pdf' | 'document' = isImg ? 'image' : isPdf ? 'pdf' : 'document'

    const reader = new FileReader()
    reader.onload = () => {
      setAttachment({
        url: reader.result as string,
        name: file.name,
        type,
      })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!subject) { setError('Select a subject for your doubt.'); return }
    if (!question.trim() || question.trim().length < 10) { setError('Write your question clearly (at least 10 characters).'); return }
    setSubmitting(true)
    try {
      createDoubt({
        subject,
        question: question.trim(),
        academicClassId: currentUser?.academicClassId || studentClass?.id,
        className: studentClass?.name || `${currentUser?.course || ''} Sem ${currentUser?.semester || ''}-${currentUser?.division || ''}`,
        teacherId: assignedTeacher?.id,
        teacherName: assignedTeacher?.name,
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type,
      })
      setSubject('')
      setQuestion('')
      setAttachment(null)
      setError('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setSubmitting(false)
    }
  }

  const myDoubts = data.doubts.filter((item) =>
    item.studentName === currentUser?.name || (item.studentId && item.studentId === currentUser?.id)
  )

  return (
    <div className="page-stack">
      <div className="detail-grid">
        <Card>
          <SectionHeading
            title="Daily doubt box"
            detail={`Ask an academic question; routed directly to your ${studentClass ? studentClass.name : 'class'} teacher.`}
          />
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Subject</span>
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                <option value="">Choose a subject</option>
                {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            {assignedTeacher && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--primary-soft)', borderRadius: '8px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                <span>Routed to:</span>
                <strong>{assignedTeacher.name}</strong>
              </div>
            )}

            <label className="field">
              <span>Your question</span>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Describe your doubt clearly with formula, code or concept details..."
                rows={4}
              />
            </label>

            {/* File Attachment Support */}
            <div className="field">
              <span>Attach diagram, PDF or notes (optional)</span>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
              />
              {attachment ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: '8px', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                    {attachment.type === 'image' ? <ImageIcon size={18} color="var(--primary)" /> : <FileText size={18} color="var(--primary)" />}
                    <span style={{ fontSize: '12px', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {attachment.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px' }}
                    title="Remove attachment"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'start' }}
                >
                  <Paperclip size={16} /> Attach file / screenshot
                </button>
              )}
            </div>

            {error && <p className="form-error"><CircleAlert size={16} />{error}</p>}
            <button className="button button--primary" type="submit" disabled={submitting}>
              <Send size={17} /> {submitting ? 'Submitting…' : 'Submit doubt'}
            </button>
          </form>
        </Card>
        <Card className="help-card">
          <span className="card-label">ACADEMIC ROUTING</span>
          <h3>Direct Subject-Teacher Link</h3>
          <p>
            Doubts are automatically routed to the designated subject faculty for your academic class ({studentClass ? studentClass.name : 'Enrolled Class'}).
          </p>
          <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.85 }}>
            You can also attach diagrams or homework snippets to help your teacher explain faster.
          </p>
        </Card>
      </div>
      <section>
        <SectionHeading title="Your previous doubts" detail="Answers appear here as teachers respond." />
        {myDoubts.length
          ? (
            <div className="doubt-list">
              {myDoubts.map((doubt) => (
                <Card key={doubt.id}>
                  <div className="doubt-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusPill tone={doubt.status === 'Answered' ? 'success' : 'warning'}>{doubt.status}</StatusPill>
                      <span>{doubt.subject} · {doubt.date}</span>
                    </div>
                    {doubt.teacherName && (
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                        Routed to: {doubt.teacherName}
                      </span>
                    )}
                  </div>
                  <h3 style={{ marginTop: '8px', marginBottom: '8px' }}>{doubt.question}</h3>

                  {/* Attachment in student's doubt card */}
                  {doubt.attachmentUrl && (
                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                      {doubt.attachmentType === 'image' ? (
                        <div style={{ maxWidth: '240px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                          <a href={doubt.attachmentUrl} target="_blank" rel="noreferrer" title="Click to view image">
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

                  {doubt.response && (
                    <div className="answer-box">
                      <strong>Teacher Response ({doubt.teacherName || 'Faculty'})</strong>
                      <p>{doubt.response}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
          : <EmptyState title="No doubts yet" detail="Use the daily doubt box when you want help with a concept." />}
      </section>
    </div>
  )
}

function Communication() {
  return <ChatView />
}

function Profile() {
  return <ProfileView />
}

export function StudentPage() {
  return (
    <AppShell role="student">
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="notices" element={<Notices />} />
        <Route path="notes" element={<Materials />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="assignments/:id" element={<AssignmentDetails />} />
        <Route path="doubts" element={<Doubts />} />
        <Route path="communication" element={<Communication />} />
        <Route path="communication/:conversationId" element={<Communication />} />
        <Route path="messages/*" element={<Navigate to="/student/communication" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="preferences" element={<Navigate to="/student/settings" replace />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

