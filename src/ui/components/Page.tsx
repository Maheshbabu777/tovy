import type { ReactNode } from 'react'
import { ScrollView, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { WIDE_BREAKPOINT } from '../tokens'

// The scrolling page every tab screen sits in. Style guide, Space: the web list column is 720 wide (576 for settings
// pages), phone side padding is 20, and the bottom gap clears the tab bar and the add button on a phone.
export function Page({ children, maxWidth = 720 }: { children: ReactNode; maxWidth?: number }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: wide ? 48 : 20,
          paddingTop: wide ? 40 : 8,
          paddingBottom: wide ? 64 : 120 + insets.bottom,
        }}
      >
        <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
      </ScrollView>
    </View>
  )
}
