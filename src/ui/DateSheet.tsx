import { useState } from 'react'
import { ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { Icons } from './icons'
import { dateLabel, parseTask, timeLabelOf } from '../core/parseTask'
import { nextDays } from '../core/today'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { webStyle } from './components/web'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'

// The few times people pick most, as one tap each (spec task-schedule).
const TIMES = [
  { label: 'Morning', time: '09:00' },
  { label: 'Noon', time: '12:00' },
  { label: 'Afternoon', time: '15:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '20:00' },
]

// When a task is due (spec task-schedule): a field that reads words ("fri 5pm", "12 oct", "in 3 days"), then the next
// seven days and "No date" as chips, then times as chips (only with a date). Every tap saves at once; Done closes.
export function DateSheet({
  visible,
  onClose,
  value,
  time = null,
  onPick,
  title = 'Schedule',
  withTime = true,
  noneLabel = 'No date',
}: {
  title?: string // "Deadline" for the date a task must be done by
  withTime?: boolean
  noneLabel?: string
  visible: boolean
  onClose: () => void
  value: string | null
  time?: string | null
  onPick: (day: string | null, time: string | null) => void
}) {
  return visible ? (
    <ScheduleForm
      onClose={onClose}
      value={value}
      time={time}
      onPick={onPick}
      title={title}
      withTime={withTime}
      noneLabel={noneLabel}
    />
  ) : null
}

function ScheduleForm({
  onClose,
  value,
  time,
  onPick,
  title,
  withTime,
  noneLabel,
}: {
  title: string
  withTime: boolean
  noneLabel: string
  onClose: () => void
  value: string | null
  time: string | null
  onPick: (day: string | null, time: string | null) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = new Date()
  const days = nextDays(now, 7)
  const [typed, setTyped] = useState('')
  // Read the words as if they were a task, with a stand-in title so a lone "tomorrow" still counts as a date.
  const read = typed.trim() ? parseTask(`x ${typed}`, now) : null
  const readable = read && (read.dueDate || read.dueTime)

  function applyTyped() {
    if (!read || !readable) return
    onPick(read.dueDate, read.dueTime)
    onClose()
  }

  const chipRow = (children: React.ReactNode) => (
    <ScrollView
      horizontal={!wide}
      scrollEnabled={!wide}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', flexWrap: wide ? 'wrap' : 'nowrap', gap: 6 }}
    >
      {children}
    </ScrollView>
  )

  return (
    <Sheet
      visible
      onClose={onClose}
      title={title}
      testID="date-sheet"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button label="Done" small onPress={onClose} testID="date-done" />
        </View>
      }
    >
      <View style={{ gap: 8, paddingBottom: 4 }}>
        <View
          style={{
            height: 44,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 12,
          }}
        >
          <Icons.date size={18} color={c.text2} />
          <TextInput
            testID="date-typed"
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={applyTyped}
            placeholder="Type a date: fri 5pm, 12 oct, in 3 days"
            placeholderTextColor={c.text3}
            accessibilityLabel="Type a date"
            autoCapitalize="none"
            style={[type.body, { flex: 1, color: c.text, height: 42 }, webStyle({ outlineStyle: 'none' })]}
          />
        </View>
        {typed.trim() ? (
          <Text testID="date-typed-read" style={[type.meta, { color: readable ? c.text : c.text2 }]}>
            {readable
              ? `${read!.dueDate ? dateLabel(read!.dueDate, now) : ''}${read!.dueTime ? `, ${timeLabelOf(read!.dueTime)}` : ''}. Press Enter to set it.`
              : 'Try "tomorrow", "fri 5pm" or "12 oct".'}
          </Text>
        ) : null}

        <Text style={[type.label, { color: c.text2, marginTop: 8 }]}>Date</Text>
        {chipRow(
          <>
            {days.map((d) => (
              <Chip
                key={d.day}
                label={d.label}
                active={value === d.day}
                onPress={() => onPick(d.day, time)}
                testID={`date-${d.day}`}
              />
            ))}
            <Chip label={noneLabel} active={value === null} onPress={() => onPick(null, null)} testID="date-none" />
          </>,
        )}

        {withTime ? <Text style={[type.label, { color: c.text2, marginTop: 8 }]}>Time</Text> : null}
        {!withTime ? null : value ? (
          chipRow(
            <>
              {TIMES.map((t) => (
                <Chip
                  key={t.time}
                  label={`${t.label} ${timeLabelOf(t.time)}`}
                  icon={Icons.time}
                  active={time === t.time}
                  onPress={() => onPick(value, time === t.time ? null : t.time)}
                  testID={`time-${t.time}`}
                />
              ))}
              <Chip label="No time" active={!time} onPress={() => onPick(value, null)} testID="time-none" />
            </>,
          )
        ) : (
          <Text style={[type.meta, { color: c.text2 }]}>Pick a date first.</Text>
        )}
      </View>
    </Sheet>
  )
}
