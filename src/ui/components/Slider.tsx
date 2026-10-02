import { useState } from 'react'
import { Platform, View, type LayoutChangeEvent } from 'react-native'
import { useTheme } from '../theme'
import { shadow, SHADOWS } from './web'

const THUMB = 22
const KEYS = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']

// Design 7.7: a 6 px pill track (accent filled, the rest ink-2), a 22 px thumb with a bg fill and a 2 px accent
// border. Step 5. The value follows the finger live and a change is committed on release (pointer up or key up).
export function Slider({
  value,
  onCommit,
  disabled = false,
  label,
  testID,
}: {
  value: number
  onCommit: (value: number) => void
  disabled?: boolean
  label: string
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [width, setWidth] = useState(0)
  const [drag, setDrag] = useState<number | null>(null) // the value being dragged to, or typed with the keys
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v / 5) * 5))
  const fromX = (x: number) => (width > THUMB ? clamp(((x - THUMB / 2) / (width - THUMB)) * 100) : 0)
  const shown = drag ?? value
  const left = width > THUMB ? (shown / 100) * (width - THUMB) : 0

  const web =
    Platform.OS === 'web'
      ? ({
          tabIndex: disabled ? -1 : 0,
          onKeyDown: (e: { key: string; preventDefault: () => void }) => {
            const i = KEYS.indexOf(e.key)
            if (i < 0 || disabled) return
            e.preventDefault()
            setDrag(clamp(shown + (i < 2 ? 5 : -5)))
          },
          onKeyUp: (e: { key: string }) => {
            if (!KEYS.includes(e.key) || disabled || drag === null) return
            setDrag(null)
            onCommit(drag)
          },
        } as object)
      : {}

  return (
    <View
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: shown }}
      focusable={!disabled}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => setDrag(fromX(e.nativeEvent.locationX))}
      onResponderMove={(e) => setDrag(fromX(e.nativeEvent.locationX))}
      onResponderRelease={(e) => {
        const next = fromX(e.nativeEvent.locationX)
        setDrag(null)
        onCommit(next)
      }}
      style={{ height: 36, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
      {...web}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: c.ink2 }}>
        <View style={{ width: left + THUMB / 2, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
      </View>
      <View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: c.bg,
            borderWidth: 2,
            borderColor: c.accent,
          },
          shadow(SHADOWS.raisedS),
        ]}
      />
    </View>
  )
}
