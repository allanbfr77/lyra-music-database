import type { Metadata, Viewport } from 'next';
import './globals.css';
import { siteUrl } from '@/lib/env';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { THEME_COLOR, THEME_INIT_SCRIPT } from '@/lib/theme';

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
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Banco de Músicas do Lyra',
    locale: 'pt_BR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Valor inicial (tema escuro, o padrão); o botão sol/lua atualiza em runtime.
  themeColor: THEME_COLOR.dark,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
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
