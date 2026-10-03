import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

// Small taps you feel on a phone (stage 5): finishing a task, a swipe passing its point, grabbing and turning the ID
// card, opening a menu by holding a row, choosing a day. Nothing on the web or where the device has no motor; a failure
// is never shown.
const on = Platform.OS === 'ios' || Platform.OS === 'android'
const safe = (f: () => Promise<void>) => {
  if (!on) return
  f().catch(() => undefined)
}

export const haptic = {
  // A light tap: something answered your touch (picking, grabbing).
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // Choosing one of several (a day, a chip), or crossing a swipe's point.
  select: () => safe(() => Haptics.selectionAsync()),
  // A firmer bump: a menu opened by holding, the card turning over.
  bump: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  // Done.
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  // Something was deleted.
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
}
