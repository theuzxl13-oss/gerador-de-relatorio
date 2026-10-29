import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";
import { ErroConfiguracao, problemasDeConfiguracao } from "@/server/config";
import { diagnosticarErroBanco } from "@/server/diagnostico";

export const dynamic = "force-dynamic";

/**
 * Health check usado pelo Render e diagnóstico rápido.
 * Responde 503 se a configuração de produção for insegura/incompleta ou se o banco
 * não responder; assim o Render não coloca no ar uma versão que não funcionaria.
 * As mensagens nunca incluem valores de variáveis.
 */
export async function GET() {
  const { erros, avisos } = problemasDeConfiguracao();
  if (erros.length) {
    console.error("[saude] configuração inválida:", erros.join(" | "));
    return NextResponse.json({ ok: false, erros }, { status: 503 });
  }
  try {
    const repo = repositorio();
    await repo.contarUsuarios();
    const integridade = await repo.diagnosticoIntegridade();
    const todos = [...avisos, ...integridade];
    return NextResponse.json({
      ok: true,
      armazenamento: repo.tipo,
      ...(repo.tipo === "arquivo" ? { aviso: diagnosticarErroBanco(null) } : {}),
      ...(todos.length ? { avisos: todos } : {}),
    });
  } catch (e) {
    console.error("[saude]", e);
    return NextResponse.json({ ok: false, erro: e instanceof ErroConfiguracao ? e.message : diagnosticarErroBanco(e) }, { status: 503 });
  }
}
