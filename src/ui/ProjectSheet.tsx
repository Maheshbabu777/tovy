import { useState } from 'react'
import { Text, View } from 'react-native'
import { Button } from './components/Button'
import { Input } from './components/Input'
import { Sheet } from './components/Sheet'
import { Swatches } from './components/Swatches'
import { useTheme } from './theme'
import { type } from './tokens'

// Design 11.15: a name (auto-focused), five colours and one button. Used to create a project and, with `onDelete`, to
// edit one. The form lives inside the sheet, which draws nothing while closed, so it starts fresh every time.
export function ProjectSheet({
  visible,
  onClose,
  onSave,
  onDelete,
  initial,
}: {
  visible: boolean
  onClose: () => void
  onSave: (project: { name: string; color: string }) => void
  onDelete?: () => void
  initial?: { name: string; color: string }
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? 'Edit project' : 'New project'} testID="project-sheet">
      <ProjectForm onClose={onClose} onSave={onSave} onDelete={onDelete} initial={initial} />
    </Sheet>
  )
}

function ProjectForm({
  onClose,
  onSave,
  onDelete,
  initial,
}: {
  onClose: () => void
  onSave: (project: { name: string; color: string }) => void
  onDelete?: () => void
  initial?: { name: string; color: string }
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? 'indigo')
  const ready = name.trim().length > 0

  function save() {
    if (!ready) return
    onSave({ name: name.trim(), color })
    onClose()
  }

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <Input
        testID="project-name"
        value={name}
        onChangeText={setName}
        placeholder="Project name"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        maxLength={60}
      />
      <Swatches value={color} onChange={setColor} />
      <Button
        testID="project-save"
        label={initial ? 'Save' : 'Create project'}
        onPress={save}
        disabled={!ready}
        fullWidth
      />
      {onDelete ? (
        <View style={{ gap: 4 }}>
          <Button
            testID="project-delete"
            label="Delete project"
            variant="danger"
            onPress={() => {
              onDelete()
              onClose()
            }}
            fullWidth
          />
          <Text style={[type.meta, { color: c.ink6, textAlign: 'center' }]}>Its tasks move to No project.</Text>
        </View>
      ) : null}
    </View>
  )
}
