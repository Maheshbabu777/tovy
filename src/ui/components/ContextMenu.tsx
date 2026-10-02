import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '../theme'
import { radius, type } from './../tokens'
import { shadow, SHADOWS, useHover } from './web'

export type MenuItem = { label: string; icon: LucideIcon; onPress: () => void; danger?: boolean; testID?: string }

// Design 7.20: 208 wide, padding 4, radius 14, items 36 tall with a 16 px icon and a 14 px label. It opens at the
// pointer and stays inside the screen. Right-click on the web, long-press on a phone.
export function ContextMenu({
  at,
  items,
  onClose,
}: {
  at: { x: number; y: number } | null
  items: MenuItem[]
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { width, height } = useWindowDimensions()
  if (!at) return null
  const menuHeight = items.length * 36 + 8
  const left = Math.max(8, Math.min(at.x, width - 208 - 8))
  const top = Math.max(8, Math.min(at.y, height - menuHeight - 8))
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ flex: 1 }}>
        <View
          testID="context-menu"
          style={[
            {
              position: 'absolute',
              left,
              top,
              width: 208,
              padding: 4,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.ink3,
              backgroundColor: c.bg,
            },
            shadow(SHADOWS.menu),
          ]}
        >
          {items.map((item) => (
            <MenuRow key={item.label} item={item} onClose={onClose} />
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}

function MenuRow({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const color = item.danger ? c.bad : c.ink
  return (
    <Pressable
      testID={item.testID}
      accessibilityRole="menuitem"
      onPress={() => {
        onClose()
        item.onPress()
      }}
      style={{
        height: 36,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        backgroundColor: hovered ? c.ink2 : 'transparent',
      }}
      {...handlers}
    >
      <item.icon size={16} color={item.danger ? c.bad : c.ink6} strokeWidth={1.75} />
      <Text style={[type.bodyS, { color }]}>{item.label}</Text>
    </Pressable>
  )
}
