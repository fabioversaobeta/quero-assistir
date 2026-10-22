import { StyleSheet, Text, View } from 'react-native';
import { ratingColors } from '@/core/theme';

/** Selo da classificação indicativa (L, 10, 12, 14, 16, 18). */
export function RatingBadge({ certification }: { certification: string | null }) {
  if (!certification) return null;
  const bg = ratingColors[certification] ?? '#444';
  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityLabel={`Classificação indicativa ${certification === 'L' ? 'livre' : certification + ' anos'}`}
    >
      <Text style={[styles.text, certification === '12' && { color: '#111' }]}>{certification}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minWidth: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  text: { color: 'white', fontWeight: '800', fontSize: 14 },
});
