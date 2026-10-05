import { repositorio } from "@/server/db";
import { responder } from "@/server/api";
import { validarNorma } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(() => repositorio().listarNormas());
}

/** Cria ou atualiza uma norma (upsert pelo id). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(() => repositorio().salvarNorma(validarNorma(body)));
}
