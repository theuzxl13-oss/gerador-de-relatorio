"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-cliente";
import { MENSAGEM_NAO_ENCONTRADO, type Candidato, type ResultadoAnalise } from "@/lib/analysis/engine";
import { criarSnapshot } from "@/lib/citacao";
import { dataCurta, hojeISO, paragrafoPrincipal } from "@/lib/relatorio";
import {
  STATUS_LABEL,
  TRATAMENTOS,
  type FundamentacaoSnapshot,
  type Genero,
  type Norma,
  type Ocorrencia,
  type StatusOcorrencia,
  type Tratamento,
} from "@/lib/types";
import { NormaDetalhe } from "./NormaDetalhe";
import { SeletorNorma } from "./SeletorNorma";
import { AreaTexto, Aviso, Botao, Campo, Cartao, Entrada, SeloConfianca, Selecao } from "./ui";

interface Selecionada {
  snapshot: FundamentacaoSnapshot;
  motivos?: string[];
}

interface Props {
  /** Ocorrência existente (edição). */
  existente?: Ocorrencia;
  /** Ocorrência de origem (duplicação): copia os dados, com nova data e novo protocolo. */
  modelo?: Ocorrencia;
  incluirTextoPadrao: boolean;
}

const EXIGE_GENERO: Tratamento[] = ["Visitante", "Outro"];

function agoraHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function FormularioOcorrencia({ existente, modelo, incluirTextoPadrao }: Props) {
  const router = useRouter();
  const base = existente ?? modelo;
  const data = existente?.data ?? hojeISO();

  const [ocorrencia, setOcorrencia] = useState(base?.ocorrencia ?? "");
  const [descricao, setDescricao] = useState(base?.descricao ?? "");
  const [nome, setNome] = useState(base?.nome ?? "");
  const [tratamento, setTratamento] = useState<Tratamento | "">(base?.tratamento ?? "");
  const [genero, setGenero] = useState<Genero | "">(base?.genero ?? "");
  const [tratamentoOutro, setTratamentoOutro] = useState(base?.tratamentoOutro ?? "");
  const [quadra, setQuadra] = useState(base?.quadra ?? "");
  const [lote, setLote] = useState(base?.lote ?? "");
  const [horario, setHorario] = useState(existente?.horario ?? "");
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? "");
  const [status, setStatus] = useState<StatusOcorrencia>(existente?.status ?? "REGISTRADA");
  const [incluirTexto, setIncluirTexto] = useState(base?.incluirTextoNorma ?? incluirTextoPadrao);

  const [erros, setErros] = useState<Record<string, string>>({});
  const [normas, setNormas] = useState<Norma[]>([]);
  const [analise, setAnalise] = useState<ResultadoAnalise | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [analiseDesatualizada, setAnaliseDesatualizada] = useState(false);
  const [principal, setPrincipal] = useState<Selecionada | null>(base?.fundamentacaoPrincipal ? { snapshot: base.fundamentacaoPrincipal } : null);
  const [complementar, setComplementar] = useState<Selecionada | null>(base?.fundamentacaoComplementar ? { snapshot: base.fundamentacaoComplementar } : null);
  const [semFundamentacao, setSemFundamentacao] = useState(!!base && !base.fundamentacaoPrincipal);
  const [seletor, setSeletor] = useState<null | "alterar" | "pesquisar">(null);
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const painelRef = useRef<HTMLDivElement>(null);

  const etapaFundamentacao = !!analise || !!principal || semFundamentacao;

  useEffect(() => {
    api.normas().then(setNormas).catch(() => setErroGeral("Não foi possível carregar a Base Normativa."));
  }, []);

  // Alterar a ocorrência após a análise exige nova pesquisa.
  const marcarAlteracao = () => analise && setAnaliseDesatualizada(true);

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!ocorrencia.trim()) e.ocorrencia = "Informe a ocorrência.";
    if (!nome.trim()) e.nome = "Informe o nome.";
    if (!tratamento) e.tratamento = "Selecione o tratamento.";
    if (!quadra.trim()) e.quadra = "Informe a quadra.";
    if (!lote.trim()) e.lote = "Informe o lote.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) e.horario = "Informe o horário (HH:MM).";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function pesquisarFundamentacao() {
    if (!validar()) return;
    setAnalisando(true);
    setErroGeral("");
    try {
      const r = await api.analisar({ ocorrencia, descricao, horario, data, tratamento: tratamento || undefined });
      setAnalise(r);
      setAnaliseDesatualizada(false);
      setSemFundamentacao(false);
      setPrincipal(r.principal ? { snapshot: criarSnapshot(r.principal.norma, "AUTOMATICA", r.principal.confianca), motivos: r.principal.motivos } : null);
      setComplementar(r.complementar ? { snapshot: criarSnapshot(r.complementar.norma, "AUTOMATICA", r.complementar.confianca), motivos: r.complementar.motivos } : null);
      setTimeout(() => painelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setErroGeral((e as Error).message);
    } finally {
      setAnalisando(false);
    }
  }

  function selecionarManual(norma: Norma, papel: "principal" | "complementar", candidato?: Candidato) {
    const sel: Selecionada = {
      snapshot: criarSnapshot(norma, candidato ? "AUTOMATICA" : "MANUAL", candidato?.confianca),
      motivos: candidato?.motivos,
    };
    if (papel === "principal") {
      setPrincipal(sel);
      if (complementar?.snapshot.normaId === norma.id) setComplementar(null);
    } else {
      if (principal?.snapshot.normaId === norma.id) return;
      setComplementar(sel);
    }
    setSemFundamentacao(false);
    setSeletor(null);
  }

  async function salvar(encaminharAnalise = false) {
    if (!validar()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!encaminharAnalise && !principal) return;
    setSalvando(true);
    setErroGeral("");
    const dados: Partial<Ocorrencia> = {
      data,
      horario,
      ocorrencia: ocorrencia.trim(),
      descricao: descricao.trim() || undefined,
      nome: nome.trim(),
      tratamento: tratamento as Tratamento,
      genero: EXIGE_GENERO.includes(tratamento as Tratamento) && genero ? genero : undefined,
      tratamentoOutro: tratamento === "Outro" ? tratamentoOutro.trim() || undefined : undefined,
      quadra: quadra.trim(),
      lote: lote.trim(),
      fundamentacaoPrincipal: encaminharAnalise ? undefined : principal?.snapshot,
      fundamentacaoComplementar: encaminharAnalise ? undefined : complementar?.snapshot,
      incluirTextoNorma: incluirTexto,
      observacoes: observacoes.trim() || undefined,
      status: encaminharAnalise ? "AGUARDANDO_ANALISE" : existente ? status : "REGISTRADA",
    };
    try {
      const salvo = existente ? await api.atualizarOcorrencia(existente.id, dados) : await api.criarOcorrencia(dados);
      router.push(`/ocorrencias/${salvo.id}${existente ? "" : "?novo=1"}`);
      router.refresh();
    } catch (e) {
      setErroGeral((e as Error).message);
      setSalvando(false);
    }
  }

  const previa =
    tratamento && principal
      ? paragrafoPrincipal({
          tratamento,
          genero: genero || undefined,
          tratamentoOutro,
          fundamentacaoPrincipal: principal.snapshot,
          fundamentacaoComplementar: complementar?.snapshot,
        })
      : "";

  const sugerida = analise?.complementarSugerida;
  const sugeridaMarcada = !!sugerida && complementar?.snapshot.normaId === sugerida.norma.id;

  return (
    <div className="space-y-6">
      <Cartao
        titulo={existente ? `Editar ocorrência – Protocolo ${existente.protocolo}` : "1. Dados da ocorrência"}
        acoes={
          <span className="text-sm text-gray-600">
            Data: <strong>{dataCurta(data)}</strong> {existente ? "(data do registro)" : "(automática)"} · Protocolo:{" "}
            <strong>{existente?.protocolo ?? "gerado ao salvar"}</strong>
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-6">
          <Campo rotulo="Ocorrência" obrigatorio erro={erros.ocorrencia} className="sm:col-span-6" ajuda='Descreva em linguagem simples. Ex.: "Perturbação de sossego", "Material de construção na calçada".'>
            <Entrada
              autoFocus={!existente}
              value={ocorrencia}
              onChange={(e) => {
                setOcorrencia(e.target.value);
                marcarAlteracao();
              }}
              placeholder="Ex.: Som alto depois das 22h"
              maxLength={200}
            />
          </Campo>
          <Campo rotulo="Nome" obrigatorio erro={erros.nome} className="sm:col-span-4">
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cristiane Fregonezi" maxLength={200} autoComplete="off" />
          </Campo>
          <Campo rotulo="Tratamento" obrigatorio erro={erros.tratamento} className="sm:col-span-2" ajuda="Define o texto: “o associado citado” / “a associada citada”.">
            <Selecao
              value={tratamento}
              onChange={(e) => {
                setTratamento(e.target.value as Tratamento);
                marcarAlteracao();
              }}
            >
              <option value="">Selecione...</option>
              {TRATAMENTOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Selecao>
          </Campo>
          {tratamento === "Outro" && (
            <Campo rotulo="Especifique" className="sm:col-span-3" ajuda="Ex.: prestador de serviço, inquilino, corretor">
              <Entrada value={tratamentoOutro} onChange={(e) => setTratamentoOutro(e.target.value)} maxLength={60} />
            </Campo>
          )}
          {EXIGE_GENERO.includes(tratamento as Tratamento) && (
            <Campo rotulo="Gênero (para o texto)" className="sm:col-span-3">
              <Selecao value={genero} onChange={(e) => setGenero(e.target.value as Genero)}>
                <option value="">Não informar – o(a)</option>
                <option value="M">Masculino – o ... citado</option>
                <option value="F">Feminino – a ... citada</option>
              </Selecao>
            </Campo>
          )}
          <Campo rotulo="Quadra" obrigatorio erro={erros.quadra} className="sm:col-span-2">
            <Entrada value={quadra} onChange={(e) => setQuadra(e.target.value)} placeholder="09" inputMode="numeric" maxLength={10} />
          </Campo>
          <Campo rotulo="Lote" obrigatorio erro={erros.lote} className="sm:col-span-2">
            <Entrada value={lote} onChange={(e) => setLote(e.target.value)} placeholder="08" inputMode="numeric" maxLength={10} />
          </Campo>
          <Campo rotulo="Horário da ocorrência" obrigatorio erro={erros.horario} className="sm:col-span-2">
            <div className="flex gap-2">
              <Entrada
                type="time"
                value={horario}
                onChange={(e) => {
                  setHorario(e.target.value);
                  marcarAlteracao();
                }}
              />
              <Botao variante="secundario" className="shrink-0 !px-3" onClick={() => setHorario(agoraHHMM())} title="Usar o horário atual">
                Agora
              </Botao>
            </div>
          </Campo>
          <Campo rotulo="Descrição complementar (opcional)" className="sm:col-span-6" ajuda="Detalhes ajudam a localizar a regra correta e aparecem no relatório.">
            <AreaTexto
              rows={2}
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                marcarAlteracao();
              }}
              maxLength={4000}
            />
          </Campo>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Botao onClick={pesquisarFundamentacao} disabled={analisando} className="w-full sm:w-auto">
            {analisando ? "Pesquisando..." : etapaFundamentacao ? "Pesquisar fundamentação novamente" : "Pesquisar fundamentação"}
          </Botao>
          {!etapaFundamentacao && (
            <Botao variante="secundario" onClick={() => validar() && setSeletor("pesquisar")} className="w-full sm:w-auto">
              Selecionar regra manualmente
            </Botao>
          )}
        </div>
      </Cartao>

      {erroGeral && <Aviso tipo="erro" titulo="Não foi possível concluir">{erroGeral}</Aviso>}

      {etapaFundamentacao && (
        <div ref={painelRef} className="scroll-mt-24">
          <Cartao titulo="2. Fundamentação">
            {analiseDesatualizada && (
              <div className="mb-4">
                <Aviso tipo="alerta" titulo="Os dados da ocorrência foram alterados">
                  Clique em “Pesquisar fundamentação novamente” para atualizar a análise.
                </Aviso>
              </div>
            )}

            {analise && analise.alertas.length > 0 && (
              <div className="mb-4 space-y-2">
                {analise.alertas.map((a) => (
                  <Aviso key={a} tipo="alerta">{a}</Aviso>
                ))}
              </div>
            )}

            {principal ? (
              <div className="space-y-5">
                <div className="rounded-xl border-2 border-marca-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-marca-800">
                      {principal.snapshot.origem === "MANUAL" ? "Fundamentação selecionada manualmente" : "Fundamentação encontrada"}
                      {complementar ? " – principal" : ""}
                    </h3>
                    <SeloConfianca confianca={principal.snapshot.origem === "MANUAL" ? undefined : principal.snapshot.confianca} />
                  </div>
                  <NormaDetalhe norma={principal.snapshot} />
                  {principal.motivos && principal.motivos.length > 0 && (
                    <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
                      {principal.motivos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {complementar && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Fundamentação complementar</h3>
                      <div className="flex items-center gap-2">
                        <SeloConfianca confianca={complementar.snapshot.origem === "MANUAL" ? undefined : complementar.snapshot.confianca} />
                        <Botao variante="fantasma" className="!py-1" onClick={() => setComplementar(null)}>
                          Remover
                        </Botao>
                      </div>
                    </div>
                    <NormaDetalhe norma={complementar.snapshot} compacto />
                  </div>
                )}

                {sugerida && !complementar && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-gray-300 p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-marca-700"
                      checked={sugeridaMarcada}
                      onChange={(e) =>
                        setComplementar(e.target.checked ? { snapshot: criarSnapshot(sugerida.norma, "MANUAL"), motivos: sugerida.motivos } : null)
                      }
                    />
                    <span>
                      <strong>Adicionar fundamentação complementar do Estatuto Social (opcional):</strong> Artigo 11, alínea &quot;a&quot; – dever dos
                      associados de cumprir e fazer cumprir as disposições do Estatuto e dos regulamentos internos.
                    </span>
                  </label>
                )}

                <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:flex-wrap">
                  <Botao variante="sucesso" onClick={() => salvar(false)} disabled={salvando || analiseDesatualizada}>
                    {salvando ? "Salvando..." : existente ? "Confirmar e salvar alterações" : "Confirmar e gerar relatório"}
                  </Botao>
                  <Botao variante="secundario" onClick={() => setSeletor("alterar")}>Alterar fundamentação</Botao>
                  <Botao variante="secundario" onClick={() => setSeletor("pesquisar")}>Pesquisar outra regra</Botao>
                  <Botao variante="fantasma" onClick={() => salvar(true)} disabled={salvando}>
                    Encaminhar para análise sem fundamentação
                  </Botao>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Aviso tipo="alerta" titulo="Fundamentação não localizada automaticamente.">
                  {MENSAGEM_NAO_ENCONTRADO}
                </Aviso>
                {analise && analise.candidatos.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-gray-600">
                      Normas com relação fraca com a ocorrência (confiança baixa). Use somente se, após leitura, a regra realmente se aplicar:
                    </p>
                    <Botao variante="secundario" onClick={() => setSeletor("alterar")}>
                      Ver {analise.candidatos.length} norma(s) com baixa confiança
                    </Botao>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Botao onClick={() => setSeletor("pesquisar")}>Pesquisar e selecionar manualmente</Botao>
                  <Botao variante="secundario" onClick={() => salvar(true)} disabled={salvando}>
                    {salvando ? "Salvando..." : "Encaminhar para análise da Administração"}
                  </Botao>
                </div>
              </div>
            )}
          </Cartao>
        </div>
      )}

      {etapaFundamentacao && (
        <Cartao titulo="3. Relatório">
          <div className="space-y-4">
            {previa && (
              <div>
                <div className="mb-1 text-sm font-medium text-gray-500">Prévia do texto</div>
                <p className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed">{previa}</p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={incluirTexto} onChange={(e) => setIncluirTexto(e.target.checked)} />
              Transcrever o texto da regra no relatório
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Observações internas (opcional)" className="sm:col-span-2" ajuda="Impressas no campo de observações do relatório.">
                <AreaTexto rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={4000} />
              </Campo>
              {existente && (
                <Campo rotulo="Status">
                  <Selecao value={status} onChange={(e) => setStatus(e.target.value as StatusOcorrencia)}>
                    {Object.entries(STATUS_LABEL).map(([v, r]) => (
                      <option key={v} value={v}>{r}</option>
                    ))}
                  </Selecao>
                </Campo>
              )}
            </div>
          </div>
        </Cartao>
      )}

      <SeletorNorma
        aberto={seletor !== null}
        aoFechar={() => setSeletor(null)}
        normas={normas}
        candidatos={seletor === "alterar" ? analise?.candidatos : undefined}
        titulo={seletor === "alterar" ? "Alterar fundamentação" : "Pesquisar regra na Base Normativa"}
        aoSelecionar={selecionarManual}
        permitirComplementar={!!principal}
      />
    </div>
  );
}
