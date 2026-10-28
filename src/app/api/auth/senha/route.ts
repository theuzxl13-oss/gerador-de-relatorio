import { NextResponse } from "next/server";
import { conferirSenha, ErroAcesso, exigirUsuario, gerarHashSenha, validarNovaSenha } from "@/server/auth";
import { responder } from "@/server/api";
import { gravarSessao } from "@/server/cookie";
import { repositorio } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Troca a própria senha (qualquer perfil). As sessões abertas em outros aparelhos
 * são encerradas; este aparelho recebe uma sessão nova.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { senhaAtual?: unknown; novaSenha?: unknown } | null;
  let atualizado: Awaited<ReturnType<ReturnType<typeof repositorio>["obterUsuario"]>> = null;
  const r = await responder(async () => {
    const eu = await exigirUsuario();
    const repo = repositorio();
    const u = (await repo.obterUsuario(eu.id))!;
    if (typeof b?.senhaAtual !== "string" || !(await conferirSenha(b.senhaAtual, u.senhaHash))) {
      throw new ErroAcesso("Senha atual incorreta.", 403);
    }
    const nova = validarNovaSenha(b?.novaSenha);
    atualizado = { ...u, senhaHash: await gerarHashSenha(nova), atualizadoEm: new Date().toISOString() };
    await repo.salvarUsuario(atualizado);
    return { ok: true };
  });
  if (atualizado) await gravarSessao(r as NextResponse, req, atualizado);
  return r;
}
