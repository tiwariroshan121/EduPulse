import type { LucideIcon } from 'lucide-react'
import {
  BarChart3, BellRing, CalendarDays, CheckSquare, ClipboardCheck,
  FileStack, GraduationCap, HelpCircle, LayoutDashboard, MessageCircle,
  Settings, ShieldCheck, Users, BookOpen,
} from 'lucide-react'
import type { Role } from '../types/domain'

export interface NavigationItem {
  label: string
  path: string
  icon: LucideIcon
}

export const roleLabels: Record<Role, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Principal / Admin',
}

export const navigation: Record<Role, NavigationItem[]> = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Timetable', path: '/student/timetable', icon: CalendarDays },
    { label: 'Notices', path: '/student/notices', icon: BellRing },
    { label: 'Notes & Materials', path: '/student/notes', icon: FileStack },
    { label: 'Assignments', path: '/student/assignments', icon: CheckSquare },
    { label: 'Daily Doubts', path: '/student/doubts', icon: HelpCircle },
    { label: 'Messages & Groups', path: '/student/communication', icon: MessageCircle },
    { label: 'Settings', path: '/student/settings', icon: Settings },
  ],
  teacher: [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'My Classes', path: '/teacher/classes', icon: GraduationCap },
    { label: 'Students', path: '/teacher/students', icon: Users },
    { label: 'Timetable', path: '/teacher/timetable', icon: CalendarDays },
    { label: 'Materials', path: '/teacher/materials', icon: FileStack },
    { label: 'Assignments', path: '/teacher/assignments', icon: CheckSquare },
    { label: 'Submissions', path: '/teacher/submissions', icon: ClipboardCheck },
    { label: 'Doubts', path: '/teacher/doubts', icon: HelpCircle },
    { label: 'Announcements', path: '/teacher/announcements', icon: BellRing },
    { label: 'Messages & Groups', path: '/teacher/communication', icon: MessageCircle },
    { label: 'Settings', path: '/teacher/settings', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/admin/students', icon: Users },
    { label: 'Teachers', path: '/admin/teachers', icon: GraduationCap },
    { label: 'Verification', path: '/admin/verification', icon: ShieldCheck },
    { label: 'Timetable', path: '/admin/timetable', icon: CalendarDays },
    { label: 'Academic Structure', path: '/admin/academic', icon: BookOpen },
    { label: 'Announcements', path: '/admin/announcements', icon: BellRing },
    { label: 'Messages & Groups', path: '/admin/communication', icon: MessageCircle },
    { label: 'Statistics', path: '/admin/statistics', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],
}
