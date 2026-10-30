"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-cliente";
import type { Pagina } from "@/lib/consulta";
import { gerarPdf } from "@/lib/pdf";
import { dataCurta, montarRelatorio } from "@/lib/relatorio";
import { DOCUMENTO_NOME, STATUS_LABEL, type Configuracoes, type DocumentoTipo, type Ocorrencia, type StatusOcorrencia } from "@/lib/types";
import { nomeArquivoPdf } from "@/components/VisualizarRelatorio";
import { usePode } from "@/components/UsuarioContexto";
import { Aviso, Botao, BotaoLink, Campo, Carregando, Entrada, SeloStatus, Selecao } from "@/components/ui";

interface Filtros {
  busca: string;
  nome: string;
  quadra: string;
  lote: string;
  ocorrencia: string;
  de: string;
  ate: string;
  dispositivo: string;
  documento: DocumentoTipo | "" | "SEM";
  status: StatusOcorrencia | "";
}

const VAZIO: Filtros = { busca: "", nome: "", quadra: "", lote: "", ocorrencia: "", de: "", ate: "", dispositivo: "", documento: "", status: "" };

const POR_PAGINA = 25;

function fundamentacaoCurta(o: Ocorrencia) {
  if (!o.fundamentacaoPrincipal) return "—";
  return [o.fundamentacaoPrincipal.citacaoCurta, o.fundamentacaoComplementar?.citacaoCurta].filter(Boolean).join(" + ");
}

export default function Historico() {
  const podeEditar = usePode("editarOcorrencia");
  const podeExcluir = usePode("excluir");
  const podeRegistrar = usePode("registrar");
  const verTodas = usePode("verTodas");
  const [pagina, setPagina] = useState<Pagina<Ocorrencia> | null>(null);
  const [numPagina, setNumPagina] = useState(1);
  const [cfg, setCfg] = useState<Configuracoes | null>(null);
  const [f, setF] = useState<Filtros>(VAZIO);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    api.configuracoes().then(setCfg).catch((e) => setErro(e.message));
  }, []);

  // Filtros e paginação são aplicados no servidor (espera a pessoa parar de digitar).
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const t = setTimeout(() => {
      api
        .ocorrencias({ ...f, pagina: numPagina, porPagina: POR_PAGINA })
        .then((r) => {
          if (cancelado) return;
          setPagina(r);
          setErro("");
        })
        .catch((e) => !cancelado && setErro(e.message))
        .finally(() => !cancelado && setCarregando(false));
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [f, numPagina, recarregar]);

  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => {
    setNumPagina(1);
    setF((x) => ({ ...x, [k]: v }));
  };
  const filtradas = pagina?.itens ?? [];
  const totalPaginas = pagina ? Math.max(1, Math.ceil(pagina.total / pagina.porPagina)) : 1;

  const filtrosAtivos = Object.entries(f).filter(([k, v]) => k !== "busca" && v).length;

  async function excluir(o: Ocorrencia) {
    if (!confirm(`Excluir definitivamente a ocorrência ${o.protocolo ? `${o.protocolo} ` : ""}(${o.ocorrencia} – ${o.nome})?`)) return;
    try {
      await api.excluirOcorrencia(o.id);
      setRecarregar((n) => n + 1);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function pdf(o: Ocorrencia) {
    if (!cfg) return;
    setGerandoPdf(o.id);
    try {
      await gerarPdf(montarRelatorio(o, cfg), nomeArquivoPdf(o));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerandoPdf(null);
    }
  }

  const Acoes = ({ o }: { o: Ocorrencia }) => (
    <div className="flex flex-wrap gap-1">
      <Link className="rounded px-2 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50" href={`/ocorrencias/${o.id}`}>Visualizar</Link>
      {podeEditar && <Link className="rounded px-2 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50" href={`/ocorrencias/${o.id}/editar`}>Editar</Link>}
      <Link className="rounded px-2 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50" href={`/ocorrencias/${o.id}?imprimir=1`}>Imprimir</Link>
      <button type="button" className="rounded px-2 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50 disabled:opacity-50" disabled={gerandoPdf === o.id} onClick={() => pdf(o)}>
        {gerandoPdf === o.id ? "Gerando..." : "PDF"}
      </button>
      {podeRegistrar && <Link className="rounded px-2 py-1 text-xs font-medium text-marca-700 hover:bg-marca-50" href={`/ocorrencias/nova?duplicar=${o.id}`}>Duplicar</Link>}
      {podeExcluir && <button type="button" className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => excluir(o)}>Excluir</button>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de ocorrências</h1>
          <p className="text-sm text-gray-600">
            {pagina ? `${pagina.total} registro(s)${verTodas ? "" : " gerados por você"}` : "Carregando registros..."}
          </p>
        </div>
        <BotaoLink href="/ocorrencias/nova">+ Nova ocorrência</BotaoLink>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Entrada placeholder="Pesquisar por protocolo, nome, ocorrência, quadra/lote, artigo/item..." value={f.busca} onChange={(e) => set("busca", e.target.value)} />
          <Botao variante="secundario" onClick={() => setMostrarFiltros((v) => !v)} className="shrink-0">
            Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ""}
          </Botao>
          {(filtrosAtivos > 0 || f.busca) && (
            <Botao variante="fantasma" onClick={() => { setNumPagina(1); setF(VAZIO); }} className="shrink-0">Limpar</Botao>
          )}
        </div>
        {mostrarFiltros && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Nome"><Entrada value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Quadra"><Entrada value={f.quadra} onChange={(e) => set("quadra", e.target.value)} inputMode="numeric" /></Campo>
              <Campo rotulo="Lote"><Entrada value={f.lote} onChange={(e) => set("lote", e.target.value)} inputMode="numeric" /></Campo>
            </div>
            <Campo rotulo="Ocorrência"><Entrada value={f.ocorrencia} onChange={(e) => set("ocorrencia", e.target.value)} /></Campo>
            <Campo rotulo="Artigo / item"><Entrada value={f.dispositivo} onChange={(e) => set("dispositivo", e.target.value)} placeholder="Ex.: item 8, art. 11, II" /></Campo>
            <Campo rotulo="Período – de"><Entrada type="date" value={f.de} onChange={(e) => set("de", e.target.value)} /></Campo>
            <Campo rotulo="Período – até"><Entrada type="date" value={f.ate} onChange={(e) => set("ate", e.target.value)} /></Campo>
            <Campo rotulo="Documento">
              <Selecao value={f.documento} onChange={(e) => set("documento", e.target.value as Filtros["documento"])}>
                <option value="">Todos</option>
                <option value="REGULAMENTO">{DOCUMENTO_NOME.REGULAMENTO}</option>
                <option value="ESTATUTO">{DOCUMENTO_NOME.ESTATUTO}</option>
                <option value="ATA">{DOCUMENTO_NOME.ATA}</option>
                <option value="SEM">Sem fundamentação</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Status">
              <Selecao value={f.status} onChange={(e) => set("status", e.target.value as Filtros["status"])}>
                <option value="">Todos</option>
                {Object.entries(STATUS_LABEL).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </Selecao>
            </Campo>
          </div>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!pagina && !erro && <Carregando />}

      {pagina && !carregando && filtradas.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">Nenhuma ocorrência encontrada.</div>
      )}

      {filtradas.length > 0 && (
        <>
          {/* Tabela (telas grandes) */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Protocolo</th>
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">Q</th>
                  <th className="px-3 py-3">L</th>
                  <th className="px-3 py-3">Ocorrência</th>
                  <th className="px-3 py-3">Fundamentação</th>
                  <th className="px-3 py-3">Horário</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map((o) => (
                  <tr key={o.id} className="align-top hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-2.5">{dataCurta(o.data)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                      <Link href={`/ocorrencias/${o.id}`} className="text-marca-700 hover:underline">{o.protocolo || "—"}</Link>
                    </td>
                    <td className="px-3 py-2.5">{o.nome}<div className="text-xs text-gray-500">{o.tratamento === "Outro" ? o.tratamentoOutro || "Outro" : o.tratamento}</div></td>
                    <td className="px-3 py-2.5">{o.quadra}</td>
                    <td className="px-3 py-2.5">{o.lote}</td>
                    <td className="px-3 py-2.5">{o.ocorrencia}</td>
                    <td className="px-3 py-2.5 text-xs">{fundamentacaoCurta(o)}</td>
                    <td className="px-3 py-2.5">{o.horario}</td>
                    <td className="px-3 py-2.5"><SeloStatus status={o.status} /></td>
                    <td className="px-3 py-2"><Acoes o={o} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartões (celular e tablet) */}
          <ul className="space-y-3 lg:hidden">
            {filtradas.map((o) => (
              <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/ocorrencias/${o.id}`} className="min-w-0">
                    <div className="font-semibold text-gray-900">{o.ocorrencia}</div>
                    <div className="text-sm text-gray-600">{o.nome} · Q{o.quadra} L{o.lote}</div>
                  </Link>
                  <SeloStatus status={o.status} />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {o.protocolo || "Sem protocolo"} · {dataCurta(o.data)} às {o.horario} · {fundamentacaoCurta(o)}
                </div>
                <div className="mt-2 border-t border-gray-100 pt-2"><Acoes o={o} /></div>
              </li>
            ))}
          </ul>
          <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Páginas">
            <Botao variante="secundario" disabled={numPagina <= 1 || carregando} onClick={() => setNumPagina((n) => n - 1)}>← Anterior</Botao>
            <span className="text-gray-600" aria-live="polite">
              Página {pagina?.pagina ?? numPagina} de {totalPaginas}
              {carregando ? " · atualizando..." : ""}
            </span>
            <Botao variante="secundario" disabled={numPagina >= totalPaginas || carregando} onClick={() => setNumPagina((n) => n + 1)}>Próxima →</Botao>
          </nav>
        </>
      )}
    </div>
  );
}
