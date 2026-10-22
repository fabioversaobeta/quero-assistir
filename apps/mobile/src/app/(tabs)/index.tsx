import type { DeckCategory, DeckScope, ProviderDto } from '@quero-assistir/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme';
import { SwipeCard, type SwipeCardHandle } from '@/features/deck/swipe-card';
import { useDeck } from '@/features/deck/use-deck';
import { useSession } from '@/features/session/session';

const CATEGORIES: { value: DeckCategory; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'movie', label: 'Filmes' },
  { value: 'series', label: 'Séries' },
  { value: 'anime', label: 'Animes' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress(): void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: 'white' }]}>{label}</Text>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const { ready, api } = useSession();
  const [scope, setScope] = useState<DeckScope>('cinema');
  const [category, setCategory] = useState<DeckCategory>('all');
  const [providerId, setProviderId] = useState<number | undefined>();
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const cardRef = useRef<SwipeCardHandle>(null);

  const filter = useMemo(
    () => ({ scope, category: scope === 'cinema' ? ('all' as const) : category, providerId: scope === 'streaming' ? providerId : undefined }),
    [scope, category, providerId],
  );
  const deck = useDeck(filter);

  useEffect(() => {
    api.providers().then(setProviders).catch(() => undefined);
  }, [api]);

  if (!ready) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  const [top, next] = deck.queue;

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <Chip label="Em cartaz" active={scope === 'cinema'} onPress={() => setScope('cinema')} />
        <Chip label="Streaming" active={scope === 'streaming'} onPress={() => setScope('streaming')} />
      </View>

      {scope === 'streaming' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Todas as plataformas" active={providerId === undefined} onPress={() => setProviderId(undefined)} />
            {providers.map((p) => (
              <Chip key={p.id} label={p.name} active={providerId === p.id} onPress={() => setProviderId(p.id)} />
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.deck}>
        {deck.loading && !top && <ActivityIndicator color={colors.accent} />}

        {deck.error && !top && (
          <View style={styles.center}>
            <Text style={styles.msg}>Não consegui carregar os títulos.</Text>
            <Text style={styles.sub}>{deck.error}</Text>
            <Pressable style={styles.primary} onPress={() => void deck.retry()}>
              <Text style={styles.primaryText}>Tentar de novo</Text>
            </Pressable>
          </View>
        )}

        {deck.exhausted && (
          <View style={styles.center}>
            {scope === 'cinema' ? (
              <>
                <Text style={styles.msg}>Você já viu tudo que está em cartaz 🎬</Text>
                <Text style={styles.sub}>Que tal explorar o catálogo das plataformas de streaming?</Text>
                <Pressable style={styles.primary} onPress={() => setScope('streaming')}>
                  <Text style={styles.primaryText}>Ver filmes, séries e animes</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.msg}>Acabaram os títulos desta seleção 🍿</Text>
                <Text style={styles.sub}>Troque a categoria ou a plataforma. Novidades chegam todo dia.</Text>
              </>
            )}
          </View>
        )}

        {next && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <SwipeCard key={next.id} title={next} interactive={false} onSwiped={() => undefined} />
          </View>
        )}
        {top && (
          <SwipeCard key={top.id} ref={cardRef} title={top} interactive onSwiped={(d) => void deck.decide(d)} />
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.round, { borderColor: colors.nope }]} disabled={!top} onPress={() => cardRef.current?.swipe('DISLIKE')} accessibilityLabel="Passar">
          <Text style={[styles.roundText, { color: colors.nope }]}>✕</Text>
        </Pressable>
        <Pressable style={styles.small} disabled={!deck.canUndo} onPress={() => void deck.undo()} accessibilityLabel="Desfazer">
          <Text style={[styles.roundText, { color: deck.canUndo ? colors.text : colors.border }]}>↩</Text>
        </Pressable>
        <Pressable style={[styles.round, { borderColor: colors.like }]} disabled={!top} onPress={() => cardRef.current?.swipe('LIKE')} accessibilityLabel="Quero assistir">
          <Text style={[styles.roundText, { color: colors.like }]}>♥</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: '600' },
  deck: { flex: 1, marginHorizontal: 16, marginVertical: 8 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  msg: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub: { color: colors.muted, textAlign: 'center' },
  primary: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  primaryText: { color: 'white', fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 14 },
  round: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  small: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  roundText: { fontSize: 26, fontWeight: '800' },
});
