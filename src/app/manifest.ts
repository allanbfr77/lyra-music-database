import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Banco de Músicas do Lyra',
    short_name: 'Lyra',
    description: 'Letras e cifras em todos os tons, com link direto para cada tom.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0c',
    theme_color: '#0a0a0c',
    categories: ['music', 'productivity'],
    icons: [
      { src: '/icons/icon-64.png', sizes: '64x64', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Buscar música', url: '/', description: 'Procurar por título, artista ou trecho da letra' },
    ],
  };
}
