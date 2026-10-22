import type { TitleDto } from '@quero-assistir/contracts';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme';
import { useSession } from '@/features/session/session';
import { RatingBadge } from '@/ui/rating-badge';

export default function TitleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const [title, setTitle] = useState<TitleDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.title(Number(id)).then(setTitle).catch((e: Error) => setError(e.message));
  }, [api, id]);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!title) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  const providers = [...new Map(title.availability.filter((a) => a.provider).map((a) => [a.provider!.id, a.provider!])).values()];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      {title.backdropUrl && <Image source={{ uri: title.backdropUrl }} style={styles.backdrop} contentFit="cover" />}
      <View style={styles.body}>
        <View style={styles.row}>
          <RatingBadge certification={title.certification} />
          <Text style={styles.title}>{title.title}</Text>
        </View>
        <Text style={styles.meta}>
          {[title.isAnime ? 'Anime' : title.kind === 'MOVIE' ? 'Filme' : 'Série', title.releaseDate?.slice(0, 4), title.runtimeMinutes ? `${title.runtimeMinutes} min` : null, title.voteAverage ? `★ ${title.voteAverage.toFixed(1)}` : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Text style={styles.meta}>{title.genres.map((g) => g.name).join(', ')}</Text>
        {title.minAge !== null && (
          <Text style={styles.meta}>{title.minAge === 0 ? 'Livre para todos os públicos' : `Não recomendado para menores de ${title.minAge} anos`}</Text>
        )}
        <Text style={styles.section}>Sinopse</Text>
        <Text style={styles.overview}>{title.overview || 'Sinopse indisponível.'}</Text>

        <Text style={styles.section}>Onde assistir</Text>
        {title.availability.some((a) => a.type === 'CINEMA') && <Text style={styles.where}>Em cartaz nos cinemas</Text>}
        {providers.map((p) => (
          <View key={p.id} style={styles.provider}>
            {p.logoUrl && <Image source={{ uri: p.logoUrl }} style={styles.logo} />}
            <Text style={styles.overview}>{p.name}</Text>
          </View>
        ))}
        {title.availability.length === 0 && <Text style={styles.meta}>Sem informações de disponibilidade.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.nope, padding: 24 },
  backdrop: { width: '100%', height: 200, backgroundColor: '#222' },
  body: { padding: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.text, fontSize: 24, fontWeight: '800' },
  meta: { color: colors.muted },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 14 },
  overview: { color: colors.text, lineHeight: 21 },
  where: { color: colors.like, fontWeight: '600' },
  provider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 6 },
});
