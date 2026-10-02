import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { motion, radius, type, WIDE_BREAKPOINT } from '../tokens'
import { IconButton } from './IconButton'
import { shadow, SHADOWS } from './web'

// Design 7.18. A phone: anchored to the bottom, top corners 22, at most 88% of the height, a grab handle. The web:
// centred 14% from the top, 512 wide (640 for the palette), no handle, a close button. Tap the scrim or press Esc to close.
export function Sheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
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
    enter.setValue(0)
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.sheet,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
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
              borderRadius: wide ? radius.xl : 0,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: Math.max(insets.bottom, 16),
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
                backgroundColor: c.ink3,
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
            <Text style={[type.title, { color: c.ink }]}>{title}</Text>
            {wide ? <IconButton icon={Icons.close} label="Close" onPress={onClose} testID="sheet-close" /> : null}
          </View>
          <View style={{ paddingHorizontal: 20 }}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  )
}
