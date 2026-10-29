import Link from "next/link";
import { repositorio } from "@/server/db";
import { exigirPagina } from "@/server/pagina";
import { formatarReais, type Alerta } from "@/lib/providencia";
import { comAlertas } from "@/lib/consulta";
import { dataCurta, hojeISO } from "@/lib/relatorio";
import { ESCLARECIMENTO_LABEL, PROVIDENCIA_LABEL, type Ocorrencia } from "@/lib/types";
import { SeloStatus } from "@/components/ui";

export const dynamic = "force-dynamic";

const TEXTO_ALERTA: Record<Alerta["tipo"], (d: number) => string> = {
  "esclarecimento-vencido": (d) => `Esclarecimento vencido há ${d} dia(s), sem resultado registrado`,
  "esclarecimento-vencendo": (d) => (d === 0 ? "Prazo de esclarecimento vence hoje" : `Prazo de esclarecimento vence em ${d} dia(s)`),
  "recurso-aberto": (d) => `Prazo de recurso em aberto (${d} dia(s) restantes)`,
};

function Linha({ o, detalhe }: { o: Ocorrencia; detalhe?: string }) {
  return (
    <li>
      <Link href={`/ocorrencias/${o.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-gray-50">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{o.ocorrencia}</span>
          <span className="block truncate text-xs text-gray-500">
            {o.protocolo || "Sem protocolo"} · {dataCurta(o.data)} · {o.nome} · Q{o.quadra} L{o.lote}
            {o.registradoPor ? ` · por ${o.registradoPor.nome}` : ""}
          </span>
          {detalhe && <span className="block truncate text-xs font-medium text-amber-800">{detalhe}</span>}
        </span>
        <SeloStatus status={o.status} />
      </Link>
    </li>
  );
}

function Secao({ titulo, vazio, children, acao }: { titulo: string; vazio: string; children: React.ReactNode[]; acao?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children.length === 0 ? <p className="py-2 text-sm text-gray-500">{vazio}</p> : <ul className="divide-y divide-gray-100">{children}</ul>}
    </section>
  );
}

export default async function PainelProvidencias() {
  const usuario = await exigirPagina("painel");
  const repo = repositorio();
  const hoje = hojeISO();
  // Contagens no banco; só as listas exibidas são carregadas.
  const [resumo, pendentesPagina, acompanhamento] = await Promise.all([
    repo.resumoProvidencias(hoje),
    repo.buscarOcorrencias({ pendentes: true }, 1, 30, { crescente: true }),
    repo.listarEmAcompanhamento(hoje),
  ]);
  const pendentes = pendentesPagina.itens;
  const comAlerta = comAlertas(acompanhamento, hoje);
  const vencidos = comAlerta.filter((x) => x.alertas.some((a) => a.tipo === "esclarecimento-vencido")).length;
  const resultados = (["PENDENTE", "ESCLARECEU", "NAO_ESCLARECEU"] as const).map((r) => ({ r, n: resumo.notificacoes[r] }));
  const porTipo = resumo.porTipo.map((x) => ({ t: x.tipo, total: x.total, mes: x.mes }));
  const listaAutores = resumo.autores.map((a) => ({ ...a, nome: a.nome || "Sem login (antes dos usuários)" }));

  const indicadores = [
    { rotulo: "Aguardando providência", valor: resumo.pendentes, cor: resumo.pendentes ? "text-amber-700" : "text-marca-800" },
    { rotulo: "Notificados aguardando esclarecimento", valor: resumo.notificacoes.PENDENTE, cor: "text-violet-700" },
    { rotulo: "Prazos de esclarecimento vencidos", valor: vencidos, cor: vencidos ? "text-red-700" : "text-marca-800" },
    { rotulo: "Multas no mês", valor: `${resumo.multas.mes} · ${formatarReais(resumo.multas.valorMes)}`, cor: "text-red-800" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providências</h1>
          <p className="text-sm text-gray-600">
            Acompanhamento dos relatórios: o que aguarda decisão, prazos de esclarecimento e recurso, multas e produção por líder.
            {usuario.perfil === "GERENTE" && " (Somente visualização.)"}
          </p>
        </div>
        <a
          href="/api/ocorrencias/exportar"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Exportar planilha (CSV)
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((k) => (
          <div key={k.rotulo} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 sm:text-sm">{k.rotulo}</div>
            <div className={`mt-1 text-xl font-bold sm:text-2xl ${k.cor}`}>{k.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo={`Aguardando providência (${resumo.pendentes})${resumo.pendentes > pendentes.length ? ` · ${pendentes.length} mais antigas` : ""}`} vazio="Nenhum relatório aguardando decisão.">
          {pendentes.map((o) => (
            <Linha key={o.id} o={o} detalhe={`Há ${Math.max(0, Math.round((Date.parse(hoje) - Date.parse(o.data)) / 86_400_000))} dia(s)`} />
          ))}
        </Secao>

        <Secao titulo="Prazos que exigem atenção" vazio="Nenhum prazo em aberto.">
          {comAlerta.slice(0, 30).map(({ o, alertas }) => (
            <Linha key={o.id} o={o} detalhe={alertas.map((a) => TEXTO_ALERTA[a.tipo](a.dias)).join(" · ")} />
          ))}
        </Secao>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Decisões</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-1">Providência</th>
                <th className="py-1 text-right">No mês</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {porTipo.map((x) => (
                <tr key={x.t}>
                  <td className="py-1.5">{PROVIDENCIA_LABEL[x.t]}</td>
                  <td className="py-1.5 text-right tabular-nums">{x.mes}</td>
                  <td className="py-1.5 text-right tabular-nums">{x.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">
            Total em multas: <strong>{formatarReais(resumo.multas.valorTotal)}</strong>
            {resumo.recursosEmAnalise > 0 && ` · ${resumo.recursosEmAnalise} recurso(s) em análise`}
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Notificações</h2>
          <ul className="space-y-2 text-sm">
            {resultados.map((x) => (
              <li key={x.r} className="flex justify-between">
                <span>{ESCLARECIMENTO_LABEL[x.r]}</span>
                <span className="font-semibold tabular-nums">{x.n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Relatórios por quem registrou</h2>
          {listaAutores.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum relatório.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-1">Nome</th>
                  <th className="py-1 text-right">Mês</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1 text-right" title="Aguardando providência">Pend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listaAutores.map((a) => (
                  <tr key={a.nome}>
                    <td className="max-w-[10rem] truncate py-1.5">{a.nome}</td>
                    <td className="py-1.5 text-right tabular-nums">{a.mes}</td>
                    <td className="py-1.5 text-right tabular-nums">{a.total}</td>
                    <td className="py-1.5 text-right tabular-nums">{a.pendentes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
