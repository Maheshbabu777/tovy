import { Text, View } from 'react-native'
import { KeyCap } from './components/KeyCap'
import { Sheet } from './components/Sheet'
import { SHORTCUTS } from './keyboardList'
import { useTheme } from './theme'
import { type } from './tokens'

// "?" on the web: every keyboard shortcut in one place.
export function ShortcutsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Sheet visible={visible} onClose={onClose} title="Keyboard shortcuts" testID="shortcuts-sheet">
      <View style={{ paddingBottom: 8 }}>
        {SHORTCUTS.map((s) => (
          <View
            key={s.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 40,
              borderBottomWidth: 1,
              borderBottomColor: c.line,
            }}
          >
            <Text style={[type.bodyS, { flex: 1, color: c.text }]}>{s.label}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {s.keys.map((k) => (
                <KeyCap key={k} label={k} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  )
}
