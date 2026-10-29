import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";
import { exigirUsuario, referencia, usuarioAtual } from "@/server/auth";
import { lerCorpo, respostaDeErro } from "@/server/api";
import { ehProducao } from "@/server/config";

export const dynamic = "force-dynamic";

const FRASE_CONFIRMACAO = "APAGAR TODAS AS OCORRENCIAS";

/** Só fora de produção e com PERMITIR_RESTAURAR_DEMO=true (qualquer outro valor desliga). */
function restauracaoPermitida() {
  return !ehProducao() && process.env.PERMITIR_RESTAURAR_DEMO === "true";
}

/**
 * Apaga TODAS as ocorrências e recria os dados demonstrativos (a trilha de auditoria é mantida).
 * Exige: ambiente que não seja produção, PERMITIR_RESTAURAR_DEMO=true, perfil Admin Geral
 * e a frase de confirmação no corpo. Tentativas recusadas também são auditadas.
 */
export async function POST(req: Request) {
  try {
    const u = await exigirUsuario("excluir");
    const repo = repositorio();
    const corpo = await lerCorpo(req);
    const negar = async (motivo: string, status: number) => {
      await repo.registrarAuditoria({ usuario: referencia(u), acao: "DEMONSTRACAO_RESTAURADA", entidade: "sistema", resultado: "NEGADO", detalhe: { motivo } });
      return NextResponse.json({ erro: motivo }, { status });
    };
    if (!restauracaoPermitida()) return negar("Restauração da demonstração desativada neste ambiente.", 403);
    if (corpo?.confirmacao !== FRASE_CONFIRMACAO) return negar(`Para confirmar, envie a frase "${FRASE_CONFIRMACAO}".`, 400);
    await repo.restaurarDemonstracao({ usuario: referencia(u), acao: "DEMONSTRACAO_RESTAURADA", entidade: "sistema" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function GET() {
  if (!(await usuarioAtual())) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  return NextResponse.json({ armazenamento: repositorio().tipo, permiteRestaurar: restauracaoPermitida(), fraseConfirmacao: FRASE_CONFIRMACAO });
}
