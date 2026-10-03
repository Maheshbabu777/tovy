// Tovy's own icons (spec design-v2, slice 4), drawn for Tovy on a 24 grid to sit beside the stones mark: soft round
// ends and joins, generous corner radii, one line weight, and a small solid "stone" (a dot) where a symbol needs a
// point of focus. Each shape is a line by default; `solid` shapes are always filled (dots); `tint` shapes are closed
// outlines that get a soft fill when the icon is shown active (the current page in the navigation).
//
// Plain data, so the same drawings can be rendered by the app (src/ui/icons.ts) and by a preview sheet.

export type Shape =
  | { d: string; solid?: boolean; tint?: boolean }
  | { circle: [cx: number, cy: number, r: number]; solid?: boolean; tint?: boolean }
  | { rect: [x: number, y: number, w: number, h: number, r: number]; tint?: boolean }

export const LINE = 1.65
export const BOLD = 2.4
export const TINT_OPACITY = 0.18

const calendar = (extra: Shape[]): Shape[] => [
  { rect: [3.75, 5, 16.5, 15.25, 4], tint: true },
  { d: 'M3.75 9.75h16.5' },
  { d: 'M8.25 3v3.5M15.75 3v3.5' },
  ...extra,
]

const folder = 'M3.5 8A3 3 0 0 1 6.5 5h3a2 2 0 0 1 1.4.6l1.3 1.4h5.3a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3Z'
const cloud = 'M7.25 18.5a4 4 0 0 1-.5-7.97A5.75 5.75 0 0 1 17.6 9.3a4.6 4.6 0 0 1-.6 9.2Z'
const ring = (r = 8.5): Shape => ({ circle: [12, 12, r], tint: true })

export const ICON_SET: Record<string, Shape[]> = {
  // Places
  inbox: [
    {
      d: 'M4 13.5V17a2.75 2.75 0 0 0 2.75 2.75h10.5A2.75 2.75 0 0 0 20 17v-3.5l-2.3-6.6A2.75 2.75 0 0 0 15.1 5H8.9a2.75 2.75 0 0 0-2.6 1.9Z',
      tint: true,
    },
    { d: 'M4 13.5h3.75l1.25 2.25h6l1.25-2.25H20' },
  ],
  today: calendar([{ circle: [12, 15, 2.25], solid: true }]),
  upcoming: calendar([
    { circle: [8.25, 15, 1.1], solid: true },
    { circle: [12, 15, 1.1], solid: true },
    { circle: [15.75, 15, 1.1], solid: true },
  ]),
  browse: [
    { rect: [4, 4, 7, 7, 2.5], tint: true },
    { rect: [13, 4, 7, 7, 2.5], tint: true },
    { rect: [4, 13, 7, 7, 2.5], tint: true },
    { circle: [16.5, 16.5, 3.6], tint: true },
  ],
  search: [{ circle: [10.75, 10.75, 6.25], tint: true }, { d: 'M15.4 15.4 20 20' }],
  project: [{ d: 'M9.75 4 8 20M16 4l-1.75 16M5 9h15M4 15h15' }],
  projects: [{ d: folder, tint: true }],
  newProject: [{ d: folder, tint: true }, { d: 'M12 10.25v5.5M9.25 13h5.5' }],
  connectedApps: [
    { d: 'M9 3.5v4M15 3.5v4' },
    { d: 'M6.5 7.5h11v2.75a5.5 5.5 0 0 1-11 0Z', tint: true },
    { d: 'M12 15.75v4.75' },
  ],
  activity: [
    { d: 'M4.6 13.25a7.5 7.5 0 1 0 1.9-6.6L4.5 8.75' },
    { d: 'M4.5 4.75v4h4' },
    { d: 'M12 8.25V12l2.75 1.75' },
  ],
  account: [
    { circle: [12, 8.75, 3.75], tint: true },
    { d: 'M5.25 19.75c1.2-3.1 3.75-4.75 6.75-4.75s5.55 1.65 6.75 4.75' },
  ],
  settings: [
    { d: 'M4 7.5h8.75M17.25 7.5H20M4 16.5h2.75M11.25 16.5H20' },
    { circle: [15, 7.5, 2.25], tint: true },
    { circle: [9, 16.5, 2.25], tint: true },
  ],
  sidebar: [{ rect: [3.5, 4.5, 17, 15, 3.75], tint: true }, { d: 'M9.5 4.5v15' }],

  // Actions
  add: [{ d: 'M12 5v14M5 12h14' }],
  check: [{ d: 'M5 12.5 9.5 17 19 7.5' }],
  close: [{ d: 'm6.5 6.5 11 11M17.5 6.5l-11 11' }],
  back: [{ d: 'M14.5 6 8.5 12l6 6' }],
  forward: [{ d: 'm9.5 6 6 6-6 6' }],
  expand: [{ d: 'm6 9.5 6 6 6-6' }],
  arrow: [{ d: 'M4.5 12h15M13.5 6l6 6-6 6' }],
  external: [{ d: 'm7.5 16.5 9-9M9 7.5h7.5V15' }],
  more: [
    { circle: [6, 12, 1.6], solid: true },
    { circle: [12, 12, 1.6], solid: true },
    { circle: [18, 12, 1.6], solid: true },
  ],
  drag: [
    { circle: [9, 6, 1.35], solid: true },
    { circle: [15, 6, 1.35], solid: true },
    { circle: [9, 12, 1.35], solid: true },
    { circle: [15, 12, 1.35], solid: true },
    { circle: [9, 18, 1.35], solid: true },
    { circle: [15, 18, 1.35], solid: true },
  ],
  edit: [
    { d: 'M5.5 15 15.9 4.6a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L9 18.5l-4.5 1Z', tint: true },
    { d: 'm14 6.5 3.5 3.5' },
  ],
  delete: [
    { d: 'M4 6.5h16' },
    { d: 'M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5' },
    { d: 'm6 6.5.9 11.75a2.25 2.25 0 0 0 2.25 2.25h5.7a2.25 2.25 0 0 0 2.25-2.25L18 6.5', tint: true },
    { d: 'M10 11v5M14 11v5' },
  ],
  undo: [{ d: 'M8.5 5 4.5 9l4 4' }, { d: 'M4.5 9H14a5.5 5.5 0 0 1 0 11h-3' }],
  filter: [{ d: 'M4 6.5h16M7 12h10M10 17.5h4' }],
  sort: [{ d: 'M7.5 4v16M4 16.5 7.5 20l3.5-3.5M16.5 20V4M13 7.5 16.5 4 20 7.5' }],
  export: [{ d: 'M12 14.5v-11M8 7.5l4-4 4 4' }, { d: 'M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5' }],
  signOut: [{ d: 'M14 4.5h3.5A2.5 2.5 0 0 1 20 7v10a2.5 2.5 0 0 1-2.5 2.5H14' }, { d: 'M10 8l-4 4 4 4M6 12h10' }],

  // A task's details
  date: calendar([]),
  deadline: [ring(8.25), { circle: [12, 12, 4.25] }, { circle: [12, 12, 1.3], solid: true }],
  time: [ring(8.5), { d: 'M12 7.5V12l3 2' }],
  reminder: [{ d: 'M5.5 17.5h13l-1.5-2.25V11a5 5 0 0 0-10 0v4.25Z', tint: true }, { d: 'M10 20.5h4' }],
  repeat: [
    { d: 'M4.5 11V9.5A3.5 3.5 0 0 1 8 6h11.5M16.5 3l3 3-3 3' },
    { d: 'M19.5 13v1.5A3.5 3.5 0 0 1 16 18H4.5M7.5 21l-3-3 3-3' },
  ],
  priority: [
    { d: 'M5.5 21V4.5' },
    { d: 'M5.5 4.5c3-1.5 5.5 1.5 8.5 0s4.5 0 4.5 0v9s-1.5-1.5-4.5 0-5.5-1.5-8.5 0Z', tint: true },
  ],
  label: [
    {
      d: 'M3.5 11.6V5A1.5 1.5 0 0 1 5 3.5h6.6a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L4.1 13a2 2 0 0 1-.6-1.4Z',
      tint: true,
    },
    { circle: [8.25, 8.25, 1.4], solid: true },
  ],
  subtasks: [{ d: 'm4 7 1.75 1.75L9 5.5M4 15.5l1.75 1.75L9 14M12 7.5h8M12 16h8' }],
  note: [{ rect: [4.5, 3.5, 15, 17, 3.75], tint: true }, { d: 'M8.5 9h7M8.5 12.75h7M8.5 16.5h4' }],
  attachment: [
    { d: 'm15.5 7.5-6.4 6.4a1.8 1.8 0 0 0 2.5 2.5l6.9-6.9a3.8 3.8 0 0 0-5.3-5.3L6.3 11a5.8 5.8 0 0 0 8.2 8.2l5-5' },
  ],
  progress: [ring(8.5), { d: 'M12 3.5A8.5 8.5 0 0 1 20.5 12H12Z', solid: true }],
  habit: [
    { d: 'M19.5 12a7.5 7.5 0 0 1-12.8 5.3M4.5 12a7.5 7.5 0 0 1 12.8-5.3' },
    { d: 'M17.3 3.3v3.4h-3.4M6.7 20.7v-3.4h3.4' },
  ],
  streak: [
    {
      d: 'M12 21c3.9 0 6.5-2.6 6.5-6.2 0-4.3-3.5-6.3-4.5-10.3-2.5 1.5-3.8 4-3.6 6.5-1-.6-1.7-1.6-1.9-2.7C6.8 9.8 5.5 12 5.5 14.8 5.5 18.4 8.1 21 12 21Z',
      tint: true,
    },
  ],
  favorite: [{ d: 'm12 3.8 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z', tint: true }],
  overdue: [ring(8.5), { d: 'M12 7.5V13' }, { circle: [12, 16.4, 1.1], solid: true }],

  // AI: a soft four-point spark with a small stone beside it.
  ai: [
    {
      d: 'M11 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z',
      tint: true,
    },
    { circle: [18, 18, 1.75], solid: true },
  ],

  // The app
  themeLight: [
    { circle: [12, 12, 4], tint: true },
    {
      d: 'M12 2.75v1.75M12 19.5v1.75M2.75 12H4.5M19.5 12h1.75M5.45 5.45l1.25 1.25M17.3 17.3l1.25 1.25M5.45 18.55l1.25-1.25M17.3 6.7l1.25-1.25',
    },
  ],
  themeDark: [{ d: 'M19.5 14.5a7.5 7.5 0 0 1-10-10 7.5 7.5 0 1 0 10 10Z', tint: true }],
  keyboard: [
    { rect: [3, 6, 18, 12, 3.25], tint: true },
    { circle: [7, 10, 0.95], solid: true },
    { circle: [10.33, 10, 0.95], solid: true },
    { circle: [13.67, 10, 0.95], solid: true },
    { circle: [17, 10, 0.95], solid: true },
    { d: 'M8 14.25h8' },
  ],
  command: [
    {
      d: 'M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9Zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15Zm0 0v6m0 0H9m6 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15Zm-6 0v2.5A2.5 2.5 0 1 1 6.5 15H9Z',
    },
  ],
  help: [
    ring(8.5),
    { d: 'M9.7 9.6a2.4 2.4 0 0 1 4.65.8c0 1.65-2.35 2-2.35 3.6' },
    { circle: [12, 16.75, 1.05], solid: true },
  ],
  info: [ring(8.5), { d: 'M12 11v5.5' }, { circle: [12, 7.9, 1.05], solid: true }],
  sync: [{ d: cloud, tint: true }],
  offline: [{ d: cloud, tint: true }, { d: 'm4 4 16 16' }],
}
