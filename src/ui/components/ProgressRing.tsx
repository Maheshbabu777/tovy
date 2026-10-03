import { useEffect, useState } from 'react'
import { Animated, Easing, Platform, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { EASE, prefersReducedMotion } from '../motion'
import { motion } from '../tokens'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Style guide, Task row: a thin text-3 ring when nothing is done, a primary arc on a line-strong track for progress
// (from 12 o'clock, clockwise, round caps), and a solid primary circle with an on-primary check when done. The arc
// animates over 500 ms.
export function ProgressRing({
  size,
  stroke,
  progress,
  done = false,
  doneAt = null,
  strong = false,
}: {
  strong?: boolean // priority 1: a solid black ring (style guide, Task row)
  size: number
  stroke: number
  progress: number // 0 to 1
  done?: boolean
  doneAt?: string | null // when it was finished: within the last two seconds the filled circle pops in
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const target = done ? 1 : Math.max(0, Math.min(1, progress))
  const [offset] = useState(() => new Animated.Value(circumference * (1 - target)))
  useEffect(() => {
    Animated.timing(offset, {
      toValue: circumference * (1 - target),
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start()
  }, [target, circumference, offset])
  if (done) {
    return <DoneCircle size={size} doneAt={doneAt} />
  }
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={target > 0 ? c.lineStrong : strong ? c.text : c.text3}
          strokeWidth={strong && target === 0 ? 2 : stroke}
          fill="none"
        />
        {target > 0 ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={c.primary}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        ) : null}
      </Svg>
    </View>
  )
}

// The solid primary circle with an on-primary check. Finished a moment ago, it pops in (0.6, 1.15, 1 over 300 ms).
function DoneCircle({ size, doneAt }: { size: number; doneAt: string | null }) {
  const { theme } = useTheme()
  const c = theme.colors
  const [pop] = useState(() => !!doneAt && Date.now() - Date.parse(doneAt) < 2000)
  const [scale] = useState(() => new Animated.Value(pop && !prefersReducedMotion() ? 0.6 : 1))
  useEffect(() => {
    if (!pop || prefersReducedMotion()) return
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.15, duration: 160, easing: EASE, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale, { toValue: 1, duration: 140, easing: EASE, useNativeDriver: Platform.OS !== 'web' }),
    ]).start()
  }, [pop, scale])
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      <Icons.check size={Math.round(size * 0.6)} color={c.onPrimary} bold />
    </Animated.View>
  )
}

export const RING_MOTION = motion
