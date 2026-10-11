import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";
import { validarConfiguracoes } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    await exigirUsuario();
    return repositorio().obterConfiguracoes();
  });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(async () => {
    await exigirUsuario("ADMIN");
    return repositorio().salvarConfiguracoes(validarConfiguracoes(body));
  });
}
