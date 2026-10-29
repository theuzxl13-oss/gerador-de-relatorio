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
  ["genero", "gênero"],
  ["tratamentoOutro", "tratamento (outro)"],
  ["quadra", "quadra"],
  ["lote", "lote"],
  ["fundamentacaoPrincipal", "fundamentação principal"],
  ["fundamentacaoComplementar", "fundamentação complementar"],
  ["incluirTextoNorma", "transcrição do texto da regra"],
  ["observacoes", "observações"],
  ["anexos", "fotos"],
  ["assinaturaNome", "assinatura"],
  ["assinaturaCargo", "cargo da assinatura"],
];

const chave = (v: unknown) => {
  if (v && typeof v === "object" && "normaId" in v) return (v as { normaId: string }).normaId;
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => (x && typeof x === "object" && "id" in x ? (x as { id: string }).id : x)));
  return JSON.stringify(v ?? "") ?? "";
};

/** Lista os campos alterados em uma edição (para a linha do tempo e a auditoria). */
export function camposAlterados(antes: Ocorrencia, depois: Partial<NovaOcorrencia>): string[] {
  return CAMPOS.filter(([k]) => k in depois && chave(antes[k]) !== chave(depois[k])).map(([, r]) => r);
}

/** Acrescenta um evento à linha do tempo exibida no relatório (gravada somente pelo servidor). */
export function comEvento(historico: EventoAuditoria[] | undefined, por: RegistradoPor, acao: EventoAuditoria["acao"], detalhe?: string): EventoAuditoria[] {
  return [...(historico ?? []), { em: new Date().toISOString(), por, acao, ...(detalhe ? { detalhe } : {}) }];
}

/**
 * Identificação mínima de uma ocorrência para a trilha de auditoria: sem nome,
 * descrição ou fotos (minimização de dados pessoais), com as normas e versões usadas.
 */
export function identificacaoAuditoria(o: Ocorrencia) {
  const norma = (f?: Ocorrencia["fundamentacaoPrincipal"]) => (f ? { id: f.normaId, versao: f.normaVersao ?? "não registrada", citacao: f.citacaoCurta } : undefined);
  return {
    protocolo: o.protocolo || null,
    data: o.data,
    quadraLote: `Q${o.quadra} L${o.lote}`,
    normaPrincipal: norma(o.fundamentacaoPrincipal),
    normaComplementar: norma(o.fundamentacaoComplementar),
    fotos: o.anexos?.length ?? 0,
    status: o.status,
  };
}
