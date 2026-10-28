import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Porta de entrada de todas as requisições:
 *  1. ORIGEM_SEGREDO (opcional, para uso com Cloudflare): só atende quem traz o
 *     cabeçalho secreto que a Cloudflare acrescenta. Assim ninguém contorna a
 *     Cloudflare acessando direto o endereço *.onrender.com.
 *  2. Proteção CSRF: alterações (POST/PUT/DELETE) só são aceitas vindas do próprio site.
 *  3. Exige login. Sem sessão válida: páginas → /login; API → 401.
 * As permissões por perfil são conferidas nas rotas da API e nas páginas.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const segredo = process.env.ORIGEM_SEGREDO;
  if (segredo && pathname !== "/api/saude" && req.headers.get("x-origem-segredo") !== segredo) {
    return new NextResponse("Acesso permitido somente pelo endereço oficial do sistema.", { status: 403 });
  }

  if (!METODOS_SEGUROS.has(req.method) && pathname.startsWith("/api/")) {
    const origem = req.headers.get("origin");
    const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")].filter(Boolean);
    let mesmoSite = false;
    try {
      mesmoSite = !!origem && hosts.includes(new URL(origem).host);
    } catch {
      mesmoSite = false;
    }
    if (!mesmoSite) return NextResponse.json({ erro: "Requisição bloqueada (origem não permitida)." }, { status: 403 });
  }

  if (pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/saude") return NextResponse.next();

  const sessao = await lerToken(req.cookies.get(COOKIE_SESSAO)?.value);
  if (sessao) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const destino = pathname + req.nextUrl.search;
  if (destino !== "/") url.searchParams.set("voltar", destino);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo\\.png|logo\\.svg).*)"],
};
