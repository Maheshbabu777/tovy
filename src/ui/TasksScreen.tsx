import { useEffect, useRef, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { supabase } from '../core/db/supabase'
import type { Project, Task, TaskEdit, TasksStore } from '../core/sync/tasks'
import { colors, fonts, projectColors, radius } from './tokens'

// Test hook: lets the end-to-end tests read tap-to-render timings.
const perf: number[] = []
;(globalThis as any).__perf = perf
function measure(action: () => void) {
  const start = performance.now()
  action()
  requestAnimationFrame(() => perf.push(performance.now() - start))
}

const UNDO_MS = 5000

function dueLabel(t: Task): string {
  if (!t.due_date) return ''
  return t.due_time ? `${t.due_date} ${t.due_time}` : t.due_date
}

export function TasksScreen({ store }: { store: TasksStore }) {
  const tasks = use$(store.tasks$) as Record<string, Task> | undefined
  const projectMap = use$(store.projects$) as Record<string, Project> | undefined
  const state = syncState(store.tasks$)
  const projectState = syncState(store.projects$)
  const pending = (use$(state.numPendingSets) ?? 0) + (use$(projectState.numPendingSets) ?? 0)
  const loaded = use$(state.isPersistLoaded)
  const [draft, setDraft] = useState('')
  const [projectDraft, setProjectDraft] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [undo, setUndo] = useState<{ undo: () => void; count: number } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [unsyncedCount, setUnsyncedCount] = useState(0)

  useEffect(() => store.catchUpAfterRealtime(), [store])
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  // Read the live count when the button is pressed, not the one from the last render, which can lag a fresh edit.
  function requestSignOut() {
    const count = (st: typeof state) =>
      Math.max(st.numPendingSets.peek() ?? 0, Object.keys(st.getPendingChanges() ?? {}).length)
    const unsynced = count(state) + count(projectState)
    if (unsynced > 0) {
      setUnsyncedCount(unsynced)
      setConfirmingSignOut(true)
    } else void signOut()
  }
  // This device only: other devices stay signed in. The user's store on this device is cleared once we are signed out.
  const signOut = () => supabase.auth.signOut({ scope: 'local' })

  function run(action: () => void) {
    try {
      setError('')
      action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function remove(id: string) {
    run(() => {
      const result = store.deleteTask(id)
      clearTimeout(undoTimer.current)
      setUndo({ undo: result.undo, count: result.ids.length })
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
    })
  }

  const projects = Object.values(projectMap ?? {})
    .filter((p) => p && !p.deleted)
    .sort((a, b) => (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id))
  const ctx: TreeContext = {
    store,
    tasks: tasks ?? {},
    projects,
    openId,
    setOpenId,
    run: (action) => run(() => measure(action)),
    remove,
  }

  const list = Object.values(tasks ?? {})
    .filter((t) => t && !t.deleted && !t.parent_id)
    .sort((a, b) => (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id))

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={require('../../assets/brand/tovy-logo.png')} style={styles.logo} accessibilityLabel="Tovy" />
        <Text testID="status" style={styles.status}>
          {!loaded ? 'loading' : pending > 0 ? `pending ${pending}` : 'synced'}
        </Text>
      </View>

      <View style={styles.addBar}>
        <TextInput
          testID="new-title"
          placeholder="Add a task"
          placeholderTextColor={colors.inkFaint}
          value={draft}
          onChangeText={setDraft}
          style={styles.addInput}
        />
        <Pressable
          testID="add"
          style={styles.addButton}
          onPress={() => {
            if (!draft.trim()) return
            run(() => measure(() => store.addTask({ title: draft.trim() })))
            setDraft('')
          }}
        >
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      {error ? (
        <Text testID="error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {[...projects.map((p) => ({ project: p as Project | null })), { project: null as Project | null }].map(
        ({ project }) => {
          const mine = list.filter((t) => (t.project_id ?? null) === (project?.id ?? null))
          if (!project && mine.length === 0 && projects.length > 0) return null
          return (
            <View
              key={project?.id ?? 'none'}
              testID={project ? `project-${project.id}` : 'project-none'}
              style={styles.card}
            >
              <ProjectHeader project={project} count={mine.length} ctx={ctx} />
              {mine.length === 0 ? <Text style={styles.empty}>No tasks</Text> : null}
              {mine.map((t) => (
                <TaskTree key={t.id} task={t} depth={0} ctx={ctx} />
              ))}
            </View>
          )
        },
      )}

      <View style={styles.addBar}>
        <TextInput
          testID="new-project"
          placeholder="New project"
          placeholderTextColor={colors.inkFaint}
          value={projectDraft}
          onChangeText={setProjectDraft}
          style={styles.addInput}
        />
        <Pressable
          testID="add-project"
          style={styles.addButton}
          onPress={() => {
            if (!projectDraft.trim()) return
            run(() => store.addProject(projectDraft.trim(), 'indigo'))
            setProjectDraft('')
          }}
        >
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      {undo ? (
        <View testID="undo-bar" style={styles.undoBar}>
          <Text style={styles.undoText}>{undo.count === 1 ? 'Task deleted' : `${undo.count} tasks deleted`}</Text>
          <Pressable
            testID="undo"
            onPress={() => {
              undo.undo()
              clearTimeout(undoTimer.current)
              setUndo(null)
            }}
          >
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      {confirmingSignOut ? (
        <View testID="unsynced-note" style={styles.warning}>
          <Text style={styles.rowTitle}>
            {unsyncedCount === 1 ? '1 change is' : `${unsyncedCount} changes are`} not saved to the server yet. Signing
            out will discard {unsyncedCount === 1 ? 'it' : 'them'}.
          </Text>
          <View style={styles.actions}>
            <Pressable testID="cancel-sign-out" style={styles.ghost} onPress={() => setConfirmingSignOut(false)}>
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
            <Pressable testID="confirm-sign-out" style={styles.ghost} onPress={signOut}>
              <Text style={[styles.ghostText, { color: colors.danger }]}>Sign out anyway</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable testID="sign-out" style={styles.ghost} onPress={requestSignOut}>
          <Text style={styles.ghostText}>Sign out</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

type TreeContext = {
  store: TasksStore
  tasks: Record<string, Task>
  projects: Project[]
  openId: string | null
  setOpenId: (id: string | null) => void
  run: (action: () => void) => void
  remove: (id: string) => void
}

const byCreated = (a: Task, b: Task) =>
  (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id)

// A task and, indented beneath it, its subtasks at any depth. The subtasks sit beside the row (not inside it) so each
// row stays one `task` element.
function TaskTree({ task, depth, ctx }: { task: Task; depth: number; ctx: TreeContext }) {
  const subtasks = Object.values(ctx.tasks)
    .filter((t) => t && !t.deleted && t.parent_id === task.id)
    .sort(byCreated)
  return (
    <>
      <TaskRow task={task} depth={depth} subtaskCount={subtasks.length} ctx={ctx} />
      {subtasks.map((t) => (
        <TaskTree key={t.id} task={t} depth={depth + 1} ctx={ctx} />
      ))}
    </>
  )
}

const colorNames = Object.keys(projectColors)

// "No project" (project is null) or a project: dot, name, count. A project's name can be edited here, its colour
// cycled, and it can be deleted (its tasks move to "No project").
function ProjectHeader({ project, count, ctx }: { project: Project | null; count: number; ctx: TreeContext }) {
  const dot = projectColors[project?.color ?? 'slate'] ?? projectColors.slate
  return (
    <View style={styles.row}>
      {project ? (
        <Pressable
          testID={`project-color-${project.id}`}
          accessibilityLabel="Change colour"
          style={styles.checkHit}
          onPress={() =>
            ctx.run(() =>
              ctx.store.setProjectColor(
                project.id,
                colorNames[(colorNames.indexOf(project.color) + 1) % colorNames.length],
              ),
            )
          }
        >
          <View style={[styles.dot, { backgroundColor: dot }]} />
        </Pressable>
      ) : (
        <View style={styles.checkHit}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
        </View>
      )}
      {project ? (
        <TextInput
          testID={`project-name-${project.id}`}
          value={project.name}
          onChangeText={(v) => ctx.run(() => ctx.store.renameProject(project.id, v))}
          style={[styles.projectName, { flex: 1 }]}
        />
      ) : (
        <Text testID="project-none-name" style={[styles.projectName, { flex: 1 }]}>
          No project
        </Text>
      )}
      <Text style={styles.meta}>{count === 1 ? '1 task' : `${count} tasks`}</Text>
      {project ? (
        <Pressable
          testID={`project-delete-${project.id}`}
          accessibilityLabel="Delete project"
          style={styles.checkHit}
          onPress={() => ctx.run(() => ctx.store.deleteProject(project.id))}
        >
          <Text style={styles.metaIcon}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function TaskRow({
  task,
  depth,
  subtaskCount,
  ctx,
}: {
  task: Task
  depth: number
  subtaskCount: number
  ctx: TreeContext
}) {
  const { store, run } = ctx
  const [subDraft, setSubDraft] = useState('')
  const done = !!task.done_at
  const open = ctx.openId === task.id
  const edit = (patch: TaskEdit) => run(() => store.editTask(task.id, patch))
  return (
    <View testID="task" style={[styles.rowWrap, { marginLeft: depth * 22 }]}>
      <View style={styles.row}>
        <Pressable
          testID={`done-${task.id}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          onPress={() => run(() => store.setDone(task.id, !done))}
          style={styles.checkHit}
        >
          <View style={[styles.check, done && styles.checkDone]}>
            {done ? <Text style={styles.tick}>✓</Text> : null}
          </View>
        </Pressable>
        <Pressable testID={`open-${task.id}`} onPress={() => ctx.setOpenId(open ? null : task.id)} style={{ flex: 1 }}>
          <Text testID={`title-${task.id}`} style={[styles.rowTitle, done && styles.rowDone]}>
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {task.kind === 'deep' ? <Text style={styles.badge}>Deep</Text> : null}
            {subtaskCount > 0 ? (
              <Text testID={`count-${task.id}`} style={styles.meta}>
                {subtaskCount === 1 ? '1 subtask' : `${subtaskCount} subtasks`}
              </Text>
            ) : null}
            {task.due_date ? <Text style={styles.meta}>{dueLabel(task)}</Text> : null}
          </View>
        </Pressable>
        <Pressable
          testID={`delete-${task.id}`}
          onPress={() => ctx.remove(task.id)}
          style={styles.checkHit}
          accessibilityLabel="Delete"
        >
          <Text style={styles.metaIcon}>✕</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.editor}>
          <TextInput
            testID={`edit-title-${task.id}`}
            value={task.title}
            onChangeText={(v) => edit({ title: v })}
            style={styles.field}
          />
          <TextInput
            testID={`edit-note-${task.id}`}
            value={task.note}
            placeholder="Note"
            placeholderTextColor={colors.inkFaint}
            multiline
            onChangeText={(v) => edit({ note: v })}
            style={[styles.field, { minHeight: 64 }]}
          />
          <View style={styles.actions}>
            <TextInput
              testID={`edit-date-${task.id}`}
              value={task.due_date ?? ''}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkFaint}
              onChangeText={(v) => edit(v ? { dueDate: v } : { dueDate: null, dueTime: null })}
              style={[styles.field, { flex: 1 }]}
            />
            <TextInput
              testID={`edit-time-${task.id}`}
              value={task.due_time ?? ''}
              placeholder="HH:MM"
              placeholderTextColor={colors.inkFaint}
              onChangeText={(v) => edit({ dueTime: v || null })}
              style={[styles.field, { flex: 1 }]}
            />
          </View>
          <View style={styles.metaRow}>
            {[{ id: null as string | null, name: 'No project' }, ...ctx.projects].map((p) => (
              <Pressable
                key={p.id ?? 'none'}
                testID={`move-${task.id}-${p.id ?? 'none'}`}
                onPress={() => run(() => store.moveToProject(task.id, p.id))}
              >
                <Text style={[styles.chip, (task.project_id ?? null) === p.id && styles.chipOn]}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            testID={`kind-${task.id}`}
            style={styles.ghost}
            onPress={() => run(() => store.setKind(task.id, task.kind === 'deep' ? 'quick' : 'deep'))}
          >
            <Text style={styles.ghostText}>
              {task.kind === 'deep' ? 'Deep task (tap to make it quick)' : 'Quick task (tap to make it deep)'}
            </Text>
          </Pressable>
          {task.kind === 'deep' ? (
            <View style={styles.actions}>
              <TextInput
                testID={`sub-title-${task.id}`}
                value={subDraft}
                placeholder="Add a subtask"
                placeholderTextColor={colors.inkFaint}
                onChangeText={setSubDraft}
                style={[styles.field, { flex: 1 }]}
              />
              <Pressable
                testID={`sub-add-${task.id}`}
                style={styles.addButton}
                onPress={() => {
                  if (!subDraft.trim()) return
                  run(() => store.addTask({ title: subDraft.trim(), parentId: task.id }))
                  setSubDraft('')
                }}
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 36, height: 36, resizeMode: 'contain' },
  status: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkFaint },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ring,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  addInput: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 8 },
  addButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  addText: { color: 'white', fontFamily: fonts.sans, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ring,
    padding: 12,
  },
  empty: { color: colors.inkFaint, fontFamily: fonts.sans, fontSize: 14, padding: 8 },
  rowWrap: { paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkHit: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.ok, borderColor: colors.ok },
  tick: { color: 'white', fontSize: 13, fontWeight: '700' },
  rowTitle: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '500', color: colors.ink },
  rowDone: { color: colors.inkFaint, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  meta: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  projectName: { fontFamily: fonts.sans, fontSize: 17, fontWeight: '600', color: colors.ink, padding: 0 },
  chip: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkSoft,
    borderWidth: 1,
    borderColor: colors.ring,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  chipOn: { color: 'white', backgroundColor: colors.accent, borderColor: colors.accent },
  metaIcon: { color: colors.inkFaint, fontSize: 14 },
  editor: { gap: 8, paddingLeft: 42, paddingBottom: 8 },
  field: {
    backgroundColor: colors.bg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.ring,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  undoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.control,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  undoText: { color: 'white', fontFamily: fonts.sans, fontSize: 14 },
  undoAction: { color: 'rgb(139,141,251)', fontFamily: fonts.sans, fontSize: 14, fontWeight: '600' },
  warning: {
    backgroundColor: colors.card,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 14,
    gap: 10,
  },
  ghost: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 },
  ghostText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
})
