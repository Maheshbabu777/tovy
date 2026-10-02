import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Components take colours from the theme so that dark mode and the accent choice work everywhere. A raw colour in a
// component would stay the same in both themes. Files that are allowed to hold colours:
const ALLOWED = new Set([
  'theme.tsx', // the palettes themselves
  'tokens.ts', // the old light-only palette and the five project colours
  'web.ts', // shadow strings
  // Screens not rebuilt yet. Each one is removed from this list when its slice replaces it.
])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('no raw colours in components', () => {
  it('uses the theme in every rebuilt file', () => {
    const offenders = files(__dirname)
      .filter((f) => /\.(tsx?|ts)$/.test(f) && !/\.test\.tsx?$/.test(f) && !ALLOWED.has(f.split('/').pop()!))
      .filter((f) => /#[0-9a-fA-F]{3,8}\b|\brgba?\(/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
