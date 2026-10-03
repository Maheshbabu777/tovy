import type { ReactNode } from 'react'
import { Animated, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Logo } from '../Brand'
import { useEnter } from '../motion'
import { useTheme } from '../theme'
import { fonts, WIDE_BREAKPOINT } from '../tokens'

// The frame of the sign in, code and setup screens.
//
// Phone (spec first-run): the mark and wordmark sit at the top as a quiet brand line, the words in the middle of the
// screen, and `actions` (fields and buttons) at the bottom, where the thumb already is; the keyboard pushes them up
// instead of covering them. Web: one centred column at most 448 wide, the actions straight under the words.
// The content fades and rises in once.
export function AuthLayout({
  children,
  actions,
  logo = true,
}: {
  children: ReactNode
  actions?: ReactNode
  logo?: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const enter = useEnter({ duration: 260, distance: 12 })

  const brand = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Logo size={wide ? 36 : 26} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: wide ? 22 : 19, letterSpacing: -0.8, color: c.text }}>
        tovy
      </Text>
    </View>
  )

  if (wide) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[{ width: '100%', maxWidth: 448, alignSelf: 'center' }, enter]}>
          {logo ? <View style={{ marginBottom: 32 }}>{brand}</View> : null}
          {children}
          {actions ? <View style={{ marginTop: 32 }}>{actions}</View> : null}
        </Animated.View>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 20 + insets.top,
          paddingBottom: 24 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {logo ? brand : null}
        <Animated.View style={[{ flex: 1, justifyContent: 'center', paddingVertical: 32 }, enter]}>
          {children}
        </Animated.View>
        {actions ? <View>{actions}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
