import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme';
import { useSession } from '@/features/session/session';

export default function ProfileScreen() {
  const { user, signIn, signOut, deleteAccount } = useSession();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Algo deu errado');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Excluir conta',
      'Sua conta e toda a sua lista serão apagadas do servidor. Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => void run(deleteAccount) },
      ],
    );

  return (
    <View style={styles.screen}>
      {user ? (
        <>
          <Text style={styles.name}>{user.name ?? user.email}</Text>
          <Text style={styles.sub}>{user.email}</Text>
          <Text style={styles.note}>Suas decisões estão salvas na sua conta e acompanham você em qualquer aparelho.</Text>
          <Pressable style={styles.button} onPress={() => void run(signOut)} disabled={busy}>
            <Text style={styles.buttonText}>Sair</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.danger]} onPress={confirmDelete} disabled={busy}>
            <Text style={[styles.buttonText, { color: colors.nope }]}>Excluir minha conta</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.name}>Modo anônimo</Text>
          <Text style={styles.note}>
            Seus filmes ficam salvos só neste aparelho. Entre com o Google para guardar sua lista na nuvem e
            usá-la em outros aparelhos — o que você já escolheu é levado junto.
          </Text>
          <Pressable style={[styles.button, styles.primary]} onPress={() => void run(signIn)} disabled={busy}>
            <Text style={[styles.buttonText, { color: 'white' }]}>Entrar com Google</Text>
          </Pressable>
        </>
      )}
      {busy && <ActivityIndicator color={colors.accent} />}
      <Text style={styles.credit}>Dados de filmes e séries fornecidos por TMDB. Este produto usa a API do TMDB mas não é endossado nem certificado por ela.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  name: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.muted },
  note: { color: colors.muted, lineHeight: 20 },
  button: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 12, padding: 14, alignItems: 'center' },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  danger: { borderColor: colors.nope },
  buttonText: { color: colors.text, fontWeight: '700' },
  credit: { color: colors.muted, fontSize: 11, marginTop: 'auto' },
});
