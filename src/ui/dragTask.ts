import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

// Drag a task onto a day or a list, on the web (spec upcoming-drag). Rows are draggable with the browser's own drag
// and drop; places that take a task (a day in Upcoming, a cell of the week strip, Inbox, Today and the projects in the
// sidebar) light up while a task is held over them. A phone keeps swipe and the row menu instead: a long press there
// already opens the menu, and dragging would fight the scroll.

const MIME = 'application/x-tovy-task'
const web = Platform.OS === 'web'

type Node = {
  addEventListener?: HTMLElement['addEventListener']
  removeEventListener?: HTMLElement['removeEventListener']
}

// The row side: returns a ref for the row's outer view. Does nothing off the web.
export function useDraggableTask(id: string) {
  const cleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanup.current?.(), [])
  return useCallback(
    (node: unknown) => {
      cleanup.current?.()
      cleanup.current = null
      const el = node as (Node & HTMLElement) | null
      if (!web || !el?.addEventListener) return
      el.setAttribute('draggable', 'true')
      const start = (e: DragEvent) => {
        e.dataTransfer?.setData(MIME, id)
        e.dataTransfer?.setData('text/plain', '')
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
      }
      el.addEventListener('dragstart', start)
      cleanup.current = () => {
        el.removeEventListener('dragstart', start)
      }
    },
    [id],
  )
}

// The drop side: a callback to give the place's view (as its `ref`), and whether a task is held over it now. `onDrop`
// gets the task's id. A pair, not an object, so the lint does not take `over` for a ref.
export function useTaskDrop(onDrop: (taskId: string) => void) {
  const [over, setOver] = useState(false)
  const latest = useRef(onDrop)
  useEffect(() => {
    latest.current = onDrop
  })
  const cleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanup.current?.(), [])
  const attach = useCallback((node: unknown) => {
    cleanup.current?.()
    cleanup.current = null
    const el = node as (Node & HTMLElement) | null
    if (!web || !el?.addEventListener) return
    let depth = 0 // dragenter and dragleave also fire for the place's children
    const ours = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes(MIME)
    const enter = (e: DragEvent) => {
      if (!ours(e)) return
      depth += 1
      setOver(true)
    }
    const leave = (e: DragEvent) => {
      if (!ours(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setOver(false)
    }
    const overIt = (e: DragEvent) => {
      if (!ours(e)) return
      e.preventDefault() // this says "you can drop here"
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    }
    const drop = (e: DragEvent) => {
      if (!ours(e)) return
      e.preventDefault()
      depth = 0
      setOver(false)
      const id = e.dataTransfer?.getData(MIME)
      if (id) latest.current(id)
    }
    el.addEventListener('dragenter', enter)
    el.addEventListener('dragleave', leave)
    el.addEventListener('dragover', overIt)
    el.addEventListener('drop', drop)
    cleanup.current = () => {
      el.removeEventListener('dragenter', enter)
      el.removeEventListener('dragleave', leave)
      el.removeEventListener('dragover', overIt)
      el.removeEventListener('drop', drop)
    }
  }, [])
  return [attach, over] as const
}
