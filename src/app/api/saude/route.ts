import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";
import { diagnosticarErroBanco } from "@/server/diagnostico";

export const dynamic = "force-dynamic";

/**
 * Health check usado pelo Render e diagnóstico rápido do banco.
 * Abra /api/saude no navegador para ver se o banco está conectado.
 */
export async function GET() {
  const armazenamento = repositorio().tipo;
  try {
    const normas = await repositorio().listarNormas();
    return NextResponse.json({
      ok: true,
      armazenamento,
      normas: normas.length,
      aviso: armazenamento === "arquivo" ? diagnosticarErroBanco(null) : undefined,
    });
  } catch (e) {
    console.error("[saude]", e);
    return NextResponse.json({ ok: false, armazenamento, erro: diagnosticarErroBanco(e) }, { status: 503 });
  }
}
