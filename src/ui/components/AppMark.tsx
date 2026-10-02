import { Text, View } from 'react-native'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { type } from '../tokens'

// Style guide, Task row: what an AI app changed carries a small sparkle and the app name, in text-2.
export function AIBadge({ label = 'AI' }: { label?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icons.ai size={13} color={c.text2} />
      <Text style={[type.meta, { color: c.text2 }]}>{label}</Text>
    </View>
  )
}
