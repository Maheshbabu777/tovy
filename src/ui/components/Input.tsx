import { forwardRef, useState } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { fonts, radius, type } from '../tokens'
import { webStyle } from './web'

// Design 7.11: height 48 (44 in dialogs, 40 compact), radius 10, 1 px ink-3 border, 16 px text. Focus turns the border
// accent, an error turns it bad with the message 6 px below. The label is always visible above.
export const Input = forwardRef<
  TextInput,
  Omit<TextInputProps, 'style'> & { label?: string; error?: string; height?: 40 | 44 | 48 }
>(function Input({ label, error, height = 48, onFocus, onBlur, ...props }, ref) {
  const { theme } = useTheme()
  const c = theme.colors
  const [focused, setFocused] = useState(false)
  const border = error ? c.bad : focused ? c.accent : c.ink3
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      {label ? <Text style={[type.label, { color: c.ink }]}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.ink5}
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
            paddingHorizontal: 16,
            fontFamily: fonts.sans,
            fontSize: 16, // never below 16, so phones do not zoom on focus
            color: c.ink,
          },
          webStyle({ outlineStyle: 'none' }),
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[type.label, { color: c.bad }]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
})
