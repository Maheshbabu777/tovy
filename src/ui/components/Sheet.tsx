import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons } from '../icons'
import { animate, DRAWER, prefersReducedMotion } from '../motion'
import { useTheme } from '../theme'
import { radius, type, WIDE_BREAKPOINT } from '../tokens'
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
  bare = false,
  width: cardWidth,
}: {
  bare?: boolean // no title row: the content is its own header (quick add); the title still names it for screen readers
  width?: number // wide screens: the card's width (512 by default)
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
    animate(enter, 1, wide ? 200 : 300, 0, wide ? undefined : DRAWER)
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, enter, onClose, wide])

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
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: enter }}>
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.sheetScrim }}
          />
        </Animated.View>
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[
            {
              width: '100%',
              maxWidth: wide ? (cardWidth ?? 512) : undefined,
              maxHeight: height * 0.88,
              backgroundColor: c.raised,
              borderRadius: wide ? radius.lg : 0,
              borderTopLeftRadius: wide ? radius.lg : radius.xl,
              borderTopRightRadius: wide ? radius.lg : radius.xl,
              borderWidth: wide ? 1 : 0,
              borderColor: c.line,
              paddingBottom: footer ? 0 : Math.max(insets.bottom, 16),
              overflow: 'hidden',
              // Wide: it settles in from 0.96 in the middle. Phone: it slides up from below the screen on the drawer curve.
              opacity: wide ? enter : enter.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
              transform: wide
                ? [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }]
                : [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }],
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
          {bare ? (
            <View style={{ height: wide ? 16 : 8 }} />
          ) : (
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
          )}
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
