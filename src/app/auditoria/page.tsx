import Link from "next/link";
import { repositorio } from "@/server/db";
import { exigirPagina } from "@/server/pagina";
import type { EntidadeAuditada } from "@/server/repositorio";

export const dynamic = "force-dynamic";

const ENTIDADES: { valor: EntidadeAuditada; rotulo: string }[] = [
  { valor: "ocorrencia", rotulo: "Ocorrências" },
  { valor: "usuario", rotulo: "Usuários" },
  { valor: "sessao", rotulo: "Acessos (login)" },
  { valor: "norma", rotulo: "Base normativa" },
  { valor: "configuracoes", rotulo: "Configurações" },
  { valor: "sistema", rotulo: "Sistema" },
];

const POR_PAGINA = 50;

export default async function PaginaAuditoria({ searchParams }: { searchParams: Promise<{ entidade?: string; antes?: string }> }) {
  await exigirPagina("auditoria");
  const sp = await searchParams;
  const entidade = ENTIDADES.find((e) => e.valor === sp.entidade)?.valor;
  const eventos = await repositorio().listarAuditoria({ limite: POR_PAGINA, antesDe: sp.antes, entidade });
  const proxima = eventos.length === POR_PAGINA ? eventos.at(-1)!.id : null;
  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ entidade, ...extra }).filter(([, v]) => v) as [string, string][]);
    return `/auditoria${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-sm text-gray-600">
          Registro permanente de quem fez o quê e quando (data e hora do servidor). Somente leitura: o banco recusa alteração ou exclusão destes registros.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por tipo">
        <Link href="/auditoria" className={`rounded-full px-3 py-1 ring-1 ${!entidade ? "bg-marca-700 text-white ring-marca-700" : "bg-white ring-gray-300"}`}>Tudo</Link>
        {ENTIDADES.map((e) => (
          <Link key={e.valor} href={link({ entidade: e.valor, antes: undefined })} className={`rounded-full px-3 py-1 ring-1 ${entidade === e.valor ? "bg-marca-700 text-white ring-marca-700" : "bg-white ring-gray-300"}`}>
            {e.rotulo}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2.5">Data e hora</th>
              <th className="px-3 py-2.5">Usuário</th>
              <th className="px-3 py-2.5">Ação</th>
              <th className="px-3 py-2.5">Resultado</th>
              <th className="px-3 py-2.5">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 align-top">
            {eventos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">Nenhum registro.</td>
              </tr>
            )}
            {eventos.map((ev) => (
              <tr key={ev.id}>
                <td className="whitespace-nowrap px-3 py-2">{new Date(ev.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td className="px-3 py-2">{ev.usuario?.nome ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{ev.acao}</span>
                  {ev.entidade === "ocorrencia" && ev.entidadeId && ev.acao !== "OCORRENCIA_EXCLUIDA" && (
                    <Link href={`/ocorrencias/${ev.entidadeId}`} className="ml-1 text-marca-700 underline">abrir</Link>
                  )}
                </td>
                <td className={`px-3 py-2 font-semibold ${ev.resultado === "SUCESSO" ? "text-emerald-700" : "text-red-700"}`}>{ev.resultado}</td>
                <td className="max-w-md px-3 py-2">
                  <code className="block whitespace-pre-wrap break-words text-xs text-gray-600">{JSON.stringify(ev.detalhe ?? {})}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm">
        {sp.antes ? <Link href={link({})} className="font-medium text-marca-700 underline">← Mais recentes</Link> : <span />}
        {proxima && <Link href={link({ antes: proxima })} className="font-medium text-marca-700 underline">Mais antigos →</Link>}
      </div>
    </div>
  );
}
