// Sizes, type and motion from the design (design-spec.md sections 2 to 4). Colours are in `theme.tsx`.
// `colors` below is the old light-only palette, kept only for the screens that have not been rebuilt yet
// (TasksScreen, ProfileGate, SignInScreen). It goes when the last of them is replaced.
export const colors = {
  bg: 'rgb(255,255,255)',
  card: 'rgb(248,248,251)',
  ink: 'rgba(17,17,26,0.92)',
  inkSoft: 'rgba(17,17,26,0.68)',
  inkFaint: 'rgba(17,17,26,0.46)',
  ring: 'rgba(17,17,26,0.12)',
  accent: 'rgb(67,56,202)',
  ok: 'rgb(34,160,107)',
  danger: 'rgb(200,60,60)',
}

export const radius = { xs: 4, sm: 6, md: 10, seg: 8, lg: 14, xl: 22, pill: 999, card: 22, control: 14 }

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 }

// Geist is loaded by the root layout. Each weight is its own family, so use these instead of `fontWeight`.
// The design uses 400, 500 and 600 only. `bold` is kept for the old screens and is the same as semibold.
export const fonts = {
  sans: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
}

// Text styles of design section 2. Letter spacing is in points (the design gives em: -0.025em at 30 is -0.75).
const text = (family: string, size: number, lineHeight: number, tracking = 0) => ({
  fontFamily: family,
  fontSize: size,
  lineHeight: Math.round(size * lineHeight),
  letterSpacing: tracking * size,
})
export const type = {
  heroNumber: text(fonts.semibold, 64, 1.0, -0.05),
  displayXl: text(fonts.semibold, 40, 1.0, -0.025),
  display: text(fonts.semibold, 32, 1.05, -0.025),
  h1Large: text(fonts.semibold, 30, 1.2, -0.025),
  h1: text(fonts.semibold, 24, 1.2, -0.025),
  pageTitle: text(fonts.semibold, 22, 1.2, -0.025),
  numberL: text(fonts.semibold, 22, 1.0),
  inputHero: text(fonts.medium, 20, 1.3),
  h3: text(fonts.semibold, 19, 1.3),
  title: text(fonts.semibold, 17, 1.3),
  bodyL: text(fonts.sans, 16, 1.6),
  body: text(fonts.sans, 15, 1.4),
  bodyMedium: text(fonts.medium, 15, 1.4),
  bodyS: text(fonts.sans, 14, 1.5),
  bodySMedium: text(fonts.medium, 14, 1.5),
  label: text(fonts.medium, 13, 1.4),
  meta: text(fonts.sans, 12.5, 1.4),
  micro: text(fonts.medium, 11, 1.2),
  monoS: text(fonts.mono, 12.5, 1.4),
  monoXs: text(fonts.mono, 11, 1.2),
}

// One easing curve, short durations (section 4).
export const motion = {
  easing: [0.2, 0.8, 0.2, 1] as const,
  hover: 150,
  route: 180,
  dialog: 200,
  sheet: 280,
  sidebar: 200,
  theme: 220,
}

export const WIDE_BREAKPOINT = 768

// Project colours (the design's five). Stored by name in `projects.color`.
export const projectColors: Record<string, string> = {
  indigo: '#4F46E5',
  teal: '#0F8A74',
  amber: '#C2670E',
  rose: '#C0364F',
  slate: '#5B6B7F',
}
