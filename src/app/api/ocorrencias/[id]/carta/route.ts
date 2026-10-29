import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { responder } from "@/server/api";
import { ErroNaoEncontrado, ErroValidacao } from "@/server/validacao";
import { ErroCarta, montarCarta } from "@/lib/carta";
import { hojeISO } from "@/lib/relatorio";

export const dynamic = "force-dynamic";

/**
 * Monta a carta de notificação ou multa (Admin Geral e Administração).
 * O texto é montado no servidor, a partir da providência e da Base Normativa,
 * e a emissão fica registrada na auditoria. O PDF é gerado no navegador.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("decidir");
    const repo = repositorio();
    const o = await repo.obterOcorrencia(id);
    if (!o) throw new ErroNaoEncontrado("Ocorrência não encontrada.");
    const [cfg, normas] = await Promise.all([repo.obterConfiguracoes(), repo.listarNormas()]);
    let carta;
    try {
      carta = montarCarta(o, cfg, normas, hojeISO());
    } catch (e) {
      if (e instanceof ErroCarta) throw new ErroValidacao(e.message);
      throw e;
    }
    await repo.registrarAuditoria({
      usuario: referencia(u),
      acao: "CARTA_EMITIDA",
      entidade: "ocorrencia",
      entidadeId: id,
      detalhe: { titulo: carta.titulo, multaValor: o.providencia?.multaValor, versao: o.versao, avisos: carta.avisos.length },
    });
    return carta;
  });
}
