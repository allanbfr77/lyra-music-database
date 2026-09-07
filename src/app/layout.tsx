import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Montserrat } from 'next/font/google';
import './globals.css';
import { siteUrl } from '@/lib/env';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { THEME_COLOR, THEME_INIT_SCRIPT } from '@/lib/theme';

/** Base da CMG Sans (OFL). Se a CMG Sans estiver instalada no sistema, ela prevalece nos slides. */
const slidesSans = Montserrat({
  weight: '700',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-slides',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Banco de Músicas do Lyra',
    template: '%s · Banco de Músicas do Lyra',
  },
  description: 'Letras e cifras em todos os tons, com link direto para cada tom.',
  applicationName: 'Lyra',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Lyra',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      {
        url: '/icons/lyra-db-favicon-dark.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icons/lyra-db-favicon-light.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: light)',
      },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        url: '/icons/icon-192-light.png',
        sizes: '192x192',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icons/icon-512-light.png',
        sizes: '512x512',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Banco de Músicas do Lyra',
    locale: 'pt_BR',
    images: [{ url: '/icons/lyra-db-lockup-512.png', width: 512, height: 512, alt: 'Lyra.db' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  // Valor inicial (tema escuro, o padrão); o botão sol/lua atualiza em runtime.
  themeColor: THEME_COLOR.dark,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${slidesSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
