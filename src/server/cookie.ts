import "server-only";
import type { NextResponse } from "next/server";
import { COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, criarToken, marcaSenha } from "@/lib/sessao";
import type { UsuarioComSenha } from "@/lib/types";

/** Grava o cookie de sessão (httpOnly, SameSite=Lax, Secure em HTTPS). */
export async function gravarSessao(resp: NextResponse, req: Request, u: UsuarioComSenha) {
  resp.cookies.set(COOKIE_SESSAO, await criarToken(u.id, u.perfil, await marcaSenha(u.senhaHash)), {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS atrás do proxy (Render/Cloudflare); HTTP apenas em uso local.
    secure: req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
}
