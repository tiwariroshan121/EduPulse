import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { NavigationItem } from '../../constants/navigation'
import type { Role } from '../../types/domain'
import { GlassOrbNavItem } from './GlassOrbNavItem'
import './glass-orb-nav.css'

export interface GlassSidebarProps {
  role: Role
  items: NavigationItem[]
  isOpen: boolean
  onClose: () => void
  collegeName?: string
}

export const GlassSidebar = memo(function GlassSidebar({
  role,
  items,
  isOpen,
  onClose,
  collegeName = 'EduPulse Campus',
}: GlassSidebarProps) {
  return (
    <>
      <aside className={`sidebar glass-sidebar ${isOpen ? 'sidebar--open' : ''}`} aria-label="Primary navigation">
        {/* Sidebar Header with Glowing Glass Orb Logo */}
        <div className="glass-sidebar__header">
          <Link to={`/${role}/dashboard`} className="glass-sidebar__brand" onClick={onClose}>
            <span className="glass-sidebar__logo-orb" aria-hidden="true">
              E
            </span>
            <div className="glass-sidebar__brand-text">
              <span>EduPulse</span>
              <small>Campus Connect</small>
            </div>
          </Link>
        </div>

        {/* Navigation Items with Animated Glass Orbs */}
        <nav className="glass-sidebar__nav">
          {items.map(({ label, path, icon }) => (
            <GlassOrbNavItem
              key={path}
              to={path}
              label={label}
              icon={icon}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Sidebar Footer with Institutional Badge */}
        <div className="glass-sidebar__footer">
          <span className="glass-sidebar__college-tag">
            {collegeName}
          </span>
        </div>
      </aside>
    </>
  )
})
