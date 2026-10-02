import type { ReactNode } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { type, WIDE_BREAKPOINT } from '../tokens'
import { IconButton } from './IconButton'

// Style guide, Type: the screen title in display (34 regular, tight tracking; 40 on the web), an optional subtitle in
// text-2, a back button on pushed pages and a slot on the right for actions.
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  titleTestID,
}: {
  title: string
  titleTestID?: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingTop: 8 }}>
      {onBack ? (
        <View style={{ marginLeft: -10, marginBottom: 2 }}>
          <IconButton icon={Icons.back} label="Back" onPress={onBack} testID="back" />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          testID={titleTestID}
          accessibilityRole="header"
          numberOfLines={1}
          style={[onBack ? type.h1 : wide ? type.displayXl : type.display, { color: c.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[type.bodyS, { color: c.text2, marginTop: 4 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{right}</View> : null}
    </View>
  )
}
