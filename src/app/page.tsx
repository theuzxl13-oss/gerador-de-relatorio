import Link from "next/link";
import { repositorio } from "@/server/db";
import { hojeISO, dataCurta } from "@/lib/relatorio";
import { normalizar } from "@/lib/analysis/texto";
import { SeloStatus } from "@/components/ui";

export const dynamic = "force-dynamic";

const ATALHOS = [
  { href: "/ocorrencias/nova", titulo: "Nova ocorrência", texto: "Registrar e gerar relatório", destaque: true, icone: "M12 5v14M5 12h14" },
  { href: "/historico", titulo: "Histórico", texto: "Consultar, imprimir e editar", icone: "M4 6h16M4 12h16M4 18h10" },
  { href: "/base-normativa", titulo: "Base normativa", texto: "Estatuto e Regulamento", icone: "M6 4h9l3 3v13H6zM9 10h6M9 14h6" },
  { href: "/configuracoes", titulo: "Configurações", texto: "Dados do relatório e sistema", icone: "M12 8a4 4 0 100 8 4 4 0 000-8zM4 12h2M18 12h2M12 4v2M12 18v2" },
];

export default async function Inicio() {
  const ocorrencias = await repositorio().listarOcorrencias();
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);

  const totalHoje = ocorrencias.filter((o) => o.data === hoje).length;
  const totalMes = ocorrencias.filter((o) => o.data.startsWith(mes)).length;

  const contagem = new Map<string, { rotulo: string; n: number }>();
  for (const o of ocorrencias) {
    const chave = normalizar(o.ocorrencia);
    const atual = contagem.get(chave) ?? { rotulo: o.ocorrencia, n: 0 };
    atual.n++;
    contagem.set(chave, atual);
  }
  const frequentes = [...contagem.values()].sort((a, b) => b.n - a.n).slice(0, 6);
  const maxFreq = frequentes[0]?.n ?? 1;
  const recentes = ocorrencias.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel de ocorrências</h1>
        <p className="text-sm text-gray-600">Registro de ocorrências e emissão de relatórios para a Administração.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ATALHOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`group flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors sm:p-5 ${
              a.destaque ? "border-marca-700 bg-marca-700 text-white hover:bg-marca-800" : "border-gray-200 bg-white hover:border-marca-200 hover:bg-marca-50"
            }`}
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.destaque ? "bg-white/15" : "bg-marca-50 text-marca-700"}`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={a.icone} />
              </svg>
            </span>
            <span>
              <span className="block text-base font-semibold uppercase tracking-wide">{a.titulo}</span>
              <span className={`block text-xs ${a.destaque ? "text-marca-100" : "text-gray-500"}`}>{a.texto}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { rotulo: "Ocorrências hoje", valor: totalHoje },
          { rotulo: "Ocorrências no mês", valor: totalMes },
          { rotulo: "Total de relatórios", valor: ocorrencias.length },
        ].map((k) => (
          <div key={k.rotulo} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="text-xs font-medium text-gray-500 sm:text-sm">{k.rotulo}</div>
            <div className="mt-1 text-2xl font-bold text-marca-800 sm:text-3xl">{k.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-semibold">Ocorrências mais frequentes</h2>
          {frequentes.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma ocorrência registrada.</p>
          ) : (
            <ul className="space-y-3">
              {frequentes.map((f) => (
                <li key={f.rotulo}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate">{f.rotulo}</span>
                    <span className="font-semibold tabular-nums">{f.n}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-marca-500" style={{ width: `${(f.n / maxFreq) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Últimos registros</h2>
            <Link href="/historico" className="text-sm font-medium text-marca-700 hover:underline">Ver histórico</Link>
          </div>
          {recentes.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma ocorrência registrada.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentes.map((o) => (
                <li key={o.id}>
                  <Link href={`/ocorrencias/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{o.ocorrencia}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {o.protocolo} · {dataCurta(o.data)} {o.horario} · {o.nome} · Q{o.quadra} L{o.lote}
                      </span>
                    </span>
                    <SeloStatus status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
