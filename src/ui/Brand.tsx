import { Image } from 'react-native'
import { BootShell } from './BootShell'
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

// While the session and profile load: the empty app frame, not a logo, so loading looks like the app arriving.
export function LoadingScreen({ testID }: { testID?: string }) {
  return <BootShell testID={testID ?? 'app-loading'} />
}
