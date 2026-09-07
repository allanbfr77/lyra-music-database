import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Integração com o Lyra',
  description: 'Como o programa Lyra consulta e importa músicas deste banco.',
};

const box: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 13,
  background: 'var(--bg-soft)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  overflowX: 'auto',
  whiteSpace: 'pre',
  margin: '8px 0 0',
};

function Endpoint({ method, path, children }: { method: string; path: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span className="chip" style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
          {method}
        </span>
        <code style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>{path}</code>
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>
        {children}
      </div>
    </div>
  );
}

export default function IntegrationPage() {
  const base = siteUrl();

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <div className="song-head">
          <h1 className="song-head__title">Integração com o Lyra</h1>
          <div className="song-head__artist">API pública, somente leitura, sem chave de acesso.</div>
        </div>

        <p className="muted" style={{ fontSize: 15 }}>
          Configure no Lyra apenas a URL base abaixo. O primeiro endereço descreve todos os outros, então o
          programa consegue se orientar sozinho.
        </p>
        <pre style={box}>{`${base}/api/v1`}</pre>

        <div className="section-title">Endpoints</div>

        <Endpoint method="GET" path="/api/v1">
          Documento de descoberta: versão da API, formato dos dados, contagem de músicas e a lista de endereços.
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/songs?q=termo&fields=&limit=20&offset=0">
          Busca em <b>título</b>, <b>artista</b> e <b>trecho da letra</b>, com acento ignorado e busca por
          prefixo. Cada resultado traz <code>slug</code>, tons disponíveis e o link direto.
          <pre style={box}>{`${base}/api/v1/songs?q=deus%20de%20toda%20a%20terra`}</pre>
          O parâmetro opcional <code>fields</code> restringe onde procurar — valores{' '}
          <code>title</code>, <code>artist</code> e <code>lyrics</code>, separados por vírgula. Sem ele, procura
          nos três. A resposta devolve em <code>fields</code> os campos realmente usados.
          <pre style={box}>{`${base}/api/v1/songs?q=fernandinho&fields=artist`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/songs/{slug}">
          Música completa: letra, cifra base, tom original, capotraste e a lista de tons com o link de cada um.
          Acrescente <code>?include=all_keys</code> para receber a cifra já transposta em todos os tons — uma
          requisição só, pronta para gravar na biblioteca local. O padrão é a cifra de teclado; use{' '}
          <code>?instrumento=violao</code> para a de violão. A resposta traz <code>instrumentos</code> com as
          versões cadastradas.
          <pre style={box}>{`${base}/api/v1/songs/galileu?include=all_keys
${base}/api/v1/songs/galileu?instrumento=violao`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/songs/{slug}/chords/{tom}">
          Cifra num tom específico. O tom vai em minúsculo: <code>a</code>, <code>bb</code>, <code>cs</code>,{' '}
          <code>fsm</code>. Sem parâmetro, devolve teclado; <code>?instrumento=violao</code> pede a cifra de
          violão.
          <pre style={box}>{`${base}/api/v1/songs/galileu/chords/a
${base}/api/v1/songs/galileu/chords/a?instrumento=violao`}</pre>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/sync?since={data}">
          Sincronização incremental: devolve só o que mudou desde a data informada e um <code>next_since</code>{' '}
          para a próxima chamada.
          <pre style={box}>{`${base}/api/v1/sync?since=2026-01-01T00:00:00Z`}</pre>
        </Endpoint>

        <div className="section-title">Endereços das páginas</div>
        <p className="muted small">
          Todo conteúdo também tem página pública e permanente — dá para favoritar e compartilhar sem login.
        </p>
        <pre style={box}>{`${base}/musica/galileu            → letra
${base}/musica/galileu/cifra      → cifra de teclado no tom original
${base}/musica/galileu/cifra/a    → cifra de teclado em A
${base}/musica/galileu/cifra/a/violao → cifra de violão em A
${base}/musica/galileu/cifra/bb   → cifra de teclado em Bb
${base}/musica/galileu/cifra/fsm  → cifra de teclado em F#m`}</pre>

        <div className="section-title">Formato da cifra</div>
        <p className="muted small">
          Texto puro, acordes em linhas próprias acima da letra — o mesmo formato usado nos sites de cifra. O
          alinhamento das colunas é preservado na transposição.
        </p>
        <pre style={box}>{`[Intro] G  D  Em  C

G            D/F#      Em
Tu és o Deus de toda a terra`}</pre>
      </main>
    </>
  );
}
