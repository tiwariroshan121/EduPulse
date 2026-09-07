import { X } from 'lucide-react'
import { useEffect, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type PropsWithChildren, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'

interface CardProps extends HTMLAttributes<HTMLElement> {
  className?: string
  interactive?: boolean
}

export function Card({ children, className = '', interactive = false, onMouseMove, ...props }: PropsWithChildren<CardProps>) {
  const cardRef = useRef<HTMLElement | null>(null)

  const handleMouseMove = (e: ReactMouseEvent<HTMLElement>) => {
    if (interactive && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      cardRef.current.style.setProperty('--mouse-x', `${x}px`)
      cardRef.current.style.setProperty('--mouse-y', `${y}px`)
    }
    onMouseMove?.(e)
  }

  return (
    <section
      ref={cardRef}
      className={`card ${interactive ? 'glass-card--interactive' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {children}
    </section>
  )
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusPill({ children, tone }: PropsWithChildren<{ tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>) {
  return <span className={`status status--${tone ?? 'neutral'}`}>{children}</span>
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon?: ReactNode
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon && <div style={{ marginBottom: 10, color: 'var(--text-muted)' }}>{icon}</div>}
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'dark'
  size?: 'small' | 'large'
}

export function Button({ className = '', variant, size, ...props }: ButtonProps) {
  const variantClass = variant ? `button--${variant}` : ''
  const sizeClass = size ? `button--${size}` : ''
  return <button className={`button ${variantClass} ${sizeClass} ${className}`.trim()} {...props} />
}
