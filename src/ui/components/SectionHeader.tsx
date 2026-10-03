import { Pressable, Text, View } from 'react-native'
import { Icons } from '../icons'
import { useTheme } from '../theme'
import { type } from '../tokens'

// Style guide, Section header: the label in text, the count in mono text-3, a hairline under it, and an optional
// underlined action at the right (Reschedule).
export function SectionHeader({
  title,
  count,
  action,
  danger = false,
  fold,
}: {
  fold?: { open: boolean; onToggle: () => void; testID?: string } // the title folds the rows away (Done today)
  title: string
  count?: number
  action?: { label: string; onPress: () => void; testID?: string }
  danger?: boolean // the title in red (Overdue)
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        // Paper, Web Today: 28 above, 10 below, the hairline as wide as the column.
        paddingTop: 28,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      }}
    >
      {fold ? (
        <Pressable
          testID={fold.testID}
          accessibilityRole="button"
          accessibilityState={{ expanded: fold.open }}
          accessibilityLabel={`${title}, ${count ?? 0}. ${fold.open ? 'Hide' : 'Show'}`}
          onPress={fold.onToggle}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text accessibilityRole="header" style={[type.label, { color: c.text }]}>
            {title}
          </Text>
          {count ? <Text style={[type.monoS, { color: c.text3 }]}>{count}</Text> : null}
          <View style={{ transform: [{ rotate: fold.open ? '0deg' : '-90deg' }] }}>
            <Icons.expand size={14} color={c.text2} />
          </View>
        </Pressable>
      ) : (
        <>
          <Text accessibilityRole="header" style={[type.label, { color: danger ? c.red : c.text }]}>
            {title}
          </Text>
          {count ? <Text style={[type.monoS, { color: c.text3 }]}>{count}</Text> : null}
        </>
      )}
      <View style={{ flex: 1 }} />
      {action ? (
        <Pressable testID={action.testID} accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={[type.label, { color: c.text, textDecorationLine: 'underline' }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
