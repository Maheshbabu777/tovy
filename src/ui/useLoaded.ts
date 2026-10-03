import { useCallback, useEffect, useState } from 'react'
import type { Loaded } from '../core/aiApi'

export type LoadState<T> =
  { status: 'loading' } | { status: 'ok'; data: T } | { status: 'notSetUp' } | { status: 'error'; message: string }

// Loads something from the server when the screen opens, and again on `reload`. `set` changes the loaded data in
// place (after an undo, say) without asking the server again.
export function useLoaded<T>(load: () => Promise<Loaded<T>>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let alive = true
    load().then(
      (r) => {
        if (!alive) return
        if (r.ok) setState({ status: 'ok', data: r.data })
        else setState(r.notSetUp ? { status: 'notSetUp' } : { status: 'error', message: r.message })
      },
      (e: unknown) =>
        alive && setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not load' }),
    )
    return () => {
      alive = false
    }
    // `load` is a module function passed by each screen; reloading follows `round`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])
  const reload = useCallback(() => setRound((n) => n + 1), [])
  const set = useCallback((change: (data: T) => T) => {
    setState((s) => (s.status === 'ok' ? { status: 'ok', data: change(s.data) } : s))
  }, [])
  return { state, reload, set }
}
