import { View } from 'react-native'
import { useTheme } from '../theme'

// Design 7.x progress bar: a 4 px ink-2 track with a pill fill, in the accent or the colour given.
export function ProgressBar({ percent, color, height = 4 }: { percent: number; color?: string; height?: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  const value = Math.max(0, Math.min(100, percent))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={{ height, borderRadius: height / 2, backgroundColor: c.ink2, overflow: 'hidden' }}
    >
      <View
        style={{ width: `${value}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? c.accent }}
      />
    </View>
  )
}
