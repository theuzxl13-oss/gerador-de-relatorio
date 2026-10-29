import { NextResponse } from "next/server";
import { conferirSenha, ErroAcesso, exigirUsuario, gerarHashSenha, validarNovaSenha } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { gravarSessao } from "@/server/cookie";
import { repositorio } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Troca a própria senha (qualquer perfil). As sessões abertas em outros aparelhos
 * são encerradas; este aparelho recebe uma sessão nova.
 */
export async function POST(req: Request) {
  let atualizado: Awaited<ReturnType<ReturnType<typeof repositorio>["obterUsuario"]>> = null;
  const r = await responder(async () => {
    const eu = await exigirUsuario(undefined, { permitirSenhaProvisoria: true });
    const b = await lerCorpo(req, 8 * 1024);
    const repo = repositorio();
    const u = (await repo.obterUsuario(eu.id))!;
    if (typeof b?.senhaAtual !== "string" || !(await conferirSenha(b.senhaAtual, u.senhaHash))) {
      throw new ErroAcesso("Senha atual incorreta.", 403);
    }
    const nova = validarNovaSenha(b?.novaSenha, u.login);
    if (nova === b?.senhaAtual) throw new ErroAcesso("A nova senha deve ser diferente da atual.", 403);
    atualizado = { ...u, senhaHash: await gerarHashSenha(nova), trocarSenha: false, atualizadoEm: new Date().toISOString() };
    await repo.salvarUsuario(atualizado, { usuario: { id: u.id, nome: u.nome }, acao: "SENHA_TROCADA", entidade: "usuario", entidadeId: u.id });
    return { ok: true };
  });
  if (atualizado) await gravarSessao(r as NextResponse, req, atualizado);
  return r;
}
