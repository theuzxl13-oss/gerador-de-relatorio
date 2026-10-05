import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";

export const dynamic = "force-dynamic";

/** Health check usado pelo Render. */
export async function GET() {
  try {
    const normas = await repositorio().listarNormas();
    return NextResponse.json({ ok: true, armazenamento: repositorio().tipo, normas: normas.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
