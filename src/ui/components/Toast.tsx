import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { useTheme } from '../theme'
import { fonts, motion, radius, type, WIDE_BREAKPOINT } from '../tokens'
import { shadow, SHADOWS } from './web'

// Design 7.21: bottom centre (84 up on a phone, above the tab bar, 24 on the web), ink background, an optional Undo and
// a close button, and a 2 px bar along the bottom edge that drains over 5 s. Messages are polite status updates.
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
    const ease = Easing.bezier(...motion.easing)
    Animated.timing(enter, { toValue: 1, duration: 250, easing: ease, useNativeDriver: Platform.OS !== 'web' }).start()
    Animated.timing(drain, { toValue: 0, duration: TOAST_MS, easing: Easing.linear, useNativeDriver: false }).start(
      ({ finished }) => {
        if (finished) onDone()
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
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
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
          shadow(SHADOWS.menu),
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
            style={{ height: 36, paddingHorizontal: 10, justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.toastUndo }}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="toast-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDone}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} color={c.toastText} strokeWidth={1.75} />
        </Pressable>
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 2,
            backgroundColor: c.toastUndo,
            width: drain.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
    </Animated.View>
  )
}
