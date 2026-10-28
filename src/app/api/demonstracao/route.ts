import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";
import { exigirUsuario, usuarioAtual } from "@/server/auth";
import { responder } from "@/server/api";

export const dynamic = "force-dynamic";

/**
 * Apaga TODAS as ocorrências e recria os dados demonstrativos.
 * Só funciona com PERMITIR_RESTAURAR_DEMO=true (nunca em produção).
 */
export async function POST() {
  if (process.env.PERMITIR_RESTAURAR_DEMO !== "true") {
    return NextResponse.json({ erro: "Restauração da demonstração desativada neste ambiente." }, { status: 403 });
  }
  return responder(async () => {
    await exigirUsuario("excluir");
    return repositorio().restaurarDemonstracao();
  });
}

export async function GET() {
  if (!(await usuarioAtual())) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  return NextResponse.json({
    armazenamento: repositorio().tipo,
    permiteRestaurar: process.env.PERMITIR_RESTAURAR_DEMO === "true",
  });
}
