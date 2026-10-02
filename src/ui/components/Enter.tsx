import type { ReactNode } from 'react'
import { Animated } from 'react-native'
import { useEnter } from '../motion'

// Fades and rises its children in when it mounts. Give it a `key` that changes with the page (a project id, a settings
// page) so moving between pages inside one tab moves the same way as switching tabs.
export function Enter({ children }: { children: ReactNode }) {
  const enter = useEnter({ duration: 180 })
  return <Animated.View style={[{ flex: 1 }, enter]}>{children}</Animated.View>
}
