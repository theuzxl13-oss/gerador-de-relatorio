import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { validarConfiguracoes } from "@/server/validacao";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    await exigirUsuario();
    return repositorio().obterConfiguracoes();
  });
}

export async function PUT(req: Request) {
  return responder(async () => {
    const u = await exigirUsuario("configuracoes");
    const nova = validarConfiguracoes(await lerCorpo(req));
    const repo = repositorio();
    const atual = await repo.obterConfiguracoes();
    const alterados = (Object.keys(nova) as (keyof typeof nova)[]).filter((k) => JSON.stringify(nova[k]) !== JSON.stringify(atual[k]));
    return repo.salvarConfiguracoes(nova, {
      usuario: referencia(u),
      acao: "CONFIGURACOES_ALTERADAS",
      entidade: "configuracoes",
      detalhe: Object.fromEntries(alterados.map((k) => [k, { antes: atual[k], depois: nova[k] }])),
    });
  });
}
