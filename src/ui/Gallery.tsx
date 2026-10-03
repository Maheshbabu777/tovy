import { useState, type ReactNode } from 'react'
import { ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { Icons } from './icons'
import type { Task } from '../core/sync/tasks'
import { Avatar } from './components/Avatar'
import { Button } from './components/Button'
import { Checkbox } from './components/Checkbox'
import { Chip } from './components/Chip'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { IconButton } from './components/IconButton'
import { Input } from './components/Input'
import { SectionHeader } from './components/SectionHeader'
import { Segmented } from './components/Segmented'
import { Group, Row } from './components/SettingsList'
import { useToast } from './components/Toast'
import { AIBadge } from './components/AppMark'
import { KeyCap } from './components/KeyCap'
import { Logo } from './Brand'
import { TaskRow } from './TaskRow'
import { ThemeOverride, useTheme, type ThemeMode } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'

// The component gallery (spec foundation-reset, criterion 5): every shared component in its states, light and dark side
// by side on a wide screen, one under the other on a phone. Not linked from the app; open /gallery.
const NOW = new Date(2026, 9, 3, 10)
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: 'Write the quarterly plan',
  note: '',
  due_date: null,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  ...extra,
})
const PROJECT = { id: 'p', name: 'Work', color: 'slate' }
const noop = () => undefined

export function Gallery() {
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const modes: ThemeMode[] = ['light', 'dark']
  return (
    <ScrollView contentContainerStyle={{ flexDirection: wide ? 'row' : 'column' }}>
      {modes.map((mode) => (
        <ThemeOverride key={mode} mode={mode}>
          <Board mode={mode} />
        </ThemeOverride>
      ))}
    </ScrollView>
  )
}

function Board({ mode }: { mode: ThemeMode }) {
  const { theme } = useTheme()
  const c = theme.colors
  const toast = useToast()
  const [checked, setChecked] = useState(false)
  const [seg, setSeg] = useState<'light' | 'dark' | 'system'>('system')
  return (
    <View testID={`gallery-${mode}`} style={{ flex: 1, backgroundColor: c.bg, padding: 24, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Logo size={24} />
        <Text style={[type.display, { color: c.text }]}>Components</Text>
      </View>
      <Text style={[type.bodyS, { color: c.text2 }]}>{mode === 'light' ? 'Light' : 'Dark'}</Text>

      <Block title="Buttons">
        <Wrap>
          <Button label="Add task" onPress={noop} />
          <Button label="Cancel" variant="ghost" bordered onPress={noop} />
          <Button label="Quiet" variant="ghost" onPress={noop} />
          <Button label="Delete" variant="danger" onPress={noop} />
          <Button label="Disabled" disabled onPress={noop} />
          <Button label="Small" small onPress={noop} />
          <Button label="With icon" icon={Icons.add} onPress={noop} />
        </Wrap>
        <Wrap>
          <IconButton icon={Icons.more} label="More" onPress={noop} />
          <IconButton icon={Icons.edit} label="Edit" onPress={noop} />
          <IconButton icon={Icons.delete} label="Delete" onPress={noop} />
        </Wrap>
      </Block>

      <Block title="Task rows">
        <View>
          <TaskRow task={task('a')} project={undefined} progress={0} now={NOW} {...rowFns} />
          <TaskRow
            task={task('b', { title: 'Call the bank', due_date: '2026-10-03', due_time: '17:00' })}
            project={PROJECT}
            progress={0}
            now={NOW}
            {...rowFns}
          />
          <TaskRow
            task={task('c', { title: 'Renew passport', due_date: '2026-10-01' })}
            project={undefined}
            progress={0}
            now={NOW}
            {...rowFns}
          />
          <TaskRow
            task={task('d', { title: 'Launch checklist', kind: 'deep' })}
            project={PROJECT}
            progress={40}
            subtasks={{ done: 2, total: 5 }}
            now={NOW}
            {...rowFns}
          />
          <TaskRow
            task={task('e', { title: 'Book flights', done_at: '2026-10-03T08:00:00Z' })}
            project={undefined}
            progress={100}
            now={NOW}
            {...rowFns}
          />
          <TaskRow
            task={task('f', { title: 'Selected row' })}
            project={undefined}
            progress={0}
            now={NOW}
            selected
            {...rowFns}
          />
        </View>
      </Block>

      <Block title="Section header">
        <SectionHeader title="Overdue" count={3} action={{ label: 'Reschedule', onPress: noop }} />
        <SectionHeader title="Due today" count={5} />
      </Block>

      <Block title="Chips">
        <Wrap>
          <Chip label="Today" icon={Icons.date} active onPress={noop} />
          <Chip label="Tomorrow" icon={Icons.date} onPress={noop} />
          <Chip label="Work" icon={Icons.project} onPress={noop} />
          <AIBadge label="Claude" />
          <KeyCap label="N" />
          <KeyCap label="Ctrl K" />
        </Wrap>
      </Block>

      <Block title="Fields">
        <Input label="Name" placeholder="Your first name" />
        <Input label="Username" value="mahesh" error="That username is taken." />
        <Wrap>
          <Checkbox checked={checked} onToggle={() => setChecked(!checked)} label="Check" />
          <Segmented
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </Wrap>
      </Block>

      <Block title="Settings">
        <Group title="Settings">
          <Row label="Appearance" icon={Icons.themeLight} value="System" onPress={noop} />
          <Row label="Sync status" icon={Icons.sync} value="Up to date" />
          <Row label="Sign out" icon={Icons.signOut} onPress={noop} chevron={false} />
          <Row label="Delete account" icon={Icons.delete} danger onPress={noop} />
        </Group>
      </Block>

      <Block title="Feedback">
        <Banner kind="offline">Offline. Changes are saved on this device and sync later.</Banner>
        <Banner kind="error">Some changes are not saved everywhere yet. They are safe on this device.</Banner>
        <Skeleton rows={2} />
        <EmptyState icon={Icons.inbox} title="Your inbox is clear" body="Capture anything here." />
        <Button
          label="Show a toast"
          variant="ghost"
          bordered
          onPress={() => toast.show({ message: 'Task deleted', action: { label: 'Undo', onPress: noop } })}
        />
        <Wrap>
          <Avatar initials="MV" size={28} />
          <Avatar initials="MV" size={56} />
        </Wrap>
      </Block>
    </View>
  )
}

const rowFns = { onToggleDone: noop, onOpen: noop, onMenu: noop }

function Block({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme()
  return (
    <View style={{ marginTop: 24, gap: 12 }}>
      <Text style={[type.label, { color: theme.colors.text2 }]}>{title}</Text>
      {children}
    </View>
  )
}

function Wrap({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</View>
}
