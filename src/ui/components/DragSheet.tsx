import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, PanResponder, Platform, Pressable, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { animate, EASE, prefersReducedMotion } from '../motion'
import { useTheme } from '../theme'
import { radius } from '../tokens'
import { shadow, SHADOWS } from './web'

// A tall bottom sheet for the phone (the open task, spec mobile-screens criterion 4). It rises over the page to about
// 92% of the height with the page dimmed behind it. Drag the handle down (past 120 px, or a quick flick) or tap the
// dim area to close; a short drag springs back. Reduce Motion shows and hides it at once.
export function DragSheet({
  children,
  onClose,
  testID,
}: {
  children: ReactNode
  onClose: () => void
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const sheetHeight = Math.round((height - insets.top) * 0.92)
  const [y] = useState(() => new Animated.Value(prefersReducedMotion() ? 0 : sheetHeight))
  const latestClose = useRef(onClose)
  useEffect(() => {
    latestClose.current = onClose
  }, [onClose])

  useEffect(() => {
    animate(y, 0, 260)
  }, [y])

  const native = Platform.OS !== 'web'
  // Read only when a gesture fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_e, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          if (prefersReducedMotion()) latestClose.current()
          else
            Animated.timing(y, { toValue: sheetHeight, duration: 200, easing: EASE, useNativeDriver: native }).start(
              () => latestClose.current(),
            )
        } else Animated.spring(y, { toValue: 0, useNativeDriver: native, bounciness: 0, speed: 18 }).start()
      },
    }),
  )

  const dim = y.interpolate({ inputRange: [0, sheetHeight], outputRange: [1, 0], extrapolate: 'clamp' })
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: dim,
          backgroundColor: c.sheetScrim,
        }}
      >
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        testID={testID}
        accessibilityViewIsModal
        style={[
          {
            height: sheetHeight,
            backgroundColor: c.raised,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            overflow: 'hidden',
            paddingBottom: insets.bottom,
            transform: [{ translateY: y }],
          },
          shadow(SHADOWS.overlay),
        ]}
      >
        <View {...responder.panHandlers} style={{ height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.lineStrong }} />
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Animated.View>
    </View>
  )
}
