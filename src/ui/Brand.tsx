import { Image, View } from 'react-native'
import { useTheme } from './theme'

// The mark: three stacked stones (`.context/design/style-guide.md`, Mark). Black on the light theme, white on the
// dark one, never recoloured. The files are cut from the app icon the human supplied.
const MARK = {
  light: require('../../assets/brand/tovy-mark-black.png'),
  dark: require('../../assets/brand/tovy-mark-white.png'),
}
const RATIO = 743 / 809 // width over height of the mark files

export function Logo({ size = 44 }: { size?: number }) {
  const { theme } = useTheme()
  return (
    <Image
      source={MARK[theme.mode]}
      style={{ width: Math.round(size * RATIO), height: size, resizeMode: 'contain' }}
      accessibilityLabel="Tovy"
    />
  )
}

// What shows while the app checks who is signed in: the mark on the page ground, nothing else.
export function LoadingScreen({ testID }: { testID?: string }) {
  const { theme } = useTheme()
  return (
    <View
      testID={testID ?? 'app-loading'}
      accessibilityLabel="Loading"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}
    >
      <Logo size={40} />
    </View>
  )
}
