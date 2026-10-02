// "Quick add" in the sidebar asks the Today screen to focus its add field. A tiny signal, so the two do not need to
// know about each other.
const listeners = new Set<() => void>()

export function onQuickAdd(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function requestQuickAdd(): void {
  listeners.forEach((listener) => listener())
}
