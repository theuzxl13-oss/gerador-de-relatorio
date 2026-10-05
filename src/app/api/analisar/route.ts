import { repositorio } from "@/server/db";
import { responder } from "@/server/api";
import { analisarOcorrencia } from "@/lib/analysis/engine";
import { ErroValidacao } from "@/server/validacao";
import type { Tratamento } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Analisa a ocorrência contra a Base Normativa vigente no banco.
 * Ponto de extensão para IA: trocar o interpretador passado a analisarOcorrencia.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return responder(async () => {
    const ocorrencia = typeof b?.ocorrencia === "string" ? b.ocorrencia.trim() : "";
    if (!ocorrencia) throw new ErroValidacao("Informe a ocorrência.");
    const normas = await repositorio().listarNormas();
    return analisarOcorrencia(ocorrencia, normas, {
      descricao: typeof b?.descricao === "string" ? b.descricao : undefined,
      horario: typeof b?.horario === "string" ? b.horario : undefined,
      data: typeof b?.data === "string" ? b.data : undefined,
      tratamento: typeof b?.tratamento === "string" ? (b.tratamento as Tratamento) : undefined,
    });
  });
}
