import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

// The task detail screen comes in the next slice of the ui-shell spec. This only exists so a tap on a row lands somewhere.
export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <View style={{ padding: 24 }}>
      <Text>Task {id}</Text>
    </View>
  )
}
