import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'
import { shadow, SHADOWS, useFocusRing } from './web'

// Style guide, Settings: a pill track on panel (padding 3) with segments 32 tall; the selected one is a primary pill.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: c.panel,
        borderRadius: radius.pill,
        padding: 2,
        alignSelf: 'flex-start',
      }}
    >
      {options.map((o) => (
        <Segment key={o.value} selected={o.value === value} label={o.label} onPress={() => onChange(o.value)} />
      ))}
    </View>
  )
}

function Segment({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID={`segment-${label.toLowerCase()}`}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        {
          // Paper, Components: the chosen one is a raised white pill on the grey track, not a black one.
          height: 28,
          paddingHorizontal: 12,
          borderRadius: radius.pill,
          justifyContent: 'center',
          backgroundColor: selected ? (theme.mode === 'dark' ? c.line : c.bg) : 'transparent',
        },
        selected ? shadow(SHADOWS.raisedS) : {},
        ring.style,
      ]}
      {...ring.handlers}
    >
      <Text style={[type.meta, { color: selected ? c.text : c.text2 }]}>{label}</Text>
    </Pressable>
  )
}
