import { useState } from 'react'
import { ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { Icons } from './icons'
import type { Project } from '../core/sync/tasks'
import { dateLabel, parseTask, timeLabelOf } from '../core/parseTask'
import { nextDays } from '../core/today'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { webStyle } from './components/web'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'

export type NewQuickTask = { title: string; dueDate: string | null; dueTime: string | null; projectId: string | null }

// Style guide, Quick add: the task name, date chips and project chips (a set chip is filled, an empty one outlined), and a
// footer on panel with Cancel and Add task pills. Enter or "Add task" adds it. A task needs a title.
// The name is read as it is typed (spec quick-add-words): "call mum tomorrow 5pm #home" fills the date, time and
// project, and a line under the field shows what was read. Tapping a chip overrides what the words said.
export function QuickAddSheet({
  visible,
  onClose,
  projects,
  onAdd,
  defaultProjectId = null,
}: {
  visible: boolean
  onClose: () => void
  projects: Project[]
  defaultProjectId?: string | null
  onAdd: (task: NewQuickTask) => void
}) {
  // The form is mounted only while open, so it starts empty every time it opens.
  return visible ? (
    <QuickAddForm onClose={onClose} projects={projects} onAdd={onAdd} defaultProjectId={defaultProjectId} />
  ) : null
}

function QuickAddForm({
  onClose,
  projects,
  onAdd,
  defaultProjectId,
}: {
  onClose: () => void
  projects: Project[]
  defaultProjectId: string | null
  onAdd: (task: NewQuickTask) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [title, setTitle] = useState('')
  // undefined: follow the words. A chip tap sets it (null clears it).
  const [pickedDate, setPickedDate] = useState<string | null | undefined>(undefined)
  const [pickedProject, setPickedProject] = useState<string | null | undefined>(undefined)

  const now = new Date()
  const days = nextDays(now)
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const read = parseTask(title, now, projects)
  const dueDate = pickedDate !== undefined ? pickedDate : read.dueDate
  const dueTime = dueDate ? read.dueTime : null
  const projectId = pickedProject !== undefined ? pickedProject : (read.projectId ?? defaultProjectId)
  const projectName = projects.find((p) => p.id === projectId)?.name

  function submit() {
    if (!title.trim()) return
    onAdd({ title: read.title, dueDate, dueTime, projectId })
    onClose()
  }

  const footer = (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
      <Button label="Cancel" variant="ghost" bordered small onPress={onClose} testID="quick-add-cancel" />
      <Button testID="quick-add-submit" label="Add task" small disabled={!title.trim()} onPress={submit} />
    </View>
  )

  return (
    <Sheet visible onClose={onClose} title="New task" testID="quick-add-sheet" footer={footer}>
      <TextInput
        testID="quick-add-title"
        autoFocus
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        placeholder="Task name"
        placeholderTextColor={c.text3}
        style={[type.h1, { color: c.text, paddingVertical: 8 }, webStyle({ outlineStyle: 'none' })]}
      />
      {read.tokens.length ? (
        <View testID="quick-add-read" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Icons.ai size={14} color={c.text2} />
          <Text style={[type.meta, { color: c.text2 }]}>
            {[dueDate ? dateLabel(dueDate, now) : '', dueTime ? timeLabelOf(dueTime) : '', projectName ?? '']
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ) : null}
      <Text style={[type.label, { color: c.text2, marginTop: 12, marginBottom: 8 }]}>Date</Text>
      {/* One scrolling row on a phone, so the sheet stays short above the keyboard; two wrapped rows on the web. */}
      <ScrollView
        horizontal={!wide}
        scrollEnabled={!wide}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: wide ? 'wrap' : 'nowrap', gap: 6 }}
      >
        {days.map(({ day, label }) => (
          <Chip
            key={day}
            label={label}
            icon={Icons.date}
            active={dueDate === day}
            onPress={() => setPickedDate(dueDate === day ? null : day)}
          />
        ))}
      </ScrollView>
      <Text style={[type.label, { color: c.text2, marginTop: 16, marginBottom: 8 }]}>Project</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="Inbox" icon={Icons.inbox} active={projectId === null} onPress={() => setPickedProject(null)} />
        {projects.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            icon={Icons.project}
            active={projectId === p.id}
            onPress={() => setPickedProject(p.id)}
          />
        ))}
      </ScrollView>
    </Sheet>
  )
}
