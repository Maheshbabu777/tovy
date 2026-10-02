import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { TabSlot, useTabsWithTriggers } from 'expo-router/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons, type ToolkitIcon } from './icons'
import { readCachedProfile } from '../core/profile/profile'
import { projectStats } from '../core/projects'
import { inboxTasks, todayCount } from '../core/views'
import storage from '../core/db/authStorage'
import { Avatar } from './components/Avatar'
import { useToast } from './components/Toast'
import { shadow, SHADOWS, transition, useFocusRing, useHover } from './components/web'
import { Logo } from './Brand'
import { onQuickAdd, requestQuickAdd } from './quickAdd'
import { QuickAddSheet } from './QuickAddSheet'
import { TaskDetail } from './TaskDetail'
import { useTheme } from './theme'
import { fonts, motion, radius, type, WIDE_BREAKPOINT } from './tokens'
import { useNow, useTaskData } from './useTaskData'

// Every route of the tab frame. Inbox, Today, Upcoming and Browse are the tabs (style guide, Navigation). Projects and
// Profile are reached from the sidebar, Browse and the avatar. Add a route here and a file under `app/(tabs)/`.
type Href = '/' | '/inbox' | '/upcoming' | '/browse' | '/projects' | '/profile'
const ROUTES: { name: string; href: Href }[] = [
  { name: 'inbox', href: '/inbox' },
  { name: 'index', href: '/' },
  { name: 'upcoming', href: '/upcoming' },
  { name: 'browse', href: '/browse' },
  { name: 'projects', href: '/projects' },
  { name: 'profile', href: '/profile' },
]
// The main places, with their web keyboard shortcut.
const MAIN: { href: Href; label: string; Icon: ToolkitIcon; key: string }[] = [
  { href: '/inbox', label: 'Inbox', Icon: Icons.inbox, key: 'I' },
  { href: '/', label: 'Today', Icon: Icons.today, key: 'T' },
  { href: '/upcoming', label: 'Upcoming', Icon: Icons.upcoming, key: 'U' },
]

const SIDEBAR = { open: 260, collapsed: 68 }
const COLLAPSE_KEY = 'tovy-sidebar-collapsed'
const EASE = Easing.bezier(...motion.easing)

const sectionOf = (pathname: string): Href => {
  const hit = ROUTES.find((r) => r.href !== '/' && (pathname === r.href || pathname.startsWith(`${r.href}/`)))
  return hit ? hit.href : '/'
}

// A page fades in over 180 ms every time the route changes.
function FadeIn({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [opacity] = useState(() => new Animated.Value(0))
  useEffect(() => {
    opacity.setValue(0)
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.route,
      easing: EASE,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [pathname, opacity])
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
}

function useInitials(userId: string) {
  const [initials, setInitials] = useState('')
  useEffect(() => {
    void readCachedProfile(userId).then((p) =>
      setInitials(p ? `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase() : ''),
    )
  }, [userId])
  return initials
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
  const initials = useInitials(store.userId)
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

  const [collapsed, setCollapsed] = useState(false)
  const [width] = useState(() => new Animated.Value(SIDEBAR.open))
  useEffect(() => {
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

  // Web shortcuts: I, T, U go to a place, N or Q opens quick add, Esc closes an open task. Ignored while typing.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'escape' && openId) {
        router.setParams({ task: undefined })
        return
      }
      const place = MAIN.find((m) => m.key.toLowerCase() === key)
      if (place) router.navigate(place.href)
      else if (key === 'n' || key === 'q') {
        e.preventDefault()
        requestQuickAdd()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, openId])

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
          store.addTask({ title: t.title, dueDate: t.dueDate, projectId: t.projectId })
          toast.show({ message: `Added "${t.title}"` })
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
              paddingHorizontal: collapsed ? 12 : 16,
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
              <Pressable
                testID="tab-profile"
                accessibilityRole="button"
                accessibilityLabel="Profile and settings"
                onPress={() => go('/profile')}
                style={{ borderRadius: 999 }}
              >
                <Avatar initials={initials} size={28} />
              </Pressable>
            </View>

            <AddTaskPill collapsed={collapsed} onPress={requestQuickAdd} />

            <View style={{ gap: 2, marginTop: 12 }}>
              {MAIN.map((m) => (
                <NavItem
                  key={m.href}
                  testID={`tab-${m.label.toLowerCase()}`}
                  label={m.label}
                  Icon={m.Icon}
                  count={counts[m.href]}
                  collapsed={collapsed}
                  on={section === m.href}
                  onPress={() => go(m.href)}
                />
              ))}
            </View>

            {collapsed ? (
              <View style={{ marginTop: 12 }}>
                <NavItem
                  testID="tab-projects"
                  label="Projects"
                  Icon={Icons.projects}
                  collapsed
                  on={section === '/projects'}
                  onPress={() => go('/projects')}
                />
              </View>
            ) : (
              <>
                <Pressable
                  testID="tab-projects"
                  accessibilityRole="button"
                  onPress={() => go('/projects')}
                  style={{ marginTop: 24, marginBottom: 4, paddingHorizontal: 8, height: 28, justifyContent: 'center' }}
                >
                  <Text style={[type.label, { color: section === '/projects' && !params.id ? c.text : c.text2 }]}>
                    Projects
                  </Text>
                </Pressable>
                <View style={{ gap: 2 }}>
                  {projects.map((p) => (
                    <NavItem
                      key={p.id}
                      testID={`nav-project-${p.id}`}
                      label={p.name}
                      hash
                      count={projectStats(p.id, tasks).count || undefined}
                      collapsed={false}
                      on={section === '/projects' && params.id === p.id}
                      onPress={() => router.navigate({ pathname: '/projects', params: { id: p.id } })}
                    />
                  ))}
                </View>
              </>
            )}
          </Animated.View>
          <View style={{ flex: 1 }}>
            <FadeIn>
              <TabSlot style={{ flex: 1 }} />
            </FadeIn>
          </View>
          {panel ? (
            <View
              testID="task-panel"
              style={{ width: 440, borderLeftWidth: 1, borderLeftColor: c.line, backgroundColor: c.bg }}
            >
              {panel}
            </View>
          ) : null}
        </View>
        {quickAdd}
      </NavigationContent>
    )
  }

  const browseOn = section === '/browse' || section === '/projects' || section === '/profile'
  const tabs: { href: Href; label: string; Icon: ToolkitIcon; on: boolean }[] = [
    ...MAIN.map((m) => ({ href: m.href, label: m.label, Icon: m.Icon, on: section === m.href })),
    { href: '/browse', label: 'Browse', Icon: Icons.browse, on: browseOn },
  ]

  return (
    <NavigationContent>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 20,
            height: 52 + insets.top,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Logo size={24} />
          <Pressable
            testID="tab-profile"
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            onPress={() => go('/profile')}
            hitSlop={8}
          >
            <Avatar initials={initials} size={30} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <FadeIn>
            <TabSlot style={{ flex: 1 }} />
          </FadeIn>
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
        {panel ? null : (
          <Pressable
            testID="fab"
            accessibilityRole="button"
            accessibilityLabel="Add task"
            onPress={requestQuickAdd}
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
          <View
            testID="task-panel"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              paddingTop: insets.top,
              backgroundColor: c.bg,
            }}
          >
            {panel}
          </View>
        ) : null}
      </View>
      {quickAdd}
    </NavigationContent>
  )
}

// A sidebar entry: icon (or `#` for a project), the label, and a count in mono text-3. Selected: hover fill and the
// filled icon.
function NavItem({
  label,
  Icon,
  hash = false,
  count,
  collapsed,
  on,
  onPress,
  testID,
}: {
  label: string
  Icon?: ToolkitIcon
  hash?: boolean
  count?: number
  collapsed: boolean
  on: boolean
  onPress: () => void
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip (shown when the sidebar is collapsed)
      title={collapsed ? label : undefined}
      onPress={onPress}
      style={[
        {
          height: 34,
          borderRadius: radius.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          paddingHorizontal: collapsed ? 0 : 8,
          backgroundColor: on || hovered ? c.hover : 'transparent',
        },
        transition('background-color'),
        ring.style,
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
          {count ? <Text style={[type.monoS, { color: c.text3 }]}>{count}</Text> : null}
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
      style={[
        {
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: c.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 8,
          paddingHorizontal: collapsed ? 0 : 16,
          opacity: hovered ? 0.88 : 1,
        },
        transition('opacity'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Icons.add size={18} color={c.onPrimary} />
      {collapsed ? null : (
        <>
          <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onPrimary }}>Add task</Text>
          <Text style={[type.monoXs, { color: c.onPrimary, opacity: 0.6 }]}>Q</Text>
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
          borderRadius: radius.pill,
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
