import { exigirUsuario, gerarHashSenha, validarNovaSenha, ErroAcesso } from "@/server/auth";
import { responder } from "@/server/api";
import { repositorio } from "@/server/db";
import { ErroValidacao } from "@/server/validacao";
import { validarDadosUsuario } from "@/server/usuarios";

export const dynamic = "force-dynamic";

/**
 * Atualiza nome, login, perfil, situação (ativo) e, opcionalmente, redefine a senha.
 * Usuários não são excluídos: são desativados, preservando o histórico.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return responder(async () => {
    const eu = await exigirUsuario("ADMIN");
    const repo = repositorio();
    const atual = await repo.obterUsuario(id);
    if (!atual) throw new ErroValidacao("Usuário não encontrado.");
    const dados = validarDadosUsuario(b);

    const outro = await repo.obterUsuarioPorLogin(dados.login);
    if (outro && outro.id !== id) throw new ErroValidacao(`O login "${dados.login}" já está em uso.`);

    // Garante que sempre exista ao menos um administrador ativo.
    const deixaDeSerAdminAtivo = atual.perfil === "ADMIN" && atual.ativo && (dados.perfil !== "ADMIN" || !dados.ativo);
    if (deixaDeSerAdminAtivo) {
      const admins = (await repo.listarUsuarios()).filter((u) => u.perfil === "ADMIN" && u.ativo);
      if (admins.length <= 1) throw new ErroValidacao("É necessário manter pelo menos um administrador ativo.");
    }
    if (id === eu.id && !dados.ativo) throw new ErroValidacao("Você não pode desativar o seu próprio usuário.");

    let senhaHash = atual.senhaHash;
    if (typeof b?.senha === "string" && b.senha) {
      try {
        senhaHash = await gerarHashSenha(validarNovaSenha(b.senha));
      } catch (e) {
        throw new ErroValidacao((e as ErroAcesso).message);
      }
    }
    return repo.salvarUsuario({ ...atual, ...dados, senhaHash, atualizadoEm: new Date().toISOString() });
  });
}
