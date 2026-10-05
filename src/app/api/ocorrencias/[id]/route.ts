import { repositorio } from "@/server/db";
import { naoEncontrado, responder } from "@/server/api";
import { ErroValidacao, validarOcorrencia } from "@/server/validacao";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const o = await repositorio().obterOcorrencia(id).catch(() => null);
  return o ? responder(async () => o) : naoEncontrado("Ocorrência não encontrada.");
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const repo = repositorio();
  const atual = await repo.obterOcorrencia(id);
  if (!atual) return naoEncontrado("Ocorrência não encontrada.");
  return responder(async () => {
    const dados = validarOcorrencia({ ...body, data: atual.data }, await repo.listarNormas(), atual);
    const gerar = (body as { gerarProtocolo?: unknown })?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo, id))) {
      throw new ErroValidacao(`Já existe outra ocorrência com o protocolo "${dados.protocolo}".`);
    }
    return repo.atualizarOcorrencia(id, dados, gerar);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(() => repositorio().excluirOcorrencia(id));
}
