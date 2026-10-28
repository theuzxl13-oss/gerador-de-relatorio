import type { EventoAuditoria, Ocorrencia, RegistradoPor } from "@/lib/types";
import type { NovaOcorrencia } from "./repositorio";

const CAMPOS: [keyof NovaOcorrencia, string][] = [
  ["protocolo", "protocolo"],
  ["horario", "horário"],
  ["ocorrencia", "ocorrência"],
  ["descricao", "descrição"],
  ["complemento", "complemento"],
  ["nome", "nome"],
  ["tratamento", "tratamento"],
  ["quadra", "quadra"],
  ["lote", "lote"],
  ["fundamentacaoPrincipal", "fundamentação principal"],
  ["fundamentacaoComplementar", "fundamentação complementar"],
  ["observacoes", "observações"],
  ["anexos", "fotos"],
  ["assinaturaNome", "assinatura"],
];

/** Lista os campos alterados em uma edição (para a linha do tempo). */
export function camposAlterados(antes: Ocorrencia, depois: Partial<NovaOcorrencia>): string[] {
  const chave = (v: unknown) => {
    if (v && typeof v === "object" && "normaId" in v) return (v as { normaId: string }).normaId;
    return JSON.stringify(v ?? "") ?? "";
  };
  return CAMPOS.filter(([k]) => k in depois && chave(antes[k]) !== chave(depois[k])).map(([, r]) => r);
}

/** Acrescenta um evento à linha do tempo (o histórico só é gravado pelo servidor). */
export function comEvento(historico: EventoAuditoria[] | undefined, por: RegistradoPor, acao: EventoAuditoria["acao"], detalhe?: string): EventoAuditoria[] {
  return [...(historico ?? []), { em: new Date().toISOString(), por, acao, ...(detalhe ? { detalhe } : {}) }];
}
