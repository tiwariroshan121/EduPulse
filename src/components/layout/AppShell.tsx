import { Bell, LogOut, Menu, Moon, Search, Settings as SettingsIcon, Sun, User } from 'lucide-react'
import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navigation, roleLabels } from '../../constants/navigation'
import type { Role } from '../../types/domain'
import { useApp } from '../../app/AppProvider'
import { Modal, StatusPill } from '../common/UI'
import { AmbientBackground } from '../common/AmbientBackground'
import { GlassSidebar } from '../navigation/GlassSidebar'
import { MobileGlassNavigation } from '../navigation/MobileGlassNavigation'


export function AppShell({ role, children }: PropsWithChildren<{ role: Role }>) {
  const { currentUser, data, settings, setTheme, logout, markNotificationsRead } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileControlRef = useRef<HTMLDivElement | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const items = navigation[role]
  const activeItem =
    items.find((item) => location.pathname.startsWith(item.path)) ??
    (location.pathname.includes('/profile')
      ? { label: 'Profile', path: `/${role}/profile`, icon: User }
      : items[0])
  const unreadCount = data.notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileControlRef.current && !profileControlRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className={`app-shell ${menuOpen ? 'app-shell--mobile-menu-open' : ''}`}>
      <AmbientBackground />

      {/* 1. Existing page content */}
      <main className={`main-area ${menuOpen ? 'main-area--mobile-blurred' : ''}`}>
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <div className="page-title">
            <p>{roleLabels[role]}</p>
            <h1>{activeItem.label}</h1>
          </div>
          <div className="topbar__actions">
            <button
              className="icon-button theme-button"
              onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle light and dark theme"
            >
              {settings.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button notification-button"
              onClick={() => setNoticeOpen(true)}
              aria-label={`${unreadCount} unread notifications`}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </button>

            {/* Top-right User Profile with Dropdown Menu */}
            <div className="profile-control" ref={profileControlRef}>
              <button
                className="profile-button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                title="User Menu (Profile, Settings, Logout)"
                aria-label="User Menu"
                aria-expanded={profileMenuOpen}
              >
                <span className="avatar">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    currentUser?.avatar || 'U'
                  )}
                </span>
                <span className="profile-button__label">
                  <strong>{currentUser?.name ?? 'Loading…'}</strong>
                  <small>{roleLabels[role]}</small>
                </span>
              </button>

              {profileMenuOpen && (
                <div className="profile-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate(`/${role}/profile`)
                    }}
                  >
                    <User size={15} /> <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate(`/${role}/settings`)
                    }}
                  >
                    <SettingsIcon size={15} /> <span>Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      setLogoutOpen(true)
                    }}
                    className="danger-text"
                  >
                    <LogOut size={15} /> <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            <button
              className="icon-button"
              onClick={() => setLogoutOpen(true)}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>

      {/* 2. Mobile backdrop + blur layer */}
      <button
        type="button"
        className={`sidebar-scrim ${menuOpen ? 'sidebar-scrim--open' : ''}`}
        aria-label="Close navigation menu"
        onClick={() => setMenuOpen(false)}
      />

      {/* 3. Actual glass navigation panel */}
      <GlassSidebar
        role={role}
        items={items}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        collegeName={currentUser?.college ?? 'EduPulse Campus'}
      />

      {/* 4. Mobile Bottom Navigation */}
      <MobileGlassNavigation items={items} onOpenMenu={() => setMenuOpen(true)} />

      {/* Notifications panel */}
      <Modal
        open={noticeOpen}
        title="Notifications"
        onClose={() => { setNoticeOpen(false); markNotificationsRead() }}
      >
        <div className="notification-list">
          {unreadCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button className="link-button" onClick={markNotificationsRead}>
                Mark all as read
              </button>
            </div>
          )}
          {data.notifications.length === 0
            ? <p className="empty-notice">No notifications yet.</p>
            : data.notifications.map((notification) => (
              <div className="notification-row" key={notification.id}>
                <div className={!notification.read ? 'notification-dot' : ''}>
                  <strong>{notification.title}</strong>
                  <p>{notification.description}</p>
                  <small>{notification.date}</small>
                </div>
              </div>
            ))}
        </div>
      </Modal>

      {/* Sign-out confirmation */}
      <Modal open={logoutOpen} title="Sign out" onClose={() => setLogoutOpen(false)}>
        <p className="modal-copy">
          Are you sure you want to sign out of EduPulse?
        </p>
        <div className="modal-actions">
          <button className="button button--ghost" onClick={() => setLogoutOpen(false)}>
            Stay signed in
          </button>
          <button
            className="button button--danger"
            onClick={() => { setLogoutOpen(false); void logout().then(() => navigate('/login')) }}
          >
            Sign out
          </button>
        </div>
      </Modal>
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="search-input">
      <Search size={18} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  )
}

export function ClassStatus({ cancelled }: { cancelled: boolean }) {
  return cancelled
    ? <StatusPill tone="danger">Class cancelled</StatusPill>
    : <StatusPill tone="success">Scheduled</StatusPill>
}
