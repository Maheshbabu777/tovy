import { useState } from 'react'
import { ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { use$ } from '@legendapp/state/react'
import { Icons } from './icons'
import { logStamp, percentOf, hasSubtasks, type LogEntry } from '../core/progress'
import type { Project, Task } from '../core/sync/tasks'
import { byCreated, dueLabel, isOverdue } from '../core/today'
import { AIBadge } from './components/AppMark'
import { Button } from './components/Button'
import { Checkbox } from './components/Checkbox'
import { Chip } from './components/Chip'
import { EmptyState } from './components/Feedback'
import { IconButton } from './components/IconButton'
import { ProgressRing } from './components/ProgressRing'
import { Slider } from './components/Slider'
import { useToast } from './components/Toast'
import { webStyle } from './components/web'
import { DateSheet } from './DateSheet'
import { ProjectPickerSheet } from './ProjectPickerSheet'
import { useStore } from './StoreContext'
import { PROJECT_COLORS, useTheme } from './theme'
import { fonts, radius, type, WIDE_BREAKPOINT } from './tokens'

// Design 11.9. A quick task is done or not done. A deep task has a progress card (ring, slider, quick steps and a
// note for the log), its subtasks, the progress log and a note. Edits are saved as you make them.
export function TaskDetail({
  id,
  onClose,
  onOpenTask,
}: {
  id: string
  onClose: () => void
  onOpenTask: (id: string) => void
}) {
  const store = useStore()
  const tasksMap = use$(store.tasks$) as Record<string, Task> | undefined
  const projectMap = use$(store.projects$) as Record<string, Project> | undefined
  // Not memoised: Legend-State changes these objects in place, so their identity does not change when a row does.
  const all = Object.values(tasksMap ?? {}).filter((t) => t && !t.deleted) as Task[]
  const task = all.find((t) => t.id === id)
  const projects = Object.values(projectMap ?? {}).filter((p) => p && !p.deleted) as Project[]

  if (!task) {
    return (
      <Frame label="" onClose={onClose}>
        <EmptyState
          icon={Icons.subtasks}
          title="This task is gone"
          body="It may have been deleted on another device."
        />
      </Frame>
    )
  }
  return <Body key={task.id} task={task} all={all} projects={projects} onClose={onClose} onOpenTask={onOpenTask} />
}

function Frame({
  children,
  label,
  onClose,
  onBack,
  onDelete,
}: {
  children: React.ReactNode
  label: string
  onClose: () => void
  onBack?: () => void
  onDelete?: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: wide ? 12 : 8,
          gap: 4,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        }}
      >
        {onBack || !wide ? (
          <IconButton icon={Icons.back} label="Back" onPress={onBack ?? onClose} testID="detail-back" />
        ) : null}
        <View style={{ flex: 1, paddingLeft: wide && !onBack ? 4 : 0 }}>
          {wide ? <Text style={[type.label, { color: c.text2 }]}>{label}</Text> : null}
        </View>
        {onDelete ? (
          <IconButton icon={Icons.delete} label="Delete task" onPress={onDelete} testID="detail-delete" />
        ) : null}
        {wide ? <IconButton icon={Icons.close} label="Close" onPress={onClose} testID="detail-close" /> : null}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: wide ? 24 : 20, paddingTop: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  )
}

function Body({
  task,
  all,
  projects,
  onClose,
  onOpenTask,
}: {
  task: Task
  all: Task[]
  projects: Project[]
  onClose: () => void
  onOpenTask: (id: string) => void
}) {
  const store = useStore()
  const toast = useToast()
  const { theme } = useTheme()
  const c = theme.colors
  const logsMap = use$(store.logs$) as Record<string, LogEntry> | undefined
  const [title, setTitle] = useState(task.title)
  const [logNote, setLogNote] = useState('')
  const [sheet, setSheet] = useState<'date' | 'project' | null>(null)
  const [subTitle, setSubTitle] = useState('')
  const now = new Date()

  const deep = task.kind === 'deep'
  const done = !!task.done_at
  const followsSubtasks = hasSubtasks(task, all)
  const percent = percentOf(task, all)
  const subs = all.filter((t) => t.parent_id === task.id).sort(byCreated)
  const subsDone = subs.filter((s) => s.done_at).length
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : undefined
  const entries = Object.values(logsMap ?? {})
    .filter((e) => e && !e.deleted && e.task_id === task.id)
    .sort((a, b) => (b.created_at ?? b.day).localeCompare(a.created_at ?? a.day) || b.id.localeCompare(a.id))

  function run(action: () => void) {
    try {
      action()
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e) })
    }
  }
  function remove() {
    run(() => {
      const { ids, undo } = store.deleteTask(task.id)
      toast.show({
        message: ids.length === 1 ? 'Task deleted' : `${ids.length} tasks deleted`,
        action: { label: 'Undo', onPress: undo },
      })
      onClose()
    })
  }
  function commit(value: number) {
    run(() => {
      store.setProgress(task.id, value, { note: logNote })
      setLogNote('')
    })
  }
  function addSubtask() {
    const text = subTitle.trim()
    if (!text) return
    run(() => {
      store.addTask({ title: text, parentId: task.id, projectId: task.project_id })
      setSubTitle('')
    })
  }
  const back = task.parent_id ? () => onOpenTask(task.parent_id!) : undefined

  return (
    <Frame label={deep ? 'Deep task' : 'Quick task'} onClose={onClose} onBack={back} onDelete={remove}>
      <TextInput
        testID="detail-title"
        accessibilityLabel="Task title"
        value={title}
        onChangeText={(v) => {
          setTitle(v)
          if (v.trim()) run(() => store.editTask(task.id, { title: v }))
        }}
        onBlur={() => {
          if (!title.trim()) setTitle(task.title) // a task keeps a title
        }}
        multiline
        numberOfLines={1}
        scrollEnabled={false}
        blurOnSubmit
        placeholder="Task title"
        placeholderTextColor={c.text3}
        style={[type.h1, { color: c.text, paddingVertical: 4 }, webStyle({ outlineStyle: 'none' })]}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Chip
          testID="chip-date"
          icon={Icons.date}
          label={dueLabel(task, now)}
          active={!!task.due_date}
          onPress={() => setSheet('date')}
        />
        <Chip
          testID="chip-project"
          label={project ? project.name : 'No project'}
          dot={project ? (PROJECT_COLORS[project.color] ?? PROJECT_COLORS.slate) : undefined}
          onPress={() => setSheet('project')}
        />
      </View>
      {isOverdue(task, now) ? (
        <Text style={[type.meta, { color: c.red, marginTop: 8 }]}>This task is overdue.</Text>
      ) : null}

      {!deep ? (
        <View
          style={{
            marginTop: 24,
            backgroundColor: c.panel,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.line,
            padding: 20,
            gap: 16,
          }}
        >
          <Text style={[type.bodyS, { color: c.text2 }]}>
            A quick task is done or not done. Switch to a deep task to log partial progress, add subtasks and keep a
            history.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              testID="detail-done"
              label={done ? 'Reopen' : 'Mark done'}
              onPress={() => run(() => store.setDone(task.id, !done))}
            />
            <Button
              testID="detail-track"
              label="Track progress"
              variant="ghost"
              onPress={() => run(() => store.setKind(task.id, 'deep'))}
            />
          </View>
        </View>
      ) : (
        <>
          <View
            style={{
              marginTop: 24,
              backgroundColor: c.panel,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View>
                <ProgressRing size={72} stroke={5} progress={percent / 100} done={done} />
                {done ? null : (
                  <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <Text testID="detail-percent" style={[type.title, { color: c.text }]}>
                      {percent}
                      <Text style={[type.monoXs, { color: c.text2 }]}>%</Text>
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                {followsSubtasks ? (
                  <Text testID="follows-subtasks" style={[type.meta, { color: c.text2 }]}>
                    Progress follows subtasks. Each of the {subs.length} counts {Math.round(100 / subs.length)}%.
                  </Text>
                ) : (
                  <Slider testID="progress-slider" label="Progress" value={percent} onCommit={commit} />
                )}
              </View>
            </View>
            {followsSubtasks ? null : (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[5, 10, 25].map((step) => (
                  <Button
                    key={step}
                    testID={`step-${step}`}
                    label={`+${step}%`}
                    variant="ghost"
                    small
                    onPress={() => commit(Math.min(100, percent + step))}
                  />
                ))}
                <Button
                  testID="detail-done"
                  label={done ? 'Reopen' : 'Mark done'}
                  variant="ghost"
                  small
                  onPress={() => run(() => store.setDone(task.id, !done))}
                />
              </View>
            )}
            {followsSubtasks ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  testID="detail-done"
                  label={done ? 'Reopen' : 'Mark done'}
                  variant="ghost"
                  small
                  onPress={() => run(() => store.setDone(task.id, !done))}
                />
              </View>
            ) : (
              <TextInput
                testID="log-note"
                accessibilityLabel="Note for the next log entry"
                value={logNote}
                onChangeText={setLogNote}
                placeholder="Add a note to the next log entry"
                placeholderTextColor={c.text3}
                style={[
                  {
                    height: 40,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: c.line,
                    backgroundColor: c.bg,
                    paddingHorizontal: 12,
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: c.text,
                  },
                  webStyle({ outlineStyle: 'none' }),
                ]}
              />
            )}
          </View>

          <BlockHeader title="Subtasks" value={subs.length ? `${subsDone}/${subs.length}` : undefined} />
          {subs.map((sub) => (
            <View
              key={sub.id}
              testID="subtask"
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Checkbox
                testID={`sub-done-${sub.id}`}
                checked={!!sub.done_at}
                label={sub.done_at ? `Reopen ${sub.title}` : `Finish ${sub.title}`}
                onToggle={() => run(() => store.setDone(sub.id, !sub.done_at))}
              />
              <Text
                testID={`sub-open-${sub.id}`}
                accessibilityRole="button"
                onPress={() => onOpenTask(sub.id)}
                style={[
                  type.body,
                  {
                    flex: 1,
                    color: sub.done_at ? c.text3 : c.text,
                    textDecorationLine: sub.done_at ? 'line-through' : 'none',
                  },
                ]}
              >
                {sub.title}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <TextInput
              testID="sub-title"
              accessibilityLabel="Add a subtask"
              value={subTitle}
              onChangeText={setSubTitle}
              onSubmitEditing={addSubtask}
              placeholder="Add a subtask"
              placeholderTextColor={c.text3}
              style={[
                {
                  flex: 1,
                  height: 40,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.line,
                  backgroundColor: c.bg,
                  paddingHorizontal: 12,
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: c.text,
                },
                webStyle({ outlineStyle: 'none' }),
              ]}
            />
            <Button
              testID="sub-add"
              label="Add"
              variant="soft"
              small
              onPress={addSubtask}
              disabled={!subTitle.trim()}
            />
          </View>

          <BlockHeader title="Progress log" />
          {entries.length === 0 ? (
            <Text testID="log-empty" style={[type.bodyS, { color: c.text2 }]}>
              No entries yet. Move the slider to log your first.
            </Text>
          ) : (
            <View style={{ borderLeftWidth: 1, borderLeftColor: c.line, marginLeft: 3, paddingLeft: 16, gap: 16 }}>
              {entries.map((e) => (
                <LogRow key={e.id} entry={e} />
              ))}
            </View>
          )}

          <BlockHeader title="Note" />
          <TextInput
            testID="detail-note"
            accessibilityLabel="Note"
            value={task.note}
            onChangeText={(v) => run(() => store.editTask(task.id, { note: v }))}
            multiline
            placeholder="Add a note"
            placeholderTextColor={c.text3}
            style={[
              {
                minHeight: 80,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.bg,
                padding: 12,
                fontFamily: fonts.sans,
                fontSize: 15,
                color: c.text,
                textAlignVertical: 'top',
              },
              webStyle({ outlineStyle: 'none' }),
            ]}
          />
        </>
      )}

      <DateSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        value={task.due_date}
        onPick={(day) => run(() => store.editTask(task.id, { dueDate: day, dueTime: day ? task.due_time : null }))}
      />
      <ProjectPickerSheet
        visible={sheet === 'project'}
        onClose={() => setSheet(null)}
        projects={projects}
        value={task.project_id}
        onPick={(projectId) => run(() => store.moveToProject(task.id, projectId))}
      />
    </Frame>
  )
}

function BlockHeader({ title, value }: { title: string; value?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginTop: 32,
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      }}
    >
      <Text style={[type.label, { color: c.text }]}>{title}</Text>
      {value ? <Text style={[type.monoS, { color: c.text3 }]}>{value}</Text> : null}
    </View>
  )
}

// A dot on the line (text-3 for you, text for an AI app), the time, who, the change in percent, and the text.
function LogRow({ entry }: { entry: LogEntry }) {
  const { theme } = useTheme()
  const c = theme.colors
  const ai = entry.source !== 'you'
  const from = entry.progress_after - entry.delta
  return (
    <View testID="log-entry" style={{ gap: 2 }}>
      <View
        style={{
          position: 'absolute',
          left: -21,
          top: 6,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: ai ? c.text : c.lineStrong,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[type.monoXs, { color: c.text2 }]}>{logStamp(entry)}</Text>
        {ai ? <AIBadge label={entry.source} /> : <Text style={[type.meta, { color: c.text2 }]}>You</Text>}
        <View style={{ flex: 1 }} />
        <Text style={[type.monoXs, { color: entry.delta >= 0 ? c.text2 : c.red }]}>
          {`${entry.delta >= 0 ? '+' : '-'}${Math.abs(entry.delta)}%`}
        </Text>
      </View>
      <Text style={[type.bodyS, { color: c.text }]}>{entry.note || `${from}% to ${entry.progress_after}%`}</Text>
    </View>
  )
}
