import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="shell">
        <div className="empty" style={{ marginTop: 40 }}>
          <strong>Não encontramos essa página</strong>
          <span className="small">A música pode ter sido removida ou o endereço está incorreto.</span>
          <div style={{ marginTop: 16 }}>
            <Link href="/" className="btn btn--primary btn--sm">
              Voltar para a busca
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
