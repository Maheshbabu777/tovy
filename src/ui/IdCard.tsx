import { memo, useEffect, useRef, useState } from 'react'
import { Platform, Text, View, type GestureResponderEvent } from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg'
import { Logo } from './Brand'
import { bandPath, barcode, cardNumber, Lanyard } from './lanyard'
import { useReducedMotion } from './motion'
import { PALETTE, useTheme } from './theme'
import { fonts } from './tokens'
import { SHADOWS, webStyle } from './components/web'

// The profile ID card (spec motion-and-id-card, Paper "07 Web · Profile · ID card"): the person's card hanging on a
// Tovy lanyard. Grab it and it follows, let go while moving and it swings, it leans and tilts toward you as it moves,
// a soft light slides over it, and a click or tap turns it over. Light theme: a black card; dark theme: a white one.
// Reduce Motion shows it hanging still and turns it over without the spin. The simulation stops drawing when it rests.

export type CardInfo = {
  name: string
  username: string
  initials: string
  userId: string
  since: Date | null
  done: number
  apps: number | null
}

const CARD_W = 300
const CARD_H = 430
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function IdBadge({
  info,
  width,
  height,
  scale = 1,
  testID = 'id-card',
}: {
  info: CardInfo
  width: number
  height: number
  scale?: number
  testID?: string
}) {
  const { theme } = useTheme()
  const reduced = useReducedMotion()
  const cardW = CARD_W * scale
  const cardH = CARD_H * scale
  const rope = Math.max(80, Math.min(height - cardH - 60 * scale, 300 * scale))
  const sim = useRef<Lanyard | null>(null)
  const flip = useRef({ at: 0, speed: 0, target: 0 })
  const press = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const stage = useRef<View>(null)
  const [, setFrame] = useState(0)
  const running = useRef(false)

  // (Re)build the lanyard when the stage changes size. It arrives by dropping in from above, unless motion is reduced.
  useEffect(() => {
    if (!width || !height) return
    const l = new Lanyard({ anchor: { x: width / 2, y: -8 }, ropeLength: rope, cardHeight: cardH * 0.92 })
    if (!reduced) l.drop(width * 0.18, rope + cardH * 0.6)
    sim.current = l
    wake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, rope, cardH, reduced])

  function wake() {
    if (running.current) return
    running.current = true
    let last = Date.now()
    const tick = () => {
      const l = sim.current
      if (!l) {
        running.current = false
        return
      }
      const now = Date.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (reduced) {
        // Still: hang straight, turn over at once.
        l.held = null
        flip.current.at = flip.current.target
      } else {
        l.advance(dt)
        // The turn over is a soft spring toward 0 or 180 degrees.
        const f = flip.current
        f.speed += ((f.target - f.at) * 160 - f.speed * 20) * dt
        f.at += f.speed * dt
      }
      setFrame((n) => (n + 1) % 1_000_000)
      const f = flip.current
      const settled = Math.abs(f.target - f.at) < 0.3 && Math.abs(f.speed) < 2
      if (reduced || (l.resting() && settled)) {
        f.at = f.target
        running.current = false
        setFrame((n) => (n + 1) % 1_000_000)
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const local = (e: GestureResponderEvent) => ({
    x: e.nativeEvent.pageX - origin.current.x,
    y: e.nativeEvent.pageY - origin.current.y,
  })

  function grant(e: GestureResponderEvent) {
    const page = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
    press.current = { ...page, t: Date.now(), moved: false }
    const hold = () => {
      const l = sim.current
      if (!l || reduced) return
      const p = local(e)
      const ax = l.foot.x - l.clip.x
      const ay = l.foot.y - l.clip.y
      const along = Math.max(0, Math.min(1, ((p.x - l.clip.x) * ax + (p.y - l.clip.y) * ay) / (ax * ax + ay * ay)))
      l.held = { x: p.x, y: p.y, along }
      wake()
    }
    // Where the stage is on the page, to turn pointer positions into stage positions.
    const el = stage.current as unknown as { getBoundingClientRect?: () => DOMRect } | null
    const box = el?.getBoundingClientRect?.()
    if (box) {
      origin.current = { x: box.left + (globalThis.scrollX ?? 0), y: box.top + (globalThis.scrollY ?? 0) }
      hold()
    } else {
      stage.current?.measureInWindow((x, y) => {
        origin.current = { x, y }
        hold()
      })
    }
  }

  function move(e: GestureResponderEvent) {
    const start = press.current
    if (start && Math.hypot(e.nativeEvent.pageX - start.x, e.nativeEvent.pageY - start.y) > 5) start.moved = true
    const l = sim.current
    if (!l?.held) return
    const p = local(e)
    l.held = { ...l.held, x: p.x, y: p.y }
  }

  function release() {
    const l = sim.current
    if (l) l.held = null
    const start = press.current
    press.current = null
    if (start && !start.moved && Date.now() - start.t < 400) {
      flip.current.target = flip.current.target === 0 ? 180 : 0
    }
    wake()
  }

  const l = sim.current
  const angle = l ? l.angle() : 0
  const v = l ? l.velocity() : { x: 0, y: 0 }
  const tiltY = clamp(v.x * 0.03, -32, 32)
  const tiltX = clamp(-v.y * 0.015, -14, 14)
  const turn = flip.current.at
  const clip = l ? l.clip : { x: width / 2, y: rope }
  const band = l ? bandPath([l.anchor, ...l.rope.slice(1), l.clip]) : ''
  // The card is the opposite of the page: black on a light page, white on a dark one.
  const ink = PALETTE[theme.mode === 'dark' ? 'light' : 'dark']
  const card: CardColors = {
    bg: theme.colors.text,
    fg: theme.colors.bg,
    text2: ink.text2,
    text3: ink.text3,
    line: ink.line,
    mark: theme.mode === 'dark' ? 'light' : 'dark',
  }
  const showBack = (((turn % 360) + 360) % 360 > 90 && ((turn % 360) + 360) % 360 < 270) as boolean

  return (
    <View
      ref={stage}
      testID={testID}
      style={[{ width, height, overflow: 'hidden' }, webStyle({ userSelect: 'none', touchAction: 'none' })]}
    >
      <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Path id="tovy-band" d={band} stroke={card.bg} strokeWidth={18 * scale} fill="none" strokeLinecap="round" />
        <SvgText
          fill={card.fg}
          fontSize={8.5 * scale}
          fontFamily={Platform.OS === 'web' ? 'Geist Mono, monospace' : fonts.mono}
          letterSpacing={2.4 * scale}
          dy={3 * scale}
        >
          <TextPath href="#tovy-band" startOffset="6">
            {'TOVY   ·   TOVY   ·   TOVY   ·   TOVY   ·   TOVY   ·   TOVY   ·   TOVY'}
          </TextPath>
        </SvgText>
      </Svg>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Your Tovy card, ${info.name}. ${showBack ? 'Showing the back.' : ''} Press to turn it over.`}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={grant}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={release}
        // @ts-expect-error keyboard: Enter or Space turns the card over on the web
        onKeyDown={(e: { key: string; preventDefault: () => void }) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          flip.current.target = flip.current.target === 0 ? 180 : 0
          wake()
        }}
        focusable
        style={[
          {
            position: 'absolute',
            left: clip.x - cardW / 2,
            top: clip.y - 10 * scale,
            width: cardW,
            height: cardH,
            transformOrigin: `50% ${10 * scale}px`,
            transform: [
              { perspective: 1000 },
              { rotateZ: `${angle}deg` },
              { rotateY: `${tiltY + turn}deg` },
              { rotateX: `${tiltX}deg` },
            ],
          },
          webStyle({ cursor: l?.held ? 'grabbing' : 'grab', outlineStyle: 'none' }),
        ]}
      >
        <Face side="front" info={info} card={card} scale={scale} hidden={showBack} />
        <Face side="back" info={info} card={card} scale={scale} hidden={!showBack} />
        <Sheen card={card} scale={scale} shift={tiltY + angle * 0.6} />
      </View>
    </View>
  )
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

type CardColors = { bg: string; fg: string; text2: string; text3: string; line: string; mark: 'light' | 'dark' }

// A soft band of light across the face that slides as the card turns.
function Sheen({ card, scale, shift }: { card: CardColors; scale: number; shift: number }) {
  const w = CARD_W * scale
  const h = CARD_H * scale
  const x = clamp(shift * 6 * scale, -w, w)
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: 20 * scale,
        overflow: 'hidden',
      }}
    >
      <Svg width={w * 2} height={h} style={{ position: 'absolute', left: -w / 2 + x, top: 0 }}>
        <Defs>
          <LinearGradient id="tovy-sheen" x1="0" y1="0" x2="1" y2="0.35">
            <Stop offset="0.35" stopColor={card.fg} stopOpacity="0" />
            <Stop offset="0.5" stopColor={card.fg} stopOpacity="0.09" />
            <Stop offset="0.65" stopColor={card.fg} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={w * 2} height={h} fill="url(#tovy-sheen)" />
      </Svg>
    </View>
  )
}

const Face = memo(function Face({
  side,
  info,
  card,
  scale: s,
  hidden,
}: {
  side: 'front' | 'back'
  info: CardInfo
  card: CardColors
  scale: number
  hidden: boolean
}) {
  const base = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: CARD_W * s,
    height: CARD_H * s,
    borderRadius: 20 * s,
    backgroundColor: card.bg,
    padding: 22 * s,
    opacity: hidden ? 0 : 1,
    transform: side === 'back' ? [{ rotateY: '180deg' }] : [],
  }
  const mono = (size: number, color: string, extra: object = {}) => ({
    fontFamily: fonts.mono,
    fontSize: size * s,
    letterSpacing: size * s * 0.16,
    color,
    ...extra,
  })
  const slot = (
    <View
      style={{
        position: 'absolute',
        left: (CARD_W / 2 - 24) * s,
        top: 12 * s,
        width: 48 * s,
        height: 8 * s,
        borderRadius: 4 * s,
        backgroundColor: card.fg,
        opacity: 0.92,
      }}
    />
  )
  if (side === 'back') {
    return (
      <View
        style={[
          base,
          { alignItems: 'center', justifyContent: 'center', gap: 20 * s },
          webStyle({ boxShadow: SHADOWS.card }),
        ]}
      >
        {slot}
        <Logo size={88 * s} mode={card.mark} />
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 22 * s,
            lineHeight: 28 * s,
            letterSpacing: -0.66 * s,
            color: card.fg,
            textAlign: 'center',
          }}
        >
          {'One small thing,\nthen the next.'}
        </Text>
        <View
          style={{
            position: 'absolute',
            left: 22 * s,
            right: 22 * s,
            bottom: 22 * s,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text style={mono(10, card.text3)}>@{info.username.toUpperCase()}</Text>
          <Text style={mono(10, card.text3)}>{cardNumber(info.userId)}</Text>
        </View>
      </View>
    )
  }
  const since = info.since ? `${MONTHS[info.since.getMonth()]} ${info.since.getFullYear()}` : ''
  return (
    <View style={[base, webStyle({ boxShadow: SHADOWS.card })]}>
      {slot}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 * s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
          <Logo size={17 * s} mode={card.mark} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15 * s, letterSpacing: -0.6 * s, color: card.fg }}>
            tovy
          </Text>
        </View>
        <Text style={mono(10, card.text2)}>MEMBER</Text>
      </View>
      <View
        style={{
          marginTop: 28 * s,
          width: 84 * s,
          height: 84 * s,
          borderRadius: 16 * s,
          borderWidth: 1,
          borderColor: card.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.sans, fontSize: 34 * s, letterSpacing: -1.3 * s, color: card.fg }}>
          {info.initials || '?'}
        </Text>
      </View>
      <Text
        testID="id-card-name"
        numberOfLines={2}
        style={{
          paddingTop: 22 * s,
          fontFamily: fonts.sans,
          fontSize: 30 * s,
          lineHeight: 34 * s,
          letterSpacing: -1 * s,
          color: card.fg,
        }}
      >
        {info.name}
      </Text>
      <Text style={{ paddingTop: 6 * s, fontFamily: fonts.mono, fontSize: 13 * s, color: card.text2 }}>
        @{info.username}
      </Text>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: card.line, paddingTop: 14 * s }}>
        <Stat label="SINCE" value={since} card={card} s={s} />
        <Stat label="DONE" value={String(info.done)} card={card} s={s} testID="id-card-done" />
        <Stat label="AI APPS" value={info.apps === null ? '-' : String(info.apps)} card={card} s={s} />
      </View>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16 * s }}
      >
        <View style={{ flexDirection: 'row', gap: 2 * s, height: 22 * s }}>
          {barcode(info.userId).map((w, i) => (
            <View key={i} style={{ width: w * s, backgroundColor: card.fg }} />
          ))}
        </View>
        <Text style={mono(10, card.text3, { letterSpacing: 1 * s })}>{cardNumber(info.userId)}</Text>
      </View>
    </View>
  )
})

function Stat({
  label,
  value,
  card,
  s,
  testID,
}: {
  label: string
  value: string
  card: CardColors
  s: number
  testID?: string
}) {
  return (
    <View style={{ flex: 1, gap: 4 * s }}>
      <Text style={{ fontFamily: fonts.mono, fontSize: 9 * s, letterSpacing: 1.4 * s, color: card.text3 }}>
        {label}
      </Text>
      <Text testID={testID} style={{ fontFamily: fonts.sans, fontSize: 14 * s, color: card.fg }}>
        {value}
      </Text>
    </View>
  )
}

// Where the card hangs: a quiet dotted ground that fills its box, the card on its lanyard, and a hint under it.
export function IdCardStage({ info, scale = 1, hint = true }: { info: CardInfo; scale?: number; hint?: boolean }) {
  const { theme } = useTheme()
  const c = theme.colors
  const [size, setSize] = useState({ width: 0, height: 0 })
  return (
    <View
      style={{ flex: 1, alignSelf: 'stretch', backgroundColor: c.panel }}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <Svg
        width={size.width}
        height={size.height}
        style={{ position: 'absolute', left: 0, top: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <Pattern id="tovy-dots" width={20} height={20} patternUnits="userSpaceOnUse">
            <Circle cx={10} cy={10} r={1} fill={c.lineStrong} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={size.width} height={size.height} fill="url(#tovy-dots)" />
      </Svg>
      {size.width ? <IdBadge info={info} width={size.width} height={size.height} scale={scale} /> : null}
      {hint ? (
        <Text
          pointerEvents="none"
          selectable={false}
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: 0.4,
            color: c.text3,
          }}
        >
          {Platform.OS === 'web' ? 'Drag it. Throw it. Click to turn it over.' : 'Drag it. Tap to turn it over.'}
        </Text>
      ) : null}
    </View>
  )
}
