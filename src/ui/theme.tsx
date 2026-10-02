import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform, StyleSheet, useColorScheme } from 'react-native'
import storage from '../core/db/authStorage'

// The colours of the design (design-spec.md section 1). Every neutral is the ink colour at an opacity, nothing is a
// raw grey. Components read colours from `useTheme()` only, so both themes and the accent choice work everywhere.

type Rgb = readonly [number, number, number]
export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'
export type AccentName = 'indigo' | 'ultramarine' | 'iris'

const BASE: Record<ThemeMode, { bg: Rgb; surface: Rgb; ink: Rgb; onAccent: Rgb; ok: Rgb; warn: Rgb; bad: Rgb }> = {
  light: {
    bg: [255, 255, 255],
    surface: [248, 248, 251],
    ink: [17, 17, 26],
    onAccent: [255, 255, 255],
    ok: [17, 122, 85],
    warn: [176, 80, 10],
    bad: [190, 40, 60],
  },
  dark: {
    bg: [11, 11, 17],
    surface: [19, 19, 27],
    ink: [238, 238, 248],
    onAccent: [14, 14, 30],
    ok: [80, 200, 150],
    warn: [240, 170, 90],
    bad: [255, 120, 135],
  },
}

export const ACCENTS: Record<AccentName, { label: string; light: Rgb; dark: Rgb }> = {
  indigo: { label: 'Indigo', light: [67, 56, 202], dark: [139, 141, 251] },
  ultramarine: { label: 'Ultramarine', light: [36, 70, 212], dark: [120, 160, 255] },
  iris: { label: 'Iris', light: [108, 52, 214], dark: [176, 140, 255] },
}

export const accentColor = (name: AccentName, mode: ThemeMode) => `rgb(${ACCENTS[name][mode].join(',')})`

// The five project colours. They are small markers only (a dot or a bar), the same in both themes.
export const PROJECT_COLORS: Record<string, string> = {
  indigo: '#4F46E5',
  teal: '#0F8A74',
  amber: '#C2670E',
  rose: '#C0364F',
  slate: '#5B6B7F',
}

const rgb = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`
const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function buildColors(mode: ThemeMode, accentName: AccentName) {
  const b = BASE[mode]
  const accent = ACCENTS[accentName][mode]
  return {
    bg: rgb(b.bg),
    bgClear: rgba(b.bg, 0), // for fades
    surface: rgb(b.surface),
    ink: rgb(b.ink),
    // The ink ladder (section 1.2): 4, 8, 12, 24, 46, 68 and 92 percent.
    ink1: rgba(b.ink, 0.04),
    ink2: rgba(b.ink, 0.08),
    ink3: rgba(b.ink, 0.12),
    ink4: rgba(b.ink, 0.24),
    ink5: rgba(b.ink, 0.46),
    ink6: rgba(b.ink, 0.68),
    ink7: rgba(b.ink, 0.92),
    accent: rgb(accent),
    accentSoft: rgba(accent, 0.11),
    accentHover: rgba(accent, 0.15),
    accentFaint: rgba(accent, 0.4),
    onAccent: rgb(b.onAccent),
    ok: rgb(b.ok),
    okSoft: rgba(b.ok, 0.15),
    warn: rgb(b.warn),
    bad: rgb(b.bad),
    badSoft: rgba(b.bad, 0.1),
    sheetScrim: 'rgba(0,0,0,0.35)',
    dialogScrim: 'rgba(0,0,0,0.40)',
    barBg: rgba(b.bg, 0.95),
    // The toast is inverted: ink background, bg text (section 1.6).
    toastBg: rgb(b.ink),
    toastText: rgb(b.bg),
    toastUndo: mode === 'light' ? '#A5A8FF' : rgb(accent),
    selection: rgba(accent, 0.25),
  }
}

export type Colors = ReturnType<typeof buildColors>
export type Theme = { mode: ThemeMode; colors: Colors }

type ThemeContextValue = {
  theme: Theme
  preference: ThemePreference
  accent: AccentName
  setPreference: (p: ThemePreference) => void
  setAccent: (a: AccentName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'tovy-theme'

// The theme a device settings choice resolves to. Pure, so it can be tested.
export function resolveMode(preference: ThemePreference, system: string | null | undefined): ThemeMode {
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light'
  return preference
}

export function makeTheme(mode: ThemeMode, accent: AccentName): Theme {
  return { mode, colors: buildColors(mode, accent) }
}

// On the web the change of theme cross-fades for 220 ms (section 4): a class on the page turns transitions on for a
// moment. Phones switch at once.
function crossFade() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return
  const root = document.documentElement
  if (!document.getElementById('tovy-theme-fade')) {
    const style = document.createElement('style')
    style.id = 'tovy-theme-fade'
    style.textContent =
      '.tovy-theme-fade, .tovy-theme-fade * { transition: background-color 220ms cubic-bezier(0.2,0.8,0.2,1), color 220ms cubic-bezier(0.2,0.8,0.2,1), border-color 220ms cubic-bezier(0.2,0.8,0.2,1), fill 220ms cubic-bezier(0.2,0.8,0.2,1), stroke 220ms cubic-bezier(0.2,0.8,0.2,1) !important; }'
    document.head.appendChild(style)
  }
  root.classList.add('tovy-theme-fade')
  setTimeout(() => root.classList.remove('tovy-theme-fade'), 300)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [accent, setAccentState] = useState<AccentName>('indigo')

  // Read the saved choice once. A blank or broken value means the defaults.
  useEffect(() => {
    void (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY)
        const saved = raw ? (JSON.parse(raw) as { preference?: ThemePreference; accent?: AccentName }) : {}
        if (saved.preference === 'light' || saved.preference === 'dark' || saved.preference === 'system') {
          setPreferenceState(saved.preference)
        }
        if (saved.accent && saved.accent in ACCENTS) setAccentState(saved.accent)
      } catch {
        // keep the defaults
      }
    })()
  }, [])

  const save = useCallback((next: { preference: ThemePreference; accent: AccentName }) => {
    void Promise.resolve(storage.setItem(STORAGE_KEY, JSON.stringify(next))).catch(() => undefined)
  }, [])

  const setPreference = useCallback(
    (p: ThemePreference) => {
      crossFade()
      setPreferenceState(p)
      save({ preference: p, accent })
    },
    [accent, save],
  )
  const setAccent = useCallback(
    (a: AccentName) => {
      crossFade()
      setAccentState(a)
      save({ preference, accent: a })
    },
    [preference, save],
  )

  const mode = resolveMode(preference, system)
  // The page behind everything and the text selection colour follow the theme too (web).
  const themeColors = buildColors(mode, accent)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    document.body.style.backgroundColor = themeColors.bg
    let style = document.getElementById('tovy-selection') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'tovy-selection'
      document.head.appendChild(style)
    }
    style.textContent = `::selection { background: ${themeColors.selection}; }`
  }, [themeColors.bg, themeColors.selection])
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: makeTheme(mode, accent), preference, accent, setPreference, setAccent }),
    [mode, accent, preference, setPreference, setAccent],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme needs the ThemeProvider')
  return value
}

// Styles that depend on the theme: `const s = useThemedStyles((c) => ({ box: { backgroundColor: c.bg } }))`.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>>(
  make: (colors: Colors, mode: ThemeMode) => T,
): T {
  const { theme } = useTheme()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(make(theme.colors, theme.mode)), [theme])
}
