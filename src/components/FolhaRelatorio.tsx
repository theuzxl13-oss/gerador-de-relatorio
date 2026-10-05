import type { ConteudoRelatorio } from "@/lib/relatorio";
import { Logo } from "./Logo";

/**
 * Relatório em folha A4 (visualização e impressão), no layout do modelo
 * oficial da Fazenda da Ilha: cabeçalho com nome, CNPJ, logo e slogan;
 * corpo; assinatura do responsável; rodapé com endereço e contato.
 */
export function FolhaRelatorio({ r }: { r: ConteudoRelatorio }) {
  return (
    <article className="folha-a4 mx-auto flex flex-col border border-gray-200 shadow-md">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="pt-2 leading-snug">
            <div className="text-[15pt] font-bold tracking-wide text-marca-800">{r.nomeCabecalho}</div>
            {r.cnpj && <div className="text-[10pt] text-gray-700">CNPJ {r.cnpj}</div>}
          </div>
          <Logo className="h-[22mm] w-auto shrink-0" />
        </div>
        {r.slogan && <div className="mt-1 text-right text-[10pt] italic text-gray-700">“{r.slogan.replace(/[“”"]/g, "")}”</div>}
        <div className="mt-2 border-b-2 border-marca-800" />
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

      {r.observacoes && (
        <div className="mb-4 break-inside-avoid text-[10.5pt]">
          <p className="font-semibold">Observações:</p>
          <p className="whitespace-pre-line text-justify">{r.observacoes}</p>
        </div>
      )}

      {/* Espaço livre para observações manuscritas e demais procedimentos administrativos */}
      <div className="min-h-[45mm] flex-1" />

      <div className="mx-auto w-[85mm] break-inside-avoid text-center text-[11pt]">
        <div className="border-t border-gray-800 pt-1 font-semibold">{r.responsavelNome || "Responsável pelo registro"}</div>
        {r.responsavelCargo && <div>{r.responsavelCargo}</div>}
      </div>

      {r.rodape && (
        <footer className="mt-10 border-t border-marca-800 pt-2 text-center text-[8pt] leading-snug text-gray-600">{r.rodape}</footer>
      )}
    </article>
  );
}
