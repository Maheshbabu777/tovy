import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { TabSlot, useTabsWithTriggers } from 'expo-router/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons, type ToolkitIcon } from './icons'
import { projectStats } from '../core/projects'
import { addedMessage } from '../core/parseTask'
import { inboxTasks, todayCount } from '../core/views'
import storage from '../core/db/authStorage'
import { Avatar } from './components/Avatar'
import { DragSheet } from './components/DragSheet'
import { useToast } from './components/Toast'
import {
  shadow,
  SHADOWS,
  transition,
  useFocusRing,
  useGroupHover,
  useHover,
  webStyle,
  pressScale,
} from './components/web'
import { useTaskDrop } from './dragTask'
import { useDropActions } from './useDropActions'
import { localDay } from '../core/today'
import { Logo } from './Brand'
import { CommandPalette } from './CommandPalette'
import { moveFocus, pressOnFocused, toggleFocused } from './keyboardList'
import { ShortcutsSheet } from './ShortcutsSheet'
import { KeyCap } from './components/KeyCap'
import { EASE, prefersReducedMotion, useSlideIn } from './motion'
import { onQuickAdd, requestPalette, requestQuickAdd } from './quickAdd'
import { QuickAddSheet } from './QuickAddSheet'
import { ProjectSheet } from './ProjectSheet'
import { TaskDetail } from './TaskDetail'
import { useTheme } from './theme'
import { fonts, motion, radius, type, WIDE_BREAKPOINT } from './tokens'
import { initialsOf, useProfile } from './useProfile'
import { useNow, useTaskData } from './useTaskData'

// Every route of the tab frame. Inbox, Today, Upcoming and Browse are the tabs (style guide, Navigation). Projects and
// Profile are reached from the sidebar, Browse and the avatar. Add a route here and a file under `app/(tabs)/`.
type Href =
  '/' | '/inbox' | '/upcoming' | '/browse' | '/projects' | '/profile' | '/completed' | '/apps' | '/activity' | '/trash'
const ROUTES: { name: string; href: Href }[] = [
  { name: 'inbox', href: '/inbox' },
  { name: 'index', href: '/' },
  { name: 'upcoming', href: '/upcoming' },
  { name: 'browse', href: '/browse' },
  { name: 'projects', href: '/projects' },
  { name: 'profile', href: '/profile' },
  { name: 'completed', href: '/completed' },
  { name: 'apps', href: '/apps' },
  { name: 'activity', href: '/activity' },
  { name: 'trash', href: '/trash' },
]
// The main places, with their web keyboard shortcut.
const MAIN: { href: Href; label: string; Icon: ToolkitIcon; key: string }[] = [
  { href: '/inbox', label: 'Inbox', Icon: Icons.inbox, key: 'I' },
  { href: '/', label: 'Today', Icon: Icons.today, key: 'T' },
  { href: '/upcoming', label: 'Upcoming', Icon: Icons.upcoming, key: 'U' },
]

const SIDEBAR = { open: 260, collapsed: 68 }
const PALETTE_KEY =
  Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? '⌘K'
    : 'Ctrl K'
const COLLAPSE_KEY = 'tovy-sidebar-collapsed'

const sectionOf = (pathname: string): Href => {
  const hit = ROUTES.find((r) => r.href !== '/' && (pathname === r.href || pathname.startsWith(`${r.href}/`)))
  return hit ? hit.href : '/'
}

// Pages switch at once (spec design-v2): fading and rising every page on every switch read as a flicker, and the apps
// people compare us with (Linear, Cursor, Devin) swap instantly. Motion is kept for things that arrive or leave.
function RouteEnter({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>
}

// The sidebar's saved width, read before the first paint on the web so a collapsed sidebar does not open and then shut.
function savedCollapsed(): boolean {
  if (Platform.OS !== 'web') return false
  // Inside the try: with storage blocked (cookies off), even reading `localStorage` throws.
  try {
    return globalThis.localStorage?.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

// The open task: slides in from the right beside the page (wide) or over it (phone).
function TaskPanel({ children, wide }: { children: ReactNode; wide: boolean }) {
  const slide = useSlideIn({ distance: wide ? 24 : 48, duration: wide ? 220 : 260 })
  return <Animated.View style={[{ flex: 1 }, slide]}>{children}</Animated.View>
}

// The frame around every page: a sidebar on a wide screen, a top bar, bottom tabs and the add button on a phone. It also
// owns quick add, the task panel and the realtime catch up, so they work on every page.
export function Shell() {
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const { theme } = useTheme()
  const c = theme.colors
  const now = useNow()
  const { store, tasks, projects } = useTaskData()
  const section = sectionOf(pathname)
  const params = useGlobalSearchParams<{ task?: string; id?: string }>()
  const openId = params.task
  const openTask = (id: string) => router.setParams({ task: id })
  const closeTask = () => router.setParams({ task: undefined })
  const panel = openId ? <TaskDetail id={openId} onClose={closeTask} onOpenTask={openTask} /> : null
  // The router only finds tabs written directly inside <Tabs>. Our frame has wrapper views, so the routes are given to
  // it explicitly (the documented way for a custom layout).
  const { NavigationContent } = useTabsWithTriggers({
    triggers: ROUTES.map(({ name, href }) => ({ type: 'internal' as const, name, href })),
  })

  useEffect(() => store.catchUpAfterRealtime(), [store])
  // A task dragged onto Inbox, Today or a project in the sidebar (web, spec upcoming-drag).
  const drop = useDropActions(now)

  // Quick add: the sidebar button, the phone add button, and N or Q on the web. Inside a project it files the task there.
  const [adding, setAdding] = useState(false)
  useEffect(() => onQuickAdd(() => setAdding(true)), [])
  const projectHere = section === '/projects' && params.id && params.id !== 'none' ? params.id : null

  const go = (href: Href) => {
    // Pressing Projects or Profile again goes back to their first page.
    if (href === section && (href === '/projects' || href === '/profile'))
      router.setParams({ id: undefined, page: undefined })
    else router.navigate(href)
  }

  const [collapsed, setCollapsed] = useState(savedCollapsed)
  const [showKeys, setShowKeys] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [width] = useState(() => new Animated.Value(savedCollapsed() ? SIDEBAR.collapsed : SIDEBAR.open))
  useEffect(() => {
    if (Platform.OS === 'web') return
    void (async () => {
      try {
        if ((await storage.getItem(COLLAPSE_KEY)) === '1') {
          setCollapsed(true)
          width.setValue(SIDEBAR.collapsed)
        }
      } catch {
        // open by default
      }
    })()
  }, [width])
  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    Animated.timing(width, {
      toValue: next ? SIDEBAR.collapsed : SIDEBAR.open,
      duration: motion.sidebar,
      easing: EASE,
      useNativeDriver: false,
    }).start()
    void Promise.resolve(storage.setItem(COLLAPSE_KEY, next ? '1' : '0')).catch(() => undefined)
  }

  // Web shortcuts: Ctrl or Cmd K opens the palette; I, T, U go to a place; N or Q adds a task (focuses the composer on
  // Today and Inbox); Esc closes an open task. Letters are ignored while typing.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        requestPalette()
        return
      }
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'escape' && openId) {
        router.setParams({ task: undefined })
        return
      }
      const place = MAIN.find((m) => m.key.toLowerCase() === key)
      if (place) router.navigate(place.href)
      else if (key === 'n') {
        e.preventDefault()
        requestQuickAdd()
      } else if (key === 'q') {
        e.preventDefault()
        requestQuickAdd(true)
      } else if (key === 'j' || key === 'arrowdown') {
        if (moveFocus(1)) e.preventDefault()
      } else if (key === 'k' || key === 'arrowup') {
        if (moveFocus(-1)) e.preventDefault()
      } else if (key === 'x') {
        if (toggleFocused()) e.preventDefault()
      } else if (key === 's') {
        if (pressOnFocused('row-schedule-')) e.preventDefault()
      } else if (key === 'm') {
        if (pressOnFocused('row-move-')) e.preventDefault()
      } else if (e.key === '?') {
        e.preventDefault()
        setShowKeys(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, openId])

  // The sidebar item the sliding highlight sits behind.
  const activeKey =
    section === '/projects'
      ? params.id && params.id !== 'none'
        ? `project-${params.id}`
        : collapsed
          ? '/projects'
          : null
      : section

  const counts: Partial<Record<Href, number>> = {
    '/inbox': inboxTasks(tasks).length,
    '/': todayCount(tasks, now),
  }

  const quickAdd = (
    <QuickAddSheet
      visible={adding}
      onClose={() => setAdding(false)}
      projects={projects}
      defaultProjectId={projectHere}
      onAdd={(t) => {
        try {
          store.addTask({
            title: t.title,
            note: t.note,
            dueDate: t.dueDate,
            dueTime: t.dueTime,
            projectId: t.projectId,
          })
          toast.show({ message: addedMessage(t, new Date(), projects.find((p) => p.id === t.projectId)?.name) })
        } catch (e) {
          toast.show({ message: e instanceof Error ? e.message : String(e) })
        }
      }}
    />
  )

  if (wide) {
    return (
      <NavigationContent>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
          <Animated.View
            style={{
              width,
              backgroundColor: c.panel,
              borderRightWidth: 1,
              borderRightColor: c.line,
              paddingVertical: 16,
              paddingHorizontal: 12,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: collapsed ? 'column' : 'row',
                alignItems: 'center',
                gap: collapsed ? 12 : 8,
                marginBottom: 16,
                minHeight: 36,
                paddingLeft: collapsed ? 0 : 10,
              }}
            >
              <Logo size={22} />
              {collapsed ? null : (
                <Text
                  style={{ fontFamily: fonts.semibold, fontSize: 18, letterSpacing: -0.72, color: c.text, flex: 1 }}
                >
                  tovy
                </Text>
              )}
              <SidebarIcon
                icon={Icons.sidebar}
                label="Toggle sidebar"
                onPress={toggleCollapsed}
                testID="collapse-sidebar"
              />
            </View>

            <AddTaskPill collapsed={collapsed} onPress={() => requestQuickAdd(true)} />

            <ScrollView style={{ flex: 1, marginTop: 16 }} showsVerticalScrollIndicator={false}>
              <NavColumn activeKey={activeKey}>
                <NavItem
                  navKey="search"
                  testID="open-palette"
                  label="Search"
                  Icon={Icons.search}
                  keyHint={PALETTE_KEY}
                  collapsed={collapsed}
                  on={false}
                  onPress={requestPalette}
                />
                {MAIN.map((m) => (
                  <NavItem
                    key={m.href}
                    navKey={m.href}
                    testID={`tab-${m.label.toLowerCase()}`}
                    label={m.label}
                    Icon={m.Icon}
                    count={counts[m.href]}
                    collapsed={collapsed}
                    on={section === m.href}
                    onPress={() => go(m.href)}
                    onDropTask={
                      m.href === '/inbox'
                        ? (id) => drop.toProject(id, null, 'Inbox')
                        : m.href === '/'
                          ? (id) => drop.toDay(id, localDay(now))
                          : undefined
                    }
                  />
                ))}
                <NavItem
                  navKey="/completed"
                  testID="tab-completed"
                  label="Completed"
                  Icon={Icons.check}
                  collapsed={collapsed}
                  on={section === '/completed'}
                  onPress={() => go('/completed')}
                />
                <NavItem
                  navKey="/activity"
                  testID="tab-activity"
                  label="Activity"
                  Icon={Icons.activity}
                  collapsed={collapsed}
                  on={section === '/activity'}
                  onPress={() => go('/activity')}
                />
                {collapsed ? (
                  <NavItem
                    navKey="/projects"
                    testID="tab-projects"
                    label="Projects"
                    Icon={Icons.projects}
                    collapsed
                    on={section === '/projects'}
                    onPress={() => go('/projects')}
                    style={{ marginTop: 12 }}
                  />
                ) : (
                  <SectionHead
                    title="Projects"
                    on={section === '/projects' && !params.id}
                    onPress={() => go('/projects')}
                    action={{ label: 'New project', icon: Icons.add, onPress: () => setCreatingProject(true) }}
                  />
                )}
                {collapsed
                  ? null
                  : projects.map((p) => (
                      <NavItem
                        key={p.id}
                        navKey={`project-${p.id}`}
                        testID={`nav-project-${p.id}`}
                        label={p.name}
                        hash
                        count={projectStats(p.id, tasks).count || undefined}
                        collapsed={false}
                        on={section === '/projects' && params.id === p.id}
                        onPress={() => router.navigate({ pathname: '/projects', params: { id: p.id } })}
                        onDropTask={(id) => drop.toProject(id, p.id, p.name)}
                      />
                    ))}
              </NavColumn>
            </ScrollView>
            <AccountCard
              collapsed={collapsed}
              on={section === '/profile'}
              onOpen={() => go('/profile')}
              onHelp={() => setShowKeys(true)}
            />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <RouteEnter>
              <TabSlot style={{ flex: 1 }} />
            </RouteEnter>
          </View>
          {panel ? (
            <View
              testID="task-panel"
              style={{ width: 440, borderLeftWidth: 1, borderLeftColor: c.line, backgroundColor: c.bg }}
            >
              <TaskPanel key={openId} wide>
                {panel}
              </TaskPanel>
            </View>
          ) : null}
        </View>
        {quickAdd}
        <CommandPalette />
        <ShortcutsSheet visible={showKeys} onClose={() => setShowKeys(false)} />
        <ProjectSheet
          visible={creatingProject}
          onClose={() => setCreatingProject(false)}
          onSave={({ name, color }) => {
            const id = store.addProject(name, color)
            toast.show({ message: `Created "${name}"` })
            router.navigate({ pathname: '/projects', params: { id } })
          }}
        />
      </NavigationContent>
    )
  }

  const browseOn = !MAIN.some((m) => m.href === section)
  // The add button lives where adding is the job: the three lists and a project page (which files the task there).
  const fabHere = section === '/' || section === '/inbox' || section === '/upcoming' || !!projectHere
  const tabs: { href: Href; label: string; Icon: ToolkitIcon; on: boolean }[] = [
    ...MAIN.map((m) => ({ href: m.href, label: m.label, Icon: m.Icon, on: section === m.href })),
    { href: '/browse', label: 'Browse', Icon: Icons.browse, on: browseOn },
  ]

  return (
    <NavigationContent>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flex: 1 }}>
          <RouteEnter>
            <TabSlot style={{ flex: 1 }} />
          </RouteEnter>
        </View>
        <View
          style={{
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: c.bg,
            borderTopWidth: 1,
            borderTopColor: c.line,
            flexDirection: 'row',
          }}
        >
          {tabs.map((t) => (
            <Pressable
              key={t.href}
              testID={`tab-${t.label.toLowerCase()}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: t.on }}
              accessibilityLabel={t.label}
              onPress={() => go(t.href)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <t.Icon size={24} color={t.on ? c.text : c.text2} filled={t.on} />
              <Text style={[type.micro, { color: t.on ? c.text : c.text2 }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        {panel || !fabHere ? null : (
          <Pressable
            testID="fab"
            accessibilityRole="button"
            accessibilityLabel="Add task"
            onPress={() => requestQuickAdd(true)}
            style={[
              {
                position: 'absolute',
                right: 20,
                bottom: 60 + insets.bottom + 16,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: c.primary,
                alignItems: 'center',
                justifyContent: 'center',
              },
              shadow(SHADOWS.fab),
            ]}
          >
            <Icons.add size={26} color={c.onPrimary} />
          </Pressable>
        )}
        {panel ? (
          // The sheet stays up while moving between a task and its subtasks; only its content changes.
          <DragSheet onClose={closeTask} testID="task-panel">
            <TaskPanel key={openId} wide={false}>
              {panel}
            </TaskPanel>
          </DragSheet>
        ) : null}
      </View>
      {quickAdd}
      <CommandPalette />
    </NavigationContent>
  )
}

// The sidebar list. A single highlight sits behind the selected item and slides to the next one (200 ms) instead of
// jumping, so moving between places reads as one surface. Items report where they are with `onLayout`.
const NavLayout = createContext<(key: string, y: number, h: number) => void>(() => undefined)

function NavColumn({ activeKey, children }: { activeKey: string | null; children: ReactNode }) {
  const { theme } = useTheme()
  const [spots, setSpots] = useState<Record<string, { y: number; h: number }>>({})
  const [y] = useState(() => new Animated.Value(0))
  const [h] = useState(() => new Animated.Value(34))
  const [shown] = useState(() => new Animated.Value(0))
  const placed = useRef(false)
  const report = useCallback(
    (key: string, top: number, height: number) =>
      setSpots((prev) =>
        prev[key]?.y === top && prev[key]?.h === height ? prev : { ...prev, [key]: { y: top, h: height } },
      ),
    [],
  )
  const spot = activeKey ? spots[activeKey] : undefined
  useEffect(() => {
    if (!spot) {
      Animated.timing(shown, { toValue: 0, duration: 120, easing: EASE, useNativeDriver: false }).start()
      return
    }
    // The first time, appear in place; after that, slide.
    if (!placed.current || prefersReducedMotion()) {
      y.setValue(spot.y)
      h.setValue(spot.h)
      placed.current = true
    } else {
      Animated.timing(y, { toValue: spot.y, duration: 200, easing: EASE, useNativeDriver: false }).start()
      Animated.timing(h, { toValue: spot.h, duration: 200, easing: EASE, useNativeDriver: false }).start()
    }
    Animated.timing(shown, { toValue: 1, duration: 120, easing: EASE, useNativeDriver: false }).start()
  }, [spot, y, h, shown])
  return (
    <NavLayout.Provider value={report}>
      <View style={{ gap: 2 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y,
            height: h,
            opacity: shown,
            borderRadius: radius.sm,
            backgroundColor: theme.colors.hover,
          }}
        />
        {children}
      </View>
    </NavLayout.Provider>
  )
}

// A sidebar entry: icon (or `#` for a project), the label, and a count in mono text-3. Selected: the highlight behind it
// and the filled icon.
function NavItem({
  navKey,
  label,
  Icon,
  hash = false,
  count,
  collapsed,
  on,
  onPress,
  testID,
  style,
  keyHint,
  onDropTask,
}: {
  onDropTask?: (taskId: string) => void // a dragged task can be dropped here (web)
  keyHint?: string
  navKey: string
  label: string
  Icon?: ToolkitIcon
  hash?: boolean
  count?: number
  collapsed: boolean
  on: boolean
  onPress: () => void
  testID?: string
  style?: ViewStyle
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const report = useContext(NavLayout)
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  const [attach, held] = useTaskDrop((id) => onDropTask?.(id))
  const over = !!onDropTask && held
  return (
    <Pressable
      ref={onDropTask ? attach : undefined}
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip (shown when the sidebar is collapsed)
      title={collapsed ? label : undefined}
      onPress={onPress}
      onLayout={(e) => report(navKey, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
      style={[
        {
          height: 34,
          borderRadius: radius.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          paddingHorizontal: collapsed ? 0 : 10,
          backgroundColor: (hovered && !on) || over ? c.hover : 'transparent',
        },
        over ? webStyle({ boxShadow: `inset 0 0 0 1.5px ${c.text}` }) : {},
        transition('background-color'),
        ring.style,
        style ?? {},
      ]}
      {...hover}
      {...ring.handlers}
    >
      {hash ? (
        <Text style={[type.bodyS, { color: c.text3, width: 18, textAlign: 'center' }]}>#</Text>
      ) : Icon ? (
        <Icon size={18} color={on ? c.text : c.text2} filled={on} />
      ) : null}
      {collapsed ? null : (
        <>
          <Text numberOfLines={1} style={[type.bodyS, { flex: 1, color: c.text }]}>
            {label}
          </Text>
          {count ? (
            <Text style={[type.monoS, { color: c.text3, minWidth: 20, textAlign: 'right' }]}>{count}</Text>
          ) : null}
          {keyHint ? <KeyCap label={keyHint} /> : null}
        </>
      )}
    </Pressable>
  )
}

// The black "Add task" pill at the top of the sidebar, with its key hint.
function AddTaskPill({ collapsed, onPress }: { collapsed: boolean; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID="quick-add"
      accessibilityRole="button"
      accessibilityLabel="Add task"
      // @ts-expect-error `title` is the web tooltip
      title={collapsed ? 'Add task' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: c.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 8,
          paddingHorizontal: collapsed ? 0 : 10,
          opacity: hovered ? 0.88 : 1,
        },
        transition('opacity'),
        ring.style,
        pressScale(pressed),
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Icons.add size={16} color={c.onPrimary} />
      {collapsed ? null : (
        <>
          <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onPrimary }}>Add task</Text>
          <KeyCap label="Q" inverse />
        </>
      )}
    </Pressable>
  )
}

function SidebarIcon({
  icon: Icon,
  label,
  onPress,
  testID,
}: {
  icon: ToolkitIcon
  label: string
  onPress: () => void
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip
      title={label}
      onPress={onPress}
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hovered ? c.hover : 'transparent',
        },
        transition('background-color'),
      ]}
      {...hover}
    >
      <Icon size={18} color={c.text2} />
    </Pressable>
  )
}

// A sidebar section title (Projects) that opens its page, with its own action that shows when you point at it, the way
// Devin and Cursor head their lists (spec design-v2).
function SectionHead({
  title,
  on,
  onPress,
  action,
}: {
  title: string
  on: boolean
  onPress: () => void
  action: { label: string; icon: ToolkitIcon; onPress: () => void }
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useGroupHover()
  const Act = action.icon
  return (
    <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', height: 30 }}>
      <Pressable
        testID="tab-projects"
        accessibilityRole="button"
        onPress={onPress}
        {...handlers}
        style={{ flex: 1, paddingHorizontal: 10, height: 30, justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: on ? c.text : c.text2 }}>
          {title}
        </Text>
      </Pressable>
      <Pressable
        testID="sidebar-new-project"
        accessibilityRole="button"
        accessibilityLabel={action.label}
        // @ts-expect-error web tooltip
        title={action.label}
        onPress={action.onPress}
        {...handlers}
        style={({ pressed }) => [
          {
            width: 26,
            height: 26,
            marginRight: 4,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? c.hover : 'transparent',
            opacity: hovered ? 1 : 0,
          },
          transition('opacity, background-color'),
        ]}
      >
        <Act size={16} color={c.text2} />
      </Pressable>
    </View>
  )
}

// The person at the bottom of the sidebar (spec design-v2, like Devin and Cursor): avatar, name and @username open
// Profile and settings; the gear does too, and ? shows the keyboard shortcuts. Collapsed, just the avatar.
function AccountCard({
  collapsed,
  on,
  onOpen,
  onHelp,
}: {
  collapsed: boolean
  on: boolean
  onOpen: () => void
  onHelp: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const profile = useProfile()
  const { hovered, handlers } = useHover()
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Your profile'
  return (
    <View
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: c.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Pressable
        testID="tab-profile"
        accessibilityRole="button"
        accessibilityLabel="Profile and settings"
        onPress={onOpen}
        {...handlers}
        style={[
          {
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            paddingVertical: 6,
            paddingHorizontal: collapsed ? 0 : 6,
            borderRadius: radius.md,
            backgroundColor: hovered || on ? c.hover : 'transparent',
          },
          transition('background-color'),
        ]}
      >
        <Avatar initials={initialsOf(profile)} size={32} />
        {collapsed ? null : (
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[type.bodyS, { color: c.text, fontFamily: fonts.medium }]}>
              {name}
            </Text>
            {profile ? (
              <Text numberOfLines={1} style={[type.meta, { color: c.text2 }]}>
                @{profile.username}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
      {collapsed ? null : (
        <>
          <SidebarIcon icon={Icons.help} label="Keyboard shortcuts" onPress={onHelp} testID="sidebar-help" />
          <SidebarIcon icon={Icons.settings} label="Settings" onPress={onOpen} testID="sidebar-settings" />
        </>
      )}
    </View>
  )
}
