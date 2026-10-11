import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";
import { validarNorma } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    await exigirUsuario();
    return repositorio().listarNormas();
  });
}

/** Cria ou atualiza uma norma (upsert pelo id). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(async () => {
    await exigirUsuario("ADMIN");
    return repositorio().salvarNorma(validarNorma(body));
  });
}
