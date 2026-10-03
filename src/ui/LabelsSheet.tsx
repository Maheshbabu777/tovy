import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { Icons } from './icons'
import { cleanLabel } from '../core/taskFields'
import { Button } from './components/Button'
import { Chip } from './components/Chip'
import { Sheet } from './components/Sheet'
import { webStyle } from './components/web'
import { useTheme } from './theme'
import { radius, type } from './tokens'

// A task's labels (spec task-fields): the labels already in use as chips to switch on and off, and a field to make a
// new one. Every change saves at once; Done closes.
export function LabelsSheet({
  visible,
  onClose,
  value,
  known,
  onChange,
}: {
  visible: boolean
  onClose: () => void
  value: string[]
  known: string[] // every label in use, most used first
  onChange: (labels: string[]) => void
}) {
  return visible ? <LabelsForm onClose={onClose} value={value} known={known} onChange={onChange} /> : null
}

function LabelsForm({
  onClose,
  value,
  known,
  onChange,
}: {
  onClose: () => void
  value: string[]
  known: string[]
  onChange: (labels: string[]) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [typed, setTyped] = useState('')
  const all = [...new Set([...value, ...known])]
  const toggle = (label: string) =>
    onChange(value.includes(label) ? value.filter((l) => l !== label) : [...value, label])
  function addTyped() {
    const label = cleanLabel(typed)
    if (!label) return
    if (!value.includes(label)) onChange([...value, label])
    setTyped('')
  }
  return (
    <Sheet
      visible
      onClose={onClose}
      title="Labels"
      testID="labels-sheet"
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button label="Done" small onPress={onClose} testID="labels-done" />
        </View>
      }
    >
      <View style={{ gap: 12, paddingBottom: 4 }}>
        <View
          style={{
            height: 44,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.line,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 12,
          }}
        >
          <Icons.label size={18} color={c.text2} />
          <TextInput
            testID="labels-typed"
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={addTyped}
            blurOnSubmit={false}
            placeholder="New label, then Enter"
            placeholderTextColor={c.text3}
            autoCapitalize="none"
            accessibilityLabel="New label"
            style={[type.body, { flex: 1, color: c.text, height: 42 }, webStyle({ outlineStyle: 'none' })]}
          />
        </View>
        {all.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {all.map((l) => (
              <Chip
                key={l}
                label={`@${l}`}
                active={value.includes(l)}
                onPress={() => toggle(l)}
                testID={`label-${l}`}
              />
            ))}
          </View>
        ) : (
          <Text style={[type.meta, { color: c.text2 }]}>No labels yet. Type one above, or add @word to a task.</Text>
        )}
      </View>
    </Sheet>
  )
}
