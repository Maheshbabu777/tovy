import type { ReactNode } from 'react'
import { ScrollView, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { WIDE_BREAKPOINT } from '../tokens'

// The scrolling page every tab screen sits in. Design 3.2: content at most 672 wide (576 for settings pages) and a
// bottom gap that clears the tab bar on a phone.
export function Page({ children, maxWidth = 672 }: { children: ReactNode; maxWidth?: number }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: wide ? 32 : 16,
          paddingTop: wide ? 16 : 8,
          paddingBottom: wide ? 48 : 96 + insets.bottom,
        }}
      >
        <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
      </ScrollView>
    </View>
  )
}
