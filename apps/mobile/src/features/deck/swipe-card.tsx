import type { TitleDto } from '@quero-assistir/contracts';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useImperativeHandle, type Ref } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors } from '@/core/theme';
import { RatingBadge } from '@/ui/rating-badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const FLING_VELOCITY = 900;

export type SwipeDirection = 'LIKE' | 'DISLIKE';
export interface SwipeCardHandle {
  swipe(direction: SwipeDirection): void;
}

interface Props {
  title: TitleDto;
  /** Só a carta do topo responde a gestos. */
  interactive: boolean;
  onSwiped(direction: SwipeDirection): void;
  ref?: Ref<SwipeCardHandle>;
}

export function SwipeCard({ title, interactive, onSwiped, ref }: Props) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const flyOut = (direction: SwipeDirection) => {
    'worklet';
    x.value = withTiming((direction === 'LIKE' ? 1 : -1) * SCREEN_WIDTH * 1.5, { duration: 220 }, (finished) => {
      if (finished) scheduleOnRN(onSwiped, direction);
    });
  };

  useImperativeHandle(ref, () => ({ swipe: (direction) => flyOut(direction) }));

  const pan = usePanGesture({
    enabled: interactive,
    onUpdate: (e) => {
      'worklet';
      x.value = e.translationX;
      y.value = e.translationY;
    },
    onDeactivate: (e) => {
      'worklet';
      const goingRight = e.translationX > 0;
      const strong = Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > FLING_VELOCITY;
      if (strong) {
        flyOut(goingRight ? 'LIKE' : 'DISLIKE');
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value * 0.3 },
      { rotate: `${interpolate(x.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-14, 0, 14])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp') }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp') }));

  const where = title.availability.some((a) => a.type === 'CINEMA')
    ? 'Em cartaz nos cinemas'
    : [...new Set(title.availability.filter((a) => a.type === 'FLATRATE').map((a) => a.provider?.name))].join(' · ');

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {title.posterUrl ? (
          <Image source={{ uri: title.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noPoster]}>
            <Text style={styles.noPosterText}>{title.title}</Text>
          </View>
        )}

        <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
          <Text style={[styles.stampText, { color: colors.like }]}>QUERO</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStyle]}>
          <Text style={[styles.stampText, { color: colors.nope }]}>PASSO</Text>
        </Animated.View>

        <Pressable style={styles.info} onPress={() => router.push(`/title/${title.id}`)}>
          <View style={styles.row}>
            <RatingBadge certification={title.certification} />
            <Text style={styles.title} numberOfLines={2}>{title.title}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {[title.isAnime ? 'Anime' : title.kind === 'MOVIE' ? 'Filme' : 'Série', title.releaseDate?.slice(0, 4), title.genres.slice(0, 3).map((g) => g.name).join(', ')]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!!where && <Text style={styles.where} numberOfLines={1}>{where}</Text>}
          {!!title.overview && <Text style={styles.overview} numberOfLines={3}>{title.overview}</Text>}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { ...StyleSheet.absoluteFill, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.panel },
  noPoster: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  noPosterText: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 4, backgroundColor: 'rgba(8,10,14,0.82)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 13 },
  where: { color: colors.like, fontSize: 13, fontWeight: '600' },
  overview: { color: colors.text, fontSize: 13, opacity: 0.9, marginTop: 2 },
  stamp: { position: 'absolute', top: 40, borderWidth: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  likeStamp: { left: 24, borderColor: colors.like, transform: [{ rotate: '-12deg' }] },
  nopeStamp: { right: 24, borderColor: colors.nope, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
});
