import { ACCENTS, makeTheme, resolveMode } from './theme'

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
  it('has the base colours of the design in both themes', () => {
    const light = makeTheme('light', 'indigo').colors
    const dark = makeTheme('dark', 'indigo').colors
    expect([light.bg, light.surface, light.ink]).toEqual(['rgb(255,255,255)', 'rgb(248,248,251)', 'rgb(17,17,26)'])
    expect([dark.bg, dark.surface, dark.ink]).toEqual(['rgb(11,11,17)', 'rgb(19,19,27)', 'rgb(238,238,248)'])
    expect([light.accent, dark.accent]).toEqual(['rgb(67,56,202)', 'rgb(139,141,251)'])
    expect([light.ok, light.warn, light.bad]).toEqual(['rgb(17,122,85)', 'rgb(176,80,10)', 'rgb(190,40,60)'])
    expect([dark.ok, dark.warn, dark.bad]).toEqual(['rgb(80,200,150)', 'rgb(240,170,90)', 'rgb(255,120,135)'])
  })

  it('builds every neutral from the ink colour at the design opacities', () => {
    const c = makeTheme('light', 'indigo').colors
    expect([c.ink1, c.ink2, c.ink3, c.ink4, c.ink5, c.ink6, c.ink7]).toEqual([
      'rgba(17,17,26,0.04)',
      'rgba(17,17,26,0.08)',
      'rgba(17,17,26,0.12)',
      'rgba(17,17,26,0.24)',
      'rgba(17,17,26,0.46)',
      'rgba(17,17,26,0.68)',
      'rgba(17,17,26,0.92)',
    ])
    const d = makeTheme('dark', 'indigo').colors
    expect(d.ink3).toBe('rgba(238,238,248,0.12)')
  })

  it('derives the soft colours from the accent and the status colours', () => {
    const c = makeTheme('light', 'indigo').colors
    expect(c.accentSoft).toBe('rgba(67,56,202,0.11)')
    expect(c.okSoft).toBe('rgba(17,122,85,0.15)')
    expect(c.badSoft).toBe('rgba(190,40,60,0.1)')
    expect(makeTheme('dark', 'indigo').colors.toastBg).toBe('rgb(238,238,248)') // the toast is inverted
  })

  it('changes only the accent when another accent is chosen', () => {
    const indigo = makeTheme('light', 'indigo').colors
    const iris = makeTheme('light', 'iris').colors
    expect(iris.accent).toBe('rgb(108,52,214)')
    expect(iris.accentSoft).toBe('rgba(108,52,214,0.11)')
    expect(iris.ink).toBe(indigo.ink)
    expect(Object.keys(ACCENTS)).toEqual(['indigo', 'ultramarine', 'iris'])
    expect(makeTheme('dark', 'ultramarine').colors.accent).toBe('rgb(120,160,255)')
  })
})
