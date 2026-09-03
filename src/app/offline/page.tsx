import SiteHeader from '@/components/SiteHeader';

export const dynamic = 'force-static';

export const metadata = { title: 'Sem conexão' };

export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main className="shell">
        <div className="empty" style={{ marginTop: 40 }}>
          <strong>Você está sem conexão</strong>
          <span className="small">
            As páginas que você já abriu continuam disponíveis. Assim que a internet voltar, o resto do banco
            aparece de novo.
          </span>
        </div>
      </main>
    </>
  );
}
