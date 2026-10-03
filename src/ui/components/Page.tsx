import { useState, type ReactNode, type RefObject } from 'react'
import { Animated, ScrollView, Text, useWindowDimensions, View, type NativeScrollEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons } from '../icons'
import { prefersReducedMotion } from '../motion'
import { useTheme } from '../theme'
import { type, WIDE_BREAKPOINT } from '../tokens'
import { IconButton } from './IconButton'
import { ScreenHeader } from './ScreenHeader'

// The scrolling page every screen sits in.
//
// Web: the list column is 720 wide (576 for settings pages) under the screen header (title, subtitle, back, actions).
//
// Phone (spec mobile-screens): every page owns its header, nothing global floats above it.
//   - A 52 px bar at the top holds back (pushed pages), the small title and at most two actions, all within reach of
//     each other and nothing else.
//   - The large title (or the screen's own `hero`) scrolls with the content. Once it has scrolled out of view, the small
//     title fades into the bar and a hairline appears under it, so you always know where you are.
//   - `sticky` stays pinned under the bar while the rest scrolls (the Upcoming week strip).
//   - The bottom gap clears the tab bar and the add button.
export function Page({
  children,
  maxWidth = 720,
  scrollRef,
  title,
  subtitle,
  titleTestID,
  onBack,
  actions,
  hero,
  sticky,
  onScroll,
  onHeadHeight,
}: {
  children: ReactNode
  maxWidth?: number
  scrollRef?: RefObject<ScrollView | null>
  title?: string
  subtitle?: string
  titleTestID?: string
  onBack?: () => void
  actions?: ReactNode // icon buttons for the header (web) or the bar (phone)
  hero?: ReactNode // a screen's own large header (Today), shown instead of the plain title
  sticky?: ReactNode
  onScroll?: (y: number) => void
  onHeadHeight?: (height: number) => void // phone: how tall the large title block is (where `sticky` pins)
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const [scrollY] = useState(() => new Animated.Value(0))
  const [heroHeight, setHeroHeight] = useState(64)

  const column = (node: ReactNode) => <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{node}</View>

  if (wide) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView
          ref={scrollRef}
          scrollEventThrottle={16}
          onScroll={(e) => onScroll?.(e.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingHorizontal: 48, paddingTop: 40, paddingBottom: 64 }}
        >
          {column(
            <>
              {hero ??
                (title !== undefined || onBack || actions ? (
                  <ScreenHeader
                    title={title ?? ''}
                    subtitle={subtitle}
                    onBack={onBack}
                    right={actions}
                    titleTestID={titleTestID}
                  />
                ) : null)}
              {sticky}
              {children}
            </>,
          )}
        </ScrollView>
      </View>
    )
  }

  // The small title shows once the large one has scrolled under the bar.
  const reveal = prefersReducedMotion()
    ? scrollY.interpolate({ inputRange: [heroHeight - 1, heroHeight], outputRange: [0, 1], extrapolate: 'clamp' })
    : scrollY.interpolate({ inputRange: [heroHeight - 24, heroHeight], outputRange: [0, 1], extrapolate: 'clamp' })
  const head = hero ?? (title ? <LargeTitle title={title} subtitle={subtitle} testID={titleTestID} /> : null)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          paddingTop: insets.top,
          height: 52 + insets.top,
          paddingHorizontal: onBack ? 6 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: c.bg,
          zIndex: 2,
        }}
      >
        {onBack ? <IconButton icon={Icons.back} label="Back" onPress={onBack} testID="back" /> : null}
        <Animated.Text
          numberOfLines={1}
          style={[type.title, { flex: 1, color: c.text, opacity: title ? reveal : 0 }]}
          accessibilityElementsHidden
        >
          {title ?? ''}
        </Animated.Text>
        {actions ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{actions}</View> : null}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            backgroundColor: c.line,
            opacity: reveal,
          }}
        />
      </View>
      <Animated.ScrollView
        ref={scrollRef as RefObject<ScrollView>}
        scrollEventThrottle={16}
        stickyHeaderIndices={sticky ? [1] : undefined}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: NativeScrollEvent }) => onScroll?.(e.nativeEvent.contentOffset.y),
        })}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View
          style={{ paddingHorizontal: 20 }}
          onLayout={(e) => {
            setHeroHeight(Math.max(1, e.nativeEvent.layout.height))
            onHeadHeight?.(e.nativeEvent.layout.height)
          }}
        >
          {head}
        </View>
        {sticky ? (
          <View
            style={{ paddingHorizontal: 20, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.line }}
          >
            {sticky}
          </View>
        ) : (
          <View />
        )}
        <View style={{ paddingHorizontal: 20 }}>{children}</View>
      </Animated.ScrollView>
    </View>
  )
}

// The phone's large title: 34 regular with tight tracking, an optional line under it.
function LargeTitle({ title, subtitle, testID }: { title: string; subtitle?: string; testID?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={{ paddingBottom: 4 }}>
      <Text testID={testID} accessibilityRole="header" style={[type.display, { color: c.text }]}>
        {title}
      </Text>
      {subtitle ? <Text style={[type.bodyS, { color: c.text2, marginTop: 4 }]}>{subtitle}</Text> : null}
    </View>
  )
}
