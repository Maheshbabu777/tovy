import { makeTheme, PALETTE, resolveMode } from './theme'

// (babel-jest lifts this above the import, so the storage module is never really loaded)
jest.mock('../core/db/authStorage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }))

describe('resolveMode', () => {
  it('follows the device only on System', () => {
    expect(resolveMode('system', 'dark')).toBe('dark')
    expect(resolveMode('system', 'light')).toBe('light')
    expect(resolveMode('system', null)).toBe('light')
    expect(resolveMode('system', 'unspecified')).toBe('light')
    expect(resolveMode('light', 'dark')).toBe('light')
    expect(resolveMode('dark', 'light')).toBe('dark')
  })
})

describe('makeTheme', () => {
  it('has the black and white palette of the style guide in both themes', () => {
    const light = makeTheme('light').colors
    const dark = makeTheme('dark').colors
    expect([light.bg, light.panel, light.hover, light.line, light.text, light.text2, light.text3]).toEqual([
      '#FFFFFF',
      '#F6F6F6',
      '#EFEFEF',
      '#E6E6E6',
      '#0A0A0A',
      '#5C5C5C',
      '#9A9A9A',
    ])
    expect([dark.bg, dark.panel, dark.hover, dark.line, dark.text, dark.text2, dark.text3]).toEqual([
      '#0A0A0A',
      '#141414',
      '#1F1F1F',
      '#262626',
      '#F5F5F5',
      '#A3A3A3',
      '#6B6B6B',
    ])
    expect([light.primary, light.onPrimary, dark.primary, dark.onPrimary]).toEqual([
      '#0A0A0A',
      '#FFFFFF',
      '#F5F5F5',
      '#0A0A0A',
    ])
    expect([light.red, dark.red]).toEqual(['#D93025', '#FF6B5E'])
  })

  it('maps the older colour names onto the new palette', () => {
    for (const mode of ['light', 'dark'] as const) {
      const c = makeTheme(mode).colors
      const p = PALETTE[mode]
      expect([c.accent, c.onAccent, c.ok, c.bad]).toEqual([p.primary, p.onPrimary, p.primary, p.red])
      expect([c.ink1, c.ink2, c.ink3, c.ink5, c.ink6, c.ink7]).toEqual([
        p.panel,
        p.hover,
        p.line,
        p.text3,
        p.text2,
        p.text,
      ])
    }
  })

  it('uses red as the only colour', () => {
    const grey = (hex: string) => hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7)
    for (const mode of ['light', 'dark'] as const) {
      const colours = Object.entries(PALETTE[mode]).filter(([name]) => name !== 'red')
      expect(colours.filter(([, hex]) => !grey(hex))).toEqual([])
    }
  })

  it('inverts the toast', () => {
    const c = makeTheme('dark').colors
    expect([c.toastBg, c.toastText]).toEqual([c.text, c.bg])
  })
})
