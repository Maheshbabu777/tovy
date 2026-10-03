import { Animated, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Icons, type ToolkitIcon } from '../icons'
import { usePop } from '../motion'
import { useTheme } from '../theme'
import { radius, type, WIDE_BREAKPOINT } from './../tokens'
import { ActionSheet } from './ActionSheet'
import { shadow, SHADOWS, useHover } from './web'

const MENU_WIDTH = 232

export type MenuItem = {
  label: string
  icon: ToolkitIcon
  onPress: () => void
  danger?: boolean
  testID?: string
  section?: string // a small label above this item, starting a group (like Devin's "Capability", "Previews")
  hint?: string // a key or short value at the right, in mono
  checked?: boolean // a check at the right: the current choice
}

// Style guide, Menu: 232 wide, padding 4, radius 12, a hairline and a soft shadow, items 34 tall with an 18 px icon and
// a 14 px label; Delete last in red. It pops in from 0.96 at the pointer and stays inside the screen. Right-click on the
// web. On a phone, long-press opens the same items as an action sheet from the bottom.
export function ContextMenu({
  at,
  items,
  onClose,
  title,
}: {
  at: { x: number; y: number } | null
  items: MenuItem[]
  onClose: () => void
  title?: string // shown at the top of the phone's action sheet (the task's title)
}) {
  const { width, height } = useWindowDimensions()
  if (!at) return null
  // A phone gets the sheet from the bottom, where the thumb already is.
  if (width < WIDE_BREAKPOINT) return <ActionSheet title={title} items={items} onClose={onClose} />
  return <MenuBody at={at} items={items} onClose={onClose} width={width} height={height} />
}

function MenuBody({
  at,
  items,
  onClose,
  width,
  height,
}: {
  at: { x: number; y: number }
  items: MenuItem[]
  onClose: () => void
  width: number
  height: number
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const pop = usePop(120)
  const menuHeight = items.length * 34 + 8 + items.filter((i) => i.section || i.danger).length * 30
  const left = Math.max(8, Math.min(at.x, width - MENU_WIDTH - 8))
  const top = Math.max(8, Math.min(at.y, height - menuHeight - 8))
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ flex: 1 }}>
        <Animated.View
          testID="context-menu"
          style={[
            {
              position: 'absolute',
              left,
              top,
              width: MENU_WIDTH,
              padding: 4,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.raised,
            },
            shadow(SHADOWS.menu),
            pop,
          ]}
        >
          {items.map((item, i) => (
            <View key={item.label}>
              {item.section ? (
                <Text
                  style={[
                    type.meta,
                    { color: c.text3, paddingHorizontal: 10, paddingTop: i ? 10 : 6, paddingBottom: 4 },
                  ]}
                >
                  {item.section}
                </Text>
              ) : item.danger && i > 0 ? (
                // Delete sits apart, after a hairline (style guide, Menu).
                <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4, marginHorizontal: 6 }} />
              ) : null}
              <MenuRow item={item} onClose={onClose} />
            </View>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

function MenuRow({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const color = item.danger ? c.red : c.text
  return (
    <Pressable
      testID={item.testID}
      accessibilityRole="menuitem"
      onPress={() => {
        onClose()
        item.onPress()
      }}
      style={{
        height: 34,
        borderRadius: radius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        backgroundColor: hovered ? c.hover : 'transparent',
      }}
      {...handlers}
    >
      <item.icon size={18} color={item.danger ? c.red : c.text2} />
      <Text style={[type.bodyS, { color, flex: 1 }]}>{item.label}</Text>
      {item.checked ? <Icons.check size={16} color={c.text} /> : null}
      {item.hint ? <Text style={[type.monoS, { color: c.text3 }]}>{item.hint}</Text> : null}
    </Pressable>
  )
}
