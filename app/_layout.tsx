import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist'
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthGate } from '../src/ui/AuthGate'
import { ToastProvider } from '../src/ui/components/Toast'
import { ThemeProvider, useTheme } from '../src/ui/theme'

function ThemedApp() {
  const { theme } = useTheme()
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <ToastProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />
        </AuthGate>
      </ToastProvider>
    </>
  )
}

export default function RootLayout() {
  // Design 2: Geist 400, 500 and 600, and Geist Mono for data. Nothing else is used in the UI.
  const [fontsReady] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular })
  // A blank moment instead of text that jumps from the system font to Geist.
  if (!fontsReady) return null
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
