import { Image, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from './tokens'

// The logo and the name, at the top of the sign in and setup screens (the sidebar has its own, smaller one).
export function Brand() {
  return (
    <View style={styles.row}>
      <Image source={require('../../assets/brand/tovy-logo.png')} style={styles.logo} accessibilityLabel="Tovy" />
      <Text style={styles.name}>tovy</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  name: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
})
