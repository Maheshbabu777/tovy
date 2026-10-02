import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons } from '../icons'
import { animate, prefersReducedMotion } from '../motion'
import { useTheme } from '../theme'
import { motion, radius, type, WIDE_BREAKPOINT } from '../tokens'
import { IconButton } from './IconButton'
import { shadow, SHADOWS } from './web'

// Style guide, Quick add and sheets. A phone: anchored to the bottom, top corners 20, at most 88% of the height, a grab handle. The web:
// centred 14% from the top, 512 wide (640 for the palette), no handle, a close button. Tap the scrim or press Esc to close.
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  testID,
}: {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode // a full width strip on panel along the bottom (the quick add actions)
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const wide = width >= WIDE_BREAKPOINT
  const [enter] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (!visible) return
    enter.setValue(prefersReducedMotion() ? 1 : 0)
    animate(enter, 1, motion.sheet)
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, enter, onClose])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={{
          flex: 1,
          justifyContent: wide ? 'flex-start' : 'flex-end',
          alignItems: 'center',
          paddingTop: wide ? height * 0.14 : 0,
        }}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.sheetScrim }}
        />
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[
            {
              width: '100%',
              maxWidth: wide ? 512 : undefined,
              maxHeight: height * 0.88,
              backgroundColor: c.bg,
              borderRadius: wide ? radius.lg : 0,
              borderTopLeftRadius: wide ? radius.lg : radius.xl,
              borderTopRightRadius: wide ? radius.lg : radius.xl,
              borderWidth: wide ? 1 : 0,
              borderColor: c.line,
              paddingBottom: footer ? 0 : Math.max(insets.bottom, 16),
              overflow: 'hidden',
              opacity: enter,
              transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            },
            shadow(SHADOWS.overlay),
          ]}
        >
          {wide ? null : (
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.lineStrong,
                marginTop: 8,
              }}
            />
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <Text style={[type.title, { color: c.text }]}>{title}</Text>
            {wide ? <IconButton icon={Icons.close} label="Close" onPress={onClose} testID="sheet-close" /> : null}
          </View>
          <View style={{ paddingHorizontal: 20 }}>{children}</View>
          {footer ? (
            <View
              style={{
                marginTop: 16,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: wide ? 12 : Math.max(insets.bottom, 12),
                backgroundColor: c.panel,
                borderTopWidth: 1,
                borderTopColor: c.line,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  )
}
