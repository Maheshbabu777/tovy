import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../theme'
import { type } from '../tokens'
import { IconButton } from './IconButton'

// Design 7.13: at least 56 tall, a back button on pushed pages, the title (22/600), an optional subtitle (13, ink-6)
// and a slot on the right for actions.
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {onBack ? (
        <View style={{ marginLeft: -8 }}>
          <IconButton icon={ChevronLeft} label="Back" onPress={onBack} testID="back" />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" numberOfLines={1} style={[type.pageTitle, { color: c.ink }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[type.meta, { color: c.ink6 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{right}</View> : null}
    </View>
  )
}
