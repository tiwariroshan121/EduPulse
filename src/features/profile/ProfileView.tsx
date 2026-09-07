import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import {
  User as UserIcon, Lock, Camera, Trash2, CheckCircle2,
  Clock, XCircle, ShieldCheck, GraduationCap, Building2,
  BookOpen, LogOut, Eye, KeyRound, AlertCircle, X, MessageSquare
} from 'lucide-react'
import { useApp } from '../../app/AppProvider'
import { useNavigate } from 'react-router-dom'
import type { User, Role, ThemeMode } from '../../types/domain'
import { Modal } from '../../components/common/UI'
import './ProfileView.css'

interface ProfileViewProps {
  targetUser?: User
  viewOnly?: boolean
  onClose?: () => void
}

export function ProfileView({ targetUser, viewOnly = false, onClose }: ProfileViewProps) {
  const {
    currentUser,
    updateProfile,
    uploadProfilePhoto,
    removeProfilePhoto,
    changePassword,
    settings,
    setTheme,
    updateSettings,
    logout,
    notify,
    startPersonalConversation,
  } = useApp()

  const navigate = useNavigate()
  const user = targetUser || currentUser

  // Edit form state
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [division, setDivision] = useState(user?.division || 'A')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Validation errors
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Hidden photo file input
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  // Determine if dirty
  const isDirty =
    name !== (user?.name || '') ||
    phone !== (user?.phone || '') ||
    division !== (user?.division || 'A')

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-card-section" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
          <h3>Profile not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Unable to load account details. Please sign in again.</p>
        </div>
      </div>
    )
  }

  // Handle Photo Selection
  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadingPhoto(true)
      try {
        await uploadProfilePhoto(file)
      } catch (err: any) {
        // error already notified by uploadProfilePhoto
      } finally {
        setUploadingPhoto(false)
        if (photoInputRef.current) photoInputRef.current.value = ''
      }
    }
  }

  // Handle Save Profile
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    let valid = true

    if (!name.trim()) {
      setNameError('Full name is required.')
      valid = false
    } else if (name.trim().length > 60) {
      setNameError('Name cannot exceed 60 characters.')
      valid = false
    } else {
      setNameError('')
    }

    if (phone.trim() && !/^[+0-9\s-]{7,16}$/.test(phone.trim())) {
      setPhoneError('Please enter a valid phone number.')
      valid = false
    } else {
      setPhoneError('')
    }

    if (!valid) return

    setSaving(true)
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        division: user.role === 'student' ? division.trim() : undefined,
      })
      setEditing(false)
    } catch (err: any) {
      notify(err?.message || 'Unable to update profile. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
      return
    }
    setName(user.name)
    setPhone(user.phone || '')
    setDivision(user.division || 'A')
    setNameError('')
    setPhoneError('')
    setEditing(false)
  }

  // Handle Password Change
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordError('')
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err?.message || 'Unable to change password. Please check your current password.')
    } finally {
      setChangingPassword(false)
    }
  }

  // Role display label
  const roleDisplay: Record<Role, string> = {
    student: 'Student',
    teacher: 'Faculty / Teacher',
    admin: 'Principal & Administrator',
  }

  // Format member since date
  const memberSinceFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : 'August 2024'

  // If view-only modal mode (e.g. opened from Chat)
  if (viewOnly) {
    return (
      <div className="member-profile-modal-backdrop" onClick={onClose}>
        <div className="member-profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="member-profile-header">
            {onClose && (
              <button className="member-profile-close-btn" onClick={onClose} title="Close">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="member-profile-body">
            <div className="member-profile-avatar-row">
              <div className="member-profile-avatar">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  user.avatar || user.name[0]
                )}
              </div>
              <span className={`profile-role-pill profile-role-pill--${user.role}`}>
                {roleDisplay[user.role]}
              </span>
            </div>

            <div>
              <h2 className="member-profile-name">{user.name}</h2>
              <p className="member-profile-sub">
                {user.college || 'EduPulse Campus'} · {user.identifier || 'Verified Member'}
              </p>
            </div>

            <div className="member-profile-facts">
              <div className="profile-dl-row">
                <span className="profile-dl-dt">Role</span>
                <span className="profile-dl-dd">{roleDisplay[user.role]}</span>
              </div>
              <div className="profile-dl-row">
                <span className="profile-dl-dt">College</span>
                <span className="profile-dl-dd">{user.college || 'Bonsalo College'}</span>
              </div>
              {user.department && (
                <div className="profile-dl-row">
                  <span className="profile-dl-dt">Department</span>
                  <span className="profile-dl-dd">{user.department}</span>
                </div>
              )}
              {user.course && (
                <div className="profile-dl-row">
                  <span className="profile-dl-dt">Course</span>
                  <span className="profile-dl-dd">{user.course}</span>
                </div>
              )}
              {user.semester && (
                <div className="profile-dl-row">
                  <span className="profile-dl-dt">Semester</span>
                  <span className="profile-dl-dd">Semester {user.semester} {user.division ? `(Div ${user.division})` : ''}</span>
                </div>
              )}
              {user.subjects && user.subjects.length > 0 && (
                <div className="profile-dl-row">
                  <span className="profile-dl-dt">Subjects</span>
                  <span className="profile-dl-dd">{user.subjects.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="member-profile-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {currentUser && targetUser && targetUser.id !== currentUser.id && (
              <button
                className="button button--primary"
                onClick={async () => {
                  const convId = await startPersonalConversation(targetUser.id)
                  if (convId) {
                    onClose?.()
                    const basePath = currentUser.role === 'admin' ? '/admin/communication' : currentUser.role === 'teacher' ? '/teacher/communication' : '/student/communication'
                    navigate(`${basePath}/${convId}`)
                  }
                }}
              >
                <MessageSquare size={14} style={{ marginRight: '6px' }} /> Message
              </button>
            )}
            <button className="button button--secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      {/* ----------------- 1. PROFILE HERO ----------------- */}
      <div className="profile-hero-card">
        <div className="profile-hero-banner" />

        <div className="profile-hero-content">
          <div className="profile-avatar-block">
            <div className="profile-avatar-wrapper">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-fallback">{user.avatar || 'U'}</div>
              )}

              {/* Photo Upload Hover Overlay */}
              <label className="profile-photo-overlay" title="Upload new profile photo">
                <Camera size={20} />
                <span>{uploadingPhoto ? 'Uploading…' : 'Change'}</span>
                <input
                  type="file"
                  ref={photoInputRef}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  disabled={uploadingPhoto}
                />
              </label>

              {/* Remove Photo Button */}
              {user.photoURL && (
                <button
                  type="button"
                  className="profile-photo-remove-btn"
                  title="Remove Profile Photo"
                  onClick={() => void removeProfilePhoto()}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="profile-hero-meta">
              <div className="profile-hero-name-row">
                <h1 className="profile-hero-name">{user.name}</h1>
                <span className={`profile-role-pill profile-role-pill--${user.role}`}>
                  {roleDisplay[user.role]}
                </span>

                {user.role === 'teacher' && (
                  <span
                    className={`profile-verification-badge profile-verification-badge--${
                      user.verificationStatus || 'approved'
                    }`}
                  >
                    {user.verificationStatus === 'pending' ? (
                      <><Clock size={12} /> Pending Verification</>
                    ) : user.verificationStatus === 'rejected' ? (
                      <><XCircle size={12} /> Verification Rejected</>
                    ) : (
                      <><CheckCircle2 size={12} /> Verified Faculty</>
                    )}
                  </span>
                )}
              </div>

              <p className="profile-hero-subtitle">
                <span>{user.college || 'Bonsalo College'}</span>
                <span>•</span>
                <span>ID: {user.identifier}</span>
                {user.role === 'student' && user.course && (
                  <>
                    <span>•</span>
                    <span>{user.course} (Sem {user.semester || '2'} · Div {user.division || 'A'})</span>
                  </>
                )}
                {user.role === 'teacher' && user.department && (
                  <>
                    <span>•</span>
                    <span>{user.department}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="profile-hero-actions">
            {editing ? (
              <>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Quick Facts Bar */}
        <div className="profile-facts-bar">
          <div className="profile-fact-item">
            <span className="profile-fact-label">Campus</span>
            <span className="profile-fact-value">{user.college || 'Bonsalo College'}</span>
          </div>

          {user.role === 'student' ? (
            <>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Course</span>
                <span className="profile-fact-value">{user.course || 'BSc Information Technology'}</span>
              </div>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Class</span>
                <span className="profile-fact-value">Semester {user.semester || '2'} · Div {user.division || 'A'}</span>
              </div>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Roll Number</span>
                <span className="profile-fact-value">{user.identifier}</span>
              </div>
            </>
          ) : user.role === 'teacher' ? (
            <>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Department</span>
                <span className="profile-fact-value">{user.department || 'Computer Science'}</span>
              </div>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Designation</span>
                <span className="profile-fact-value">{user.designation || 'Faculty Member'}</span>
              </div>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Employee ID</span>
                <span className="profile-fact-value">{user.identifier}</span>
              </div>
            </>
          ) : (
            <>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Administrative Role</span>
                <span className="profile-fact-value">Principal / Admin</span>
              </div>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Scope</span>
                <span className="profile-fact-value">All Campus Records</span>
              </div>
              <div className="profile-fact-item">
                <span className="profile-fact-label">Admin ID</span>
                <span className="profile-fact-value">{user.identifier}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ----------------- 2. SECTIONS GRID ----------------- */}
      <div className="profile-sections-grid">
        {/* Card 1: Personal Information */}
        <section className="profile-card-section">
          <div className="profile-card-title">
            <h3><UserIcon size={18} /> Personal Information</h3>
            {editing && <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>Editing Mode</span>}
          </div>

          {editing ? (
            <form className="profile-edit-form" onSubmit={handleSaveProfile}>
              <div className="profile-form-group">
                <label className="profile-form-label">Full Name *</label>
                <input
                  className="profile-form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
                {nameError && <span className="profile-form-error">{nameError}</span>}
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  Email Address
                  <span className="profile-protected-badge"><Lock size={10} /> Linked to Auth</span>
                </label>
                <input
                  className="profile-form-input"
                  value={user.email}
                  disabled
                  title="Email is verified with authentication and cannot be edited directly."
                />
                <span className="profile-form-help">Your official registered campus email.</span>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">Phone Number</label>
                <input
                  className="profile-form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
                {phoneError && <span className="profile-form-error">{phoneError}</span>}
              </div>

              {user.role === 'student' && (
                <div className="profile-form-group">
                  <label className="profile-form-label">Division / Section</label>
                  <input
                    className="profile-form-input"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="A"
                  />
                </div>
              )}
            </form>
          ) : (
            <dl className="profile-dl">
              <div className="profile-dl-row">
                <dt className="profile-dl-dt">Full Name</dt>
                <dd className="profile-dl-dd">{user.name}</dd>
              </div>
              <div className="profile-dl-row">
                <dt className="profile-dl-dt">Email Address</dt>
                <dd className="profile-dl-dd">{user.email}</dd>
              </div>
              <div className="profile-dl-row">
                <dt className="profile-dl-dt">Phone Number</dt>
                <dd className="profile-dl-dd">{user.phone || 'Not provided'}</dd>
              </div>
              <div className="profile-dl-row">
                <dt className="profile-dl-dt">Campus Role</dt>
                <dd className="profile-dl-dd">{roleDisplay[user.role]}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* Card 2: Academic / Professional Details */}
        <section className="profile-card-section">
          <div className="profile-card-title">
            <h3>
              {user.role === 'student' ? (
                <><GraduationCap size={18} /> Academic Information</>
              ) : user.role === 'teacher' ? (
                <><Building2 size={18} /> Professional Details</>
              ) : (
                <><ShieldCheck size={18} /> Administrative Details</>
              )}
            </h3>
            <span className="profile-protected-badge"><Lock size={10} /> Campus Managed</span>
          </div>

          <dl className="profile-dl">
            {user.role === 'student' ? (
              <>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Student ID / Roll No</dt>
                  <dd className="profile-dl-dd">{user.identifier}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Degree / Course</dt>
                  <dd className="profile-dl-dd">{user.course || 'BSc Information Technology'}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Current Semester</dt>
                  <dd className="profile-dl-dd">Semester {user.semester || '2'}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Division / Section</dt>
                  <dd className="profile-dl-dd">Division {user.division || 'A'}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Academic Batch</dt>
                  <dd className="profile-dl-dd">{user.batch || '2024–2027'}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Department</dt>
                  <dd className="profile-dl-dd">{user.department || 'Information Technology'}</dd>
                </div>
              </>
            ) : user.role === 'teacher' ? (
              <>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Employee ID</dt>
                  <dd className="profile-dl-dd">{user.identifier}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Department</dt>
                  <dd className="profile-dl-dd">{user.department || 'Computer Science'}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Designation</dt>
                  <dd className="profile-dl-dd">{user.designation || 'Associate Professor'}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Assigned Subjects</dt>
                  <dd className="profile-dl-dd">
                    {user.subjects && user.subjects.length > 0
                      ? user.subjects.join(', ')
                      : 'Data Structures, Web Development, Algorithms'}
                  </dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Verification Status</dt>
                  <dd className="profile-dl-dd">
                    <span
                      className={`profile-verification-badge profile-verification-badge--${
                        user.verificationStatus || 'approved'
                      }`}
                    >
                      {user.verificationStatus === 'pending'
                        ? '⏳ Waiting for Admin Review'
                        : user.verificationStatus === 'rejected'
                        ? '✕ Rejected'
                        : '✓ Verified Faculty'}
                    </span>
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Administrator ID</dt>
                  <dd className="profile-dl-dd">{user.identifier}</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Official Designation</dt>
                  <dd className="profile-dl-dd">Principal & Institutional Administrator</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">Department</dt>
                  <dd className="profile-dl-dd">Campus Administration & Dean Office</dd>
                </div>
                <div className="profile-dl-row">
                  <dt className="profile-dl-dt">System Authority</dt>
                  <dd className="profile-dl-dd">Faculty Verification, Academic Schedules, Campus Broadcasts</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {/* Card 3: Account & Institution Status */}
        <section className="profile-card-section">
          <div className="profile-card-title">
            <h3><BookOpen size={18} /> Account Information</h3>
          </div>

          <dl className="profile-dl">
            <div className="profile-dl-row">
              <dt className="profile-dl-dt">Account Status</dt>
              <dd className="profile-dl-dd" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#059669',
                    display: 'inline-block',
                  }}
                />
                Active
              </dd>
            </div>
            <div className="profile-dl-row">
              <dt className="profile-dl-dt">Institution</dt>
              <dd className="profile-dl-dd">{user.college || 'Bonsalo College'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt className="profile-dl-dt">Member Since</dt>
              <dd className="profile-dl-dd">{memberSinceFormatted}</dd>
            </div>
            <div className="profile-dl-row">
              <dt className="profile-dl-dt">Authentication Method</dt>
              <dd className="profile-dl-dd">
                {user.id.startsWith('google-') ? 'Google Workspace Account' : 'Campus Email & Password'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Card 4: Preferences & Accessibility */}
        <section className="profile-card-section">
          <div className="profile-card-title">
            <h3><Eye size={18} /> Display & Notification Preferences</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                Interface Appearance
              </span>
              <div className="theme-options">
                {[
                  { value: 'light' as ThemeMode, title: 'Light', detail: 'Crisp daylight' },
                  { value: 'dark' as ThemeMode, title: 'Dark', detail: 'Night study' },
                  { value: 'comfort' as ThemeMode, title: 'Eye Comfort', detail: 'Warm reading' },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    className={`theme-option ${settings.theme === t.value ? 'theme-option--active' : ''}`}
                  >
                    <span className={`theme-swatch theme-swatch--${t.value}`} />
                    <strong>{t.title}</strong>
                    <small>{t.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <label className="toggle-row">
                <span>
                  <strong>Campus Push Notifications</strong>
                  <small>Timetable changes, notes uploads, and chat messages</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                />
              </label>

              <label className="toggle-row">
                <span>
                  <strong>Email Academic Summaries</strong>
                  <small>Weekly attendance and assignment reminders</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.emailUpdates}
                  onChange={(e) => updateSettings({ emailUpdates: e.target.checked })}
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* ----------------- 3. SECURITY & SIGN OUT ----------------- */}
      <section className="profile-card-section">
        <div className="profile-card-title">
          <h3><KeyRound size={18} /> Account Security & Session</h3>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Password & Sign-in</strong>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Keep your account protected with a strong, distinct password.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setPasswordError('')
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setShowPasswordModal(true)
              }}
            >
              <Lock size={15} style={{ marginRight: '6px' }} /> Change Password
            </button>

            <button
              type="button"
              className="button button--danger"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut size={15} style={{ marginRight: '6px' }} /> Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* ----------------- MODAL: CHANGE PASSWORD ----------------- */}
      <Modal
        open={showPasswordModal}
        title="Change Account Password"
        onClose={() => setShowPasswordModal(false)}
      >
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Enter your current password followed by your new password.
          </p>

          <div className="profile-form-group">
            <label className="profile-form-label">Current Password *</label>
            <input
              type="password"
              className="profile-form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label">New Password * (Min 6 chars)</label>
            <input
              type="password"
              className="profile-form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label">Confirm New Password *</label>
            <input
              type="password"
              className="profile-form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {passwordError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '12px' }}>
              <AlertCircle size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '6px' }}>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setShowPasswordModal(false)}
              disabled={changingPassword}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={changingPassword}
            >
              {changingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ----------------- MODAL: SIGN OUT CONFIRMATION ----------------- */}
      <Modal
        open={showLogoutModal}
        title="Sign Out Confirmation"
        onClose={() => setShowLogoutModal(false)}
      >
        <p style={{ fontSize: '13.5px', color: 'var(--text)', margin: '0 0 16px' }}>
          Are you sure you want to sign out of EduPulse? Your unsaved session data will be cleared.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setShowLogoutModal(false)}
          >
            Stay Signed In
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() => {
              setShowLogoutModal(false)
              void logout().then(() => navigate('/login'))
            }}
          >
            Sign Out
          </button>
        </div>
      </Modal>
    </div>
  )
}
