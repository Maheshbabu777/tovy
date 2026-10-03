import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { Icons } from './icons'
import type { Project } from '../core/sync/tasks'
import { dateLabel, markPieces, parseTask, timeLabelOf } from '../core/parseTask'
import { nextDays } from '../core/today'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { pressScale, webStyle } from './components/web'
import { ContextMenu } from './components/ContextMenu'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'

export type NewQuickTask = {
  title: string
  dueDate: string | null
  dueTime: string | null
  projectId: string | null
  note?: string
}

// Quick add (Paper, Components "Quick add and fields"): the task name with the understood words underlined, a
// description, a date chip that fills when a date is set, and a footer on panel with the project at the left and
// Cancel and Add task at the right. Enter or "Add task" adds it. A task needs a title.
// The name is read as it is typed (spec quick-add-words): "call mum tomorrow 5pm #home" sets the date, time and
// project. Choosing in a chip or the project menu overrides what the words said.
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
  const [note, setNote] = useState('')
  // undefined: follow the words. A chip tap sets it (null clears it).
  const [pickedDate, setPickedDate] = useState<string | null | undefined>(undefined)
  const [pickedProject, setPickedProject] = useState<string | null | undefined>(undefined)
  const [choosingDate, setChoosingDate] = useState(false)
  const [projectMenu, setProjectMenu] = useState<{ x: number; y: number } | null>(null)

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
    onAdd({ title: read.title, dueDate, dueTime, projectId, note: note.trim() })
    onClose()
  }

  // Paper, Components "Quick add and fields": the project at the left of the footer, Cancel and Add task at the right.
  const footer = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable
        testID="quick-add-project"
        accessibilityRole="button"
        accessibilityLabel={`Project: ${projectName ?? 'Inbox'}. Change`}
        onPress={(e) => setProjectMenu({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 8, borderRadius: 6 },
          pressScale(pressed),
        ]}
      >
        {projectName ? (
          <Text style={[type.label, { color: c.text }]}># {projectName}</Text>
        ) : (
          <>
            <Icons.inbox size={15} color={c.text} />
            <Text style={[type.label, { color: c.text }]}>Inbox</Text>
          </>
        )}
        <Icons.expand size={13} color={c.text2} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <Button label="Cancel" variant="ghost" bordered small onPress={onClose} testID="quick-add-cancel" />
      <Button testID="quick-add-submit" label="Add task" small disabled={!title.trim()} onPress={submit} />
    </View>
  )

  const dateText = dueDate
    ? [dateLabel(dueDate, now), dueTime ? timeLabelOf(dueTime) : ''].filter(Boolean).join(' ')
    : ''

  return (
    <Sheet visible onClose={onClose} title="New task" testID="quick-add-sheet" footer={footer} bare width={640}>
      <WordsField value={title} onChange={setTitle} onSubmit={submit} marks={read.tokens.map((t) => t.text)} />
      <TextInput
        testID="quick-add-note"
        value={note}
        onChangeText={setNote}
        placeholder="Description"
        placeholderTextColor={c.text3}
        multiline
        style={[type.bodyS, { color: c.text, paddingVertical: 4, minHeight: 24 }, webStyle({ outlineStyle: 'none' })]}
      />
      <View testID="quick-add-read" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        <Chip
          label={dateText || 'Date'}
          icon={Icons.date}
          active={!!dueDate}
          onPress={() => setChoosingDate((o) => !o)}
          testID="quick-add-date"
        />
        {dueDate ? <Chip label="No date" onPress={() => setPickedDate(null)} testID="quick-add-no-date" /> : null}
      </View>
      {choosingDate ? (
        // One scrolling row on a phone, so the sheet stays short above the keyboard; wrapped rows on the web.
        <ScrollView
          horizontal={!wide}
          scrollEnabled={!wide}
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: wide ? 'wrap' : 'nowrap', gap: 6 }}
        >
          {days.map(({ day, label }) => (
            <Chip
              key={day}
              label={label}
              active={dueDate === day}
              onPress={() => {
                setPickedDate(day)
                setChoosingDate(false)
              }}
            />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ height: 4 }} />
      <ContextMenu
        at={projectMenu}
        onClose={() => setProjectMenu(null)}
        title="Project"
        items={[
          {
            label: 'Inbox',
            icon: Icons.inbox,
            checked: projectId === null,
            onPress: () => setPickedProject(null),
            testID: 'quick-add-project-inbox',
          },
          ...projects.map((p, i) => ({
            label: p.name,
            icon: Icons.project,
            section: i === 0 ? 'Projects' : undefined,
            checked: projectId === p.id,
            onPress: () => setPickedProject(p.id),
            testID: `quick-add-project-${p.id}`,
          })),
        ]}
      />
    </Sheet>
  )
}

// The task name, typed naturally. Words that were understood (a date, a time, a #project) are underlined in place, so
// nothing is pulled out of the sentence (Paper, Components). A clear field sits over a drawn copy of the text: the field
// takes the typing and the caret, the copy shows the marks.
function WordsField({
  value,
  onChange,
  onSubmit,
  marks,
}: {
  value: string
  onChange: (text: string) => void
  onSubmit: () => void
  marks: string[]
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const pieces = markPieces(value, marks)
  const style = [type.inputHero, { paddingVertical: 6 }]
  return (
    <View>
      <Text
        accessibilityElementsHidden
        style={[style, { position: 'absolute', left: 0, right: 0, top: 0, color: c.text }]}
      >
        {pieces.map((p, i) =>
          p.marked ? (
            <Text key={i} style={{ textDecorationLine: 'underline', textDecorationColor: c.text2 }}>
              {p.text}
            </Text>
          ) : (
            <Text key={i}>{p.text}</Text>
          ),
        )}
      </Text>
      <TextInput
        testID="quick-add-title"
        autoFocus
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Task name"
        placeholderTextColor={c.text3}
        cursorColor={c.text}
        selectionColor={c.selection}
        accessibilityLabel="Task name"
        style={[style, { color: 'transparent' }, webStyle({ outlineStyle: 'none', caretColor: c.text })]}
      />
    </View>
  )
}
