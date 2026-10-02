import { useEffect, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { motion } from '../tokens'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Design 7.8: a track circle and an arc from 12 o'clock, clockwise, with round caps. Done turns it green with a check.
// The arc animates over 500 ms.
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
  const arc = done ? c.ok : c.accent
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={done ? c.ok : c.ink2} strokeWidth={stroke} fill="none" />
        {target > 0 ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arc}
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
      {done ? <Icons.check size={Math.round(size * 0.5)} color={c.ok} strokeWidth={2.6} /> : null}
    </View>
  )
}

export const RING_MOTION = motion
