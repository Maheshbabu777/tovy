import { Modal, Pressable, Text, View } from 'react-native'
import { DAILY_GOAL } from '../core/progress'
import { Button } from './components/Button'
import { ProgressRing } from './components/ProgressRing'
import { useTheme } from './theme'
import { type } from './tokens'

// Design 11.14: shown once when a change takes the day to 150 points. A 140 wide ok ring with a check, "Ring closed",
// and a button to carry on. Tapping anywhere dismisses it. (The streak line and "See streak" come with the streak spec.)
export function RingClosed({ visible, points, onClose }: { visible: boolean; points: number; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="ring-closed"
        accessibilityLabel="Ring closed. Tap to dismiss."
        onPress={onClose}
        style={{ flex: 1, backgroundColor: c.bgOverlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <ProgressRing size={140} stroke={10} progress={1} done />
        <Text style={[type.display, { color: c.ink, marginTop: 24, fontSize: 34, lineHeight: 38 }]}>Ring closed</Text>
        <Text style={[type.body, { color: c.ink6, marginTop: 8, textAlign: 'center', maxWidth: 320 }]}>
          {Math.max(points, DAILY_GOAL)} progress points today.
        </Text>
        <View style={{ marginTop: 28 }}>
          <Button label="Keep going" onPress={onClose} testID="ring-closed-dismiss" />
        </View>
      </Pressable>
    </Modal>
  )
}
