import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { comEvento } from "@/server/auditoria";
import { ErroNaoEncontrado, validarProvidencia, versaoInformada } from "@/server/validacao";
import { resumoProvidencia, statusDaOcorrencia } from "@/lib/providencia";
import { PROVIDENCIA_LABEL, type Providencia } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Campos da providência registrados na auditoria (valores administrativos, sem dados pessoais). */
const paraAuditoria = (p?: Providencia) =>
  p
    ? {
        tipo: p.tipo,
        multaValor: p.multaValor,
        reincidente: p.reincidente,
        esclarecimento: p.esclarecimentoInicio ? `${p.esclarecimentoInicio}..${p.esclarecimentoFim}` : undefined,
        resultado: p.esclarecimentoResultado,
        recurso: p.recursoSituacao,
        recebimento: p.dataRecebimento,
      }
    : null;

/** Registra ou atualiza a providência (Admin Geral e Administração). Exige a versão lida. */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("decidir");
    const body = await lerCorpo(req);
    const versao = versaoInformada(body);
    const repo = repositorio();
    const cfg = await repo.obterConfiguracoes();
    const por = referencia(u);
    const r = await repo.alterarOcorrencia(
      id,
      (atual) => {
        const providencia = validarProvidencia(body, { usuario: por, valorTaxa: cfg.valorTaxa, anterior: atual.providencia });
        const anterior = atual.providencia;
        const nova = !anterior || anterior.tipo !== providencia.tipo;
        if (!nova && JSON.stringify(anterior) === JSON.stringify(providencia)) return { dados: {}, auditoria: null };
        const detalhe = nova
          ? `${anterior ? `Alterou de ${PROVIDENCIA_LABEL[anterior.tipo]} para ` : ""}${resumoProvidencia(providencia)}. ${providencia.descricao}`
          : resumoProvidencia(providencia);
        return {
          dados: {
            providencia,
            status: statusDaOcorrencia({ ...atual, providencia }),
            historico: comEvento(atual.historico, por, nova ? "PROVIDENCIA" : "ATUALIZOU_PROVIDENCIA", detalhe),
          },
          auditoria: {
            usuario: por,
            acao: nova ? "PROVIDENCIA_REGISTRADA" : "PROVIDENCIA_ATUALIZADA",
            entidade: "ocorrencia",
            entidadeId: id,
            detalhe: { antes: paraAuditoria(anterior), depois: paraAuditoria(providencia), versaoAnterior: atual.versao },
          },
        };
      },
      { versaoEsperada: versao, usuarioId: u.id },
    );
    if (!r) throw new ErroNaoEncontrado("Ocorrência não encontrada.");
    return r;
  });
}

/** Desfaz a providência (volta para análise). Fica registrado na linha do tempo e na auditoria. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("decidir");
    const versao = versaoInformada(await lerCorpo(req));
    const por = referencia(u);
    const r = await repositorio().alterarOcorrencia(
      id,
      (atual) => {
        if (!atual.providencia) return { dados: {}, auditoria: null };
        return {
          dados: {
            providencia: undefined,
            status: statusDaOcorrencia({ ...atual, providencia: undefined, status: undefined }),
            historico: comEvento(atual.historico, por, "REMOVEU_PROVIDENCIA", `Desfez: ${resumoProvidencia(atual.providencia)}`),
          },
          auditoria: { usuario: por, acao: "PROVIDENCIA_DESFEITA", entidade: "ocorrencia", entidadeId: id, detalhe: { antes: paraAuditoria(atual.providencia) } },
        };
      },
      { versaoEsperada: versao, usuarioId: u.id },
    );
    if (!r) throw new ErroNaoEncontrado("Ocorrência não encontrada.");
    return r;
  });
}
