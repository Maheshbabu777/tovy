import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, Image, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { TabSlot, TabTrigger, useTabsWithTriggers } from 'expo-router/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons, type ToolkitIcon } from './icons'
import { use$ } from '@legendapp/state/react'
import type { Proposal } from '../core/sync/tasks'
import { useStore } from './StoreContext'
import { TaskDetail } from './TaskDetail'
import storage from '../core/db/authStorage'
import { requestQuickAdd } from './quickAdd'
import { useTheme } from './theme'
import { fonts, motion, radius, type, WIDE_BREAKPOINT } from './tokens'
import { transition, useFocusRing, useHover, webStyle } from './components/web'

// The places a person can go. One line each: add a tab here and a route file under `app/(tabs)/`.
// `key` is the keyboard shortcut on the web (design 6.1).
const TABS: {
  name: string
  href: '/' | '/inbox' | '/projects' | '/profile'
  label: string
  Icon: ToolkitIcon
  key?: string
}[] = [
  { name: 'index', href: '/', label: 'Today', Icon: Icons.today, key: 'T' },
  { name: 'inbox', href: '/inbox', label: 'Inbox', Icon: Icons.inbox, key: 'I' },
  { name: 'projects', href: '/projects', label: 'Projects', Icon: Icons.projects, key: 'P' },
  { name: 'profile', href: '/profile', label: 'Profile', Icon: Icons.account },
]

const SIDEBAR = { open: 240, collapsed: 68 }
const COLLAPSE_KEY = 'tovy-sidebar-collapsed'
const EASE = Easing.bezier(...motion.easing)

// One entry of the bar or the sidebar. `isFocused` and `onPress` are passed in by the tab trigger.
function NavItem({
  label,
  Icon,
  wide,
  collapsed,
  shortcut,
  badge = 0,
  isFocused,
  onPress,
}: {
  label: string
  Icon: ToolkitIcon
  wide: boolean
  collapsed: boolean
  shortcut?: string
  badge?: number
  isFocused?: boolean
  onPress?: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  const on = !!isFocused
  if (!wide) {
    return (
      <Pressable
        testID={`tab-${label.toLowerCase()}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={onPress}
        style={[{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 }, ring.style]}
        {...ring.handlers}
      >
        <View>
          <Icon size={24} color={on ? c.text : c.text2} filled={on} />
          {badge > 0 ? <Badge count={badge} floating /> : null}
        </View>
        <Text style={[type.micro, { color: on ? c.accent : c.ink6 }]}>{label}</Text>
      </Pressable>
    )
  }
  return (
    <Pressable
      testID={`tab-${label.toLowerCase()}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip (shown when the sidebar is collapsed)
      title={collapsed ? label : undefined}
      onPress={onPress}
      style={[
        {
          height: 40,
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          paddingHorizontal: collapsed ? 0 : 12,
          backgroundColor: on ? c.ink2 : hovered ? c.ink1 : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      <View>
        <Icon size={18} color={on ? c.text : c.text2} filled={on} />
        {badge > 0 && collapsed ? <Badge count={badge} floating /> : null}
      </View>
      {collapsed ? null : (
        <>
          <Text style={[{ flex: 1, fontFamily: fonts.medium, fontSize: 14.5 }, { color: on ? c.ink : c.ink6 }]}>
            {label}
          </Text>
          {badge > 0 ? <Badge count={badge} /> : null}
          {shortcut ? <Text style={[type.monoXs, { color: c.ink5 }]}>{shortcut}</Text> : null}
        </>
      )}
    </Pressable>
  )
}

// Design 11.0: an accent pill with the number of proposals waiting. On an icon it sits at the top right.
function Badge({ count, floating = false }: { count: number; floating?: boolean }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      testID="inbox-badge"
      accessibilityLabel={`${count} waiting`}
      style={[
        {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          paddingHorizontal: 4,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        floating ? { position: 'absolute', top: -6, right: -9 } : {},
      ]}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: c.onAccent }}>{count > 99 ? '99+' : count}</Text>
    </View>
  )
}

// A page fades in over 180 ms every time the route changes (design section 4).
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

// The frame around every tab: a bottom bar on a phone, a sidebar on a wide screen.
export function Shell() {
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { theme } = useTheme()
  const c = theme.colors
  // A task opens beside the page (wide) or over it (phone), chosen by `?task=` so it survives a reload and a back step.
  const { task: openId } = useGlobalSearchParams<{ task?: string }>()
  const openTask = (id: string) => router.setParams({ task: id })
  const closeTask = () => router.setParams({ task: undefined })
  const panel = openId ? <TaskDetail id={openId} onClose={closeTask} onOpenTask={openTask} /> : null
  const store = useStore()
  const proposals = use$(store.proposals$) as Record<string, Proposal> | undefined
  const waiting = Object.values(proposals ?? {}).filter((p) => p && !p.deleted && p.status === 'pending').length
  // The router only finds tabs written directly inside <Tabs>. Our frame has wrapper views, so the tabs are given to it
  // explicitly (the documented way for a custom layout).
  const { NavigationContent } = useTabsWithTriggers({
    triggers: TABS.map(({ name, href }) => ({ type: 'internal' as const, name, href })),
  })

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

  // Keyboard shortcuts of the design (6.1) that exist so far: T and P go to a tab, N adds a task. Ignored while typing.
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
      const tab = TABS.find((t) => t.key?.toLowerCase() === key)
      if (tab) router.navigate(tab.href)
      else if (key === 'n') {
        router.navigate('/')
        setTimeout(requestQuickAdd, 50)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, openId])

  const list = (
    <View style={wide ? { gap: 4 } : { flexDirection: 'row' }}>
      {TABS.map(({ name, label, Icon, key }) => (
        <TabTrigger key={name} name={name} asChild>
          <NavItem
            label={label}
            Icon={Icon}
            wide={wide}
            collapsed={collapsed}
            shortcut={key}
            badge={name === 'inbox' ? waiting : 0}
          />
        </TabTrigger>
      ))}
    </View>
  )

  return (
    <NavigationContent>
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
          <Animated.View
            style={{
              width,
              backgroundColor: c.surface,
              borderRightWidth: 1,
              borderRightColor: c.ink3,
              paddingVertical: 16,
              paddingHorizontal: collapsed ? 8 : 12,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20,
                paddingHorizontal: collapsed ? 0 : 6,
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <Image
                source={require('../../assets/brand/tovy-logo.png')}
                style={{ width: 28, height: 28, resizeMode: 'contain' }}
                accessibilityLabel="Tovy"
              />
              {collapsed ? null : <Text style={[type.pageTitle, { color: c.ink }]}>tovy</Text>}
            </View>
            <QuickAddButton
              collapsed={collapsed}
              onPress={() => {
                router.navigate('/')
                setTimeout(requestQuickAdd, 50) // after Today is showing
              }}
            />
            {list}
            <View style={{ flex: 1 }} />
            <CollapseButton collapsed={collapsed} onPress={toggleCollapsed} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <FadeIn>
              <TabSlot style={{ flex: 1 }} />
            </FadeIn>
          </View>
          {panel ? (
            <View
              testID="task-panel"
              style={{ width: 420, borderLeftWidth: 1, borderLeftColor: c.ink3, backgroundColor: c.bg }}
            >
              {panel}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flex: 1, paddingTop: insets.top }}>
            <FadeIn>
              <TabSlot style={{ flex: 1 }} />
            </FadeIn>
          </View>
          <View
            style={[
              {
                height: 64 + insets.bottom,
                paddingBottom: insets.bottom,
                paddingTop: 6,
                backgroundColor: c.barBg,
                borderTopWidth: 1,
                borderTopColor: c.ink3,
              },
              webStyle({ backdropFilter: 'blur(12px)' }),
            ]}
          >
            {list}
          </View>
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
      )}
    </NavigationContent>
  )
}

function QuickAddButton({ collapsed, onPress }: { collapsed: boolean; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID="quick-add"
      accessibilityRole="button"
      accessibilityLabel="Quick add"
      // @ts-expect-error `title` is the web tooltip
      title={collapsed ? 'Quick add' : undefined}
      onPress={onPress}
      style={[
        {
          height: 40,
          borderRadius: radius.md,
          backgroundColor: c.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 8,
          paddingHorizontal: collapsed ? 0 : 12,
          marginBottom: 12,
          opacity: hovered ? 0.9 : 1,
        },
        transition('opacity'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Icons.add size={18} color={c.onAccent} strokeWidth={1.75} />
      {collapsed ? null : <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.onAccent }}>Quick add</Text>}
    </Pressable>
  )
}

function CollapseButton({ collapsed, onPress }: { collapsed: boolean; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID="collapse-sidebar"
      accessibilityRole="button"
      accessibilityLabel="Toggle sidebar"
      // @ts-expect-error `title` is the web tooltip
      title="Toggle sidebar"
      onPress={onPress}
      style={[
        {
          height: 40,
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          paddingHorizontal: collapsed ? 0 : 12,
          backgroundColor: hovered ? c.ink1 : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...hover}
      {...ring.handlers}
    >
      <Icons.sidebar size={18} color={c.ink5} strokeWidth={1.75} />
      {collapsed ? null : <Text style={[type.label, { color: c.ink5 }]}>Collapse</Text>}
    </Pressable>
  )
}
