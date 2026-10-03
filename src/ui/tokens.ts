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

export const radius = { xs: 4, sm: 6, md: 10, seg: 999, lg: 12, xl: 20, pill: 999, card: 12, control: 10 }

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

// Text styles of the style guide (`.context/design/style-guide.md`, Type): big type at regular weight with tight
// tracking, weight 500 only for small titles, labels and buttons.
// (Earlier: text styles of design section 2.) Letter spacing is in points (the design gives em: -0.025em at 30 is -0.75).
const text = (family: string, size: number, lineHeight: number, tracking = 0) => ({
  fontFamily: family,
  fontSize: size,
  lineHeight: Math.round(size * lineHeight),
  letterSpacing: tracking * size,
})
export const type = {
  heroNumber: text(fonts.sans, 56, 1.07, -0.035),
  displayXl: text(fonts.sans, 40, 1.1, -0.035),
  display: text(fonts.sans, 34, 1.12, -0.035),
  h1Large: text(fonts.sans, 30, 1.2, -0.03),
  h1: text(fonts.sans, 24, 1.17, -0.02),
  pageTitle: text(fonts.sans, 28, 1.15, -0.03),
  numberL: text(fonts.medium, 22, 1.0),
  inputHero: text(fonts.sans, 18, 1.35),
  h3: text(fonts.medium, 18, 1.33, -0.01),
  title: text(fonts.medium, 18, 1.33, -0.01),
  bodyL: text(fonts.sans, 16, 1.5),
  body: text(fonts.sans, 15, 1.4),
  bodyMedium: text(fonts.medium, 15, 1.4),
  bodyS: text(fonts.sans, 14, 1.43),
  bodySMedium: text(fonts.medium, 14, 1.43),
  label: text(fonts.medium, 13, 1.4),
  meta: text(fonts.sans, 12, 1.33),
  micro: text(fonts.medium, 11, 1.27),
  monoS: text(fonts.mono, 12, 1.33),
  monoXs: text(fonts.mono, 11, 1.27),
}

// Motion (Paper "06 Motion · References"): a strong ease out for things arriving and answering a touch, the drawer
// curve for sheets, short durations. Pages swap instantly.
export const motion = {
  easing: [0.23, 1, 0.32, 1] as const,
  drawer: [0.32, 0.72, 0, 1] as const,
  press: 120,
  hover: 150,
  route: 180,
  dialog: 200,
  sheet: 250,
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
