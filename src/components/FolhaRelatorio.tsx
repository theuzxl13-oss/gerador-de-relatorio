import type { ConteudoRelatorio } from "@/lib/relatorio";
import { Logo } from "./Logo";

/** Relatório em formato de folha A4 (visualização e impressão). */
export function FolhaRelatorio({ r }: { r: ConteudoRelatorio }) {
  return (
    <article className="folha-a4 mx-auto flex flex-col border border-gray-200 shadow-md">
      <header className="mb-8 flex items-center gap-4 border-b-2 border-marca-800 pb-3">
        <Logo className="h-16 w-16 shrink-0" />
        <div className="leading-snug">
          <div className="text-[10.5pt] font-bold uppercase text-marca-800">{r.cabecalhoAssociacao}</div>
          <div className="text-[9pt] italic text-gray-600">Onde morar é viver!</div>
        </div>
      </header>

      <p className="mb-6">{r.localData}</p>

      <p>{r.destinatario}</p>
      <p className="mb-6">Protocolo: {r.protocolo}</p>

      {r.linhas.map((l) => (
        <p key={l.rotulo}>
          {l.rotulo}: {l.valor}
        </p>
      ))}
      <p>{r.quadraLote}</p>
      <p className={r.descricao ? "" : "mb-6"}>Horas: {r.horas}</p>
      {r.descricao && <p className="mb-6 mt-2 text-justify">Descrição: {r.descricao}</p>}

      <p className="mb-6 text-justify indent-10">{r.paragrafo}</p>

      {r.fundamentacoes.map((f) => (
        <div key={f.titulo + f.citacao} className="mb-4 break-inside-avoid text-[10pt]">
          <p className="font-semibold">
            {f.titulo}: {f.citacao}
          </p>
          <p className="mt-1 whitespace-pre-line border-l-2 border-gray-400 pl-3 text-justify italic text-gray-800">“{f.texto}”</p>
        </div>
      ))}

      <div className="mt-6 flex-1 break-inside-avoid">
        <p className="mb-1 text-[10pt] font-semibold">Observações / providências da Administração:</p>
        <div className="min-h-[55mm] rounded border border-gray-400 p-3 text-[10pt]">
          {r.observacoes && <p className="whitespace-pre-line">{r.observacoes}</p>}
        </div>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-10 break-inside-avoid text-center text-[10pt]">
        <div>
          <div className="border-t border-gray-700 pt-1">{r.responsavelNome || "Responsável pelo registro"}</div>
          {r.responsavelCargo && <div className="text-gray-600">{r.responsavelCargo}</div>}
        </div>
        <div>
          <div className="border-t border-gray-700 pt-1">Administração</div>
        </div>
      </div>
    </article>
  );
}
