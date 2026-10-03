import { Pressable, Text, View } from 'react-native'
import { monthGrid, monthTitle, type CalendarDay } from '../core/views'
import type { Task } from '../core/sync/tasks'
import { Icons, type ToolkitIcon } from './icons'
import { useTheme } from './theme'
import { radius, type } from './tokens'
import { SHADOWS, shadow, transition, useFocusRing, useHover, webStyle } from './components/web'

// The Upcoming calendar controls (spec design-v2, slice 3): the month it shows (press it for a month grid), the week
// before and after, and a way back to today. The list below is not limited to a week: any day can be reached.

export function CalendarBar({
  month,
  open,
  onToggle,
  onPrev,
  onNext,
  onToday,
  canPrev,
}: {
  month: string // any day in the month shown
  open: boolean
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  canPrev: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 16 }}>
      <Pressable
        testID="calendar-month"
        accessibilityRole="button"
        accessibilityLabel={`${monthTitle(month)}, ${open ? 'hide' : 'show'} the month`}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            height: 32,
            paddingHorizontal: 10,
            marginLeft: -10,
            borderRadius: radius.sm,
            backgroundColor: hovered || open ? c.hover : 'transparent',
          },
          transition('background-color'),
          ring.style,
        ]}
        {...handlers}
        {...ring.handlers}
      >
        <Text style={[type.bodySMedium, { color: c.text }]}>{monthTitle(month)}</Text>
        <View style={[{ transform: [{ rotate: open ? '180deg' : '0deg' }] }, transition('transform')]}>
          <Icons.expand size={14} color={c.text2} />
        </View>
      </Pressable>
      <View style={{ flex: 1 }} />
      <NavButton icon={Icons.back} label="Previous week" onPress={onPrev} disabled={!canPrev} testID="calendar-prev" />
      <TodayButton onPress={onToday} />
      <NavButton icon={Icons.forward} label="Next week" onPress={onNext} testID="calendar-next" />
    </View>
  )
}

function NavButton({
  icon: Icon,
  label,
  onPress,
  disabled,
  testID,
}: {
  icon: ToolkitIcon
  label: string
  onPress: () => void
  disabled?: boolean
  testID: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      // @ts-expect-error `title` is the web tooltip, not in the native types
      title={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hovered && !disabled ? c.hover : 'transparent',
          opacity: disabled ? 0.35 : 1,
        },
        transition('background-color'),
        ring.style,
      ]}
      {...handlers}
      {...ring.handlers}
    >
      <Icon size={16} color={hovered ? c.text : c.text2} />
    </Pressable>
  )
}

function TodayButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID="calendar-today"
      accessibilityRole="button"
      accessibilityLabel="Go to today"
      onPress={onPress}
      style={[
        {
          height: 32,
          paddingHorizontal: 12,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: c.line,
          justifyContent: 'center',
          backgroundColor: hovered ? c.hover : 'transparent',
        },
        transition('background-color'),
        ring.style,
      ]}
      {...handlers}
      {...ring.handlers}
    >
      <Text style={[type.label, { color: c.text }]}>Today</Text>
    </Pressable>
  )
}

const WEEK_HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// A month as a grid of days, Monday first. Days with an open task have a dot; today has a ring; the picked day is
// filled; days already over are faded and cannot be picked. Arrows step a month at a time.
export function MonthPicker({
  tasks,
  now,
  month,
  selected,
  onMonth,
  onPick,
  floating,
}: {
  floating?: boolean // wide screens: a popover over the list instead of a panel that pushes it down
  tasks: Task[]
  now: Date
  month: string
  selected: string
  onMonth: (step: -1 | 1) => void
  onPick: (day: string) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const weeks = monthGrid(tasks, now, month)
  return (
    <View
      testID="month-picker"
      style={[
        {
          marginTop: 8,
          padding: 12,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.bg,
          maxWidth: 360,
        },
        floating ? { position: 'absolute', top: 48, left: -12, width: 320, zIndex: 10 } : {},
        floating ? shadow(SHADOWS.menu) : {},
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[type.bodySMedium, { color: c.text, flex: 1, paddingLeft: 4 }]}>{monthTitle(month)}</Text>
        <NavButton icon={Icons.back} label="Previous month" onPress={() => onMonth(-1)} testID="month-prev" />
        <NavButton icon={Icons.forward} label="Next month" onPress={() => onMonth(1)} testID="month-next" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEK_HEAD.map((w, i) => (
          <Text key={i} style={[type.micro, { flex: 1, textAlign: 'center', color: c.text3, paddingBottom: 4 }]}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].day} style={{ flexDirection: 'row' }}>
          {week.map((d) => (
            <MonthCell key={d.day} d={d} on={d.day === selected} onPick={onPick} />
          ))}
        </View>
      ))}
    </View>
  )
}

function MonthCell({
  d,
  on,
  onPick,
}: {
  d: CalendarDay & { inMonth: boolean }
  on: boolean
  onPick: (day: string) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const ring = useFocusRing(c.primary)
  const faded = d.past || !d.inMonth
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
      <Pressable
        testID={`month-${d.day}`}
        accessibilityRole="button"
        accessibilityLabel={`${d.weekday} ${d.date}${d.busy ? ', has tasks' : ''}`}
        accessibilityState={{ selected: on, disabled: d.past }}
        disabled={d.past}
        onPress={() => onPick(d.day)}
        style={[
          {
            width: 36,
            height: 36,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: on ? c.primary : hovered && !d.past ? c.hover : 'transparent',
            borderWidth: 1,
            borderColor: on ? c.primary : d.today ? c.text : 'transparent',
          },
          transition('background-color'),
          ring.style,
          webStyle({ cursor: d.past ? 'default' : 'pointer' }),
        ]}
        {...handlers}
        {...ring.handlers}
      >
        <Text style={[type.bodyS, { color: on ? c.onPrimary : faded ? c.text3 : c.text }]}>{d.date}</Text>
        <View
          style={{
            position: 'absolute',
            bottom: 4,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: d.busy && !d.past ? (on ? c.onPrimary : c.text) : 'transparent',
          }}
        />
      </Pressable>
    </View>
  )
}
