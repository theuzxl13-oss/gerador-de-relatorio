import { randomUUID } from "node:crypto";
import { ErroAcesso, exigirUsuario, gerarHashSenha, validarNovaSenha } from "@/server/auth";
import { responder } from "@/server/api";
import { repositorio } from "@/server/db";
import { ErroValidacao } from "@/server/validacao";
import { validarDadosUsuario } from "@/server/usuarios";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    await exigirUsuario("ADMIN");
    return repositorio().listarUsuarios();
  });
}

/** Cria um usuário (somente administrador). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return responder(async () => {
    await exigirUsuario("ADMIN");
    const repo = repositorio();
    const dados = validarDadosUsuario(b);
    if (await repo.obterUsuarioPorLogin(dados.login)) throw new ErroValidacao(`O login "${dados.login}" já está em uso.`);
    let senha: string;
    try {
      senha = validarNovaSenha(b?.senha);
    } catch (e) {
      throw new ErroValidacao((e as ErroAcesso).message);
    }
    const agora = new Date().toISOString();
    return repo.salvarUsuario({ id: randomUUID(), ...dados, senhaHash: await gerarHashSenha(senha), criadoEm: agora, atualizadoEm: agora });
  }, 201);
}
