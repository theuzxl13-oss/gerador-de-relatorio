import { repositorio } from "@/server/db";
import { usuarioAtual } from "@/server/auth";
import { naoEncontrado, respostaDeErro } from "@/server/api";
import { pode, podeVerOcorrencia } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

/**
 * Entrega a foto somente a quem pode ver a ocorrência dela; foto ainda pendente,
 * somente a quem a enviou (ou a perfis que veem todos os relatórios).
 * Qualquer recusa responde 404, sem revelar se a foto existe.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await usuarioAtual();
    if (!u || u.trocarSenha) return naoEncontrado("Imagem não encontrada.");
    const { id } = await ctx.params;
    const repo = repositorio();
    const a = await repo.obterAnexo(id);
    if (!a) return naoEncontrado("Imagem não encontrada.");
    if (a.ocorrenciaId) {
      const o = await repo.obterOcorrencia(a.ocorrenciaId);
      if (!o || !podeVerOcorrencia(u, o)) return naoEncontrado("Imagem não encontrada.");
    } else if (a.enviadoPor !== u.id && !pode(u.perfil, "verTodas")) {
      return naoEncontrado("Imagem não encontrada.");
    }
    return new Response(new Uint8Array(a.dados), {
      headers: {
        "Content-Type": a.tipo,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
