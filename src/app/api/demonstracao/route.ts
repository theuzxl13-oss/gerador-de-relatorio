import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";
import { responder } from "@/server/api";

export const dynamic = "force-dynamic";

/**
 * Apaga TODAS as ocorrências e recria os dados demonstrativos.
 * Bloqueado quando PERMITIR_RESTAURAR_DEMO=false (recomendado em produção).
 */
export async function POST() {
  if (process.env.PERMITIR_RESTAURAR_DEMO === "false") {
    return NextResponse.json({ erro: "Restauração da demonstração desativada neste ambiente." }, { status: 403 });
  }
  return responder(() => repositorio().restaurarDemonstracao());
}

export async function GET() {
  return NextResponse.json({
    armazenamento: repositorio().tipo,
    permiteRestaurar: process.env.PERMITIR_RESTAURAR_DEMO !== "false",
  });
}
