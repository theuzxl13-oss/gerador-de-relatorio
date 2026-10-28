import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { responder } from "@/server/api";
import { camposAlterados, comEvento } from "@/server/auditoria";
import { ErroValidacao, validarOcorrencia } from "@/server/validacao";
import { podeVerOcorrencia } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario();
    const o = await repositorio().obterOcorrencia(id);
    if (!o || !podeVerOcorrencia(u, o)) throw new ErroValidacao("Ocorrência não encontrada.");
    return o;
  });
}

/** Edição do relatório: Admin Geral e Administração (os perfis operacionais não editam). */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const repo = repositorio();
  return responder(async () => {
    const u = await exigirUsuario("editarOcorrencia");
    const atual = await repo.obterOcorrencia(id);
    if (!atual) throw new ErroValidacao("Ocorrência não encontrada.");
    const dados = validarOcorrencia({ ...body, data: atual.data }, await repo.listarNormas(), atual);
    const gerar = (body as { gerarProtocolo?: unknown })?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo, id))) {
      throw new ErroValidacao(`Já existe outra ocorrência com o protocolo "${dados.protocolo}".`);
    }
    const alterados = camposAlterados(atual, dados);
    if (gerar) alterados.push("protocolo gerado");
    return repo.atualizarOcorrencia(
      id,
      {
        ...dados,
        registradoPor: atual.registradoPor,
        providencia: atual.providencia,
        historico: alterados.length ? comEvento(atual.historico, referencia(u), "EDITOU", `Alterou: ${alterados.join(", ")}`) : atual.historico,
      },
      gerar,
    );
  });
}

/** Exclusão: somente Admin Geral. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("excluir");
    if (!(await repositorio().obterOcorrencia(id))) throw new ErroValidacao("Ocorrência não encontrada.");
    console.info(`[auditoria] ocorrência ${id} excluída por ${u.nome} (${u.id})`);
    return repositorio().excluirOcorrencia(id);
  });
}
