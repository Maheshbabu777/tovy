import { Animated, Modal, Pressable, Text, useWindowDimensions } from 'react-native'
import { type ToolkitIcon } from '../icons'
import { usePop } from '../motion'
import { useTheme } from '../theme'
import { radius, type } from './../tokens'
import { shadow, SHADOWS, useHover } from './web'

const MENU_WIDTH = 232

export type MenuItem = { label: string; icon: ToolkitIcon; onPress: () => void; danger?: boolean; testID?: string }

// Style guide, Menu: 232 wide, padding 4, radius 12, a hairline and a soft shadow, items 34 tall with an 18 px icon and
// a 14 px label; Delete last in red. It pops in from 0.96 at the pointer and stays inside the screen. Right-click on the web, long-press on a phone.
export function ContextMenu({
  at,
  items,
  onClose,
}: {
  at: { x: number; y: number } | null
  items: MenuItem[]
  onClose: () => void
}) {
  const { width, height } = useWindowDimensions()
  if (!at) return null
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
  const menuHeight = items.length * 34 + 8
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
              backgroundColor: c.bg,
            },
            shadow(SHADOWS.menu),
            pop,
          ]}
        >
          {items.map((item) => (
            <MenuRow key={item.label} item={item} onClose={onClose} />
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
      <Text style={[type.bodyS, { color }]}>{item.label}</Text>
    </Pressable>
  )
}
