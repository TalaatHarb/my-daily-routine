import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { createApi, type LabelKind } from '../lib/api'
import type {
  CreateTaskRequest,
  LabelRequest,
  Task,
  TaskQuery,
  TaskStatus,
  UpdateProfileRequest,
  UpdateTaskRequest,
} from '../types/api'

export const queryKeys = {
  me: ['me'] as const,
  tasks: ['tasks'] as const,
  taskList: (query: TaskQuery) => ['tasks', query] as const,
  labels: ['labels'] as const,
  labelList: (kind: LabelKind, search: string) => ['labels', kind, search] as const,
}

export function useApi() {
  const auth = useAuth()
  const token = auth.user?.access_token
  return useMemo(() => createApi(token), [token])
}

export function useMe() {
  const api = useApi()
  const auth = useAuth()
  return useQuery({ queryKey: queryKeys.me, queryFn: api.getMe, enabled: auth.isAuthenticated, staleTime: 5 * 60_000 })
}

export function useUpdateMe() {
  const api = useApi()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => api.updateMe(body),
    onSuccess: (profile) => client.setQueryData(queryKeys.me, profile),
  })
}

export function useTasks(query: TaskQuery, enabled = true) {
  const api = useApi()
  const auth = useAuth()
  return useQuery({
    queryKey: queryKeys.taskList(query),
    queryFn: () => api.listTasks(query),
    enabled: auth.isAuthenticated && enabled,
  })
}

export function useLabels(kind: LabelKind, search = '', enabled = true) {
  const api = useApi()
  const auth = useAuth()
  return useQuery({
    queryKey: queryKeys.labelList(kind, search),
    queryFn: () => api.listLabels(kind, search),
    enabled: auth.isAuthenticated && enabled,
    staleTime: 30_000,
  })
}

type TaskSnapshot = Array<[QueryKey, Task[] | undefined]>

/** Mutations on tasks, with optimistic updates for the quick interactions. */
export function useTaskActions() {
  const api = useApi()
  const client = useQueryClient()

  const patchCachedTask = async (id: string, patch: (task: Task) => Task): Promise<TaskSnapshot> => {
    await client.cancelQueries({ queryKey: queryKeys.tasks })
    const snapshot = client.getQueriesData<Task[]>({ queryKey: queryKeys.tasks })
    client.setQueriesData<Task[]>({ queryKey: queryKeys.tasks }, (tasks) =>
      tasks?.map((task) => (task.id === id ? patch(task) : task)),
    )
    return snapshot
  }

  const restore = (snapshot?: TaskSnapshot) => snapshot?.forEach(([key, data]) => client.setQueryData(key, data))
  const invalidateTasks = () => client.invalidateQueries({ queryKey: queryKeys.tasks })
  const invalidateAll = () => {
    void client.invalidateQueries({ queryKey: queryKeys.tasks })
    void client.invalidateQueries({ queryKey: queryKeys.labels })
  }

  const create = useMutation({
    mutationFn: (body: CreateTaskRequest) => api.createTask(body),
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: queryKeys.tasks })
      const snapshot = client.getQueriesData<Task[]>({ queryKey: queryKeys.tasks })
      const now = new Date().toISOString()
      const placeholder: Task = {
        id: `temp-${now}`,
        name: body.name,
        description: null,
        plannedDate: body.plannedDate ?? '',
        startTime: body.startTime ?? null,
        duration: 0,
        durationUnit: 'minutes',
        status: 'todo',
        completedAt: null,
        impact: 0,
        resources: 0,
        category: null,
        tags: [],
        metadata: {},
        sortOrder: Number.MAX_SAFE_INTEGER,
        createdAt: now,
        updatedAt: now,
      }
      snapshot.forEach(([key]) => {
        const query = key[1] as TaskQuery | undefined
        if (query?.date && query.date === body.plannedDate) {
          client.setQueryData<Task[]>(key, (tasks) => (tasks ? [...tasks, placeholder] : tasks))
        }
      })
      return snapshot
    },
    onError: (_error, _variables, snapshot) => restore(snapshot),
    onSettled: invalidateAll,
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTaskRequest }) => api.updateTask(id, body),
    onSettled: invalidateAll,
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => api.setTaskStatus(id, status),
    onMutate: ({ id, status }) =>
      patchCachedTask(id, (task) => ({
        ...task,
        status,
        completedAt: status === 'done' ? new Date().toISOString() : null,
      })),
    onError: (_error, _variables, snapshot) => restore(snapshot),
    onSettled: invalidateTasks,
  })

  const move = useMutation({
    mutationFn: ({ id, plannedDate }: { id: string; plannedDate: string }) => api.moveTask(id, plannedDate),
    onMutate: async ({ id, plannedDate }) => {
      await client.cancelQueries({ queryKey: queryKeys.tasks })
      const snapshot = client.getQueriesData<Task[]>({ queryKey: queryKeys.tasks })
      // Remove from single-day lists that no longer contain the task; other lists refresh on settle.
      client.setQueriesData<Task[]>({ queryKey: queryKeys.tasks }, (tasks) =>
        tasks?.map((task) => (task.id === id ? { ...task, plannedDate } : task)),
      )
      snapshot.forEach(([key]) => {
        const query = key[1] as TaskQuery | undefined
        if (query?.date && query.date !== plannedDate) {
          client.setQueryData<Task[]>(key, (tasks) => tasks?.filter((task) => task.id !== id))
        }
      })
      return snapshot
    },
    onError: (_error, _variables, snapshot) => restore(snapshot),
    onSettled: invalidateTasks,
  })

  const duplicate = useMutation({
    mutationFn: (id: string) => api.duplicateTask(id),
    onSettled: invalidateTasks,
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.tasks })
      const snapshot = client.getQueriesData<Task[]>({ queryKey: queryKeys.tasks })
      client.setQueriesData<Task[]>({ queryKey: queryKeys.tasks }, (tasks) => tasks?.filter((task) => task.id !== id))
      return snapshot
    },
    onError: (_error, _variables, snapshot) => restore(snapshot),
    onSettled: invalidateAll,
  })

  return { create, update, setStatus, move, duplicate, remove }
}

export function useLabelActions(kind: LabelKind) {
  const api = useApi()
  const client = useQueryClient()
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: queryKeys.labels })
    void client.invalidateQueries({ queryKey: queryKeys.tasks })
  }

  const create = useMutation({ mutationFn: (body: LabelRequest) => api.createLabel(kind, body), onSettled: invalidate })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Required<LabelRequest> }) => api.updateLabel(kind, id, body),
    onSettled: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.deleteLabel(kind, id), onSettled: invalidate })

  return { create, update, remove }
}
