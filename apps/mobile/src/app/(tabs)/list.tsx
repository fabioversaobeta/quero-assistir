import type { WatchlistItemDto } from '@quero-assistir/contracts';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme';
import { useSession } from '@/features/session/session';
import { RatingBadge } from '@/ui/rating-badge';

export default function WatchlistScreen() {
  const { library, user } = useSession();
  const [items, setItems] = useState<WatchlistItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await library.watchlist());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar a lista');
    }
  }, [library]);

  // Recarrega sempre que a aba ganha foco (o usuário pode ter curtido títulos no deck).
  useFocusEffect(useCallback(() => void load(), [load, user?.id]));

  const toggleWatched = async (item: WatchlistItemDto) => {
    await library.setWatched(item.title.id, !item.watched);
    await load();
  };
  const remove = async (item: WatchlistItemDto) => {
    await library.undo(item.title.id);
    await load();
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
      data={items}
      keyExtractor={(i) => String(i.title.id)}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{error ?? 'Sua lista está vazia'}</Text>
          {!error && <Text style={styles.sub}>Arraste para a direita os títulos que você quer assistir.</Text>}
        </View>
      }
      renderItem={({ item }) => (
        <View style={[styles.item, item.watched && { opacity: 0.55 }]}>
          <Pressable onPress={() => router.push(`/title/${item.title.id}`)} style={styles.main}>
            <Image source={{ uri: item.title.posterUrl ?? undefined }} style={styles.poster} contentFit="cover" />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.row}>
                <RatingBadge certification={item.title.certification} />
                <Text style={styles.title} numberOfLines={2}>{item.title.title}</Text>
              </View>
              <Text style={styles.sub} numberOfLines={1}>
                {item.title.genres.slice(0, 3).map((g) => g.name).join(', ')}
              </Text>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Pressable onPress={() => void toggleWatched(item)} style={styles.action}>
              <Text style={styles.actionText}>{item.watched ? 'Não vi' : 'Já vi'}</Text>
            </Pressable>
            <Pressable onPress={() => void remove(item)} style={styles.action}>
              <Text style={[styles.actionText, { color: colors.nope }]}>Remover</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub: { color: colors.muted, textAlign: 'center' },
  item: { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 8 },
  main: { flexDirection: 'row', gap: 12 },
  poster: { width: 60, height: 90, borderRadius: 8, backgroundColor: '#222' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  action: { paddingVertical: 4, paddingHorizontal: 8 },
  actionText: { color: colors.muted, fontWeight: '600' },
});
