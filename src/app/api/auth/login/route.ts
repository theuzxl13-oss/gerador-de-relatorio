import { NextResponse } from "next/server";
import { conferirSenhaOuNada, garantirAdministradorInicial } from "@/server/auth";
import { gravarSessao } from "@/server/cookie";
import { repositorio } from "@/server/db";
import { diagnosticarErroBanco } from "@/server/diagnostico";
import { bloqueio, ipDoCliente, limparFalhas, registrarFalha } from "@/server/limite";

export const dynamic = "force-dynamic";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { login?: unknown; senha?: unknown } | null;
  const login = typeof b?.login === "string" ? b.login.trim().slice(0, 80) : "";
  const senha = typeof b?.senha === "string" ? b.senha.slice(0, 200) : "";
  if (!login || !senha) return NextResponse.json({ erro: "Informe usuário e senha." }, { status: 400 });

  const ip = ipDoCliente(req);
  const minutos = bloqueio(ip, login);
  if (minutos > 0) {
    return NextResponse.json(
      { erro: `Muitas tentativas incorretas. Aguarde ${minutos} minuto(s) e tente novamente.` },
      { status: 429, headers: { "Retry-After": String(minutos * 60) } },
    );
  }

  try {
    await garantirAdministradorInicial();
    const u = await repositorio().obterUsuarioPorLogin(login);
    const senhaOk = await conferirSenhaOuNada(senha, u?.senhaHash);
    if (!u || !u.ativo || !senhaOk) {
      registrarFalha(ip, login);
      console.warn(`[login] falha para "${login}" (ip ${ip})`);
      await espera(600); // dificulta tentativas em sequência
      return NextResponse.json({ erro: "Usuário ou senha incorretos." }, { status: 401 });
    }
    limparFalhas(ip, login);
    const resp = NextResponse.json({ ok: true, nome: u.nome, perfil: u.perfil });
    await gravarSessao(resp, req, u);
    return resp;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ erro: `Erro ao acessar o banco de dados. ${diagnosticarErroBanco(e)}` }, { status: 500 });
  }
}
