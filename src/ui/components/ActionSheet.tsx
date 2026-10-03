import { Animated, Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEnter } from '../motion'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'
import type { MenuItem } from './ContextMenu'

// The phone's action menu (spec mobile-screens, criterion 5): a sheet from the bottom, inside the thumb zone, with
// 52 px rows and a Cancel row at the end. Tap the scrim or Cancel to close. Delete stays last and red.
export function ActionSheet({ title, items, onClose }: { title?: string; items: MenuItem[]; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const rise = useEnter({ distance: 32, duration: 220 })
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.sheetScrim }}
        />
        <Animated.View
          testID="context-menu"
          accessibilityViewIsModal
          style={[
            {
              backgroundColor: c.raised,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: 12,
            },
            rise,
          ]}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.lineStrong }} />
          {title ? (
            <Text numberOfLines={1} style={[type.label, { color: c.text2, paddingHorizontal: 8, paddingTop: 12 }]}>
              {title}
            </Text>
          ) : null}
          <View style={{ marginTop: 8 }}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                testID={item.testID}
                accessibilityRole="menuitem"
                onPress={() => {
                  onClose()
                  item.onPress()
                }}
                style={({ pressed }) => ({
                  height: 52,
                  borderRadius: radius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 8,
                  backgroundColor: pressed ? c.hover : 'transparent',
                })}
              >
                <item.icon size={20} color={item.danger ? c.red : c.text2} />
                <Text style={[type.body, { color: item.danger ? c.red : c.text }]}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable
              testID="menu-cancel"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                height: 52,
                marginTop: 4,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: c.line,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? c.hover : 'transparent',
              })}
            >
              <Text style={[type.bodyMedium, { color: c.text }]}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}
