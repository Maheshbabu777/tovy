import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'
import { shadow, SHADOWS, useFocusRing } from './web'

// Design 7.6: an ink-1 track (radius 10, padding 2) with segments 32 tall; the selected one is a bg raised pill.
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
        backgroundColor: c.ink1,
        borderRadius: radius.md,
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
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID={`segment-${label.toLowerCase()}`}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        {
          height: 32,
          paddingHorizontal: 14,
          borderRadius: radius.seg,
          justifyContent: 'center',
          backgroundColor: selected ? c.bg : 'transparent',
        },
        selected ? shadow(SHADOWS.raisedS) : {},
        ring.style,
      ]}
      {...ring.handlers}
    >
      <Text style={[type.label, { color: selected ? c.ink : c.ink6 }]}>{label}</Text>
    </Pressable>
  )
}
