'use client';

import { ChevronUpIcon } from '@/components/icons';

/** "Voltar ao topo" do rodapé: suave, ou na hora para quem prefere menos movimento. */
export default function BackToTopButton() {
  return (
    <button
      type="button"
      className="site-footer__top"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
    >
      Voltar ao topo
      <ChevronUpIcon size={15} />
    </button>
  );
}
