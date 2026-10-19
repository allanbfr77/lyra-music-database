/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const robots = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };
    return [
      {
        source: '/',
        headers: [robots],
      },
      {
        source: '/:path*',
        headers: [robots],
      },
      {
        // A API é só leitura. O Lyra (e o Tom Louvores, se consumir estes dados)
        // envia Authorization: Bearer. O navegador logado usa o cookie de sessão.
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Cache-Control', value: 'private, no-store' },
          robots,
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          robots,
        ],
      },
    ];
  },
};

export default nextConfig;
