import { useEffect, useRef, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { supabase } from '../core/db/supabase'
import type { Task, TasksStore } from '../core/sync/tasks'
import { colors, fonts, radius } from './tokens'

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
  const state = syncState(store.tasks$)
  const pending = use$(state.numPendingSets) ?? 0
  const loaded = use$(state.isPersistLoaded)
  const [draft, setDraft] = useState('')
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
    const unsynced = Math.max(state.numPendingSets.peek() ?? 0, Object.keys(state.getPendingChanges() ?? {}).length)
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

      <View style={styles.card}>
        {list.length === 0 ? <Text style={styles.empty}>No tasks yet</Text> : null}
        {list.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            open={openId === t.id}
            onToggleOpen={() => setOpenId(openId === t.id ? null : t.id)}
            onDone={() => run(() => measure(() => store.setDone(t.id, !t.done_at)))}
            onEdit={(patch) => run(() => measure(() => store.editTask(t.id, patch)))}
            onDelete={() => remove(t.id)}
          />
        ))}
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

type RowProps = {
  task: Task
  open: boolean
  onToggleOpen: () => void
  onDone: () => void
  onEdit: (patch: { title?: string; note?: string; dueDate?: string | null; dueTime?: string | null }) => void
  onDelete: () => void
}

function TaskRow({ task, open, onToggleOpen, onDone, onEdit, onDelete }: RowProps) {
  const done = !!task.done_at
  return (
    <View testID="task" style={styles.rowWrap}>
      <View style={styles.row}>
        <Pressable
          testID={`done-${task.id}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          onPress={onDone}
          style={styles.checkHit}
        >
          <View style={[styles.check, done && styles.checkDone]}>
            {done ? <Text style={styles.tick}>✓</Text> : null}
          </View>
        </Pressable>
        <Pressable testID={`open-${task.id}`} onPress={onToggleOpen} style={{ flex: 1 }}>
          <Text testID={`title-${task.id}`} style={[styles.rowTitle, done && styles.rowDone]}>
            {task.title}
          </Text>
          {task.due_date ? <Text style={styles.meta}>{dueLabel(task)}</Text> : null}
        </Pressable>
        <Pressable testID={`delete-${task.id}`} onPress={onDelete} style={styles.checkHit} accessibilityLabel="Delete">
          <Text style={styles.metaIcon}>✕</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.editor}>
          <TextInput
            testID={`edit-title-${task.id}`}
            value={task.title}
            onChangeText={(v) => onEdit({ title: v })}
            style={styles.field}
          />
          <TextInput
            testID={`edit-note-${task.id}`}
            value={task.note}
            placeholder="Note"
            placeholderTextColor={colors.inkFaint}
            multiline
            onChangeText={(v) => onEdit({ note: v })}
            style={[styles.field, { minHeight: 64 }]}
          />
          <View style={styles.actions}>
            <TextInput
              testID={`edit-date-${task.id}`}
              value={task.due_date ?? ''}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkFaint}
              onChangeText={(v) => onEdit(v ? { dueDate: v } : { dueDate: null, dueTime: null })}
              style={[styles.field, { flex: 1 }]}
            />
            <TextInput
              testID={`edit-time-${task.id}`}
              value={task.due_time ?? ''}
              placeholder="HH:MM"
              placeholderTextColor={colors.inkFaint}
              onChangeText={(v) => onEdit({ dueTime: v || null })}
              style={[styles.field, { flex: 1 }]}
            />
          </View>
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
  meta: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '500', color: colors.inkSoft, marginTop: 2 },
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
