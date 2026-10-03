import { createElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { BOLD, ICON_SET, LINE, TINT_OPACITY, type Shape } from './iconSet'

// The icon toolkit (`.context/design/style-guide.md`, Icons). One icon per meaning, from Tovy's own set (src/ui/iconSet.ts,
// spec design-v2): a line icon, with a soft fill inside for the active tab or nav item (`filled`). Screens import icons
// from here by meaning, never by drawing, so the set can change in one place. `strokeWidth` is accepted and ignored so
// older call sites keep compiling.
export type IconProps = {
  size?: number
  color?: string
  filled?: boolean
  bold?: boolean // a heavier line, for a check drawn on a filled circle
  strokeWidth?: number
  style?: StyleProp<ViewStyle>
  testID?: string
}
export type ToolkitIcon = (props: IconProps) => ReturnType<typeof createElement>

function shape(s: Shape, i: number, color: string, filled: boolean, width: number) {
  const solid = 'solid' in s && s.solid
  const paint = solid
    ? { fill: color }
    : {
        fill: filled && s.tint ? color : 'none',
        fillOpacity: filled && s.tint ? TINT_OPACITY : undefined,
        stroke: color,
        strokeWidth: width,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      }
  if ('d' in s) return createElement(Path, { key: i, d: s.d, ...paint })
  if ('circle' in s) {
    const [cx, cy, r] = s.circle
    return createElement(Circle, { key: i, cx, cy, r, ...paint })
  }
  const [x, y, width_, height, r] = s.rect
  return createElement(Rect, { key: i, x, y, width: width_, height, rx: r, ry: r, ...paint })
}

function make(name: keyof typeof ICON_SET): ToolkitIcon {
  const shapes = ICON_SET[name]
  const ToolkitIconComponent = ({ size = 20, color = 'currentColor', filled, bold, style, testID }: IconProps) =>
    createElement(
      Svg,
      { width: size, height: size, viewBox: '0 0 24 24', style, testID },
      shapes.map((s, i) => shape(s, i, color, !!filled, bold ? BOLD : LINE)),
    )
  return ToolkitIconComponent
}

export const Icons = {
  inbox: make('inbox'),
  today: make('today'),
  upcoming: make('upcoming'),
  browse: make('browse'),
  search: make('search'),
  add: make('add'),
  check: make('check'),
  close: make('close'),
  back: make('back'),
  forward: make('forward'),
  expand: make('expand'),
  more: make('more'),
  date: make('date'),
  deadline: make('deadline'),
  time: make('time'),
  reminder: make('reminder'),
  repeat: make('repeat'),
  priority: make('priority'),
  label: make('label'),
  project: make('project'),
  projects: make('projects'),
  newProject: make('newProject'),
  subtasks: make('subtasks'),
  note: make('note'),
  attachment: make('attachment'),
  progress: make('progress'),
  habit: make('habit'),
  streak: make('streak'),
  ai: make('ai'),
  connectedApps: make('connectedApps'),
  activity: make('activity'),
  undo: make('undo'),
  edit: make('edit'),
  delete: make('delete'),
  drag: make('drag'),
  filter: make('filter'),
  sort: make('sort'),
  favorite: make('favorite'),
  settings: make('settings'),
  account: make('account'),
  themeLight: make('themeLight'),
  themeDark: make('themeDark'),
  signOut: make('signOut'),
  export: make('export'),
  keyboard: make('keyboard'),
  command: make('command'),
  help: make('help'),
  info: make('info'),
  sync: make('sync'),
  offline: make('offline'),
  overdue: make('overdue'),
  sidebar: make('sidebar'),
  arrow: make('arrow'),
  external: make('external'),
}

export type IconName = keyof typeof Icons
