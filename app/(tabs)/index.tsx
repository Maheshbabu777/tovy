import { TasksScreen } from '../../src/ui/TasksScreen'
import { useStore } from '../../src/ui/StoreContext'

export default function Today() {
  return <TasksScreen store={useStore()} />
}
