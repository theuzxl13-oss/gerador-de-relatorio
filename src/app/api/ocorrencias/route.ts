import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";
import { ErroValidacao, validarOcorrencia } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    await exigirUsuario();
    return repositorio().listarOcorrencias();
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(async () => {
    const usuario = await exigirUsuario();
    const repo = repositorio();
    const dados = { ...validarOcorrencia(body, await repo.listarNormas()), registradoPor: { id: usuario.id, nome: usuario.nome } };
    const gerar = (body as { gerarProtocolo?: unknown })?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo))) {
      throw new ErroValidacao(`Já existe uma ocorrência com o protocolo "${dados.protocolo}".`);
    }
    return repo.criarOcorrencia(gerar ? { ...dados, protocolo: "" } : dados, gerar);
  }, 201);
}
