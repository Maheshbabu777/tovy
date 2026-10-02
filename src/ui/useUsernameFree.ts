import { useEffect, useState } from 'react'
import { isUsernameAvailable } from '../core/profile/profile'
import { USERNAME_PATTERN } from '../core/profile/rules'

// Asks whether a username is free shortly after the person stops typing. true: free, false: taken, null: not asked
// yet, badly formed, or could not ask. An answer only counts for the text it was asked about.
export function useUsernameFree(username: string): boolean | null {
  const [answer, setAnswer] = useState<{ name: string; free: boolean | null } | null>(null)
  useEffect(() => {
    if (!USERNAME_PATTERN.test(username)) return
    let cancelled = false
    const timer = setTimeout(() => {
      void isUsernameAvailable(username).then((free) => {
        if (!cancelled) setAnswer({ name: username, free })
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username])
  return answer && answer.name === username ? answer.free : null
}
