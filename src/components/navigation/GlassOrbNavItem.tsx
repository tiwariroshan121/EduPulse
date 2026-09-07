import { useState, memo } from 'react'
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export interface GlassOrbNavItemProps {
  icon: LucideIcon
  label: string
  to: string
  isActive?: boolean
  onClick?: () => void
  badge?: number | string
  compact?: boolean
}

export const GlassOrbNavItem = memo(function GlassOrbNavItem({
  icon: Icon,
  label,
  to,
  onClick,
  badge,
  compact = false,
}: GlassOrbNavItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <NavLink
      to={to}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={({ isActive }) =>
        `glass-orb-nav-item ${isActive ? 'glass-orb-nav-item--active' : ''} ${
          isHovered && !isActive ? 'glass-orb-nav-item--hovered' : ''
        } ${compact ? 'glass-orb-nav-item--compact' : ''}`
      }
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          {/* Active Glowing Glass Orb Background Layer */}
          {isActive && (
            <div className="glass-orb-glow-backdrop" aria-hidden="true">
              <span className="glass-orb-glow-core" />
              <span className="glass-orb-inner-sheen" />
            </div>
          )}

          {/* Icon with scaling, elevation and glow */}
          <span className="glass-orb-icon-wrapper">
            <Icon
              size={compact ? 20 : 19}
              className={`glass-orb-icon ${isActive ? 'glass-orb-icon--active' : ''}`}
            />
          </span>

          {/* Navigation Label */}
          {!compact && (
            <span className="glass-orb-label-text">
              {label}
            </span>
          )}

          {/* Active Orb Dot Indicator (matching the ◉ visual) */}
          {isActive && !compact && (
            <span className="glass-orb-dot-indicator" aria-hidden="true">
              <span className="glass-orb-dot-pulse" />
            </span>
          )}

          {/* Optional notification badge */}
          {badge !== undefined && (
            <span className="glass-orb-badge">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
})
