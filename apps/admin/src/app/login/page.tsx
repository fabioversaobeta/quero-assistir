import { GoogleSignIn } from './google-sign-in';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <div className="login">
      <div className="box">
        <h1>Quero Assistir</h1>
        <p className="muted">Painel administrativo</p>
        {expired && <p className="error">Sessão expirada ou sem permissão. Entre novamente.</p>}
        <GoogleSignIn clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''} />
      </div>
    </div>
  );
}
