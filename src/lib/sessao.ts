/**
 * Token de sessão assinado (HMAC-SHA256) guardado em cookie httpOnly.
 * Usa Web Crypto para funcionar tanto no Proxy quanto nas rotas da API.
 */
import type { Perfil } from "./types";

export const COOKIE_SESSAO = "sessao";
export const DURACAO_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60; // 7 dias

export interface DadosSessao {
  /** id do usuário */
  u: string;
  /** perfil no momento do login (a permissão é sempre reconferida no banco) */
  p: Perfil;
  /** expiração (epoch em segundos) */
  e: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/**
 * Segredo das sessões: SESSAO_SEGREDO, ou derivado das variáveis já
 * configuradas no servidor (estável entre reinícios, nunca exposto ao navegador).
 */
function segredo(): string {
  return (
    process.env.SESSAO_SEGREDO ||
    `fazenda-ilha|${process.env.APP_SENHA ?? ""}|${process.env.DATABASE_URL ?? "local"}`
  );
}

async function chave() {
  return crypto.subtle.importKey("raw", enc.encode(segredo()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function criarToken(usuarioId: string, perfil: Perfil): Promise<string> {
  const dados: DadosSessao = { u: usuarioId, p: perfil, e: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS };
  const corpo = b64url(enc.encode(JSON.stringify(dados)));
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", await chave(), enc.encode(corpo)));
  return `${corpo}.${b64url(assinatura)}`;
}

export async function lerToken(token: string | undefined | null): Promise<DadosSessao | null> {
  if (!token) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await chave(), deB64url(assinatura), enc.encode(corpo));
    if (!ok) return null;
    const dados = JSON.parse(new TextDecoder().decode(deB64url(corpo))) as DadosSessao;
    if (typeof dados.u !== "string" || dados.e < Date.now() / 1000) return null;
    return dados;
  } catch {
    return null;
  }
}
