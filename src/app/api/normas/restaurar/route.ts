import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { responder } from "@/server/api";

export const dynamic = "force-dynamic";

/** Restaura a Base Normativa original extraída dos PDFs (somente Admin Geral; auditado). */
export async function POST() {
  return responder(async () => {
    const u = await exigirUsuario("baseNormativa");
    await repositorio().restaurarNormas({ usuario: referencia(u), acao: "NORMAS_RESTAURADAS", entidade: "norma" });
    return { ok: true };
  });
}
