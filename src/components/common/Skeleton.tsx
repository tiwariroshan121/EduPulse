import React from 'react'

export function Skeleton({
  width,
  height,
  borderRadius,
  className = '',
  style,
}: {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '16px',
        borderRadius: borderRadius ?? 'var(--radius-sm)',
        ...style,
      }}
      aria-hidden="true"
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="page-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Skeleton width={180} height={28} style={{ marginBottom: 8 }} />
          <Skeleton width={260} height={16} />
        </div>
        <Skeleton width={110} height={40} borderRadius="var(--radius-md)" />
      </div>

      <div className="metric-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card metric-card">
            <Skeleton width={44} height={44} borderRadius="var(--radius-md)" />
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid--primary">
        <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
          <Skeleton width={150} height={20} />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={60} borderRadius="var(--radius-md)" />
          ))}
        </div>
        <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
          <Skeleton width={120} height={20} />
          <Skeleton height={140} borderRadius="var(--radius-md)" />
        </div>
      </div>
    </div>
  )
}

export function TimetableSkeleton() {
  return (
    <div className="timetable-container">
      <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={220} height={32} />
        <Skeleton width={140} height={38} borderRadius="var(--radius-md)" />
      </div>
      <div className="card" style={{ padding: 18, display: 'flex', gap: 12 }}>
        <Skeleton width={120} height={36} borderRadius="var(--radius-md)" />
        <Skeleton width={120} height={36} borderRadius="var(--radius-md)" />
        <Skeleton width={120} height={36} borderRadius="var(--radius-md)" />
      </div>
      <div className="card" style={{ padding: 24, minHeight: 400, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ display: 'grid', gap: 12 }}>
            <Skeleton height={30} borderRadius="var(--radius-sm)" />
            <Skeleton height={100} borderRadius="var(--radius-md)" />
            <Skeleton height={100} borderRadius="var(--radius-md)" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 520, padding: 0 }}>
      <div style={{ padding: 16, borderRight: '1px solid var(--glass-border)', display: 'grid', gap: 12 }}>
        <Skeleton height={38} borderRadius="var(--radius-md)" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Skeleton width={40} height={40} borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
              <Skeleton width="90%" height={12} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: 16 }}>
          <Skeleton width={44} height={44} borderRadius="50%" />
          <Skeleton width={160} height={20} />
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <Skeleton width="45%" height={48} borderRadius="var(--radius-md)" />
          <Skeleton width="50%" height={48} borderRadius="var(--radius-md)" style={{ justifySelf: 'end' }} />
          <Skeleton width="40%" height={48} borderRadius="var(--radius-md)" />
        </div>
        <Skeleton height={46} borderRadius="var(--radius-md)" />
      </div>
    </div>
  )
}
