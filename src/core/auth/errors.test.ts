import { describeAuthError, isValidEmail } from './errors'

describe('describeAuthError', () => {
  it('explains a wrong or expired code', () => {
    const wrong = describeAuthError(
      { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' },
      'verify',
    )
    expect(wrong.text).toMatch(/wrong or has expired/)
    expect(wrong.waitSeconds).toBeUndefined()
    expect(describeAuthError({ status: 400, message: 'Token is invalid' }, 'verify').text).toMatch(
      /wrong or has expired/,
    )
  })

  it('shows a rate limit message with the wait the server asked for', () => {
    const limited = describeAuthError(
      {
        status: 429,
        code: 'over_email_send_rate_limit',
        message: 'For security purposes, you can only request this after 42 seconds.',
      },
      'send',
    )
    expect(limited.text).toMatch(/Too many codes/)
    expect(limited.waitSeconds).toBe(42)
    expect(describeAuthError({ status: 429, message: 'email rate limit exceeded' }, 'send').waitSeconds).toBe(60)
    expect(describeAuthError({ code: 'over_request_rate_limit', message: '' }, 'verify').text).toMatch(/Too many codes/)
  })

  it('tells a bad address, no connection and anything else apart', () => {
    expect(
      describeAuthError(
        { status: 400, code: 'validation_failed', message: 'Unable to validate email address: invalid format' },
        'send',
      ).text,
    ).toMatch(/does not look right/)
    expect(describeAuthError({ message: 'Failed to fetch' }, 'send').text).toMatch(/No connection/)
    expect(describeAuthError({ status: 500, message: 'boom' }, 'send').text).toMatch(/could not be sent/)
    expect(describeAuthError({ status: 500, message: 'boom' }, 'verify').text).toMatch(/could not be checked/)
  })
})

describe('isValidEmail', () => {
  it('accepts normal addresses and rejects the rest', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('  me@gmail.com ')).toBe(true)
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
