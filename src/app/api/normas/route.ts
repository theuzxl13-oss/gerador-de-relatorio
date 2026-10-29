import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { validarNorma } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    await exigirUsuario();
    return repositorio().listarNormas();
  });
}

/** Cria ou atualiza uma norma (upsert pelo id). Somente Admin Geral; registrado na auditoria. */
export async function POST(req: Request) {
  return responder(async () => {
    const u = await exigirUsuario("baseNormativa");
    const n = validarNorma(await lerCorpo(req));
    const repo = repositorio();
    const anterior = (await repo.listarNormas()).find((x) => x.id === n.id);
    return repo.salvarNorma(n, {
      usuario: referencia(u),
      acao: anterior ? "NORMA_EDITADA" : "NORMA_CRIADA",
      entidade: "norma",
      entidadeId: n.id,
      detalhe: {
        versaoAnterior: anterior ? (anterior.atualizadoEm ?? "original") : null,
        textoAlterado: anterior ? anterior.texto !== n.texto : undefined,
        textoAnterior: anterior && anterior.texto !== n.texto ? anterior.texto : undefined,
        ativo: n.ativo,
        revisaoManual: !!n.revisaoManual,
      },
    });
  });
}
