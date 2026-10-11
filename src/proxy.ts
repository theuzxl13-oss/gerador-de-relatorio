import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteção de acesso por usuário e senha (HTTP Basic Auth).
 * Ativada quando as variáveis APP_USUARIO e APP_SENHA estão definidas
 * (recomendado no Render, pois o endereço do sistema é público).
 */
export function proxy(req: NextRequest) {
  const usuario = process.env.APP_USUARIO;
  const senha = process.env.APP_SENHA;
  if (!usuario || !senha) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [u, ...resto] = atob(auth.slice(6)).split(":");
      if (u === usuario && resto.join(":") === senha) return NextResponse.next();
    } catch {
      // credencial malformada: cai no pedido de autenticação
    }
  }
  return new NextResponse("Acesso restrito à Administração.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Fazenda da Ilha - Ocorrencias", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!api/saude|_next/static|_next/image|favicon.ico|logo).*)"],
};
