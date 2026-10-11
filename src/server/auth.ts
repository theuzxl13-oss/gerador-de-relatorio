import "server-only";
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";
import type { Perfil, Usuario, UsuarioComSenha } from "@/lib/types";
import { repositorio } from "./db";

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

/** Erro de autenticação (401) ou de permissão (403). */
export class ErroAcesso extends Error {
  constructor(
    mensagem: string,
    readonly status: 401 | 403,
  ) {
    super(mensagem);
  }
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(senha, sal, 64);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const [alg, salB64, hashB64] = armazenado.split("$");
  if (alg !== "scrypt" || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scrypt(senha, Buffer.from(salB64, "base64"), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

export function validarNovaSenha(senha: unknown): string {
  if (typeof senha !== "string" || senha.length < 6) throw new ErroAcesso("A senha deve ter pelo menos 6 caracteres.", 403);
  if (senha.length > 200) throw new ErroAcesso("Senha muito longa.", 403);
  return senha;
}

let criacaoInicial: Promise<void> | null = null;

/**
 * Na primeira execução cria o administrador inicial a partir de
 * APP_USUARIO / APP_SENHA (as variáveis já configuradas no Render).
 * Sem essas variáveis (uso local), cria admin / admin.
 */
export function garantirAdministradorInicial(): Promise<void> {
  if (!criacaoInicial) {
    criacaoInicial = (async () => {
      const repo = repositorio();
      if ((await repo.contarUsuarios()) > 0) return;
      const login = process.env.APP_USUARIO?.trim() || "admin";
      const senha = process.env.APP_SENHA || "admin";
      const agora = new Date().toISOString();
      await repo.salvarUsuario({
        id: randomUUID(),
        nome: process.env.APP_ADMIN_NOME?.trim() || login,
        login,
        perfil: "ADMIN",
        ativo: true,
        senhaHash: await gerarHashSenha(senha),
        criadoEm: agora,
        atualizadoEm: agora,
      });
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
  return u && u.ativo ? publico(u) : null;
}

/** Exige usuário logado e, opcionalmente, um perfil. Lança ErroAcesso. */
export async function exigirUsuario(perfil?: Perfil): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) throw new ErroAcesso("Sessão expirada. Entre novamente.", 401);
  if (perfil === "ADMIN" && u.perfil !== "ADMIN") {
    throw new ErroAcesso("Apenas o administrador pode realizar esta ação.", 403);
  }
  return u;
}
