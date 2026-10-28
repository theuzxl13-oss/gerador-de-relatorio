import { conferirSenha, ErroAcesso, exigirUsuario, gerarHashSenha, validarNovaSenha } from "@/server/auth";
import { responder } from "@/server/api";
import { repositorio } from "@/server/db";

export const dynamic = "force-dynamic";

/** Troca a própria senha (qualquer perfil). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { senhaAtual?: unknown; novaSenha?: unknown } | null;
  return responder(async () => {
    const eu = await exigirUsuario();
    const repo = repositorio();
    const u = (await repo.obterUsuario(eu.id))!;
    if (typeof b?.senhaAtual !== "string" || !(await conferirSenha(b.senhaAtual, u.senhaHash))) {
      throw new ErroAcesso("Senha atual incorreta.", 403);
    }
    const nova = validarNovaSenha(b?.novaSenha);
    await repo.salvarUsuario({ ...u, senhaHash: await gerarHashSenha(nova), atualizadoEm: new Date().toISOString() });
    return { ok: true };
  });
}
