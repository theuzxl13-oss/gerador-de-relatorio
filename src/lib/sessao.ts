/**
 * Token de sessão assinado (HMAC-SHA256) guardado em cookie httpOnly.
 * Usa Web Crypto para funcionar tanto no Proxy quanto nas rotas da API.
 *
 * Formato: base64url(JSON) "." base64url(HMAC). O JSON identifica a finalidade
 * ("f": "sessao") e a versão do formato ("v"), para que nenhum outro valor
 * assinado com o mesmo segredo possa ser aceito como sessão.
 *
 * Segredo: SESSAO_SEGREDO (obrigatório em produção, ≥ 32 caracteres aleatórios).
 * Rotação: mova o valor atual para SESSAO_SEGREDO_ANTERIOR e defina um novo
 * SESSAO_SEGREDO; tokens antigos continuam válidos até expirar (ou remova o
 * anterior para encerrar todas as sessões imediatamente).
 */
import type { Perfil } from "./types";

export const COOKIE_SESSAO = "sessao";
export const DURACAO_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60; // 7 dias
export const TAMANHO_MINIMO_SEGREDO_SESSAO = 32;
const VERSAO_TOKEN = 1;
const TAMANHO_MAXIMO_TOKEN = 2048;

export interface DadosSessao {
  /** finalidade do token */
  f: "sessao";
  /** versão do formato */
  v: number;
  /** id do usuário */
  u: string;
  /** perfil no momento do login (a permissão é sempre reconferida no banco) */
  p: Perfil;
  /** emissão e expiração (epoch em segundos) */
  i: number;
  e: number;
  /** marca da senha atual: trocar a senha encerra as sessões abertas em outros aparelhos */
  m: string;
  /** 1 = senha provisória no momento da emissão (o Proxy leva as páginas para a troca de senha) */
  t?: 1;
}

export class ErroSegredoSessao extends Error {}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("base64url inválido");
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

type Env = Record<string, string | undefined>;
const g = globalThis as unknown as { __segredoDev?: string };

/**
 * Segredos aceitos: [atual, anterior?]. Em produção sem SESSAO_SEGREDO válido lança
 * ErroSegredoSessao (nunca usa um valor previsível). Fora de produção, sem a variável,
 * usa um segredo aleatório do processo (as sessões caem quando o servidor reinicia).
 */
export function segredosSessao(env: Env = process.env): string[] {
  const atual = env.SESSAO_SEGREDO ?? "";
  if (atual.length < TAMANHO_MINIMO_SEGREDO_SESSAO) {
    if (env.NODE_ENV === "production") {
      throw new ErroSegredoSessao(`SESSAO_SEGREDO ausente ou curto (mínimo ${TAMANHO_MINIMO_SEGREDO_SESSAO} caracteres). Configure-o no servidor.`);
    }
    if (!g.__segredoDev) g.__segredoDev = b64url(crypto.getRandomValues(new Uint8Array(32)));
    return [g.__segredoDev];
  }
  const anterior = env.SESSAO_SEGREDO_ANTERIOR ?? "";
  return anterior.length >= TAMANHO_MINIMO_SEGREDO_SESSAO && anterior !== atual ? [atual, anterior] : [atual];
}

const chaves = new Map<string, Promise<CryptoKey>>();
function chave(segredo: string) {
  let k = chaves.get(segredo);
  if (!k) {
    k = crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    chaves.set(segredo, k);
  }
  return k;
}

/** Identificador curto derivado do hash da senha (não revela a senha nem o hash). */
export async function marcaSenha(senhaHash: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`marca|${senhaHash}`)));
  return b64url(d).slice(0, 16);
}

export async function criarToken(
  usuarioId: string,
  perfil: Perfil,
  marca: string,
  env: Env = process.env,
  agora = Date.now(),
  opcoes: { trocarSenha?: boolean } = {},
): Promise<string> {
  const [segredo] = segredosSessao(env);
  const i = Math.floor(agora / 1000);
  const dados: DadosSessao = { f: "sessao", v: VERSAO_TOKEN, u: usuarioId, p: perfil, i, e: i + DURACAO_SESSAO_SEGUNDOS, m: marca, ...(opcoes.trocarSenha ? { t: 1 as const } : {}) };
  const corpo = b64url(enc.encode(JSON.stringify(dados)));
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", await chave(segredo), enc.encode(corpo)));
  return `${corpo}.${b64url(assinatura)}`;
}

/**
 * Valida assinatura, finalidade, versão, formato e validade. Qualquer problema
 * (inclusive segredo não configurado) resulta em null: sem sessão.
 */
export async function lerToken(token: string | undefined | null, env: Env = process.env, agora = Date.now()): Promise<DadosSessao | null> {
  if (!token || token.length > TAMANHO_MAXIMO_TOKEN) return null;
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [corpo, assinatura] = partes;
  if (!corpo || !assinatura) return null;
  try {
    const assinaturaBytes = deB64url(assinatura);
    let ok = false;
    for (const segredo of segredosSessao(env)) {
      if (await crypto.subtle.verify("HMAC", await chave(segredo), assinaturaBytes, enc.encode(corpo))) {
        ok = true;
        break;
      }
    }
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(deB64url(corpo))) as Partial<DadosSessao>;
    const s = Math.floor(agora / 1000);
    if (d.f !== "sessao" || d.v !== VERSAO_TOKEN) return null;
    if (typeof d.u !== "string" || typeof d.m !== "string" || typeof d.p !== "string") return null;
    if (typeof d.i !== "number" || typeof d.e !== "number" || d.e <= s || d.i > s + 60 || d.e - d.i > DURACAO_SESSAO_SEGUNDOS) return null;
    return d as DadosSessao;
  } catch {
    return null;
  }
}
