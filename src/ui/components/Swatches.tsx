import { Pressable, View } from 'react-native'
import { PROJECT_COLORS, useTheme } from '../theme'
import { useFocusRing } from './web'

const NAMES: Record<string, string> = { indigo: 'Indigo', teal: 'Teal', amber: 'Amber', rose: 'Rose', slate: 'Slate' }

// Design 11.15: five 36 px colour swatches. The chosen one gets a 2 px ring in its own colour, 2 px away from it.
export function Swatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {Object.keys(PROJECT_COLORS).map((key) => (
        <Swatch key={key} name={key} selected={key === value} onPress={() => onChange(key)} />
      ))}
    </View>
  )
}

function Swatch({ name, selected, onPress }: { name: string; selected: boolean; onPress: () => void }) {
  const { theme } = useTheme()
  const ring = useFocusRing(theme.colors.accent)
  const color = PROJECT_COLORS[name]
  return (
    <Pressable
      testID={`swatch-${name}`}
      accessibilityRole="radio"
      accessibilityLabel={NAMES[name]}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: selected ? color : 'transparent',
        },
        ring.style,
      ]}
      {...ring.handlers}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color }} />
    </Pressable>
  )
}
