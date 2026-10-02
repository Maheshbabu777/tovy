// The rules for a profile, as plain functions (they mirror the checks in `0005_profiles.sql`, which has the last word).

export type ProfileInput = { firstName: string; lastName: string; username: string }
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
export const USERNAME_HELP = 'Use 3 to 20 characters: lowercase letters, numbers and _.'

// Returns the message to show for each field that is not valid. An empty object means the input is fine.
export function checkProfileInput(input: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {}
  const first = input.firstName.trim()
  const last = input.lastName.trim()
  if (first.length < 1) errors.firstName = 'Enter your first name.'
  else if (first.length > 50) errors.firstName = 'Keep your first name under 50 characters.'
  if (last.length < 1) errors.lastName = 'Enter your last name.'
  else if (last.length > 50) errors.lastName = 'Keep your last name under 50 characters.'
  if (!USERNAME_PATTERN.test(input.username)) errors.username = USERNAME_HELP
  return errors
}

// Google tells us the name; use it to fill the form so the person only checks it. Other sign ins give nothing.
export function prefillNames(metadata: Record<string, unknown> | undefined): { firstName: string; lastName: string } {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const given = text(metadata?.given_name)
  const family = text(metadata?.family_name)
  if (given || family) return { firstName: given.slice(0, 50), lastName: family.slice(0, 50) }
  const full = text(metadata?.full_name) || text(metadata?.name)
  const space = full.indexOf(' ')
  if (space < 0) return { firstName: full.slice(0, 50), lastName: '' }
  return {
    firstName: full.slice(0, space).slice(0, 50),
    lastName: full
      .slice(space + 1)
      .trim()
      .slice(0, 50),
  }
}
