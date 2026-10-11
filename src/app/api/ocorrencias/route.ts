import { repositorio } from "@/server/db";
import { responder } from "@/server/api";
import { ErroValidacao, validarOcorrencia } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(() => repositorio().listarOcorrencias());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(async () => {
    const repo = repositorio();
    const dados = validarOcorrencia(body, await repo.listarNormas());
    const gerar = (body as { gerarProtocolo?: unknown })?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo))) {
      throw new ErroValidacao(`Já existe uma ocorrência com o protocolo "${dados.protocolo}".`);
    }
    return repo.criarOcorrencia(gerar ? { ...dados, protocolo: "" } : dados, gerar);
  }, 201);
}
