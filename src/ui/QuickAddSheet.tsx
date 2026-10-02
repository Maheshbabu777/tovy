import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { Icons } from './icons'
import type { Project } from '../core/sync/tasks'
import { nextDays } from '../core/today'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { webStyle } from './components/web'
import { PROJECT_COLORS, useTheme } from './theme'
import { fonts, type } from './tokens'

// Design 11.7 without the date reading (that is its own spec). The title, a date chosen from chips and a project chip.
// Enter or "Add task" adds it. A task needs a title.
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
  // The form lives inside the sheet, which draws nothing while closed, so it starts empty every time it opens.
  return (
    <Sheet visible={visible} onClose={onClose} title="New task" testID="quick-add-sheet">
      <QuickAddForm onClose={onClose} projects={projects} onAdd={onAdd} defaultProjectId={defaultProjectId} />
    </Sheet>
  )
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

  function submit() {
    const text = title.trim()
    if (!text) return
    onAdd({ title: text, dueDate, projectId })
    onClose()
  }

  return (
    <>
      <TextInput
        testID="quick-add-title"
        autoFocus
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        placeholder="What needs doing?"
        placeholderTextColor={c.ink5}
        style={[
          { fontFamily: fonts.medium, fontSize: 20, color: c.ink, paddingVertical: 8 },
          webStyle({ outlineStyle: 'none' }),
        ]}
      />
      <Text style={[type.label, { color: c.ink6, marginTop: 12, marginBottom: 8 }]}>Date</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {days.map(({ day, label }) => (
          <Chip
            key={day}
            label={label}
            icon={Icons.date}
            active={dueDate === day}
            onPress={() => setDueDate(dueDate === day ? null : day)}
          />
        ))}
      </View>
      <Text style={[type.label, { color: c.ink6, marginTop: 16, marginBottom: 8 }]}>Project</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="No project" active={projectId === null} onPress={() => setProjectId(null)} />
        {projects.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            dot={PROJECT_COLORS[p.color] ?? PROJECT_COLORS.slate}
            active={projectId === p.id}
            onPress={() => setProjectId(p.id)}
          />
        ))}
      </ScrollView>
      <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
        <Button testID="quick-add-submit" label="Add task" disabled={!title.trim()} onPress={submit} />
      </View>
    </>
  )
}
