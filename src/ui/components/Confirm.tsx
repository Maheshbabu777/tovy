import { Modal, Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme'
import { radius, type } from '../tokens'
import { Button } from './Button'

// A small centred question with Cancel and one action, for the few things that cannot be undone from a toast
// (disconnecting an AI app). The action is red when it removes something.
export function Confirm({
  visible,
  title,
  body,
  action,
  danger = false,
  onConfirm,
  onClose,
  testID,
}: {
  visible: boolean
  title: string
  body: string
  action: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
  testID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.sheetScrim }}
        />
        <View
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            width: '100%',
            maxWidth: 384,
            backgroundColor: c.bg,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.line,
            padding: 24,
            gap: 12,
          }}
        >
          <Text style={[type.title, { color: c.text }]}>{title}</Text>
          <Text style={[type.bodyS, { color: c.text2 }]}>{body}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button label="Cancel" variant="ghost" onPress={onClose} testID={testID ? `${testID}-cancel` : undefined} />
            <Button
              label={action}
              variant={danger ? 'danger' : 'primary'}
              onPress={() => {
                onClose()
                onConfirm()
              }}
              testID={testID ? `${testID}-confirm` : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
