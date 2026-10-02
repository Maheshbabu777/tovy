import { Pressable, View } from 'react-native'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { useFocusRing } from './web'

// Style guide: a 20 px check circle with a 1.5 px text-3 ring. Checked: a solid primary circle with an on-primary check.
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
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onToggle}
      hitSlop={8}
      style={[{ borderRadius: 10 }, ring.style]}
      {...ring.handlers}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: checked ? c.primary : c.text3,
          backgroundColor: checked ? c.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icons.check size={12} color={c.onPrimary} bold /> : null}
      </View>
    </Pressable>
  )
}
