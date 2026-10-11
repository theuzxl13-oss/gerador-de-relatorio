import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";

/**
 * Exige login em todo o sistema. Sem sessão válida:
 *  - páginas → redireciona para /login
 *  - API     → 401
 * As permissões por perfil (Administrador / Presença) são conferidas nas rotas da API.
 */
export async function proxy(req: NextRequest) {
  const sessao = await lerToken(req.cookies.get(COOKIE_SESSAO)?.value);
  if (sessao) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const destino = req.nextUrl.pathname + req.nextUrl.search;
  if (destino !== "/") url.searchParams.set("voltar", destino);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/auth/login|api/saude|_next/static|_next/image|favicon.ico|logo\\.png|logo\\.svg).*)"],
};
