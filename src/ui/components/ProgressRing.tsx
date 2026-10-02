import { useEffect, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Icons } from '../icons'
import { useTheme } from '../theme'
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
}: {
  size: number
  stroke: number
  progress: number // 0 to 1
  done?: boolean
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
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icons.check size={Math.round(size * 0.6)} color={c.onPrimary} filled />
      </View>
    )
  }
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={target > 0 ? c.lineStrong : c.text3}
          strokeWidth={stroke}
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

export const RING_MOTION = motion
