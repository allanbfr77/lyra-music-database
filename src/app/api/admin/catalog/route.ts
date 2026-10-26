import { NextResponse, type NextRequest } from 'next/server';
import { getAdminCatalogRevision, listAdminCatalog } from '@/lib/admin-catalog';
import { catalogRevisionToken } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/**
 * Admin library for the browser cache.
 * `?rev=` matching the current fingerprint returns no songs.
 */
export async function GET(request: NextRequest) {
  try {
    const revision = await getAdminCatalogRevision();
    const known = request.nextUrl.searchParams.get('rev');
    if (known && known === catalogRevisionToken(revision)) {
      return json({ unchanged: true, revision });
    }
    const songs = await listAdminCatalog();
    return json({ unchanged: false, revision, songs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao consultar o banco.';
    return json({ error: message }, 500);
  }
}
