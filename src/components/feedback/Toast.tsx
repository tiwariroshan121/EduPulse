import { CheckCircle2, Info, XCircle } from 'lucide-react'

export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'info' | 'error' }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? XCircle : Info
  return <div className={`toast toast--${tone}`} role="status"><Icon size={19} />{message}</div>
}
