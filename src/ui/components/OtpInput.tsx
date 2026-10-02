import { useRef } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useTheme } from '../theme'
import { fonts, radius } from '../tokens'
import { webStyle } from './web'

// Design 7.12: six cells, each 56 tall and flexible in width, 8 apart, radius 10, 1 px border, 24 px semibold digits.
// The next empty cell has the accent border, an error gives every cell the bad border and bad digits. One hidden input
// takes the typing (numbers only), tapping any cell focuses it.
export function OtpInput({
  value,
  onChange,
  error = false,
  autoFocus = true,
  testID,
}: {
  value: string
  onChange: (value: string) => void
  error?: boolean
  autoFocus?: boolean
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const input = useRef<TextInput>(null)
  const next = Math.min(value.length, 5)
  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: 6 }, (_, i) => {
          const active = !error && i === next && value.length < 6
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 56,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: error ? c.bad : active ? c.accent : c.ink3,
                backgroundColor: c.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 24, color: error ? c.bad : c.ink }}>
                {value[i] ?? ''}
              </Text>
            </View>
          )
        })}
      </View>
      <TextInput
        ref={input}
        testID={testID}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus={autoFocus}
        accessibilityLabel="6-digit code"
        caretHidden
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, fontSize: 16 },
          webStyle({ outlineStyle: 'none', cursor: 'text', caretColor: 'transparent' }),
        ]}
      />
    </Pressable>
  )
}
