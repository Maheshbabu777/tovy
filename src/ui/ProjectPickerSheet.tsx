import { View } from 'react-native'
import type { Project } from '../core/sync/tasks'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { PROJECT_COLORS } from './theme'

// Picks the project of a task, or "No project".
export function ProjectPickerSheet({
  visible,
  onClose,
  projects,
  value,
  onPick,
}: {
  visible: boolean
  onClose: () => void
  projects: Project[]
  value: string | null
  onPick: (projectId: string | null) => void
}) {
  const pick = (id: string | null) => {
    onPick(id)
    onClose()
  }
  return (
    <Sheet visible={visible} onClose={onClose} title="Project" testID="project-picker">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
        <Chip label="No project" active={value === null} onPress={() => pick(null)} testID="pick-project-none" />
        {projects.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            dot={PROJECT_COLORS[p.color] ?? PROJECT_COLORS.slate}
            active={value === p.id}
            onPress={() => pick(p.id)}
            testID={`pick-project-${p.id}`}
          />
        ))}
      </View>
    </Sheet>
  )
}
