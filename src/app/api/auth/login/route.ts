import { NextResponse } from "next/server";
import { conferirSenhaOuNada, garantirAdministradorInicial } from "@/server/auth";
import { gravarSessao } from "@/server/cookie";
import { repositorio } from "@/server/db";
import type { RegistroAuditoria } from "@/server/repositorio";
import { lerCorpo, respostaDeErro } from "@/server/api";
import { bloqueio, ipDoCliente, limparFalhas, registrarFalha } from "@/server/limite";

export const dynamic = "force-dynamic";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  let b: Record<string, unknown> | null;
  try {
    b = await lerCorpo(req, 8 * 1024);
  } catch (e) {
    return respostaDeErro(e);
  }
  const login = typeof b?.login === "string" ? b.login.trim().slice(0, 80) : "";
  const senha = typeof b?.senha === "string" ? b.senha.slice(0, 200) : "";
  if (!login || !senha) return NextResponse.json({ erro: "Informe usuário e senha." }, { status: 400 });

  const ip = ipDoCliente(req);
  const minutos = bloqueio(ip, login);
  if (minutos > 0) {
    await auditarLogin({ acao: "LOGIN_BLOQUEADO", entidade: "sessao", resultado: "NEGADO", detalhe: { ip } });
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
      // O texto digitado no campo login não é registrado (pode ser uma senha digitada no campo errado).
      console.warn(`[login] falha de autenticação (ip ${ip})`);
      await auditarLogin({
        usuario: u ? { id: u.id, nome: u.nome } : null,
        acao: "LOGIN",
        entidade: "sessao",
        entidadeId: u?.id,
        resultado: "NEGADO",
        detalhe: { ip, motivo: !u ? "login inexistente" : !u.ativo ? "usuário desativado" : "senha incorreta" },
      });
      await espera(600); // dificulta tentativas em sequência
      return NextResponse.json({ erro: "Usuário ou senha incorretos." }, { status: 401 });
    }
    limparFalhas(ip, login);
    await auditarLogin({ usuario: { id: u.id, nome: u.nome }, acao: "LOGIN", entidade: "sessao", entidadeId: u.id, detalhe: { ip } });
    const resp = NextResponse.json({ ok: true, nome: u.nome, perfil: u.perfil });
    await gravarSessao(resp, req, u);
    return resp;
  } catch (e) {
    return respostaDeErro(e);
  }
}

/** Falha ao auditar um login não impede o acesso: fica registrada no log do servidor. */
async function auditarLogin(evento: RegistroAuditoria) {
  try {
    await repositorio().registrarAuditoria(evento);
  } catch (e) {
    console.error("[auditoria] falha ao registrar evento de login:", (e as Error).message);
  }
}
