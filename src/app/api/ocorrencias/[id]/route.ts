import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";
import { ErroValidacao, validarOcorrencia } from "@/server/validacao";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    await exigirUsuario();
    const o = await repositorio().obterOcorrencia(id);
    if (!o) throw new ErroValidacao("Ocorrência não encontrada.");
    return o;
  });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const repo = repositorio();
  return responder(async () => {
    // Somente o administrador edita (o perfil Presença apenas registra e consulta).
    await exigirUsuario("ADMIN");
    const atual = await repo.obterOcorrencia(id);
    if (!atual) throw new ErroValidacao("Ocorrência não encontrada.");
    const dados = { ...validarOcorrencia({ ...body, data: atual.data }, await repo.listarNormas(), atual), registradoPor: atual.registradoPor };
    const gerar = (body as { gerarProtocolo?: unknown })?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo, id))) {
      throw new ErroValidacao(`Já existe outra ocorrência com o protocolo "${dados.protocolo}".`);
    }
    return repo.atualizarOcorrencia(id, dados, gerar);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    await exigirUsuario("ADMIN");
    return repositorio().excluirOcorrencia(id);
  });
}
