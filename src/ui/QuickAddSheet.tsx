import { useState } from 'react'
import { ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { Icons } from './icons'
import type { Project } from '../core/sync/tasks'
import { nextDays } from '../core/today'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { webStyle } from './components/web'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'

// Style guide, Quick add: the task name, date chips and project chips (a set chip is filled, an empty one outlined), and a
// footer on panel with Cancel and Add task pills. Enter or "Add task" adds it. A task needs a title.
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
  onAdd: (task: { title: string; dueDate: string | null; projectId: string | null }) => void
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
  onAdd: (task: { title: string; dueDate: string | null; projectId: string | null }) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId)

  const days = nextDays(new Date())
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT

  function submit() {
    const text = title.trim()
    if (!text) return
    onAdd({ title: text, dueDate, projectId })
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
            onPress={() => setDueDate(dueDate === day ? null : day)}
          />
        ))}
      </ScrollView>
      <Text style={[type.label, { color: c.text2, marginTop: 16, marginBottom: 8 }]}>Project</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="Inbox" icon={Icons.inbox} active={projectId === null} onPress={() => setProjectId(null)} />
        {projects.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            icon={Icons.project}
            active={projectId === p.id}
            onPress={() => setProjectId(p.id)}
          />
        ))}
      </ScrollView>
    </Sheet>
  )
}
