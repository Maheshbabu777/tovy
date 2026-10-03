import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { useTheme } from '../theme'
import { fonts, radius } from '../tokens'

// An AI app as people recognise it (spec design-v2): its own icon, as the app registered it with Tovy's sign-in, on a
// soft tile. An app that gave no icon, or whose icon fails to load, gets its first letter instead of a generic symbol.
export function AppIcon({ name, logoUri, size = 36 }: { name: string; logoUri?: string; size?: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  const [broken, setBroken] = useState(false)
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size >= 32 ? radius.md : radius.sm,
        backgroundColor: c.panel,
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {logoUri && !broken ? (
        <Image
          source={{ uri: logoUri }}
          onError={() => setBroken(true)}
          style={{ width: size * 0.62, height: size * 0.62, resizeMode: 'contain' }}
        />
      ) : (
        <Text style={{ fontFamily: fonts.medium, fontSize: Math.round(size * 0.42), color: c.text }}>{letter}</Text>
      )}
    </View>
  )
}
