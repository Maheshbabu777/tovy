import { Platform } from 'react-native'

// An AI app can send someone who is signed out to the consent screen (spec mcp-server). Signing in with an email code
// keeps them on that page, but Google sends the browser back to the site's front page. So the page is remembered just
// before going to Google, and opened again once signed in. Web only, and only for the consent screen.
const KEY = 'tovy-return-to'

export function rememberReturn() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return
  const here = `${window.location.pathname}${window.location.search}`
  try {
    if (window.location.pathname.startsWith('/oauth/')) window.sessionStorage.setItem(KEY, here)
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // private mode: the person starts again from the AI app
  }
}

// The remembered page, once. Only a path inside this site is ever returned.
export function takeReturn(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null
  try {
    const path = window.sessionStorage.getItem(KEY)
    window.sessionStorage.removeItem(KEY)
    return path && path.startsWith('/oauth/') && !path.startsWith('//') ? path : null
  } catch {
    return null
  }
}
