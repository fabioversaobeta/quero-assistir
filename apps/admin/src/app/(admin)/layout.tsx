import Link from 'next/link';
import { LogoutButton } from '@/components/actions';

const links = [
  { href: '/', label: 'Visão geral' },
  { href: '/titles', label: 'Catálogo' },
  { href: '/providers', label: 'Plataformas' },
  { href: '/sync', label: 'Sincronização' },
  { href: '/users', label: 'Usuários' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <nav className="side">
        <div className="brand">🎬 Quero Assistir</div>
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        <div className="spacer" />
        <LogoutButton />
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
