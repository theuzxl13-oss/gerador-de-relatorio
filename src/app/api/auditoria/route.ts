import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";
import type { EntidadeAuditada } from "@/server/repositorio";

export const dynamic = "force-dynamic";

const ENTIDADES: EntidadeAuditada[] = ["ocorrencia", "usuario", "norma", "configuracoes", "sistema", "sessao", "anexo"];

/** Trilha de auditoria (somente leitura; Admin Geral e Gerente). Paginação por `antes` (id). */
export async function GET(req: Request) {
  return responder(async () => {
    await exigirUsuario("auditoria");
    const p = new URL(req.url).searchParams;
    const entidade = ENTIDADES.find((e) => e === p.get("entidade"));
    return repositorio().listarAuditoria({
      limite: Math.min(Number(p.get("limite")) || 50, 200),
      antesDe: p.get("antes") ?? undefined,
      entidade,
      entidadeId: p.get("id") ?? undefined,
    });
  });
}
