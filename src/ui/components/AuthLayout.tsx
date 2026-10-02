import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Logo } from '../Brand'
import { useTheme } from '../theme'

// The frame of the sign in, code and setup screens (design 11.3): a centred column, at most 448 wide, content centred
// vertically, the logo on top.
export function AuthLayout({ children, logo = true }: { children: ReactNode; logo?: boolean }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 40 + insets.top,
        paddingBottom: 40 + insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center' }}>
        {logo ? (
          <View style={{ marginBottom: 24 }}>
            <Logo size={44} />
          </View>
        ) : null}
        {children}
      </View>
    </ScrollView>
  )
}
