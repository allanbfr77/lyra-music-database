import Link from 'next/link';

/**
 * Marca do Lyra no desenho do site da INVB: o símbolo ao lado de "Lyra", com
 * "music.db" pequeno embaixo — como "NOVA VIDA / BOTAFOGO" na logo da igreja.
 * Aparece só sobre fundo escuro (cabeçalho e rodapé), por isso usa sempre a
 * versão escura do símbolo.
 */
export default function Brand({ href = '/', className = 'brand' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={className}>
      <span className="brand__mark">
        <img className="brand__logo" src="/icons/lyra-db-favicon-dark.png" alt="" width={36} height={36} />
      </span>
      <span className="brand__text">
        <span className="brand__name">Lyra</span>
        <span className="brand__sub">music.db</span>
      </span>
    </Link>
  );
}
