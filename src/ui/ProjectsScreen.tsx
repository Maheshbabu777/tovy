import { useEffect, useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { use$ } from '@legendapp/state/react'
import { syncState } from '@legendapp/state'
import { FolderPlus, ListChecks, Pencil, Plus } from 'lucide-react-native'
import { projectStats, sortProjects, taskCountLabel } from '../core/projects'
import { percentOf } from '../core/progress'
import type { Project, Task } from '../core/sync/tasks'
import { byCreated, byDue } from '../core/today'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { EmptyState, Skeleton } from './components/Feedback'
import { IconButton } from './components/IconButton'
import { Page } from './components/Page'
import { ProgressBar } from './components/ProgressBar'
import { ScreenHeader } from './components/ScreenHeader'
import { useToast } from './components/Toast'
import { ProjectSheet } from './ProjectSheet'
import { QuickAddSheet } from './QuickAddSheet'
import { useStore } from './StoreContext'
import { TaskRow } from './TaskRow'
import { PROJECT_COLORS, useTheme } from './theme'
import { type } from './tokens'
import { useTaskActions } from './useTaskActions'

const NONE = 'none' // the route id of the "No project" page

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// The Projects tab. With `?id=` it shows one project (the page stays inside the tab, so the tab bar or sidebar stays).
export function ProjectsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  return id ? <ProjectPage id={id} /> : <ProjectList />
}

function useProjectData() {
  const store = useStore()
  const tasksMap = use$(store.tasks$) as Record<string, Task> | undefined
  const projectMap = use$(store.projects$) as Record<string, Project> | undefined
  const loaded = use$(syncState(store.tasks$).isPersistLoaded)
  // Not memoised: Legend-State changes these objects in place, so their identity does not change when a task does.
  const tasks = Object.values(tasksMap ?? {}).filter(Boolean) as Task[]
  const projects = sortProjects((Object.values(projectMap ?? {}).filter((p) => p && !p.deleted) as Project[]) ?? [])
  return { store, tasks, projects, projectMap, loaded }
}

function ProjectList() {
  const { store, tasks, projects, loaded } = useProjectData()
  const router = useRouter()
  const toast = useToast()
  const columns = useWindowDimensions().width >= 640 ? 2 : 1
  const [creating, setCreating] = useState(false)

  const cards: { id: string; name: string; color: string }[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }))
  const hasLoose = projectStats(null, tasks).count > 0
  if (hasLoose) cards.push({ id: NONE, name: 'No project', color: 'slate' })
  const rows: (typeof cards)[] = []
  for (let i = 0; i < cards.length; i += columns) rows.push(cards.slice(i, i + columns))

  return (
    <Page>
      <ScreenHeader
        title="Projects"
        right={<IconButton icon={Plus} label="New project" onPress={() => setCreating(true)} testID="new-project" />}
      />
      <View style={{ marginTop: 8, gap: 8 }}>
        {!loaded ? (
          <Skeleton rows={3} />
        ) : cards.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="No projects yet"
            body="Group related tasks under a project, like Work or Home."
          >
            <Button label="New project" onPress={() => setCreating(true)} testID="empty-new-project" />
          </EmptyState>
        ) : (
          rows.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              {row.map((card) => (
                <ProjectCard
                  key={card.id}
                  {...card}
                  stats={projectStats(card.id === NONE ? null : card.id, tasks)}
                  onPress={() => router.push({ pathname: '/projects', params: { id: card.id } })}
                />
              ))}
              {row.length < columns ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))
        )}
      </View>
      <ProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onSave={({ name, color }) => {
          store.addProject(name, color)
          toast.show({ message: `Created "${name}"` })
        }}
      />
    </Page>
  )
}

function ProjectCard({
  id,
  name,
  color,
  stats,
  onPress,
}: {
  id: string
  name: string
  color: string
  stats: { count: number; percent: number }
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const tint = PROJECT_COLORS[color] ?? PROJECT_COLORS.slate
  return (
    <View style={{ flex: 1 }}>
      <Card onPress={onPress} testID={`project-${id}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
          <Text numberOfLines={1} style={[type.title, { color: c.ink, flex: 1 }]}>
            {name}
          </Text>
        </View>
        <Text style={[type.label, { color: c.ink6, marginTop: 4 }]}>
          {stats.count === 0 ? 'No tasks yet' : `${taskCountLabel(stats.count)} · ${stats.percent}% done`}
        </Text>
        <View style={{ marginTop: 12 }}>
          <ProgressBar percent={stats.percent} color={tint} />
        </View>
      </Card>
    </View>
  )
}

function ProjectPage({ id }: { id: string }) {
  const { store, tasks, projects, projectMap, loaded } = useProjectData()
  const router = useRouter()
  const toast = useToast()
  const now = useNow()
  const { run, toggleDone, open, openMenu, menuElement } = useTaskActions(now)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const { theme } = useTheme()
  const c = theme.colors

  const loose = id === NONE
  const project = loose ? undefined : projectMap?.[id]
  const missing = loaded && !loose && (!project || project.deleted)
  const back = () => router.setParams({ id: undefined })
  const own = tasks
    .filter((t) => !t.deleted && !t.parent_id && (t.project_id ?? null) === (loose ? null : id))
    .sort((a, b) => byDue(a, b) || byCreated(a, b))
  const open_ = own.filter((t) => !t.done_at)
  const done = own.filter((t) => t.done_at)

  if (missing) {
    return (
      <Page>
        <ScreenHeader title="Project" onBack={back} />
        <EmptyState icon={ListChecks} title="This project is gone" body="It may have been deleted on another device." />
      </Page>
    )
  }

  const title = loose ? 'No project' : (project?.name ?? '')
  const rowsOf = (list: Task[]) =>
    list.map((task) => (
      <TaskRow
        key={task.id}
        task={task}
        project={undefined}
        progress={percentOf(task, tasks)}
        now={now}
        onToggleDone={() => toggleDone(task)}
        onOpen={() => open(task)}
        onMenu={(at) => openMenu(task, at)}
      />
    ))

  return (
    <Page>
      <ScreenHeader
        title={title}
        subtitle={taskCountLabel(own.length)}
        onBack={back}
        right={
          <>
            <IconButton icon={Plus} label="Add task" onPress={() => setAdding(true)} testID="project-add-task" />
            {loose ? null : (
              <IconButton icon={Pencil} label="Edit project" onPress={() => setEditing(true)} testID="project-edit" />
            )}
          </>
        }
      />
      <View style={{ marginTop: 8 }}>
        {!loaded ? (
          <Skeleton rows={4} />
        ) : own.length === 0 ? (
          <EmptyState icon={ListChecks} title="No tasks yet" body="Add a task here, or move one in from its page.">
            <Button label="Add a task" onPress={() => setAdding(true)} testID="project-empty-add" />
          </EmptyState>
        ) : (
          <>
            {rowsOf(open_)}
            {done.length > 0 ? (
              <>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 24, paddingBottom: 4 }}>
                  <Text style={[type.label, { color: c.ink6 }]}>Done</Text>
                  <Text style={[type.label, { color: c.ink5 }]}>{done.length}</Text>
                </View>
                {rowsOf(done)}
              </>
            ) : null}
          </>
        )}
      </View>
      <ProjectSheet
        visible={editing}
        onClose={() => setEditing(false)}
        initial={project ? { name: project.name, color: project.color } : undefined}
        onSave={({ name, color }) => {
          store.renameProject(id, name)
          store.setProjectColor(id, color)
        }}
        onDelete={() => {
          const { undo } = store.deleteProject(id)
          toast.show({ message: 'Project deleted', action: { label: 'Undo', onPress: undo } })
          back()
        }}
      />
      <QuickAddSheet
        visible={adding}
        onClose={() => setAdding(false)}
        projects={projects}
        defaultProjectId={loose ? null : id}
        onAdd={(t) =>
          run(() => {
            store.addTask({ title: t.title, dueDate: t.dueDate, projectId: t.projectId })
            toast.show({ message: `Added "${t.title}"` })
          })
        }
      />
      {menuElement}
    </Page>
  )
}
