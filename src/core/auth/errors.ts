// What the sign in screen says when Supabase Auth refuses something. Pure functions, so they are easy to test.

export type AuthFailure = { message?: string; status?: number; code?: string }

export type AuthMessage = {
  text: string
  // Set when the server says how long to wait before asking for another code.
  waitSeconds?: number
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

// `step` is what the person was doing: asking for a code ('send') or entering one ('verify').
export function describeAuthError(error: AuthFailure, step: 'send' | 'verify'): AuthMessage {
  const message = error.message ?? ''
  const code = error.code ?? ''

  // Too many requests. Supabase says "...you can only request this after 42 seconds" for the per address wait.
  if (error.status === 429 || code.includes('rate_limit')) {
    const seconds = Number(/after (\d+) seconds?/i.exec(message)?.[1])
    return {
      text: 'Too many codes were asked for. Wait a minute, then ask again.',
      waitSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 60,
    }
  }

  if (step === 'verify') {
    if (code === 'otp_expired' || /expired|invalid/i.test(message)) {
      return { text: 'That code is wrong or has expired. Check it, or ask for a new one.' }
    }
    return { text: 'The code could not be checked. Try again.' }
  }

  if (
    code === 'validation_failed' ||
    code === 'email_address_invalid' ||
    /invalid format|invalid email/i.test(message)
  ) {
    return { text: 'That email address does not look right.' }
  }
  if (error.status === undefined || error.status === 0 || /failed to fetch|network/i.test(message)) {
    return { text: 'No connection. Check your internet and try again.' }
  }
  return { text: 'The code could not be sent. Try again in a moment.' }
}
