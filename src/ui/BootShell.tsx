import { Platform, View, useWindowDimensions } from 'react-native'
import { useTheme } from './theme'
import { WIDE_BREAKPOINT } from './tokens'

// What shows while the app gets ready (fonts, the saved session, the profile): the same empty frame the boot page in
// public/index.html draws before any JavaScript, so a reload goes frame, frame, then the frame with tasks. Nothing
// flashes, nothing jumps. On a wide screen a signed-in person sees the empty sidebar where it is about to be.
export function BootShell({ testID = 'app-loading' }: { testID?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const web = bootFlags()
  return (
    <View testID={testID} accessibilityLabel="Loading" style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      {wide && web.signedIn ? (
        <View
          style={{
            width: web.collapsed ? 68 : 260,
            backgroundColor: c.panel,
            borderRightWidth: 1,
            borderRightColor: c.line,
          }}
        />
      ) : null}
    </View>
  )
}

// What the boot page found in this browser (see public/index.html). Off the web: signed in is unknown, so no sidebar.
function bootFlags(): { signedIn: boolean; collapsed: boolean } {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return { signedIn: false, collapsed: false }
  const root = document.documentElement
  return { signedIn: root.hasAttribute('data-signed-in'), collapsed: root.hasAttribute('data-collapsed') }
}
