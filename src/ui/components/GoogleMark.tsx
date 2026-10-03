import { Image } from 'react-native'

// Google's "G" for "Continue with Google", cut from Google's own sign-in assets
// (developers.google.com/identity/branding-guidelines). Its colours and shape are never changed; it takes the place
// of a toolkit icon in a button, so it accepts the same props and ignores the colour.
export function GoogleMark({ size = 18 }: { size?: number; color?: string }) {
  return (
    <Image
      source={require('../../../assets/brand/google-g.png')}
      style={{ width: size, height: size }}
      accessibilityLabel="Google"
    />
  )
}
