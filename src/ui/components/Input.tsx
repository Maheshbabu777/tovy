import { forwardRef, useState } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { fonts, radius, type } from '../tokens'
import { webStyle } from './web'

// Style guide, Fields: label above, 44 tall (48 on sign in, 40 compact), radius 10, a line border, 16 px text. Focus
// turns the border text colour; an error turns it red with a red sentence below. The label is always visible above.
export const Input = forwardRef<
  TextInput,
  Omit<TextInputProps, 'style'> & { label?: string; error?: string; height?: 40 | 44 | 48 }
>(function Input({ label, error, height = 44, onFocus, onBlur, ...props }, ref) {
  const { theme } = useTheme()
  const c = theme.colors
  const [focused, setFocused] = useState(false)
  const border = error ? c.red : focused ? c.text : c.line
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      {label ? <Text style={[type.label, { color: c.text }]}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.text3}
        accessibilityLabel={label ?? props.placeholder}
        accessibilityHint={error}
        aria-invalid={!!error}
        {...props}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={[
          {
            height,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: c.bg,
            paddingHorizontal: 14,
            fontFamily: fonts.sans,
            fontSize: 16, // never below 16, so phones do not zoom on focus
            color: c.text,
          },
          webStyle({ outlineStyle: 'none' }),
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[type.meta, { color: c.red }]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
})
