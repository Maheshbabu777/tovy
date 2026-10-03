import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Icons, type ToolkitIcon } from './icons'
import { paletteResults, type PaletteItem } from '../core/palette'
import { KeyCap } from './components/KeyCap'
import { useToast } from './components/Toast'
import { shadow, SHADOWS, webStyle } from './components/web'
import { usePop } from './motion'
import { onPalette } from './quickAdd'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'
import { useTaskData } from './useTaskData'

const ICON: Record<string, ToolkitIcon> = {
  'go-inbox': Icons.inbox,
  'go-today': Icons.today,
  'go-upcoming': Icons.upcoming,
  'go-projects': Icons.projects,
  'go-profile': Icons.account,
}

// The command palette: go anywhere, open a project or a task by name, switch the theme, or add the typed text as a task.
// Ctrl or Cmd K and the search buttons open it; arrows move, Enter runs, Esc closes.
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => onPalette(() => setOpen(true)), [])
  return open ? <PaletteBody onClose={() => setOpen(false)} /> : null
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const { theme, setPreference } = useTheme()
  const c = theme.colors
  const router = useRouter()
  const toast = useToast()
  const { store, tasks, projects } = useTaskData()
  const { width, height } = useWindowDimensions()
  const wide = width >= WIDE_BREAKPOINT
  const pop = usePop()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<TextInput>(null)
  const items = paletteResults(query, { projects, tasks })
  const current = Math.min(active, items.length - 1)

  function run(item: PaletteItem | undefined) {
    if (!item) return
    onClose()
    if (item.kind === 'go') router.navigate(item.href)
    else if (item.kind === 'project')
      router.navigate({ pathname: '/projects', params: { id: item.id.replace('project-', '') } })
    else if (item.kind === 'task') router.setParams({ task: item.id.replace('task-', '') })
    else if (item.kind === 'theme') setPreference(theme.mode === 'dark' ? 'light' : 'dark')
    else {
      try {
        store.addTask({ title: item.title, dueDate: null, projectId: null })
        toast.show({ message: `Added "${item.title}" to Inbox` })
      } catch (e) {
        toast.show({ message: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', paddingTop: wide ? height * 0.14 : 56, paddingHorizontal: 12 }}>
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.sheetScrim }}
        />
        <Animated.View
          testID="palette"
          accessibilityViewIsModal
          style={[
            {
              width: '100%',
              maxWidth: 600,
              maxHeight: height * 0.7,
              backgroundColor: c.raised,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              overflow: 'hidden',
            },
            shadow(SHADOWS.menu),
            pop,
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.line,
            }}
          >
            <Icons.search size={18} color={c.text2} />
            <TextInput
              ref={input}
              testID="palette-input"
              autoFocus
              value={query}
              onChangeText={(v) => {
                setQuery(v)
                setActive(0)
              }}
              onSubmitEditing={() => run(items[current])}
              onKeyPress={(e) => {
                const key = e.nativeEvent.key
                if (key === 'ArrowDown') setActive((current + 1) % items.length)
                else if (key === 'ArrowUp') setActive((current - 1 + items.length) % items.length)
                else if (key === 'Escape') onClose()
              }}
              placeholder="Search tasks and projects, or type a task to add"
              placeholderTextColor={c.text3}
              accessibilityLabel="Search or run a command"
              style={[type.body, { flex: 1, height: 52, color: c.text }, webStyle({ outlineStyle: 'none' })]}
            />
            {wide ? <KeyCap label="Esc" /> : null}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 6 }}>
            {items.map((item, i) => (
              <PaletteRow
                key={item.id}
                item={item}
                active={i === current}
                showKeys={wide}
                onHover={() => setActive(i)}
                onPress={() => run(item)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

function PaletteRow({
  item,
  active,
  showKeys,
  onHover,
  onPress,
}: {
  item: PaletteItem
  active: boolean
  showKeys: boolean
  onHover: () => void
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const Icon =
    item.kind === 'go'
      ? (ICON[item.id] ?? Icons.forward)
      : item.kind === 'project'
        ? Icons.project
        : item.kind === 'task'
          ? item.done
            ? Icons.check
            : Icons.today
          : item.kind === 'theme'
            ? theme.mode === 'dark'
              ? Icons.themeLight
              : Icons.themeDark
            : Icons.add
  const section =
    item.kind === 'project' ? 'Project' : item.kind === 'task' ? 'Task' : item.kind === 'add' ? 'Inbox' : ''
  return (
    <Pressable
      testID={`palette-${item.id}`}
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={onHover}
      style={{
        height: 40,
        borderRadius: radius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 10,
        backgroundColor: active ? c.hover : 'transparent',
      }}
    >
      <Icon size={18} color={active ? c.text : c.text2} />
      <Text
        numberOfLines={1}
        style={[
          type.bodyS,
          {
            flex: 1,
            color: item.kind === 'task' && item.done ? c.text3 : c.text,
            textDecorationLine: item.kind === 'task' && item.done ? 'line-through' : 'none',
          },
        ]}
      >
        {item.label}
      </Text>
      {section ? <Text style={[type.meta, { color: c.text3 }]}>{section}</Text> : null}
      {showKeys && 'key' in item && item.key ? <KeyCap label={item.key} /> : null}
      {active && showKeys ? <Icons.forward size={14} color={c.text3} /> : null}
    </Pressable>
  )
}
