import { apiError, json, preflight } from '@/lib/api';
import { listPublishedCustomVersions, mapVersionDetail } from '@/lib/lyra-versions';

export const dynamic = 'force-dynamic';

/**
 * Músicas em branco / medleys já enviados ao Lyra.
 * Edições salvas e não enviadas não aparecem.
 */
export async function GET() {
  try {
    const versions = await listPublishedCustomVersions();
    return json({
      format: 'lyra.slide_versions.v1',
      kind: 'custom',
      count: versions.length,
      versions: versions.map(mapVersionDetail),
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao listar versões personalizadas.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
