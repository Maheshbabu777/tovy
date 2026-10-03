import { Icons } from './icons'
import { EmptyState } from './components/Feedback'

// Shown by Connected apps, Activity and Trash while the server side is not switched on for this Tovy yet (the database
// change has not reached it, or sign in for apps is off). Nothing is broken; there is just nothing to show.
export function NotSetUp() {
  return (
    <EmptyState
      icon={Icons.connectedApps}
      title="Not switched on yet"
      body="Connecting AI apps is built but not turned on for this Tovy yet. Once it is, this page fills in by itself."
    />
  )
}
