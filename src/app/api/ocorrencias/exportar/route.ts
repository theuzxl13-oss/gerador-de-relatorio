import { NextResponse } from "next/server";
import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { respostaDeErro } from "@/server/api";
import { prazoRecurso } from "@/lib/providencia";
import { ESCLARECIMENTO_LABEL, PROVIDENCIA_LABEL, RECURSO_LABEL, STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

const br = (d?: string) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "");

function celula(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  // Evita que planilhas interpretem o conteúdo como fórmula.
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** Planilha (CSV, separada por ponto e vírgula) com todos os relatórios e providências. */
export async function GET() {
  let lista;
  try {
    const u = await exigirUsuario("painel");
    lista = await repositorio().listarOcorrencias();
    await repositorio().registrarAuditoria({ usuario: referencia(u), acao: "EXPORTACAO_CSV", entidade: "sistema", detalhe: { registros: lista.length } });
  } catch (e) {
    return respostaDeErro(e);
  }
  const cab = [
    "Protocolo", "Data", "Horário", "Ocorrência", "Nome", "Tratamento", "Quadra", "Lote", "Fundamentação",
    "Situação", "Registrado por", "Providência", "Descrição da providência", "Decidido por", "Decidido em",
    "Recebimento", "Esclarecimento – início", "Esclarecimento – fim", "Esclarecimento – resultado", "Esclarecimento – observação",
    "Multa (R$)", "Reincidência", "Prazo de recurso", "Recurso", "Observação do recurso",
  ];
  const linhas = lista.map((o) => {
    const p = o.providencia;
    return [
      o.protocolo, br(o.data), o.horario, o.ocorrencia, o.nome, o.tratamento === "Outro" ? o.tratamentoOutro ?? "Outro" : o.tratamento,
      o.quadra, o.lote, o.fundamentacaoPrincipal?.citacaoCurta, STATUS_LABEL[o.status] ?? o.status, o.registradoPor?.nome,
      p ? PROVIDENCIA_LABEL[p.tipo] : "", p?.descricao, p?.decididoPor.nome, br(p?.decididoEm),
      br(p?.dataRecebimento), br(p?.esclarecimentoInicio), br(p?.esclarecimentoFim),
      p?.esclarecimentoResultado ? ESCLARECIMENTO_LABEL[p.esclarecimentoResultado] : "", p?.esclarecimentoObservacao,
      p?.multaValor !== undefined ? p.multaValor.toFixed(2).replace(".", ",") : "", p?.tipo === "MULTADO" ? (p.reincidente ? "Sim" : "Não") : "",
      p ? br(prazoRecurso(p)) : "", p?.recursoSituacao ? RECURSO_LABEL[p.recursoSituacao] : "", p?.recursoObservacao,
    ].map(celula).join(";");
  });
  const csv = "﻿" + [cab.map(celula).join(";"), ...linhas].join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ocorrencias-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
