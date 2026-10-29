import { exigirUsuario, gerarHashSenha, referencia, validarNovaSenha, ErroAcesso } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { repositorio } from "@/server/db";
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from "@/server/validacao";
import { validarDadosUsuario } from "@/server/usuarios";
import { perfisGerenciaveis } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

/**
 * Atualiza nome, login, perfil, situação (ativo) e, opcionalmente, redefine a senha.
 * Usuários não são excluídos: são desativados, preservando o histórico.
 * Desativação e mudança de perfil valem na próxima requisição (o perfil é lido do banco);
 * redefinir a senha encerra as sessões abertas e torna a senha provisória.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return responder(async () => {
    const eu = await exigirUsuario("usuarios");
    const b = await lerCorpo(req);
    const repo = repositorio();
    const atual = await repo.obterUsuario(id);
    const permitidos = perfisGerenciaveis(eu.perfil);
    // Usuário de perfil não gerenciável é tratado como inexistente para quem não pode administrá-lo.
    if (!atual || !permitidos.includes(atual.perfil)) throw new ErroNaoEncontrado("Usuário não encontrado.");
    const dados = validarDadosUsuario(b);
    if (!permitidos.includes(dados.perfil)) throw new ErroAcesso("Você não pode atribuir este perfil.", 403);

    const outro = await repo.obterUsuarioPorLogin(dados.login);
    if (outro && outro.id !== id) throw new ErroConflito(`O login "${dados.login}" já está em uso.`);

    // Garante que sempre exista ao menos um Admin Geral ativo.
    const deixaDeSerAdminAtivo = atual.perfil === "ADMIN_GERAL" && atual.ativo && (dados.perfil !== "ADMIN_GERAL" || !dados.ativo);
    if (deixaDeSerAdminAtivo) {
      const admins = (await repo.listarUsuarios()).filter((u) => u.perfil === "ADMIN_GERAL" && u.ativo);
      if (admins.length <= 1) throw new ErroValidacao("É necessário manter pelo menos um Admin Geral ativo.");
    }
    if (id === eu.id && !dados.ativo) throw new ErroValidacao("Você não pode desativar o seu próprio usuário.");

    let senhaHash = atual.senhaHash;
    let trocarSenha = atual.trocarSenha;
    const redefiniu = typeof b?.senha === "string" && b.senha.length > 0;
    if (redefiniu) {
      try {
        senhaHash = await gerarHashSenha(validarNovaSenha(b!.senha, dados.login));
      } catch (e) {
        throw new ErroValidacao((e as ErroAcesso).message);
      }
      // Senha escolhida por outra pessoa é provisória.
      trocarSenha = id !== eu.id;
    }
    const mudancas = (["nome", "login", "perfil", "ativo"] as const).filter((k) => dados[k] !== atual[k]);
    return repo.salvarUsuario(
      { ...atual, ...dados, senhaHash, trocarSenha, atualizadoEm: new Date().toISOString() },
      {
        usuario: referencia(eu),
        acao: "USUARIO_ALTERADO",
        entidade: "usuario",
        entidadeId: id,
        detalhe: {
          ...Object.fromEntries(mudancas.map((k) => [k, { antes: atual[k], depois: dados[k] }])),
          senhaRedefinida: redefiniu,
        },
      },
    );
  });
}
