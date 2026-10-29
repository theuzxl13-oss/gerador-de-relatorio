/**
 * Regras da providência (Regulamento Interno, tópico XV – Atos disciplinares):
 *  - 2.2 Notificação por escrito, com prazo para atendimento;
 *  - 2.3 Multa no valor de até uma taxa da Associação;
 *  - 2.4 Reincidência: multa dobrada;
 *  - 3   Reincidente: repete a falta dentro de 12 meses;
 *  - 5   Recurso em 30 dias a partir do recebimento da notificação ou multa.
 */
import {
  PRAZO_RECURSO_DIAS,
  PRAZO_REINCIDENCIA_MESES,
  type Ocorrencia,
  type Providencia,
  type StatusOcorrencia,
} from "./types";

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function subtrairMeses(data: string, meses: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - meses);
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias (b − a) entre duas datas AAAA-MM-DD. */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Último dia para recurso (30 dias do recebimento). */
export function prazoRecurso(p: Pick<Providencia, "tipo" | "dataRecebimento">): string | undefined {
  if (p.tipo === "ARQUIVADO" || !p.dataRecebimento) return undefined;
  return somarDias(p.dataRecebimento, PRAZO_RECURSO_DIAS);
}

/** Valor máximo da multa: uma taxa, ou duas na reincidência. undefined se a taxa não foi configurada. */
export function multaMaxima(valorTaxa: number, reincidente: boolean): number | undefined {
  if (!(valorTaxa > 0)) return undefined;
  return valorTaxa * (reincidente ? 2 : 1);
}

/**
 * Situação do relatório, definida pela providência. Sem providência: "Registrada",
 * ou "Aguardando análise" quando falta a fundamentação. Situações gravadas manualmente
 * por versões anteriores (ex.: "Concluída") são preservadas enquanto não houver providência.
 */
export function statusDaOcorrencia(o: { fundamentacaoPrincipal?: unknown; providencia?: Providencia; status?: StatusOcorrencia }): StatusOcorrencia {
  const p = o.providencia;
  if (!p) {
    if (o.status && o.status !== "REGISTRADA" && o.status !== "AGUARDANDO_ANALISE") return o.status;
    return o.fundamentacaoPrincipal ? "REGISTRADA" : "AGUARDANDO_ANALISE";
  }
  if (p.tipo === "ARQUIVADO") return "ARQUIVADA";
  if (p.tipo === "MULTADO") return "MULTADA";
  return p.esclarecimentoResultado && p.esclarecimentoResultado !== "PENDENTE" ? "CONCLUIDA" : "NOTIFICADA";
}

/** Indica se a ocorrência ainda aguarda decisão da Administração. */
export function aguardaDecisao(o: Pick<Ocorrencia, "providencia" | "status">): boolean {
  return !o.providencia && (o.status === "REGISTRADA" || o.status === "AGUARDANDO_ANALISE");
}

/** Resumo de uma linha da providência (linha do tempo, exportação). */
export function resumoProvidencia(p: Providencia): string {
  const br = (d?: string) => (d ? d.split("-").reverse().join("/") : "");
  if (p.tipo === "ARQUIVADO") return "Arquivado";
  if (p.tipo === "NOTIFICADO") {
    const r = p.esclarecimentoResultado ?? "PENDENTE";
    const res = r === "PENDENTE" ? "aguardando esclarecimento" : r === "ESCLARECEU" ? "esclareceu" : "não esclareceu";
    return `Notificado – esclarecimento de ${br(p.esclarecimentoInicio)} a ${br(p.esclarecimentoFim)} (${res})`;
  }
  return `Multado – ${formatarReais(p.multaValor)}${p.reincidente ? " (reincidência, valor dobrado)" : ""}`;
}

function normalizar(s: string | undefined) {
  return (s ?? "").trim().replace(/^0+/, "").toLowerCase();
}

/** Primeiro dia considerado para reincidência (12 meses antes da data). */
export function inicioReincidencia(data: string): string {
  return subtrairMeses(data, PRAZO_REINCIDENCIA_MESES);
}

/**
 * Ocorrências anteriores do mesmo imóvel (quadra/lote) com a mesma norma
 * principal nos 12 meses anteriores (RI XV, item 3). Ignora as arquivadas e canceladas.
 */
export function buscarReincidencias(alvo: Ocorrencia, todas: Ocorrencia[]): Ocorrencia[] {
  const norma = alvo.fundamentacaoPrincipal?.normaId;
  if (!norma || !normalizar(alvo.quadra) || !normalizar(alvo.lote)) return [];
  const inicio = inicioReincidencia(alvo.data);
  return todas
    .filter(
      (o) =>
        o.id !== alvo.id &&
        o.fundamentacaoPrincipal?.normaId === norma &&
        normalizar(o.quadra) === normalizar(alvo.quadra) &&
        normalizar(o.lote) === normalizar(alvo.lote) &&
        o.status !== "CANCELADA" &&
        o.providencia?.tipo !== "ARQUIVADO" &&
        o.data >= inicio &&
        (o.data < alvo.data || (o.data === alvo.data && o.criadoEm < alvo.criadoEm)),
    )
    .sort((a, b) => b.data.localeCompare(a.data));
}

export type Alerta = { tipo: "esclarecimento-vencido" | "esclarecimento-vencendo" | "recurso-aberto"; dias: number };

/** Prazos que merecem atenção da Administração (hoje = AAAA-MM-DD). */
export function alertasPrazo(o: Pick<Ocorrencia, "providencia">, hoje: string): Alerta[] {
  const p = o.providencia;
  if (!p) return [];
  const r: Alerta[] = [];
  if (p.tipo === "NOTIFICADO" && p.esclarecimentoFim && (p.esclarecimentoResultado ?? "PENDENTE") === "PENDENTE") {
    const d = diasEntre(hoje, p.esclarecimentoFim);
    if (d < 0) r.push({ tipo: "esclarecimento-vencido", dias: -d });
    else if (d <= 3) r.push({ tipo: "esclarecimento-vencendo", dias: d });
  }
  const fim = prazoRecurso(p);
  if (fim && (p.recursoSituacao ?? "SEM_RECURSO") === "SEM_RECURSO") {
    const d = diasEntre(hoje, fim);
    if (d >= 0) r.push({ tipo: "recurso-aberto", dias: d });
  }
  return r;
}

export function formatarReais(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
