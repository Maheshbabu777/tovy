import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Icons } from './icons'
import { ICON_SET } from './iconSet'

// The icon toolkit is the only place that knows the icon library (`.context/design/style-guide.md`, Icons).
const ROOTS = [join(__dirname, '..'), join(__dirname, '..', '..', 'app')]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

jest.mock('react-native-svg', () => new Proxy({}, { get: () => () => null }))

describe('icon toolkit', () => {
  it('is the only file that imports an icon library', () => {
    const offenders = ROOTS.flatMap(files)
      .filter((f) => /\.tsx?$/.test(f) && !/icons\.(test\.)?ts$/.test(f))
      .filter((f) => /from '(phosphor-react-native|lucide-react-native)/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('has one icon per meaning', () => {
    const names = Object.keys(Icons)
    expect(new Set(names).size).toBe(names.length)
    expect(Object.keys(ICON_SET).sort()).toEqual([...names].sort())
    for (const meaning of ['inbox', 'today', 'upcoming', 'browse', 'search', 'add', 'close', 'back', 'delete', 'ai']) {
      expect(names).toContain(meaning)
    }
  })
})
