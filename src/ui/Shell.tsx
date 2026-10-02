import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CircleCheck, Folder, Plus, User, type LucideIcon } from 'lucide-react-native'
import { requestQuickAdd } from './quickAdd'
import { colors, fonts, radius } from './tokens'

export const WIDE_BREAKPOINT = 768

// The places a person can go. One line each: add a tab here and a route file under `app/(tabs)/`.
const TABS: { name: string; href: '/' | '/projects' | '/profile'; label: string; Icon: LucideIcon }[] = [
  { name: 'index', href: '/', label: 'Today', Icon: CircleCheck },
  { name: 'projects', href: '/projects', label: 'Projects', Icon: Folder },
  { name: 'profile', href: '/profile', label: 'Profile', Icon: User },
]

// One entry of the bar or the sidebar. `isFocused` and `onPress` are passed in by the tab trigger.
function NavItem({
  label,
  Icon,
  wide,
  isFocused,
  ...rest
}: {
  label: string
  Icon: LucideIcon
  wide: boolean
  isFocused?: boolean
  onPress?: () => void
}) {
  const color = isFocused ? colors.accent : colors.inkSoft
  return (
    <Pressable
      {...rest}
      testID={`tab-${label.toLowerCase()}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={wide ? [styles.sideItem, isFocused && styles.sideItemOn] : styles.barItem}
    >
      <Icon size={wide ? 20 : 22} color={isFocused && wide ? colors.ink : color} strokeWidth={1.8} />
      <Text
        style={[
          wide ? styles.sideLabel : styles.barLabel,
          { color: isFocused ? (wide ? colors.ink : colors.accent) : colors.inkSoft },
          isFocused && { fontFamily: fonts.semibold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// The frame around every tab: a bottom bar on a phone, a sidebar on a wide screen.
export function Shell() {
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const list = (
    <TabList style={wide ? styles.sideList : [styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(({ name, href, label, Icon }) => (
        <TabTrigger key={name} name={name} href={href} asChild>
          <NavItem label={label} Icon={Icon} wide={wide} />
        </TabTrigger>
      ))}
    </TabList>
  )

  return (
    <Tabs>
      {wide ? (
        <View style={styles.wideFrame}>
          <View style={styles.sidebar}>
            <View style={styles.brand}>
              <Image source={require('../../assets/brand/tovy-logo.png')} style={styles.brandLogo} />
              <Text style={styles.brandName}>tovy</Text>
            </View>
            <Pressable
              testID="quick-add"
              style={styles.quickAdd}
              onPress={() => {
                router.navigate('/')
                setTimeout(requestQuickAdd, 50) // after Today is showing
              }}
            >
              <Plus size={18} color="white" strokeWidth={2.2} />
              <Text style={styles.quickAddText}>Quick add</Text>
            </Pressable>
            {list}
          </View>
          <View style={styles.main}>
            <TabSlot style={styles.slot} />
          </View>
        </View>
      ) : (
        <View style={styles.phoneFrame}>
          <View style={[styles.main, { paddingTop: insets.top }]}>
            <TabSlot style={styles.slot} />
          </View>
          {list}
        </View>
      )}
    </Tabs>
  )
}

const styles = StyleSheet.create({
  phoneFrame: { flex: 1, backgroundColor: colors.bg },
  wideFrame: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  main: { flex: 1, backgroundColor: colors.bg },
  slot: { flex: 1 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.ring,
    backgroundColor: colors.bg,
    paddingTop: 8,
  },
  barItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  barLabel: { fontFamily: fonts.medium, fontSize: 11.5 },
  sidebar: {
    width: 240,
    backgroundColor: colors.card,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.ring,
    padding: 12,
    gap: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingVertical: 8 },
  brandLogo: { width: 30, height: 30, resizeMode: 'contain' },
  brandName: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  quickAddText: { fontFamily: fonts.semibold, fontSize: 14.5, color: 'white' },
  sideList: { gap: 4 },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sideItemOn: { backgroundColor: 'rgba(17,17,26,0.08)' },
  sideLabel: { fontFamily: fonts.medium, fontSize: 15 },
})
