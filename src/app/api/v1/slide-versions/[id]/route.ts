import { apiError, json, preflight } from '@/lib/api';
import { getPublishedVersionById, mapVersionDetail } from '@/lib/lyra-versions';

export const dynamic = 'force-dynamic';

/** Uma versão já enviada ao Lyra (original, usuário ou música em branco). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const version = await getPublishedVersionById(id);
    if (!version) return apiError('Versão não encontrada ou ainda não enviada ao programa.', 404);
    return json(mapVersionDetail(version));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao buscar a versão.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
