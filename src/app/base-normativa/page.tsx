"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-cliente";
import { pesquisarNormas } from "@/lib/analysis/engine";
import { CATEGORIAS } from "@/lib/analysis/categorias";
import { citacaoCompleta, rotuloDispositivo } from "@/lib/citacao";
import { compararNormas } from "@/lib/ordenacao";
import { DOCUMENTO_NOME, type DocumentoTipo, type Norma } from "@/lib/types";
import { INTRODUCAO_DOCUMENTO, SECOES, caputSecao } from "@/data/normas";
import { AreaTexto, Aviso, Botao, Campo, Carregando, Entrada, Modal, Selecao } from "@/components/ui";

const PARAGRAFO_ID: Record<string, string> = {
  "Parágrafo único": "pu",
  "Parágrafo Primeiro": "p1",
  "Parágrafo Segundo": "p2",
  "Parágrafo Terceiro": "p3",
  "Parágrafo Quarto": "p4",
  "Parágrafo Quinto": "p5",
};

/** Mesmo padrão de identificador usado na base original (ex.: RI-II-8, ES-58-p2). */
function gerarId(n: Norma): string {
  const partes =
    n.documento === "ESTATUTO"
      ? ["ES", n.artigo, n.alinea, n.paragrafo ? PARAGRAFO_ID[n.paragrafo] : ""]
      : ["RI", n.secaoNumero, n.subitem || n.item];
  return partes.filter(Boolean).join("-");
}

const novaNorma = (documento: DocumentoTipo): Norma => ({
  id: "",
  documento,
  secaoNumero: "",
  secaoTitulo: "",
  texto: "",
  palavrasChave: [],
  categorias: [],
  aplicavelOcorrencias: true,
  ativo: true,
});

export default function BaseNormativa() {
  const [normas, setNormas] = useState<Norma[] | null>(null);
  const [documento, setDocumento] = useState<DocumentoTipo>("REGULAMENTO");
  const [busca, setBusca] = useState("");
  const [somenteRevisao, setSomenteRevisao] = useState(false);
  const [somenteAplicaveis, setSomenteAplicaveis] = useState(false);
  const [editando, setEditando] = useState<{ norma: Norma; nova: boolean } | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = () => api.normas().then(setNormas).catch((e) => setErro(e.message));
  useEffect(() => {
    carregar();
  }, []);

  const doDocumento = useMemo(() => (normas ?? []).filter((n) => n.documento === documento), [normas, documento]);
  const pendentes = (normas ?? []).filter((n) => n.revisaoManual).length;

  const visiveis = useMemo(() => {
    // A pesquisa inclui normas inativas, para que possam ser encontradas e reativadas.
    let l = busca.trim() ? pesquisarNormas(busca, doDocumento.map((n) => ({ ...n, ativo: true }))).map((x) => doDocumento.find((n) => n.id === x.id)!) : [...doDocumento].sort(compararNormas);
    if (somenteRevisao) l = l.filter((n) => n.revisaoManual);
    if (somenteAplicaveis) l = l.filter((n) => n.aplicavelOcorrencias);
    return l;
  }, [doDocumento, busca, somenteRevisao, somenteAplicaveis]);

  const grupos = useMemo(() => {
    if (busca.trim()) return [{ numero: "", titulo: "Resultados da pesquisa", normas: visiveis }];
    return SECOES[documento]
      .map((s) => ({ ...s, normas: visiveis.filter((n) => n.secaoNumero === s.numero) }))
      .concat([{ numero: "?", titulo: "Outras seções", normas: visiveis.filter((n) => !SECOES[documento].some((s) => s.numero === n.secaoNumero)) }])
      .filter((g) => g.normas.length > 0);
  }, [visiveis, documento, busca]);

  async function excluir(n: Norma) {
    if (!confirm(`Excluir a norma "${citacaoCompleta(n)}"? Relatórios já emitidos mantêm o texto gravado.`)) return;
    try {
      await api.excluirNorma(n.id);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function restaurar() {
    if (!confirm("Restaurar a Base Normativa original extraída dos PDFs? Todas as edições, inclusões e exclusões de normas serão descartadas. Os relatórios já emitidos não são afetados.")) return;
    try {
      await api.restaurarNormas();
      await carregar();
      setMensagem("Base Normativa original restaurada.");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base normativa</h1>
          <p className="text-sm text-gray-600">Normas extraídas do Estatuto Social e do Regulamento Interno. Somente estas normas podem fundamentar relatórios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao onClick={() => setEditando({ norma: novaNorma(documento), nova: true })}>+ Nova norma</Botao>
          <Botao variante="secundario" onClick={restaurar}>Restaurar base original</Botao>
        </div>
      </div>

      {pendentes > 0 && (
        <Aviso tipo="alerta" titulo={`${pendentes} norma(s) com trecho sinalizado para revisão manual`}>
          O PDF original possui carimbos sobrepostos ao texto. Os trechos ilegíveis foram marcados e não foram completados por suposição.
          Confira no documento físico e corrija pelo botão “Editar”.{" "}
          <button type="button" className="font-semibold underline" onClick={() => setSomenteRevisao(true)}>Mostrar somente pendentes</button>
        </Aviso>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {mensagem && <Aviso tipo="sucesso">{mensagem}</Aviso>}

      <div className="flex gap-1 rounded-xl bg-gray-200/70 p-1">
        {(["REGULAMENTO", "ESTATUTO"] as DocumentoTipo[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDocumento(d)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide ${documento === d ? "bg-white text-marca-800 shadow-sm" : "text-gray-600"}`}
          >
            {DOCUMENTO_NOME[d]} <span className="font-normal normal-case text-gray-500">({(normas ?? []).filter((n) => n.documento === d).length})</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm italic text-gray-600">{INTRODUCAO_DOCUMENTO[documento]}</p>
        <Entrada placeholder="Pesquisar por texto, palavra-chave, categoria, número do artigo ou item..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={somenteRevisao} onChange={(e) => setSomenteRevisao(e.target.checked)} />
            Somente com revisão pendente
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={somenteAplicaveis} onChange={(e) => setSomenteAplicaveis(e.target.checked)} />
            Somente aplicáveis a ocorrências
          </label>
        </div>
      </div>

      {!normas && !erro && <Carregando />}
      {normas && grupos.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Nenhuma norma encontrada.</p>}

      {grupos.map((g) => (
        <section key={g.numero + g.titulo} className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-marca-800">
              {g.numero && g.numero !== "?" ? `${documento === "ESTATUTO" ? "Capítulo " : ""}${g.numero} – ` : ""}
              {g.titulo}
            </h2>
            {g.numero && caputSecao(documento, g.numero) && <p className="text-xs italic text-gray-600">{caputSecao(documento, g.numero)}</p>}
          </header>
          <ul className="divide-y divide-gray-100">
            {g.normas.map((n) => (
              <li key={n.id} className={`px-4 py-3 sm:px-5 ${n.ativo ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {rotuloDispositivo(n)}
                      {n.itemTitulo && n.documento === "REGULAMENTO" ? ` (${n.itemTitulo})` : ""}
                    </span>
                    {busca && <span className="text-xs text-gray-500">{citacaoCompleta(n)}</span>}
                    {n.revisaoManual && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">Revisar texto</span>}
                    {!n.aplicavelOcorrencias && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Institucional</span>}
                    {!n.ativo && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">Inativa</span>}
                    {n.pagina && <span className="text-xs text-gray-400">pág. {n.pagina}</span>}
                  </div>
                  <div className="flex gap-1">
                    <Botao variante="fantasma" className="!px-2 !py-1 text-xs" onClick={() => setEditando({ norma: n, nova: false })}>Editar</Botao>
                    <Botao variante="fantasma" className="!px-2 !py-1 text-xs !text-red-700 hover:!bg-red-50" onClick={() => excluir(n)}>Excluir</Botao>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800">{n.texto}</p>
                {n.observacaoRevisao && <p className="mt-1 text-xs text-amber-700">⚠ {n.observacaoRevisao}</p>}
                {(n.categorias.length > 0 || n.palavrasChave.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {n.categorias.map((c) => (
                      <span key={c} className="rounded-full bg-marca-100 px-2 py-0.5 text-xs font-medium text-marca-800">{c}</span>
                    ))}
                    {n.palavrasChave.map((k) => (
                      <span key={k} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{k}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editando && (
        <EditorNorma
          inicial={editando.norma}
          nova={editando.nova}
          idsExistentes={(normas ?? []).map((n) => n.id)}
          aoFechar={() => setEditando(null)}
          aoSalvar={async () => {
            setEditando(null);
            await carregar();
            setMensagem("Norma salva.");
          }}
        />
      )}
    </div>
  );
}

function EditorNorma({ inicial, nova, idsExistentes, aoFechar, aoSalvar }: { inicial: Norma; nova: boolean; idsExistentes: string[]; aoFechar: () => void; aoSalvar: () => void }) {
  const [n, setN] = useState<Norma>(inicial);
  const [palavras, setPalavras] = useState(inicial.palavrasChave.join(", "));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = <K extends keyof Norma>(k: K, v: Norma[K]) => setN((x) => ({ ...x, [k]: v }));
  const secoes = SECOES[n.documento];
  const estatuto = n.documento === "ESTATUTO";

  async function salvar() {
    setErro("");
    const norma: Norma = {
      ...n,
      palavrasChave: palavras.split(",").map((p) => p.trim()).filter(Boolean),
    };
    if (nova) {
      norma.id = gerarId(norma);
      if (idsExistentes.includes(norma.id)) {
        setErro(`Já existe uma norma com esta numeração (${norma.id}). Edite a existente.`);
        return;
      }
    }
    setSalvando(true);
    try {
      await api.salvarNorma(norma);
      aoSalvar();
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  return (
    <Modal aberto aoFechar={aoFechar} titulo={nova ? "Nova norma" : `Editar – ${citacaoCompleta(inicial)}`} largura="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-6">
        <Campo rotulo="Documento" className="sm:col-span-3">
          <Selecao value={n.documento} disabled={!nova} onChange={(e) => setN({ ...novaNorma(e.target.value as DocumentoTipo), texto: n.texto })}>
            <option value="REGULAMENTO">{DOCUMENTO_NOME.REGULAMENTO}</option>
            <option value="ESTATUTO">{DOCUMENTO_NOME.ESTATUTO}</option>
          </Selecao>
        </Campo>
        <Campo rotulo={estatuto ? "Capítulo" : "Tópico / seção"} obrigatorio className="sm:col-span-3">
          <Selecao
            value={n.secaoNumero}
            onChange={(e) => {
              const s = secoes.find((x) => x.numero === e.target.value);
              setN((x) => ({ ...x, secaoNumero: e.target.value, secaoTitulo: s?.titulo ?? "" }));
            }}
          >
            <option value="">Selecione...</option>
            {secoes.map((s) => (
              <option key={s.numero} value={s.numero}>{s.numero} – {s.titulo}</option>
            ))}
          </Selecao>
        </Campo>
        {estatuto ? (
          <>
            <Campo rotulo="Artigo" obrigatorio className="sm:col-span-2"><Entrada value={n.artigo ?? ""} disabled={!nova} onChange={(e) => set("artigo", e.target.value)} /></Campo>
            <Campo rotulo="Alínea" className="sm:col-span-2"><Entrada value={n.alinea ?? ""} disabled={!nova} onChange={(e) => set("alinea", e.target.value || undefined)} placeholder="a, b, c..." /></Campo>
            <Campo rotulo="Parágrafo" className="sm:col-span-2">
              <Selecao value={n.paragrafo ?? ""} disabled={!nova} onChange={(e) => set("paragrafo", e.target.value || undefined)}>
                <option value="">— caput —</option>
                {["Parágrafo único", "Parágrafo Primeiro", "Parágrafo Segundo", "Parágrafo Terceiro", "Parágrafo Quarto", "Parágrafo Quinto"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Selecao>
            </Campo>
          </>
        ) : (
          <>
            <Campo rotulo="Item" className="sm:col-span-2"><Entrada value={n.item ?? ""} disabled={!nova} onChange={(e) => set("item", e.target.value || undefined)} placeholder="8" /></Campo>
            <Campo rotulo="Subitem" className="sm:col-span-2"><Entrada value={n.subitem ?? ""} disabled={!nova} onChange={(e) => set("subitem", e.target.value || undefined)} placeholder="1.2.7" /></Campo>
            <Campo rotulo="Título do item" className="sm:col-span-2"><Entrada value={n.itemTitulo ?? ""} onChange={(e) => set("itemTitulo", e.target.value || undefined)} placeholder="Ex.: Lago" /></Campo>
          </>
        )}
        {!nova && <p className="text-xs text-gray-500 sm:col-span-6">A numeração de uma norma existente não pode ser alterada (preserva a rastreabilidade dos relatórios). Para outra numeração, cadastre uma nova norma.</p>}
        <Campo rotulo="Texto integral da regra (exatamente como no documento)" obrigatorio className="sm:col-span-6">
          <AreaTexto rows={6} value={n.texto} onChange={(e) => set("texto", e.target.value)} />
        </Campo>
        <Campo rotulo="Palavras-chave (separadas por vírgula)" className="sm:col-span-6" ajuda="Termos que o funcionário costuma usar para esta situação.">
          <Entrada value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="sossego, barulho, som alto, 22h" />
        </Campo>
        <div className="sm:col-span-6">
          <span className="mb-1 block text-sm font-medium text-gray-700">Categorias de ocorrência</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => {
              const marcada = n.categorias.includes(c.nome);
              return (
                <button
                  key={c.nome}
                  type="button"
                  onClick={() => set("categorias", marcada ? n.categorias.filter((x) => x !== c.nome) : [...n.categorias, c.nome])}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${marcada ? "bg-marca-700 text-white ring-marca-700" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"}`}
                >
                  {c.nome}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2 text-sm sm:col-span-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={n.aplicavelOcorrencias} onChange={(e) => set("aplicavelOcorrencias", e.target.checked)} />
            Pode ser sugerida automaticamente como fundamentação de ocorrências
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={n.ativo} onChange={(e) => set("ativo", e.target.checked)} />
            Norma ativa
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={!!n.revisaoManual} onChange={(e) => set("revisaoManual", e.target.checked || undefined)} />
            Texto pendente de revisão manual
          </label>
        </div>
        {n.revisaoManual && (
          <Campo rotulo="Observação da revisão" className="sm:col-span-6">
            <Entrada value={n.observacaoRevisao ?? ""} onChange={(e) => set("observacaoRevisao", e.target.value || undefined)} />
          </Campo>
        )}
      </div>
      {erro && <div className="mt-4"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="mt-6 flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
        <Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar norma"}</Botao>
      </div>
    </Modal>
  );
}
