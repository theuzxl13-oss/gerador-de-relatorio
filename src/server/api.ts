import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ErroAcesso } from "./auth";
import { ErroConfiguracao } from "./config";
import { ErroConflito, ErroNaoEncontrado, ErroTamanho, ErroValidacao } from "./validacao";
import { diagnosticarErroBanco, ehErroDeBanco } from "./diagnostico";
import { ErroSegredoSessao } from "@/lib/sessao";

/**
 * Envolve um handler de API com tratamento padronizado de erros:
 * 400 validação · 401/403 acesso · 404 inexistente (ou sem acesso) · 409 conflito ·
 * 503 configuração/banco indisponível · 500 interno (sem detalhes, com código de referência no log).
 */
export async function responder<T>(fn: () => Promise<T>, status = 200) {
  try {
    const dados = await fn();
    return NextResponse.json(dados ?? { ok: true }, { status });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export function respostaDeErro(e: unknown) {
  if (e instanceof ErroValidacao) return NextResponse.json({ erro: e.message }, { status: 400 });
  if (e instanceof ErroNaoEncontrado) return NextResponse.json({ erro: e.message }, { status: 404 });
  if (e instanceof ErroTamanho) return NextResponse.json({ erro: e.message }, { status: 413 });
  if (e instanceof ErroConflito) return NextResponse.json({ erro: e.message }, { status: 409 });
  if (e instanceof ErroAcesso) return NextResponse.json({ erro: e.message, ...(e.codigo ? { codigo: e.codigo } : {}) }, { status: e.status });
  if (e instanceof ErroConfiguracao || e instanceof ErroSegredoSessao) {
    console.error("[config]", e.message);
    return NextResponse.json({ erro: `Sistema não configurado corretamente: ${e.message}` }, { status: 503 });
  }
  const ref = randomUUID().slice(0, 8);
  console.error(`[api] ref=${ref}`, e);
  if (ehErroDeBanco(e)) {
    return NextResponse.json({ erro: `Erro ao acessar o banco de dados. ${diagnosticarErroBanco(e)} (ref. ${ref})` }, { status: 503 });
  }
  return NextResponse.json({ erro: `Erro interno. Informe ao administrador o código ${ref}.` }, { status: 500 });
}

export function naoEncontrado(msg = "Registro não encontrado.") {
  return NextResponse.json({ erro: msg }, { status: 404 });
}

export const LIMITE_CORPO_PADRAO = 256 * 1024;

/**
 * Lê o corpo JSON com limite de tamanho (o Next não limita o corpo das rotas de API).
 * Recusa pelo Content-Length e também conta os bytes recebidos, para corpos sem esse cabeçalho.
 */
export async function lerCorpo(req: Request, limite = LIMITE_CORPO_PADRAO): Promise<Record<string, unknown> | null> {
  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > limite) throw new ErroTamanho(`Dados muito grandes (limite de ${Math.round(limite / 1024)} KB).`);
  if (!req.body) return null;
  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel().catch(() => undefined);
      throw new ErroTamanho(`Dados muito grandes (limite de ${Math.round(limite / 1024)} KB).`);
    }
    partes.push(value);
  }
  try {
    const v = JSON.parse(Buffer.concat(partes).toString("utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
