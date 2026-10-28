import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { responder } from "@/server/api";
import { comEvento } from "@/server/auditoria";
import { ErroValidacao, validarOcorrencia } from "@/server/validacao";
import { podeVerOcorrencia } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

/** Líderes, porteiros e rondas recebem apenas os relatórios que eles mesmos geraram. */
export async function GET() {
  return responder(async () => {
    const u = await exigirUsuario();
    return (await repositorio().listarOcorrencias()).filter((o) => podeVerOcorrencia(u, o));
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(async () => {
    const usuario = await exigirUsuario("registrar");
    const repo = repositorio();
    const por = referencia(usuario);
    const dados = {
      ...validarOcorrencia(body, await repo.listarNormas()),
      registradoPor: por,
      historico: comEvento(undefined, por, "CRIOU", "Relatório gerado"),
    };
    const gerar = (body as { gerarProtocolo?: unknown })?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo))) {
      throw new ErroValidacao(`Já existe uma ocorrência com o protocolo "${dados.protocolo}".`);
    }
    return repo.criarOcorrencia(gerar ? { ...dados, protocolo: "" } : dados, gerar);
  }, 201);
}
