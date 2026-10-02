import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Icons } from './icons'
import { projectStats, taskCountLabel } from '../core/projects'
import { byCreated, byDue } from '../core/today'
import { Button } from './components/Button'
import { EmptyState, Skeleton } from './components/Feedback'
import { IconButton } from './components/IconButton'
import { Page } from './components/Page'
import { ScreenHeader } from './components/ScreenHeader'
import { useToast } from './components/Toast'
import { transition, useFocusRing, useHover } from './components/web'
import { ProjectSheet } from './ProjectSheet'
import { QuickAddSheet } from './QuickAddSheet'
import { AddTaskRow, TaskRows, TaskSection } from './TaskList'
import { useTheme } from './theme'
import { type } from './tokens'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

const NONE = 'none' // the route id of the "No project" page

// The Projects tab. With `?id=` it shows one project (the page stays inside the tab, so the tab bar or sidebar stays).
export function ProjectsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  return id ? <ProjectPage id={id} /> : <ProjectList />
}

function ProjectList() {
  const { store, tasks, projects, loaded } = useTaskData()
  const router = useRouter()
  const toast = useToast()
  const [creating, setCreating] = useState(false)

  const rows: { id: string; name: string }[] = projects.map((p) => ({ id: p.id, name: p.name }))
  if (projectStats(null, tasks).count > 0) rows.push({ id: NONE, name: 'No project' })

  return (
    <Page>
      <ScreenHeader
        title="Projects"
        right={
          <IconButton
            icon={Icons.newProject}
            label="New project"
            onPress={() => setCreating(true)}
            testID="new-project"
          />
        }
      />
      <View style={{ marginTop: 16 }}>
        {!loaded ? (
          <Skeleton rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Icons.projects}
            title="No projects yet"
            body="Group related tasks under a project, like Work or Home."
          >
            <Button label="New project" onPress={() => setCreating(true)} testID="empty-new-project" />
          </EmptyState>
        ) : (
          <View>
            {rows.map((row) => (
              <ProjectRow
                key={row.id}
                {...row}
                stats={projectStats(row.id === NONE ? null : row.id, tasks)}
                onPress={() => router.push({ pathname: '/projects', params: { id: row.id } })}
              />
            ))}
          </View>
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

// A project in the list: `#`, the name, and "3 tasks · 40% done" under it. Rows are split by hairlines.
function ProjectRow({
  id,
  name,
  stats,
  onPress,
}: {
  id: string
  name: string
  stats: { count: number; percent: number }
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID={`project-${id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 60,
          paddingVertical: 10,
          marginHorizontal: -8,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
          backgroundColor: hovered ? c.hover : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Text style={[type.body, { color: c.text3, width: 20, textAlign: 'center' }]}>#</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={[type.body, { color: c.text }]}>
          {name}
        </Text>
        <Text style={[type.meta, { color: c.text2 }]}>
          {stats.count === 0 ? 'No tasks yet' : `${taskCountLabel(stats.count)} · ${stats.percent}% done`}
        </Text>
      </View>
      <Icons.forward size={16} color={c.text3} />
    </Pressable>
  )
}

function ProjectPage({ id }: { id: string }) {
  const { store, tasks, projects, projectMap, loaded } = useTaskData()
  const router = useRouter()
  const toast = useToast()
  const now = useNow()
  const actions = useTaskActions(now)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)

  const loose = id === NONE
  const project = loose ? undefined : projectMap?.[id]
  const missing = loaded && !loose && (!project || project.deleted)
  const back = () => router.setParams({ id: undefined })
  const own = tasks
    .filter((t) => !t.deleted && !t.parent_id && (t.project_id ?? null) === (loose ? null : id))
    .sort((a, b) => byDue(a, b) || byCreated(a, b))
  const openRows = own.filter((t) => !t.done_at)
  const done = own.filter((t) => t.done_at)

  if (missing) {
    return (
      <Page>
        <ScreenHeader title="Project" onBack={back} />
        <EmptyState
          icon={Icons.projects}
          title="This project is gone"
          body="It may have been deleted on another device."
        />
      </Page>
    )
  }

  const title = loose ? 'No project' : (project?.name ?? '')
  const shared = { all: tasks, projectMap, now, actions, showProject: false }
  const addHere = (text: string) =>
    actions.run(() => {
      store.addTask({ title: text, dueDate: null, projectId: loose ? null : id })
      toast.show({ message: `Added "${text}"` })
    })

  return (
    <Page>
      <ScreenHeader
        title={title}
        subtitle={taskCountLabel(own.length)}
        onBack={back}
        right={
          <>
            <IconButton icon={Icons.add} label="Add task" onPress={() => setAdding(true)} testID="project-add-task" />
            {loose ? null : (
              <IconButton
                icon={Icons.edit}
                label="Edit project"
                onPress={() => setEditing(true)}
                testID="project-edit"
              />
            )}
          </>
        }
      />
      <View style={{ marginTop: 16 }}>
        {!loaded ? (
          <Skeleton rows={4} />
        ) : own.length === 0 ? (
          <EmptyState icon={Icons.subtasks} title="No tasks yet" body="Add a task here, or move one in from its page.">
            <Button label="Add a task" onPress={() => setAdding(true)} testID="project-empty-add" />
          </EmptyState>
        ) : (
          <>
            <TaskRows rows={openRows} {...shared} />
            <AddTaskRow onAdd={addHere} testID="project-new-title" collapsible />
            <TaskSection id="done" title="Done" rows={done} {...shared} />
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
          actions.run(() => {
            store.addTask({ title: t.title, dueDate: t.dueDate, projectId: t.projectId })
            toast.show({ message: `Added "${t.title}"` })
          })
        }
      />
      {actions.menuElement}
    </Page>
  )
}
