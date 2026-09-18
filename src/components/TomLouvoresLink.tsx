import { Inter } from 'next/font/google';

const HREF = 'https://louvores.invbotafogo.com.br/';

/** Mesma tipografia do header em louvores.invbotafogo.com.br */
const tomLouvoresSans = Inter({
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
});

export default function TomLouvoresLink({
  className = 'tom-louvores-link',
}: {
  className?: string;
}) {
  return (
    <a
      href={HREF}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      title="Tom Louvores"
      aria-label="Abrir Tom Louvores"
    >
      <img
        className="tom-louvores-link__img"
        src="/logo.png"
        alt=""
        width={27}
        height={30}
      />
      <span className="tom-louvores-link__sep" aria-hidden="true" />
      <span className={`tom-louvores-link__text ${tomLouvoresSans.className}`}>
        Tom
        <br />
        Louvores
      </span>
    </a>
  );
}
