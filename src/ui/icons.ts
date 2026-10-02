import { createElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ArrowsDownUpIcon,
  ArrowUpRightIcon,
  BellIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartDonutIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  CloudIcon,
  CloudSlashIcon,
  CommandIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  ExportIcon,
  FireIcon,
  FlagIcon,
  FolderSimpleIcon,
  FolderSimplePlusIcon,
  FunnelIcon,
  GearIcon,
  HashIcon,
  InfoIcon,
  KeyboardIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  NotePencilIcon,
  PaperclipIcon,
  PencilSimpleIcon,
  PlugsIcon,
  PlusIcon,
  QuestionIcon,
  RepeatIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SparkleIcon,
  SquaresFourIcon,
  StarIcon,
  SunIcon,
  TagIcon,
  TargetIcon,
  TrashIcon,
  TrayIcon,
  UserCircleIcon,
  WarningCircleIcon,
  XIcon,
  type Icon,
} from 'phosphor-react-native'

// The icon toolkit (`.context/design/style-guide.md`, Icons). One icon per meaning, Phosphor regular weight, and the
// filled weight only for the active tab or nav item. Screens import icons from here by meaning, never from the library,
// so the set can change in one place. `strokeWidth` is accepted and ignored so older call sites keep compiling.
export type IconProps = {
  size?: number
  color?: string
  filled?: boolean
  strokeWidth?: number
  style?: StyleProp<ViewStyle>
  testID?: string
}
export type ToolkitIcon = (props: IconProps) => ReturnType<typeof createElement>

function make(source: Icon): ToolkitIcon {
  const ToolkitIconComponent = ({ size = 20, color, filled, style, testID }: IconProps) =>
    createElement(source, { size, color, weight: filled ? 'fill' : 'regular', style, testID })
  return ToolkitIconComponent
}

export const Icons = {
  inbox: make(TrayIcon),
  today: make(CalendarCheckIcon),
  upcoming: make(CalendarDotsIcon),
  browse: make(SquaresFourIcon),
  search: make(MagnifyingGlassIcon),
  add: make(PlusIcon),
  check: make(CheckIcon),
  close: make(XIcon),
  back: make(CaretLeftIcon),
  forward: make(CaretRightIcon),
  expand: make(CaretDownIcon),
  more: make(DotsThreeIcon),
  date: make(CalendarBlankIcon),
  deadline: make(TargetIcon),
  time: make(ClockIcon),
  reminder: make(BellIcon),
  repeat: make(RepeatIcon),
  priority: make(FlagIcon),
  label: make(TagIcon),
  project: make(HashIcon),
  projects: make(FolderSimpleIcon),
  newProject: make(FolderSimplePlusIcon),
  subtasks: make(ListChecksIcon),
  note: make(NotePencilIcon),
  attachment: make(PaperclipIcon),
  progress: make(ChartDonutIcon),
  habit: make(ArrowsClockwiseIcon),
  streak: make(FireIcon),
  ai: make(SparkleIcon),
  connectedApps: make(PlugsIcon),
  activity: make(ClockCounterClockwiseIcon),
  undo: make(ArrowCounterClockwiseIcon),
  edit: make(PencilSimpleIcon),
  delete: make(TrashIcon),
  drag: make(DotsSixVerticalIcon),
  filter: make(FunnelIcon),
  sort: make(ArrowsDownUpIcon),
  favorite: make(StarIcon),
  settings: make(GearIcon),
  account: make(UserCircleIcon),
  themeLight: make(SunIcon),
  themeDark: make(MoonIcon),
  signOut: make(SignOutIcon),
  export: make(ExportIcon),
  keyboard: make(KeyboardIcon),
  command: make(CommandIcon),
  help: make(QuestionIcon),
  info: make(InfoIcon),
  sync: make(CloudIcon),
  offline: make(CloudSlashIcon),
  overdue: make(WarningCircleIcon),
  sidebar: make(SidebarSimpleIcon),
  arrow: make(ArrowRightIcon),
  external: make(ArrowUpRightIcon),
}

export type IconName = keyof typeof Icons
