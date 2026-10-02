import { Text, View } from 'react-native'
import { DAILY_GOAL, pointsToClose, ringClosed, ringPercent } from '../core/progress'
import { ProgressRing } from './components/ProgressRing'
import { useTheme } from './theme'
import { radius, type } from './tokens'

// Design 11.6: the day's ring (88 wide, 8 stroke) with the share of 150 points, what is left to close it, and a line
// saying partial progress counts. The streak line comes with the streak spec.
export function HeroCard({ points }: { points: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  const closed = ringClosed(points)
  const percent = ringPercent(points)
  return (
    <View
      testID="hero-card"
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: c.ink3,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <View>
        <ProgressRing size={88} stroke={8} progress={percent / 100} done={closed} />
        {closed ? null : (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[type.numberL, { color: c.ink }]}>{percent}</Text>
            <Text style={[type.monoXs, { color: c.ink6, marginTop: -2 }]}>%</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text testID="hero-headline" style={[type.title, { color: c.ink }]}>
          {closed ? 'Ring closed' : `${pointsToClose(points)} points to close`}
        </Text>
        <Text testID="hero-sub" style={[type.bodyS, { color: c.ink6 }]}>
          {points} of {DAILY_GOAL} progress points today. Partial progress counts.
        </Text>
      </View>
    </View>
  )
}
