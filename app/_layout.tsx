import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist'
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthGate } from '../src/ui/AuthGate'
import { BootShell } from '../src/ui/BootShell'
import { ToastProvider } from '../src/ui/components/Toast'
import { ThemeProvider, useTheme } from '../src/ui/theme'

function ThemedApp() {
  const { theme } = useTheme()
  // Design 2: Geist 400, 500 and 600, and Geist Mono for data. Nothing else is used in the UI. Until they are ready the
  // empty app frame shows (it has no text), instead of text that jumps from the system font to Geist.
  const [fontsReady] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular })
  if (!fontsReady) return <BootShell />
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <ToastProvider>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: theme.colors.bg },
            }}
          />
        </AuthGate>
      </ToastProvider>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
