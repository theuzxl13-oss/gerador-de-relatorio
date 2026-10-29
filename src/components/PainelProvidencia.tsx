"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ErroConflito } from "@/lib/api-cliente";
import { alertasPrazo, formatarReais, multaMaxima, prazoRecurso, somarDias } from "@/lib/providencia";
import { dataCurta, hojeISO } from "@/lib/relatorio";
import {
  ESCLARECIMENTO_LABEL,
  PRAZO_RECURSO_DIAS,
  PROVIDENCIA_LABEL,
  RECURSO_LABEL,
  type EventoAuditoria,
  type Ocorrencia,
  type Providencia,
  type ResultadoEsclarecimento,
  type SituacaoRecurso,
  type TipoProvidencia,
} from "@/lib/types";
import { Aviso, Botao, Campo, Entrada, SeloStatus, Selecao } from "./ui";

export interface Reincidencia {
  id: string;
  protocolo: string;
  data: string;
  ocorrencia: string;
  nome: string;
  providencia?: TipoProvidencia;
}

interface Form {
  tipo: TipoProvidencia | "";
  descricao: string;
  dataRecebimento: string;
  esclarecimentoInicio: string;
  esclarecimentoFim: string;
  esclarecimentoResultado: ResultadoEsclarecimento;
  esclarecimentoObservacao: string;
  multaValor: string;
  reincidente: boolean;
  recursoSituacao: SituacaoRecurso;
  recursoObservacao: string;
}

function paraForm(p: Providencia | undefined, prazoDias: number, reincidente: boolean): Form {
  const hoje = hojeISO();
  return {
    tipo: p?.tipo ?? "",
    descricao: p?.descricao ?? "",
    dataRecebimento: p?.dataRecebimento ?? "",
    esclarecimentoInicio: p?.esclarecimentoInicio ?? hoje,
    esclarecimentoFim: p?.esclarecimentoFim ?? somarDias(hoje, prazoDias),
    esclarecimentoResultado: p?.esclarecimentoResultado ?? "PENDENTE",
    esclarecimentoObservacao: p?.esclarecimentoObservacao ?? "",
    multaValor: p?.multaValor !== undefined ? p.multaValor.toFixed(2).replace(".", ",") : "",
    reincidente: p?.reincidente ?? reincidente,
    recursoSituacao: p?.recursoSituacao ?? "SEM_RECURSO",
    recursoObservacao: p?.recursoObservacao ?? "",
  };
}

const ACAO_LABEL: Record<EventoAuditoria["acao"], string> = {
  CRIOU: "Gerou o relatório",
  EDITOU: "Editou o relatório",
  PROVIDENCIA: "Registrou a providência",
  ATUALIZOU_PROVIDENCIA: "Atualizou a providência",
  REMOVEU_PROVIDENCIA: "Desfez a providência",
};

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function PainelProvidencia({
  ocorrencia,
  podeDecidir,
  valorTaxa,
  prazoEsclarecimentoDias,
  reincidencias,
  aoAtualizar,
}: {
  ocorrencia: Ocorrencia;
  podeDecidir: boolean;
  valorTaxa: number;
  prazoEsclarecimentoDias: number;
  reincidencias: Reincidencia[];
  aoAtualizar: (o: Ocorrencia) => void;
}) {
  const p = ocorrencia.providencia;
  const [editando, setEditando] = useState(!p && podeDecidir);
  const [f, setF] = useState<Form>(() => paraForm(p, prazoEsclarecimentoDias, reincidencias.length > 0));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const maximo = multaMaxima(valorTaxa, f.reincidente);
  const alertas = alertasPrazo(ocorrencia, hojeISO());

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const salvo = await api.registrarProvidencia(ocorrencia.id, { ...f, multaValor: f.multaValor, versao: ocorrencia.versao });
      aoAtualizar(salvo);
      setF(paraForm(salvo.providencia, prazoEsclarecimentoDias, false));
      setEditando(false);
    } catch (e) {
      setErro(e instanceof ErroConflito ? `${e.message} (Seus dados digitados ainda estão no formulário: copie-os antes de recarregar.)` : (e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function desfazer() {
    if (!confirm("Desfazer a providência? O relatório volta para análise (fica registrado na linha do tempo).")) return;
    setErro("");
    try {
      const salvo = await api.removerProvidencia(ocorrencia.id, ocorrencia.versao ?? 1);
      aoAtualizar(salvo);
      setF(paraForm(undefined, prazoEsclarecimentoDias, reincidencias.length > 0));
      setEditando(true);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <section className="nao-imprimir space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Providência da Administração</h2>
        <SeloStatus status={ocorrencia.status} />
      </div>

      {reincidencias.length > 0 && (
        <Aviso tipo="alerta" titulo={`Possível reincidência (RI XV, item 3): ${reincidencias.length} ocorrência(s) da mesma norma para Q${ocorrencia.quadra} L${ocorrencia.lote} nos últimos 12 meses`}>
          <ul className="mt-1 space-y-0.5">
            {reincidencias.map((r) => (
              <li key={r.id}>
                <Link href={`/ocorrencias/${r.id}`} className="underline">
                  {dataCurta(r.data)} · {r.protocolo || "sem protocolo"} · {r.ocorrencia} ({r.nome})
                </Link>
                {r.providencia && <span> – {PROVIDENCIA_LABEL[r.providencia]}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">Na reincidência a multa é dobrada (RI XV, 2.4). Confira se é a mesma pessoa/falta antes de marcar.</p>
        </Aviso>
      )}

      {alertas.map((a) => (
        <Aviso key={a.tipo} tipo={a.tipo === "esclarecimento-vencido" ? "erro" : "info"}>
          {a.tipo === "esclarecimento-vencido" && `O prazo de esclarecimento venceu há ${a.dias} dia(s) e o resultado ainda não foi registrado.`}
          {a.tipo === "esclarecimento-vencendo" && (a.dias === 0 ? "O prazo de esclarecimento vence hoje." : `O prazo de esclarecimento vence em ${a.dias} dia(s).`)}
          {a.tipo === "recurso-aberto" && `Prazo de recurso em aberto: ${a.dias} dia(s) restante(s) (RI XV, item 5).`}
        </Aviso>
      ))}

      {!editando && !p && <p className="text-sm text-amber-700">Aguardando a providência da Administração.</p>}

      {!editando && p && (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Item rotulo="Providência">
            <strong>{PROVIDENCIA_LABEL[p.tipo]}</strong>
          </Item>
          <Item rotulo="Decidido por">
            {p.decididoPor.nome} em {dataHora(p.decididoEm)}
          </Item>
          <Item rotulo="Providência tomada" largo>
            <span className="whitespace-pre-line">{p.descricao}</span>
          </Item>
          {p.tipo === "NOTIFICADO" && (
            <>
              <Item rotulo="Período para esclarecimento">
                {dataCurta(p.esclarecimentoInicio!)} a {dataCurta(p.esclarecimentoFim!)}
              </Item>
              <Item rotulo="Esclarecimento">
                <strong>{ESCLARECIMENTO_LABEL[p.esclarecimentoResultado ?? "PENDENTE"]}</strong>
              </Item>
              {p.esclarecimentoObservacao && (
                <Item rotulo="Detalhes do esclarecimento" largo>
                  <span className="whitespace-pre-line">{p.esclarecimentoObservacao}</span>
                </Item>
              )}
            </>
          )}
          {p.tipo === "MULTADO" && (
            <Item rotulo="Valor da multa">
              <strong>{formatarReais(p.multaValor)}</strong>
              {p.reincidente && " (reincidência – valor dobrado)"}
            </Item>
          )}
          {p.tipo !== "ARQUIVADO" && (
            <>
              <Item rotulo="Recebida pela pessoa em">{p.dataRecebimento ? dataCurta(p.dataRecebimento) : "não informado"}</Item>
              <Item rotulo={`Recurso (${PRAZO_RECURSO_DIAS} dias)`}>
                {prazoRecurso(p) ? `até ${dataCurta(prazoRecurso(p)!)} · ` : ""}
                {RECURSO_LABEL[p.recursoSituacao ?? "SEM_RECURSO"]}
              </Item>
              {p.recursoObservacao && (
                <Item rotulo="Observação do recurso" largo>
                  {p.recursoObservacao}
                </Item>
              )}
            </>
          )}
        </dl>
      )}

      {!editando && podeDecidir && (
        <div className="flex flex-wrap gap-2">
          <Botao variante={p ? "secundario" : "primario"} onClick={() => setEditando(true)}>
            {p ? (p.tipo === "NOTIFICADO" && (p.esclarecimentoResultado ?? "PENDENTE") === "PENDENTE" ? "Registrar esclarecimento / atualizar" : "Atualizar providência") : "Registrar providência"}
          </Botao>
          {p && (
            <Botao variante="fantasma" className="!text-red-700 hover:!bg-red-50" onClick={desfazer}>
              Desfazer
            </Botao>
          )}
        </div>
      )}

      {editando && podeDecidir && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Providência">
            {(Object.keys(PROVIDENCIA_LABEL) as TipoProvidencia[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={f.tipo === t}
                onClick={() => set("tipo", t)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  f.tipo === t ? "border-marca-700 bg-marca-700 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {PROVIDENCIA_LABEL[t]}
              </button>
            ))}
          </div>

          {f.tipo && (
            <Campo rotulo="Providência tomada (o que foi feito)" obrigatorio ajuda="Ex.: Notificação entregue em mãos pela portaria; Arquivado por falta de provas; Multa lançada no boleto de dezembro.">
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-200"
                rows={3}
                maxLength={4000}
                value={f.descricao}
                onChange={(e) => set("descricao", e.target.value)}
              />
            </Campo>
          )}

          {f.tipo === "NOTIFICADO" && (
            <fieldset className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
              <legend className="px-1 text-sm font-semibold text-violet-900">Período para esclarecimento (RI XV, 2.2)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Início" obrigatorio>
                  <Entrada type="date" value={f.esclarecimentoInicio} onChange={(e) => set("esclarecimentoInicio", e.target.value)} />
                </Campo>
                <Campo rotulo="Fim (prazo)" obrigatorio>
                  <Entrada type="date" value={f.esclarecimentoFim} min={f.esclarecimentoInicio} onChange={(e) => set("esclarecimentoFim", e.target.value)} />
                </Campo>
              </div>
              <Campo rotulo="A pessoa esclareceu?">
                <Selecao value={f.esclarecimentoResultado} onChange={(e) => set("esclarecimentoResultado", e.target.value as ResultadoEsclarecimento)}>
                  {(Object.keys(ESCLARECIMENTO_LABEL) as ResultadoEsclarecimento[]).map((r) => (
                    <option key={r} value={r}>{ESCLARECIMENTO_LABEL[r]}</option>
                  ))}
                </Selecao>
              </Campo>
              {f.esclarecimentoResultado !== "PENDENTE" && (
                <Campo rotulo="Detalhes do esclarecimento" obrigatorio ajuda="O que a pessoa apresentou (ou registre que não houve resposta no prazo).">
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-200"
                    rows={2}
                    maxLength={2000}
                    value={f.esclarecimentoObservacao}
                    onChange={(e) => set("esclarecimentoObservacao", e.target.value)}
                  />
                </Campo>
              )}
            </fieldset>
          )}

          {f.tipo === "MULTADO" && (
            <fieldset className="space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
              <legend className="px-1 text-sm font-semibold text-red-900">Multa (RI XV, 2.3 e 2.4)</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={f.reincidente} onChange={(e) => set("reincidente", e.target.checked)} />
                Reincidência dentro de 12 meses (multa dobrada)
              </label>
              <Campo
                rotulo="Valor da multa (R$)"
                obrigatorio
                ajuda={
                  maximo !== undefined
                    ? `Até ${formatarReais(maximo)} (${f.reincidente ? "duas taxas, por reincidência" : "uma taxa da Associação"}).`
                    : "Até uma taxa da Associação (o dobro na reincidência). Informe o valor da taxa em Configurações para o sistema conferir o limite."
                }
              >
                <Entrada inputMode="decimal" placeholder="0,00" value={f.multaValor} onChange={(e) => set("multaValor", e.target.value.replace(/[^\d.,]/g, ""))} />
              </Campo>
              {maximo !== undefined && (
                <button type="button" className="text-xs font-medium text-marca-700 underline" onClick={() => set("multaValor", maximo.toFixed(2).replace(".", ","))}>
                  Usar o valor máximo ({formatarReais(maximo)})
                </button>
              )}
            </fieldset>
          )}

          {(f.tipo === "NOTIFICADO" || f.tipo === "MULTADO") && (
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
              <legend className="px-1 text-sm font-semibold text-gray-800">Recebimento e recurso (RI XV, item 5)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Data em que a pessoa recebeu" ajuda={f.dataRecebimento ? `Prazo de recurso até ${dataCurta(somarDias(f.dataRecebimento, PRAZO_RECURSO_DIAS))}.` : `O recurso pode ser apresentado em ${PRAZO_RECURSO_DIAS} dias do recebimento.`}>
                  <Entrada type="date" value={f.dataRecebimento} onChange={(e) => set("dataRecebimento", e.target.value)} />
                </Campo>
                <Campo rotulo="Recurso">
                  <Selecao value={f.recursoSituacao} onChange={(e) => set("recursoSituacao", e.target.value as SituacaoRecurso)}>
                    {(Object.keys(RECURSO_LABEL) as SituacaoRecurso[]).map((r) => (
                      <option key={r} value={r}>{RECURSO_LABEL[r]}</option>
                    ))}
                  </Selecao>
                </Campo>
              </div>
              {f.recursoSituacao !== "SEM_RECURSO" && (
                <Campo rotulo="Observação do recurso">
                  <Entrada value={f.recursoObservacao} maxLength={2000} onChange={(e) => set("recursoObservacao", e.target.value)} />
                </Campo>
              )}
            </fieldset>
          )}

          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="flex flex-wrap justify-end gap-2">
            {p && (
              <Botao variante="secundario" onClick={() => { setF(paraForm(p, prazoEsclarecimentoDias, false)); setEditando(false); setErro(""); }}>
                Cancelar
              </Botao>
            )}
            <Botao onClick={salvar} disabled={!f.tipo || salvando}>
              {salvando ? "Salvando..." : "Salvar providência"}
            </Botao>
          </div>
        </div>
      )}

      {ocorrencia.historico && ocorrencia.historico.length > 0 && (
        <details className="border-t border-gray-100 pt-3" open={!editando}>
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">Linha do tempo ({ocorrencia.historico.length})</summary>
          <ol className="mt-3 space-y-3 border-l-2 border-marca-100 pl-4">
            {[...ocorrencia.historico].reverse().map((ev, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-marca-500" />
                <div className="text-xs text-gray-500">{dataHora(ev.em)} · {ev.por.nome}</div>
                <div className="font-medium text-gray-800">{ACAO_LABEL[ev.acao]}</div>
                {ev.detalhe && <div className="whitespace-pre-line text-gray-600">{ev.detalhe}</div>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function Item({ rotulo, largo, children }: { rotulo: string; largo?: boolean; children: React.ReactNode }) {
  return (
    <div className={largo ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-gray-500">{rotulo}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}
