import { memo, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import type { NavigationItem } from '../../constants/navigation'
import './glass-orb-nav.css'

export interface MobileGlassNavigationProps {
  items: NavigationItem[]
  onOpenMenu: () => void
}

export const MobileGlassNavigation = memo(function MobileGlassNavigation({
  items,
  onOpenMenu,
}: MobileGlassNavigationProps) {
  // Select core 4 modules: exclude notices/announcements/settings from the quick bottom bar
  // Notifications remain accessible via the top-bar notification bell with unread badge.
  const primaryItems = useMemo(() => {
    // 1. For student, guarantee: Dashboard, Timetable, Notes & Materials, Messages & Groups
    const isStudent = items.some((item) => item.path.includes('/student/'))
    if (isStudent) {
      const studentKeys = ['dashboard', 'timetable', 'notes', 'communication']
      const resolved: NavigationItem[] = []
      studentKeys.forEach((key) => {
        const found = items.find((item) => item.path.includes(key))
        if (found) resolved.push(found)
      })
      if (resolved.length === 4) return resolved
    }

    // 2. For teacher / admin, filter out notices/announcements/settings
    const coreFiltered = items.filter(
      (item) =>
        !item.path.includes('notices') &&
        !item.path.includes('announcements') &&
        !item.path.includes('settings')
    )

    const commItem = items.find((item) => item.path.includes('communication'))
    const result = coreFiltered.slice(0, 4)
    if (commItem && !result.some((r) => r.path === commItem.path)) {
      if (result.length >= 4) {
        result[3] = commItem
      } else {
        result.push(commItem)
      }
    }
    return result
  }, [items])

  return (
    <nav className="bottom-nav mobile-glass-nav" aria-label="Mobile navigation">
      {primaryItems.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `mobile-glass-nav__item ${isActive ? 'mobile-glass-nav__item--active' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="mobile-glass-nav__orb-backdrop" aria-hidden="true" />
              )}
              <Icon size={19} />
              <span>
                {label === 'Notes & Materials'
                  ? 'Materials'
                  : label === 'Messages & Groups'
                  ? 'Messages'
                  : label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      <button
        type="button"
        className="mobile-glass-nav__item"
        onClick={onOpenMenu}
        aria-label="Open full menu"
      >
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  )
})
