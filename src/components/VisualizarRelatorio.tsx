"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-cliente";
import { gerarPdf } from "@/lib/pdf";
import { montarRelatorio } from "@/lib/relatorio";
import { DOCUMENTO_NOME, STATUS_LABEL, type Configuracoes, type Ocorrencia, type StatusOcorrencia } from "@/lib/types";
import { FolhaRelatorio } from "./FolhaRelatorio";
import { Aviso, Botao, BotaoLink, SeloConfianca, SeloStatus, Selecao } from "./ui";

export function nomeArquivoPdf(o: Ocorrencia) {
  return `Relatorio_${o.protocolo}_Q${o.quadra}_L${o.lote}.pdf`.replace(/[^\w.-]+/g, "_");
}

export function VisualizarRelatorio({ ocorrencia, configuracoes, novo, acaoInicial }: { ocorrencia: Ocorrencia; configuracoes: Configuracoes; novo?: boolean; acaoInicial?: "imprimir" | "pdf" }) {
  const router = useRouter();
  const [o, setO] = useState(ocorrencia);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const conteudo = montarRelatorio(o, configuracoes);
  const executado = useRef(false);

  async function pdf() {
    setGerando(true);
    setErro("");
    try {
      await gerarPdf(conteudo, nomeArquivoPdf(o));
    } catch (e) {
      setErro("Falha ao gerar o PDF: " + (e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  useEffect(() => {
    if (executado.current || !acaoInicial) return;
    executado.current = true;
    if (acaoInicial === "imprimir") setTimeout(() => window.print(), 400);
    else pdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acaoInicial]);

  async function alterarStatus(status: StatusOcorrencia) {
    try {
      const salvo = await api.atualizarOcorrencia(o.id, { ...o, status });
      setO(salvo);
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir definitivamente a ocorrência ${o.protocolo}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.excluirOcorrencia(o.id);
      router.push("/historico");
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const fundamentacoes = [o.fundamentacaoPrincipal, o.fundamentacaoComplementar].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="nao-imprimir w-full space-y-4 lg:sticky lg:top-24 lg:w-80 lg:shrink-0">
        {novo && <Aviso tipo="sucesso" titulo="Relatório gerado com sucesso">Protocolo {o.protocolo}.</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <div className="grid grid-cols-2 gap-2">
          <Botao onClick={pdf} disabled={gerando} className="col-span-1">
            {gerando ? "Gerando..." : "Gerar PDF"}
          </Botao>
          <Botao variante="secundario" onClick={() => window.print()}>Imprimir</Botao>
          <BotaoLink href={`/ocorrencias/${o.id}/editar`} variante="secundario">Editar</BotaoLink>
          <BotaoLink href={`/ocorrencias/nova?duplicar=${o.id}`} variante="secundario">Duplicar</BotaoLink>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Protocolo {o.protocolo}</span>
            <SeloStatus status={o.status} />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Alterar status</span>
            <Selecao value={o.status} onChange={(e) => alterarStatus(e.target.value as StatusOcorrencia)}>
              {Object.entries(STATUS_LABEL).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </Selecao>
          </label>
          <div className="border-t border-gray-100 pt-3">
            <div className="mb-1 text-xs font-medium text-gray-500">Fundamentação vinculada (registro de auditoria)</div>
            {fundamentacoes.length === 0 ? (
              <p className="text-amber-700">Sem fundamentação – encaminhada para análise da Administração.</p>
            ) : (
              <ul className="space-y-2">
                {fundamentacoes.map((f) => (
                  <li key={f!.normaId}>
                    <div className="font-medium">{f!.citacaoCurta} · {DOCUMENTO_NOME[f!.documento]}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                      <SeloConfianca confianca={f!.origem === "MANUAL" ? undefined : f!.confianca} />
                      <span>confirmada em {new Date(f!.confirmadoEm).toLocaleString("pt-BR")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <BotaoLink href="/historico" variante="fantasma">← Histórico</BotaoLink>
          <Botao variante="fantasma" className="!text-red-700 hover:!bg-red-50" onClick={excluir}>Excluir</Botao>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <FolhaRelatorio r={conteudo} />
      </div>
    </div>
  );
}
