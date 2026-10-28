import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { responder } from "@/server/api";
import { comEvento } from "@/server/auditoria";
import { ErroValidacao, validarProvidencia } from "@/server/validacao";
import { resumoProvidencia, statusDaOcorrencia } from "@/lib/providencia";
import { PROVIDENCIA_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Registra ou atualiza a providência (Admin Geral e Administração). */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  return responder(async () => {
    const u = await exigirUsuario("decidir");
    const repo = repositorio();
    const atual = await repo.obterOcorrencia(id);
    if (!atual) throw new ErroValidacao("Ocorrência não encontrada.");
    const cfg = await repo.obterConfiguracoes();
    const por = referencia(u);
    const providencia = validarProvidencia(body, { usuario: por, valorTaxa: cfg.valorTaxa, anterior: atual.providencia });
    const anterior = atual.providencia;
    const nova = !anterior || anterior.tipo !== providencia.tipo;
    if (!nova && JSON.stringify(anterior) === JSON.stringify(providencia)) return atual;
    const detalhe = nova
      ? `${anterior ? `Alterou de ${PROVIDENCIA_LABEL[anterior.tipo]} para ` : ""}${resumoProvidencia(providencia)}. ${providencia.descricao}`
      : resumoProvidencia(providencia);
    return repo.atualizarOcorrencia(id, {
      providencia,
      status: statusDaOcorrencia({ ...atual, providencia }),
      historico: comEvento(atual.historico, por, nova ? "PROVIDENCIA" : "ATUALIZOU_PROVIDENCIA", detalhe),
    });
  });
}

/** Desfaz a providência (volta para análise). Fica registrado na linha do tempo. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("decidir");
    const repo = repositorio();
    const atual = await repo.obterOcorrencia(id);
    if (!atual) throw new ErroValidacao("Ocorrência não encontrada.");
    if (!atual.providencia) return atual;
    return repo.atualizarOcorrencia(id, {
      providencia: undefined,
      status: statusDaOcorrencia({ ...atual, providencia: undefined, status: undefined }),
      historico: comEvento(atual.historico, referencia(u), "REMOVEU_PROVIDENCIA", `Desfez: ${resumoProvidencia(atual.providencia)}`),
    });
  });
}
