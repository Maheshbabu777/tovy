// Small signals so the parts of the frame do not need to know about each other.
//   Quick add: the sidebar pill, the phone add button and the N key. A screen with its own composer (Today and Inbox on
//   a wide screen) registers it while it is showing, and N focuses that instead of opening the sheet.
//   Palette: the search buttons and Ctrl or Cmd K open the command palette.
type Listener = () => void

const quickAddListeners = new Set<Listener>()
const composers: Listener[] = []
const paletteListeners = new Set<Listener>()

export function onQuickAdd(listener: Listener): () => void {
  quickAddListeners.add(listener)
  return () => {
    quickAddListeners.delete(listener)
  }
}

// The most recently registered composer wins. Returns the function that removes it again.
export function registerComposer(focus: Listener): () => void {
  composers.push(focus)
  return () => {
    const i = composers.lastIndexOf(focus)
    if (i >= 0) composers.splice(i, 1)
  }
}

// `sheet` forces the quick add sheet even when a composer is showing (the add buttons).
export function requestQuickAdd(sheet = false): void {
  const composer = composers[composers.length - 1]
  if (composer && !sheet) composer()
  else quickAddListeners.forEach((listener) => listener())
}

export function onPalette(listener: Listener): () => void {
  paletteListeners.add(listener)
  return () => {
    paletteListeners.delete(listener)
  }
}

export function requestPalette(): void {
  paletteListeners.forEach((listener) => listener())
}
