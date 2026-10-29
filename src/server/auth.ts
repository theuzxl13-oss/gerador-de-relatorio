import "server-only";
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, lerToken, marcaSenha } from "@/lib/sessao";
import { pode, type Acao } from "@/lib/permissoes";
import { PERFIL_LABEL, type Usuario, type UsuarioComSenha } from "@/lib/types";
import { credenciaisAdminInicial, fraquezaSenha } from "./config";
import { repositorio } from "./db";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

/** Erro de autenticação (401) ou de permissão (403). `codigo` orienta a tela (ex.: TROCAR_SENHA). */
export class ErroAcesso extends Error {
  constructor(
    mensagem: string,
    readonly status: 401 | 403,
    readonly codigo?: string,
  ) {
    super(mensagem);
  }
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 64);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

/** Hash fictício: o tempo de resposta é o mesmo para login inexistente e senha errada. */
const HASH_FICTICIO = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;
export async function conferirSenhaOuNada(senha: string, armazenado?: string): Promise<boolean> {
  const ok = await conferirSenha(senha, armazenado ?? HASH_FICTICIO);
  return !!armazenado && ok;
}

export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const [alg, salB64, hashB64] = armazenado.split("$");
  if (alg !== "scrypt" || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scrypt(senha, Buffer.from(salB64, "base64"), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/** Regras para senhas definidas na tela (mínimo de 8 caracteres e não óbvia). */
export function validarNovaSenha(senha: unknown, login = ""): string {
  if (typeof senha !== "string") throw new ErroAcesso("Informe a senha.", 403);
  if (senha.length > 200) throw new ErroAcesso("Senha muito longa.", 403);
  const fraqueza = fraquezaSenha(senha, login, 8);
  if (fraqueza) throw new ErroAcesso(`A senha ${fraqueza}.`, 403);
  return senha;
}

let criacaoInicial: Promise<void> | null = null;

/**
 * Enquanto não existir nenhum usuário, cria o Admin Geral inicial a partir de
 * APP_USUARIO / APP_SENHA. Não há credencial padrão: sem essas variáveis (ou com
 * senha fraca em produção) lança ErroConfiguracao e ninguém entra.
 * A criação só acontece com o banco vazio (inserção condicional e login único),
 * então nenhuma requisição consegue criar outro administrador por este caminho.
 * O administrador inicial é obrigado a trocar a senha no primeiro acesso.
 */
export function garantirAdministradorInicial(): Promise<void> {
  if (!criacaoInicial) {
    criacaoInicial = (async () => {
      const repo = repositorio();
      if ((await repo.contarUsuarios()) > 0) return;
      const cred = credenciaisAdminInicial();
      const agora = new Date().toISOString();
      const criado = await repo.criarPrimeiroUsuario({
        id: randomUUID(),
        nome: cred.nome,
        login: cred.login,
        perfil: "ADMIN_GERAL",
        ativo: true,
        trocarSenha: true,
        senhaHash: await gerarHashSenha(cred.senha),
        criadoEm: agora,
        atualizadoEm: agora,
      });
      if (criado) console.info("[auth] Admin Geral inicial criado a partir de APP_USUARIO.");
    })().catch((e) => {
      criacaoInicial = null;
      throw e;
    });
  }
  return criacaoInicial;
}

function publico(u: UsuarioComSenha): Usuario {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { senhaHash, ...resto } = u;
  return resto;
}

/** Usuário da sessão atual (reconferido no banco: ativo e perfil atual), ou null. */
export async function usuarioAtual(): Promise<Usuario | null> {
  const sessao = await lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return null;
  const u = await repositorio().obterUsuario(sessao.u);
  if (!u || !u.ativo) return null;
  // Senha trocada (ou redefinida pelo administrador) depois do login: sessão encerrada.
  if (sessao.m !== (await marcaSenha(u.senhaHash))) return null;
  return publico(u);
}

/**
 * Exige usuário logado e, opcionalmente, permissão para uma ação. Lança ErroAcesso.
 * Quem está com senha provisória só pode trocar a senha (permitirSenhaProvisoria).
 */
export async function exigirUsuario(acao?: Acao, opcoes: { permitirSenhaProvisoria?: boolean } = {}): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) throw new ErroAcesso("Sessão expirada. Entre novamente.", 401);
  if (u.trocarSenha && !opcoes.permitirSenhaProvisoria) {
    throw new ErroAcesso("Defina uma nova senha antes de continuar.", 403, "TROCAR_SENHA");
  }
  if (acao && !pode(u.perfil, acao)) {
    throw new ErroAcesso(`O perfil ${PERFIL_LABEL[u.perfil]} não tem permissão para esta ação.`, 403);
  }
  return u;
}

/** Referência gravada nos registros de auditoria. */
export function referencia(u: Usuario) {
  return { id: u.id, nome: u.nome };
}
