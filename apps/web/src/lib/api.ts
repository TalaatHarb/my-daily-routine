import type {
  CreateTaskRequest,
  Label,
  LabelRequest,
  LabelSummary,
  ProblemDetails,
  Task,
  TaskQuery,
  TaskStatus,
  UpdateProfileRequest,
  UpdateTaskRequest,
  UserProfile,
} from '../types/api'
import { environment } from './environment'

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ProblemDetails

  constructor(status: number, message: string, problem?: ProblemDetails) {
    super(message)
    this.status = status
    this.problem = problem
  }
}

export type LabelKind = 'categories' | 'tags'

async function request<T>(token: string | undefined, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${environment.apiBaseUrl}${path}`, { ...init, headers })

  if (!response.ok) {
    let problem: ProblemDetails | undefined
    try {
      problem = (await response.json()) as ProblemDetails
    } catch {
      problem = undefined
    }
    const message =
      problem?.detail ||
      (problem?.errors ? Object.values(problem.errors).flat().join(' ') : undefined) ||
      problem?.title ||
      `Request failed with status ${response.status}`
    throw new ApiError(response.status, message, problem)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function toQueryString(query: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

const json = (body: unknown) => JSON.stringify(body)

/** Creates API functions bound to an access token. */
export function createApi(token: string | undefined) {
  return {
    getMe: () => request<UserProfile>(token, '/me'),
    updateMe: (body: UpdateProfileRequest) => request<UserProfile>(token, '/me', { method: 'PUT', body: json(body) }),

    listTasks: (query: TaskQuery = {}) => request<Task[]>(token, `/tasks${toQueryString(query)}`),
    getTask: (id: string) => request<Task>(token, `/tasks/${id}`),
    createTask: (body: CreateTaskRequest) => request<Task>(token, '/tasks', { method: 'POST', body: json(body) }),
    updateTask: (id: string, body: UpdateTaskRequest) =>
      request<Task>(token, `/tasks/${id}`, { method: 'PUT', body: json(body) }),
    setTaskStatus: (id: string, status: TaskStatus) =>
      request<Task>(token, `/tasks/${id}/status`, { method: 'PATCH', body: json({ status }) }),
    moveTask: (id: string, plannedDate: string) =>
      request<Task>(token, `/tasks/${id}/move`, { method: 'POST', body: json({ plannedDate }) }),
    duplicateTask: (id: string) => request<Task>(token, `/tasks/${id}/duplicate`, { method: 'POST' }),
    deleteTask: (id: string) => request<void>(token, `/tasks/${id}`, { method: 'DELETE' }),

    listLabels: (kind: LabelKind, search = '', limit = 50) =>
      request<LabelSummary[]>(token, `/${kind}${toQueryString({ search, limit })}`),
    createLabel: (kind: LabelKind, body: LabelRequest) =>
      request<Label>(token, `/${kind}`, { method: 'POST', body: json(body) }),
    updateLabel: (kind: LabelKind, id: string, body: Required<LabelRequest>) =>
      request<Label>(token, `/${kind}/${id}`, { method: 'PUT', body: json(body) }),
    deleteLabel: (kind: LabelKind, id: string) => request<void>(token, `/${kind}/${id}`, { method: 'DELETE' }),
  }
}

export type Api = ReturnType<typeof createApi>
