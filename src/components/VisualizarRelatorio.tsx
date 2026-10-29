"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-cliente";
import { gerarPdf } from "@/lib/pdf";
import { montarRelatorio } from "@/lib/relatorio";
import { DOCUMENTO_NOME, type Configuracoes, type Ocorrencia } from "@/lib/types";
import { FolhaRelatorio } from "./FolhaRelatorio";
import { PainelProvidencia, type Reincidencia } from "./PainelProvidencia";
import { usePode } from "./UsuarioContexto";
import { Aviso, Botao, BotaoLink, SeloConfianca, SeloStatus } from "./ui";

export function nomeArquivoPdf(o: Ocorrencia) {
  const id = o.protocolo || o.data;
  return `Relatorio_${id}_Q${o.quadra}_L${o.lote}.pdf`.replace(/[^\w.-]+/g, "_");
}

export function VisualizarRelatorio({
  ocorrencia,
  configuracoes,
  novo,
  acaoInicial,
  reincidencias,
}: {
  ocorrencia: Ocorrencia;
  configuracoes: Configuracoes;
  novo?: boolean;
  acaoInicial?: "imprimir" | "pdf";
  /** Informado apenas para os perfis que acompanham as providências. */
  reincidencias?: Reincidencia[];
}) {
  const router = useRouter();
  const podeEditar = usePode("editarOcorrencia");
  const podeExcluir = usePode("excluir");
  const podeRegistrar = usePode("registrar");
  const podeDecidir = usePode("decidir");
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

  async function excluir() {
    if (!confirm(`Excluir definitivamente esta ocorrência${o.protocolo ? ` (protocolo ${o.protocolo})` : ""}? Esta ação não pode ser desfeita.`)) return;
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
        {novo && <Aviso tipo="sucesso" titulo="Relatório gerado com sucesso">{o.protocolo ? `Protocolo ${o.protocolo}.` : "Sem protocolo informado."}</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <div className="grid grid-cols-2 gap-2">
          <Botao onClick={pdf} disabled={gerando} className="col-span-1">
            {gerando ? "Gerando..." : "Gerar PDF"}
          </Botao>
          <Botao variante="secundario" onClick={() => window.print()}>Imprimir</Botao>
          {podeEditar && <BotaoLink href={`/ocorrencias/${o.id}/editar`} variante="secundario">Editar</BotaoLink>}
          {podeRegistrar && <BotaoLink href={`/ocorrencias/nova?duplicar=${o.id}`} variante="secundario">Duplicar</BotaoLink>}
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{o.protocolo ? `Protocolo ${o.protocolo}` : "Sem protocolo"}</span>
            <SeloStatus status={o.status} />
          </div>
          {o.registradoPor && (
            <p className="text-xs text-gray-500">
              Registrada por <strong className="text-gray-700">{o.registradoPor.nome}</strong> em {new Date(o.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          )}
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
                      <span>
                        confirmada em {new Date(f!.confirmadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        {f!.confirmadoPor ? ` por ${f!.confirmadoPor.nome}` : ""}
                      </span>
                    </div>
                    {f!.revisaoPendente && (
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        Atenção: no momento do vínculo, o texto desta norma estava marcado para revisão manual (leitura incerta do PDF). Confira o
                        documento original antes de decidir a providência.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <BotaoLink href="/historico" variante="fantasma">← Histórico</BotaoLink>
          {podeExcluir && <Botao variante="fantasma" className="!text-red-700 hover:!bg-red-50" onClick={excluir}>Excluir</Botao>}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        {reincidencias && (
          <PainelProvidencia
            key={o.atualizadoEm}
            ocorrencia={o}
            podeDecidir={podeDecidir}
            valorTaxa={configuracoes.valorTaxa}
            prazoEsclarecimentoDias={configuracoes.prazoEsclarecimentoDias}
            reincidencias={reincidencias}
            aoAtualizar={(salvo) => {
              setO(salvo);
              router.refresh();
            }}
          />
        )}
        <div className="overflow-x-auto">
          <FolhaRelatorio r={conteudo} />
        </div>
      </div>
    </div>
  );
}
