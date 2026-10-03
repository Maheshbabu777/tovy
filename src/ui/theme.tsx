import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform, StyleSheet, useColorScheme } from 'react-native'
import storage from '../core/db/authStorage'

// The colours of the design system (`.context/design/style-guide.md`, drawn in the Paper file `tovy`). Black and
// white, with red as the only colour. Components read colours from `useTheme()` only, so both themes work everywhere.
// The older names (ink1 to ink7, accent, ok, bad) are kept as aliases of the new palette so every screen follows it.

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'

export const PALETTE = {
  light: {
    bg: '#FFFFFF',
    panel: '#F6F6F6',
    hover: '#EFEFEF',
    line: '#E6E6E6',
    lineStrong: '#D4D4D4',
    text: '#0A0A0A',
    text2: '#5C5C5C',
    text3: '#9A9A9A',
    primary: '#0A0A0A',
    onPrimary: '#FFFFFF',
    red: '#D93025',
  },
  dark: {
    bg: '#0A0A0A',
    panel: '#141414',
    hover: '#1F1F1F',
    line: '#262626',
    lineStrong: '#3A3A3A',
    text: '#F5F5F5',
    text2: '#A3A3A3',
    text3: '#6B6B6B',
    primary: '#F5F5F5',
    onPrimary: '#0A0A0A',
    red: '#FF6B5E',
  },
} as const

// Projects carry a colour name in the database. The black and white design does not colour them, so every name shows
// as the secondary text grey until projects get their own design.
export const PROJECT_COLORS: Record<string, string> = {
  indigo: '#5C5C5C',
  teal: '#5C5C5C',
  amber: '#5C5C5C',
  rose: '#5C5C5C',
  slate: '#5C5C5C',
}

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function buildColors(mode: ThemeMode) {
  const p = PALETTE[mode]
  return {
    ...p,
    bgClear: alpha(p.bg, 0), // for fades
    // What floats (sheets, menus, the palette): the page ground in light, one step up in dark so it separates.
    raised: mode === 'dark' ? p.panel : p.bg,
    // Aliases used by the screens built before the black and white system.
    surface: p.panel,
    ink: p.text,
    ink1: p.panel,
    ink2: p.hover,
    ink3: p.line,
    ink4: p.lineStrong,
    ink5: p.text3,
    ink6: p.text2,
    ink7: p.text,
    accent: p.primary,
    accentSoft: p.hover,
    accentHover: p.lineStrong,
    accentFaint: p.lineStrong,
    onAccent: p.onPrimary,
    ok: p.primary,
    okSoft: p.hover,
    warn: p.text2,
    bad: p.red,
    badSoft: alpha(p.red, mode === 'light' ? 0.08 : 0.16),
    sheetScrim: 'rgba(0,0,0,0.35)',
    dialogScrim: 'rgba(0,0,0,0.40)',
    barBg: p.bg,
    bgOverlay: alpha(p.bg, 0.92),
    // The toast is inverted: text colour ground, bg text.
    toastBg: p.text,
    toastText: p.bg,
    toastUndo: p.bg,
    toastPill: alpha(p.bg, 0.16),
    selection: alpha(p.text, 0.14),
  }
}

export type Colors = ReturnType<typeof buildColors>
export type Theme = { mode: ThemeMode; colors: Colors }

type ThemeContextValue = {
  theme: Theme
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'tovy-theme'

// The theme a device settings choice resolves to. Pure, so it can be tested.
export function resolveMode(preference: ThemePreference, system: string | null | undefined): ThemeMode {
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light'
  return preference
}

export function makeTheme(mode: ThemeMode): Theme {
  return { mode, colors: buildColors(mode) }
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

function webSavedPreference(): ThemePreference | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const p = raw ? (JSON.parse(raw) as { preference?: string }).preference : null
    return p === 'light' || p === 'dark' || p === 'system' ? p : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  // On the web the saved choice is read before the first paint (the boot page in public/index.html reads it too), so a
  // reload never draws one theme and then switches. Phones read it from storage just after.
  const [preference, setPreferenceState] = useState<ThemePreference>(() => webSavedPreference() ?? 'system')

  // Read the saved choice once. A blank or broken value means the defaults.
  useEffect(() => {
    void (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY)
        const saved = raw ? (JSON.parse(raw) as { preference?: ThemePreference }) : {}
        if (saved.preference === 'light' || saved.preference === 'dark' || saved.preference === 'system') {
          setPreferenceState(saved.preference)
        }
      } catch {
        // keep the defaults
      }
    })()
  }, [])

  const save = useCallback((next: { preference: ThemePreference }) => {
    void Promise.resolve(storage.setItem(STORAGE_KEY, JSON.stringify(next))).catch(() => undefined)
  }, [])

  const setPreference = useCallback(
    (p: ThemePreference) => {
      crossFade()
      setPreferenceState(p)
      save({ preference: p })
    },
    [save],
  )

  const mode = resolveMode(preference, system)
  // The page behind everything and the text selection colour follow the theme too (web).
  const themeColors = buildColors(mode)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    document.body.style.backgroundColor = themeColors.bg
    document.documentElement.setAttribute('data-theme', mode)
    let style = document.getElementById('tovy-selection') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'tovy-selection'
      document.head.appendChild(style)
    }
    style.textContent = `::selection { background: ${themeColors.selection}; }`
  }, [themeColors.bg, themeColors.selection, mode])
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: makeTheme(mode), preference, setPreference }),
    [mode, preference, setPreference],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Draws its children in one fixed theme, whatever the person chose (the component gallery shows both side by side).
export function ThemeOverride({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const parent = useTheme()
  const value = useMemo<ThemeContextValue>(() => ({ ...parent, theme: makeTheme(mode) }), [parent, mode])
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
