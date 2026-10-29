import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { responder } from "@/server/api";
import { ErroNaoEncontrado } from "@/server/validacao";

export const dynamic = "force-dynamic";

/**
 * Exclui a norma da Base Normativa (somente Admin Geral). Os relatórios que já a
 * usaram mantêm a cópia do texto (snapshot). O texto excluído fica na auditoria.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: bruto } = await ctx.params;
  const id = decodeURIComponent(bruto);
  return responder(async () => {
    const u = await exigirUsuario("baseNormativa");
    const repo = repositorio();
    const anterior = (await repo.listarNormas()).find((x) => x.id === id);
    if (!anterior) throw new ErroNaoEncontrado("Norma não encontrada.");
    await repo.excluirNorma(id, {
      usuario: referencia(u),
      acao: "NORMA_EXCLUIDA",
      entidade: "norma",
      entidadeId: id,
      detalhe: { versao: anterior.atualizadoEm ?? "original", texto: anterior.texto },
    });
    return { ok: true };
  });
}
