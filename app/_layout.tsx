import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist'
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthGate } from '../src/ui/AuthGate'
import { colors } from '../src/ui/tokens'

export default function RootLayout() {
  const [fontsReady] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
  })
  // A blank moment instead of text that jumps from the system font to Geist.
  if (!fontsReady) return null
  return (
    <SafeAreaProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </AuthGate>
    </SafeAreaProvider>
  )
}
