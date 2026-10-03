import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons } from '../icons'
import { animate } from '../motion'
import { useTheme } from '../theme'
import { fonts, radius, type, WIDE_BREAKPOINT } from '../tokens'
import { shadow, SHADOWS } from './web'

// Style guide, Toast: inverted (text colour ground), 48 tall, radius 12, Undo as a translucent pill. Bottom centre (84 up
// on a phone, above the tab bar, 24 on the web), a close button, and a 2 px bar that drains over 5 s.
const TOAST_MS = 5000

type ToastAction = { label: string; onPress: () => void }
type ToastInput = { message: string; action?: ToastAction }
type ToastValue = { show: (toast: ToastInput) => void }

const ToastContext = createContext<ToastValue | null>(null)

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast needs the ToastProvider')
  return value
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null)
  const show = useCallback((input: ToastInput) => setToast({ ...input, id: Date.now() + Math.random() }), [])
  const done = useCallback(() => setToast(null), [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={done} /> : null}
    </ToastContext.Provider>
  )
}

function ToastView({ toast, onDone }: { toast: ToastInput; onDone: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const [enter] = useState(() => new Animated.Value(0))
  const [drain] = useState(() => new Animated.Value(1))
  useEffect(() => {
    animate(enter, 1, 250)
    // When its time is up it sinks and fades, quicker than it came.
    Animated.timing(drain, { toValue: 0, duration: TOAST_MS, easing: Easing.linear, useNativeDriver: false }).start(
      ({ finished }) => {
        if (finished) animate(enter, 0, 160, 0, undefined, onDone)
      },
    )
  }, [enter, drain, onDone])
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: wide ? 24 : 84 + insets.bottom,
        alignItems: 'center',
        paddingHorizontal: 16,
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
        ],
      }}
    >
      <View
        testID="toast"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          {
            minHeight: 48,
            borderRadius: radius.lg,
            backgroundColor: c.toastBg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingLeft: 16,
            paddingRight: 6,
            overflow: 'hidden',
            maxWidth: 480,
          },
          shadow(SHADOWS.toast),
        ]}
      >
        <Text style={[type.bodyS, { color: c.toastText, flexShrink: 1, paddingVertical: 12 }]}>{toast.message}</Text>
        {toast.action ? (
          <Pressable
            testID="toast-undo"
            accessibilityRole="button"
            onPress={() => {
              toast.action?.onPress()
              onDone()
            }}
            style={{
              height: 30,
              paddingHorizontal: 14,
              marginLeft: 8,
              borderRadius: radius.pill,
              backgroundColor: c.toastPill,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.toastUndo }}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="toast-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDone}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icons.close size={16} color={c.toastText} />
        </Pressable>
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 2,
            backgroundColor: c.toastPill,
            width: drain.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
    </Animated.View>
  )
}
