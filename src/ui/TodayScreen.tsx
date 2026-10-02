import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CircleCheck, Plus } from 'lucide-react-native'
import { readCachedProfile } from '../core/profile/profile'
import type { Project, Task } from '../core/sync/tasks'
import { addDays, dateLine, greeting, groupTasks, localDay, subtaskProgress } from '../core/today'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { useToast } from './components/Toast'
import { webStyle } from './components/web'
import { onQuickAdd } from './quickAdd'
import { QuickAddSheet } from './QuickAddSheet'
import { useStore } from './StoreContext'
import { TaskRow } from './TaskRow'
import { useTheme } from './theme'
import { fonts, radius, type, WIDE_BREAKPOINT } from './tokens'
import { useOnline } from './useOnline'
import { useTaskActions } from './useTaskActions'

// The date and the greeting stay right across midnight and a long session.
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// Design 11.6, without the points ring, routines and streak line (their own specs). Groups: Overdue, Due today, Coming
// up, Anytime, and what was finished today.
export function TodayScreen() {
  const store = useStore()
  const toast = useToast()
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const online = useOnline()
  const { run, toggleDone, open, openMenu, menuElement } = useTaskActions(now)

  const tasksMap = use$(store.tasks$) as Record<string, Task> | undefined
  const projectMap = use$(store.projects$) as Record<string, Project> | undefined
  const taskState = syncState(store.tasks$)
  const loaded = use$(taskState.isPersistLoaded)
  const syncError = use$(taskState.error)

  const [firstName, setFirstName] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => store.catchUpAfterRealtime(), [store])
  useEffect(() => onQuickAdd(() => setSheetOpen(true)), [])
  useEffect(() => {
    void readCachedProfile(store.userId).then((p) => setFirstName(p?.first_name ?? ''))
  }, [store.userId])

  // Not memoised on `tasksMap`: Legend-State changes that object in place, so its identity does not change when a task does.
  const tasks = Object.values(tasksMap ?? {}).filter(Boolean) as Task[]
  const projects = (Object.values(projectMap ?? {}).filter((p) => p && !p.deleted) as Project[]).sort(
    (a, b) => (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id),
  )
  const groups = groupTasks(tasks, now)
  const sections: { key: string; title: string; rows: Task[] }[] = [
    { key: 'overdue', title: 'Overdue', rows: groups.overdue },
    { key: 'due-today', title: 'Due today', rows: groups.dueToday },
    { key: 'coming-up', title: 'Coming up', rows: groups.comingUp },
    { key: 'anytime', title: 'Anytime', rows: groups.anytime },
    { key: 'done-today', title: 'Done today', rows: groups.doneToday },
  ].filter((s) => s.rows.length > 0)

  function addTask(input: { title: string; dueDate?: string | null; projectId?: string | null }) {
    run(() => {
      store.addTask({ title: input.title, dueDate: input.dueDate ?? null, projectId: input.projectId ?? null })
      const when = input.dueDate
        ? ` · ${input.dueDate === localDay(now) ? 'Today' : input.dueDate === addDays(localDay(now), 1) ? 'Tomorrow' : input.dueDate}`
        : ''
      toast.show({ message: `Added "${input.title}"${when}` })
    })
  }

  const quickBar = wide ? (
    <View
      style={{
        height: 48,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.ink3,
        backgroundColor: c.bg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
      }}
    >
      <Plus size={18} color={c.accent} strokeWidth={1.75} />
      <TextInput
        testID="new-title"
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => {
          const text = draft.trim()
          if (!text) return
          addTask({ title: text })
          setDraft('')
        }}
        placeholder="Add a task..."
        placeholderTextColor={c.ink5}
        accessibilityLabel="Add a task"
        style={[{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: c.ink }, webStyle({ outlineStyle: 'none' })]}
      />
      <View
        style={{
          borderWidth: 1,
          borderColor: c.ink3,
          borderRadius: radius.sm,
          paddingHorizontal: 6,
          paddingVertical: 1,
        }}
      >
        <Text style={[type.monoXs, { color: c.ink6 }]}>N</Text>
      </View>
    </View>
  ) : null

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: wide ? 32 : 16,
          paddingTop: wide ? 24 : 16,
          paddingBottom: wide ? 48 : 96 + insets.bottom,
        }}
      >
        <View style={{ width: '100%', maxWidth: 672, alignSelf: 'center' }}>
          {quickBar}
          <View
            style={{
              marginTop: wide ? 28 : 8,
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={[type.label, { color: c.ink6 }]}>{dateLine(now)}</Text>
              <Text testID="greeting" accessibilityRole="header" style={[type.h1Large, { color: c.ink, marginTop: 2 }]}>
                {greeting(now)}
                {firstName ? `, ${firstName}` : ''}
              </Text>
            </View>
          </View>

          <View style={{ gap: 8, marginTop: 16 }}>
            {!online ? <Banner kind="offline">Offline. Changes are saved on this device and sync later.</Banner> : null}
            {online && syncError ? <Banner kind="error">Sync failed. Your data is safe locally.</Banner> : null}
          </View>

          {!loaded ? (
            <View style={{ marginTop: 16 }}>
              <Skeleton />
            </View>
          ) : sections.length === 0 ? (
            <EmptyState icon={CircleCheck} title="A clear day" body="Nothing scheduled. Add a task to get started." />
          ) : (
            sections.map((section) => (
              <View key={section.key} testID={`section-${section.key}`}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingTop: 24,
                    paddingBottom: 4,
                  }}
                >
                  <Text style={[type.label, { color: c.ink6 }]}>{section.title}</Text>
                  <Text style={[type.label, { color: c.ink5 }]}>{section.rows.length}</Text>
                </View>
                {section.rows.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={task.project_id ? projectMap?.[task.project_id] : undefined}
                    progress={subtaskProgress(task.id, tasks)}
                    now={now}
                    onToggleDone={() => toggleDone(task)}
                    onOpen={() => open(task)}
                    onMenu={(at) => openMenu(task, at)}
                  />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {wide ? null : (
        <View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 12,
              paddingTop: 24,
              paddingBottom: 12,
            },
            webStyle({ backgroundImage: `linear-gradient(to top, ${c.bg}, ${c.bgClear})` }),
          ]}
        >
          <Pressable
            testID="quick-bar"
            accessibilityRole="button"
            accessibilityLabel="Add a task"
            onPress={() => setSheetOpen(true)}
            style={{
              height: 48,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.ink3,
              backgroundColor: c.bg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
            }}
          >
            <Plus size={18} color={c.accent} strokeWidth={1.75} />
            <Text style={[type.body, { color: c.ink5 }]}>Add a task...</Text>
          </Pressable>
        </View>
      )}

      <QuickAddSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        projects={projects}
        onAdd={(t) => addTask(t)}
      />
      {menuElement}
    </View>
  )
}
