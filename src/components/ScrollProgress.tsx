'use client';

import { useEffect, useRef } from 'react';

/**
 * Fio dourado na base do cabeçalho que acompanha a rolagem — o mesmo do site
 * da INVB. Numa cifra comprida, mostra quanto da música já passou.
 *
 * O valor vai direto para o DOM, dentro de um requestAnimationFrame, em vez de
 * virar estado do React: estado faria o cabeçalho re-renderizar a cada evento
 * de scroll. O preenchimento usa `scaleX`, resolvido no compositor.
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    function apply() {
      frame = 0;
      const bar = ref.current;
      if (!bar) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      // Rolagem elástica (iOS) devolve valores fora de 0–1.
      bar.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // A página cresce depois de carregar (cifra vinda do cache, vídeo aberto):
    // sem isto a barra passaria a mostrar o percentual errado.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, []);

  return <div ref={ref} className="site-header__scroll no-print" aria-hidden="true" />;
}
