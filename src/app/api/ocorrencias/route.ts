import { repositorio } from "@/server/db";
import { responder } from "@/server/api";
import { validarOcorrencia } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(() => repositorio().listarOcorrencias());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(async () => {
    const repo = repositorio();
    const dados = validarOcorrencia(body, await repo.listarNormas());
    return repo.criarOcorrencia(dados);
  }, 201);
}
