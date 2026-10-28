import { NextResponse } from "next/server";
import { conferirSenha, garantirAdministradorInicial } from "@/server/auth";
import { repositorio } from "@/server/db";
import { diagnosticarErroBanco } from "@/server/diagnostico";
import { COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, criarToken } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { login?: unknown; senha?: unknown } | null;
  const login = typeof b?.login === "string" ? b.login.trim() : "";
  const senha = typeof b?.senha === "string" ? b.senha : "";
  if (!login || !senha) return NextResponse.json({ erro: "Informe usuário e senha." }, { status: 400 });

  try {
    await garantirAdministradorInicial();
    const u = await repositorio().obterUsuarioPorLogin(login);
    if (!u || !u.ativo || !(await conferirSenha(senha, u.senhaHash))) {
      await espera(600); // dificulta tentativas em sequência
      return NextResponse.json({ erro: "Usuário ou senha incorretos." }, { status: 401 });
    }
    const resp = NextResponse.json({ ok: true, nome: u.nome, perfil: u.perfil });
    resp.cookies.set(COOKIE_SESSAO, await criarToken(u.id, u.perfil), {
      httpOnly: true,
      sameSite: "lax",
      // HTTPS no Render (atrás do proxy dele); HTTP apenas em uso local.
      secure: req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:",
      path: "/",
      maxAge: DURACAO_SESSAO_SEGUNDOS,
    });
    return resp;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ erro: `Erro ao acessar o banco de dados. ${diagnosticarErroBanco(e)}` }, { status: 500 });
  }
}
