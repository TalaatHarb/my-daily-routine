export type TaskStatus = 'todo' | 'inProgress' | 'done'
export type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks'
export type ThemePreference = 'system' | 'light' | 'dark'
export type Locale = 'en' | 'ar'

export interface UserProfile {
  id: string
  subject: string
  username: string | null
  email: string | null
  displayName: string | null
  firstName: string | null
  lastName: string | null
  locale: Locale | null
  timeZone: string | null
  theme: ThemePreference
  createdAt: string
  updatedAt: string
}

export interface UpdateProfileRequest {
  displayName?: string | null
  locale?: Locale | null
  timeZone?: string | null
  theme?: ThemePreference
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface LabelSummary extends Label {
  taskCount: number
}

export interface Task {
  id: string
  name: string
  description: string | null
  plannedDate: string
  startTime: string | null
  duration: number
  durationUnit: DurationUnit
  status: TaskStatus
  completedAt: string | null
  impact: number
  resources: number
  category: Label | null
  tags: Label[]
  metadata: Record<string, string>
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  name: string
  plannedDate?: string
  startTime?: string | null
  description?: string | null
  duration?: number
  durationUnit?: DurationUnit
  status?: TaskStatus
  impact?: number
  resources?: number
  category?: string | null
  tags?: string[]
  metadata?: Record<string, string>
}

export interface UpdateTaskRequest {
  name: string
  description: string | null
  plannedDate: string
  startTime: string | null
  duration: number
  durationUnit: DurationUnit
  status: TaskStatus
  impact: number
  resources: number
  category: string | null
  tags: string[]
  metadata: Record<string, string>
}

export interface TaskQuery {
  date?: string
  from?: string
  to?: string
  overdue?: boolean
  all?: boolean
  status?: TaskStatus
  categoryId?: string
  tag?: string
  search?: string
}

export interface LabelRequest {
  name: string
  color?: string
}

export interface ProblemDetails {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
}
