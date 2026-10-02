import { Image } from 'react-native'

// The logo mark (design 8). It is a tile with its own colours, the same in both themes here.
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/brand/tovy-logo.png')}
      style={{ width: size, height: size, resizeMode: 'contain' }}
      accessibilityLabel="Tovy"
    />
  )
}
