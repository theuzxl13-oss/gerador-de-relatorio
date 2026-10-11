import { repositorio } from "@/server/db";
import { responder } from "@/server/api";
import { validarConfiguracoes } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(() => repositorio().obterConfiguracoes());
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  return responder(() => repositorio().salvarConfiguracoes(validarConfiguracoes(body)));
}
