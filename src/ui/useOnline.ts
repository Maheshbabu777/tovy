import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

// Whether the device says it has a connection. The web tells us with the browser's online and offline events. A phone
// has no such event without an extra package, so it is treated as online (the sync error banner still shows).
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
