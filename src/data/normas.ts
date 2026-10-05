import type { DocumentoTipo, Norma } from "@/lib/types";
import { NORMAS_ESTATUTO, CAPITULOS_ESTATUTO, ESTATUTO_CABECALHO } from "./estatuto";
import { NORMAS_REGULAMENTO, SECOES_REGULAMENTO, REGULAMENTO_PREAMBULO, type SecaoDocumento } from "./regulamento";

/** Base normativa original (extraída dos PDFs). Usada para popular o banco na primeira execução. */
export const NORMAS_ORIGINAIS: Norma[] = [...NORMAS_REGULAMENTO, ...NORMAS_ESTATUTO];

export const SECOES: Record<DocumentoTipo, SecaoDocumento[]> = {
  REGULAMENTO: SECOES_REGULAMENTO,
  ESTATUTO: CAPITULOS_ESTATUTO,
};

export const INTRODUCAO_DOCUMENTO: Record<DocumentoTipo, string> = {
  REGULAMENTO: REGULAMENTO_PREAMBULO,
  ESTATUTO: ESTATUTO_CABECALHO,
};

export function caputSecao(documento: DocumentoTipo, numero: string): string | undefined {
  return SECOES[documento].find((s) => s.numero === numero)?.caput;
}

export type { SecaoDocumento };
