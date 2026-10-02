// Visual values taken from the Figma prototype (see .context/design-notes.md). Light theme only for now.
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

export const radius = { card: 22, control: 14, pill: 999 }

// Geist is loaded by the root layout (`app/_layout.tsx`). Each weight is its own family, so use these instead of
// `fontWeight`. `sans` is the regular weight.
export const fonts = {
  sans: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
}

// Project colours (the design's five). Stored by name in `projects.color`.
export const projectColors: Record<string, string> = {
  indigo: 'rgb(99,102,241)',
  teal: 'rgb(20,184,166)',
  amber: 'rgb(245,158,11)',
  rose: 'rgb(244,63,94)',
  slate: 'rgb(100,116,139)',
}
