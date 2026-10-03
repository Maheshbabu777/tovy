import type { ReactNode } from 'react'
import { View } from 'react-native'

// Holds a page inside a tab (a project, a settings page). Pages swap at once, like tabs do (spec design-v2): the
// fade and rise on every switch read as a flicker. Give it a `key` that changes with the page so its state resets.
export function Enter({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>
}
