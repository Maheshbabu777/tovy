import { checkProfileInput, prefillNames } from './rules'

const ok = { firstName: 'Ada', lastName: 'Lovelace', username: 'ada_l' }

describe('checkProfileInput', () => {
  it('accepts a good profile', () => {
    expect(checkProfileInput(ok)).toEqual({})
    expect(checkProfileInput({ ...ok, firstName: '  Ada  ' })).toEqual({}) // spaces around a name are trimmed by the database
  })

  it('refuses empty or too long names', () => {
    expect(checkProfileInput({ ...ok, firstName: '   ' }).firstName).toMatch(/first name/)
    expect(checkProfileInput({ ...ok, lastName: '' }).lastName).toMatch(/last name/)
    expect(checkProfileInput({ ...ok, firstName: 'x'.repeat(51) }).firstName).toMatch(/under 50/)
    expect(checkProfileInput({ ...ok, lastName: 'x'.repeat(50) })).toEqual({})
  })

  it('refuses usernames that break the format', () => {
    for (const username of ['ab', 'a'.repeat(21), 'Ada_L', 'ada l', 'ada-l', 'ada.l', '']) {
      expect(checkProfileInput({ ...ok, username }).username).toMatch(/3 to 20/)
    }
    expect(checkProfileInput({ ...ok, username: 'a_1' })).toEqual({})
    expect(checkProfileInput({ ...ok, username: 'a'.repeat(20) })).toEqual({})
  })

  it('reports every bad field at once', () => {
    expect(Object.keys(checkProfileInput({ firstName: '', lastName: '', username: 'x' })).sort()).toEqual([
      'firstName',
      'lastName',
      'username',
    ])
  })
})

describe('prefillNames', () => {
  it('uses the given and family name when Google sends them', () => {
    expect(prefillNames({ given_name: 'Ada', family_name: 'Lovelace', name: 'ignored' })).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
  })

  it('splits a full name at the first space', () => {
    expect(prefillNames({ full_name: 'Ada King Lovelace' })).toEqual({ firstName: 'Ada', lastName: 'King Lovelace' })
    expect(prefillNames({ name: 'Ada' })).toEqual({ firstName: 'Ada', lastName: '' })
  })

  it('gives empty names when there is nothing to use', () => {
    expect(prefillNames(undefined)).toEqual({ firstName: '', lastName: '' })
    expect(prefillNames({ given_name: 5, name: null })).toEqual({ firstName: '', lastName: '' })
  })
})
