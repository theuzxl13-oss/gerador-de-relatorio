import { randomUUID } from "node:crypto";
import { ErroAcesso, exigirUsuario, gerarHashSenha, referencia, validarNovaSenha } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { repositorio } from "@/server/db";
import { ErroConflito, ErroValidacao } from "@/server/validacao";
import { validarDadosUsuario } from "@/server/usuarios";
import { perfisGerenciaveis } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(async () => {
    const eu = await exigirUsuario("usuarios");
    const permitidos = perfisGerenciaveis(eu.perfil);
    return (await repositorio().listarUsuarios()).filter((u) => permitidos.includes(u.perfil));
  });
}

/**
 * Cria um login. Admin Geral: qualquer perfil; Administração: Líder, Porteiro e Ronda.
 * A senha definida aqui é provisória: a pessoa é obrigada a trocá-la no primeiro acesso.
 */
export async function POST(req: Request) {
  return responder(async () => {
    const eu = await exigirUsuario("usuarios");
    const b = await lerCorpo(req);
    const repo = repositorio();
    const dados = validarDadosUsuario(b);
    if (!perfisGerenciaveis(eu.perfil).includes(dados.perfil)) throw new ErroAcesso("Você não pode criar logins com este perfil.", 403);
    if (await repo.obterUsuarioPorLogin(dados.login)) throw new ErroConflito(`O login "${dados.login}" já está em uso.`);
    let senha: string;
    try {
      senha = validarNovaSenha(b?.senha, dados.login);
    } catch (e) {
      throw new ErroValidacao((e as ErroAcesso).message);
    }
    const agora = new Date().toISOString();
    const id = randomUUID();
    return repo.salvarUsuario(
      { id, ...dados, trocarSenha: true, senhaHash: await gerarHashSenha(senha), criadoEm: agora, atualizadoEm: agora },
      { usuario: referencia(eu), acao: "USUARIO_CRIADO", entidade: "usuario", entidadeId: id, detalhe: { login: dados.login, perfil: dados.perfil, ativo: dados.ativo } },
    );
  }, 201);
}
