import { Pressable, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme } from '../theme'
import { useFocusRing } from './web'

// Design 7.9: 20 by 20, radius 6, 1.5 px ink-4 border. Checked: accent fill and border with an on-accent check.
export function Checkbox({
  checked,
  onToggle,
  label,
  testID,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      hitSlop={8}
      style={[{ borderRadius: 6 }, ring.style]}
      {...ring.handlers}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: checked ? c.accent : c.ink4,
          backgroundColor: checked ? c.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Check size={13} color={c.onAccent} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  )
}
