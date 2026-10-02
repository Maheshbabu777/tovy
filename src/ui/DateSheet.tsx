import { Text, View } from 'react-native'
import { nextDays } from '../core/today'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { useTheme } from './theme'
import { type } from './tokens'

// Design 11.10 with the date and "No date" groups (reminders and repeat come with their own spec).
export function DateSheet({
  visible,
  onClose,
  value,
  onPick,
}: {
  visible: boolean
  onClose: () => void
  value: string | null
  onPick: (day: string | null) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const days = nextDays(new Date(), 7)
  const pick = (day: string | null) => {
    onPick(day)
    onClose()
  }
  return (
    <Sheet visible={visible} onClose={onClose} title="Date" testID="date-sheet">
      <View style={{ gap: 8, paddingBottom: 8 }}>
        <Text style={[type.label, { color: c.ink6 }]}>Date</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {days.map((d) => (
            <Chip
              key={d.day}
              label={d.label}
              active={value === d.day}
              onPress={() => pick(d.day)}
              testID={`date-${d.day}`}
            />
          ))}
          <Chip label="No date" active={value === null} onPress={() => pick(null)} testID="date-none" />
        </View>
        <View style={{ marginTop: 12 }}>
          <Button label="Done" onPress={onClose} fullWidth />
        </View>
      </View>
    </Sheet>
  )
}
