/* eslint-disable @next/next/no-img-element */
import type { ConteudoRelatorio } from "@/lib/relatorio";
import { Logo } from "./Logo";

/**
 * Relatório em folhas A4 (tela e impressão), no layout do modelo oficial da
 * portaria (ex.: "ANIMAL SOLTO"):
 *  - cabeçalho com FAZENDA DA ILHA (sublinhado), CNPJ, logo e “Onde morar é viver”;
 *  - corpo em itálico com espaçamento entre as linhas;
 *  - foto reduzida abaixo do texto e assinatura do responsável;
 *  - uma página adicional por foto, ampliada;
 *  - rodapé com endereço em todas as páginas.
 */
export function FolhaRelatorio({ r }: { r: ConteudoRelatorio }) {
  const [primeira] = r.imagens;
  return (
    <div className="space-y-6 print:space-y-0">
      <Pagina r={r}>
        <div className="relatorio-corpo">
          <p className="mb-[9mm] pl-[21mm]">{r.localData}</p>
          <p className="linha">{r.destinatario}</p>
          <p className="linha">Protocolo: {r.protocolo}</p>
          {r.linhas.map((l) => (
            <p key={l.rotulo} className="linha">
              {l.rotulo}: {l.valor}
            </p>
          ))}
          <p className="linha">{r.quadraLote}</p>
          <p className="linha">Horas: {r.horas}</p>
          {r.descricao && <p className="mb-[4mm] text-justify">Descrição: {r.descricao}</p>}

          <p className="paragrafo">{r.paragrafo}</p>

          {r.fundamentacoes.map((f) => (
            <div key={f.titulo + f.citacao} className="mt-[3mm] break-inside-avoid text-[10.5pt]">
              <p className="font-semibold">
                {f.titulo}: {f.citacao}
              </p>
              <p className="whitespace-pre-line text-justify">“{f.texto}”</p>
            </div>
          ))}

          {r.observacoes && (
            <div className="mt-[3mm] break-inside-avoid text-[11pt]">
              <span className="font-semibold">Observações: </span>
              <span className="whitespace-pre-line">{r.observacoes}</span>
            </div>
          )}

          {primeira && (
            <img
              src={primeira.url}
              alt={primeira.nome}
              className="mt-[6mm] ml-[3mm] block max-h-[62mm] max-w-[100mm] break-inside-avoid object-contain"
            />
          )}

          <div className="mt-[14mm] break-inside-avoid pl-[13mm]">
            <p className="mb-[4.5mm] underline">{r.responsavelNome || "Responsável pelo registro"}</p>
            {r.responsavelCargo && <p className="underline">{r.responsavelCargo}</p>}
          </div>
        </div>
      </Pagina>

      {r.imagens.map((img, i) => (
        <Pagina key={img.url} r={r}>
          <figure className="mt-[2mm]">
            <img src={img.url} alt={img.nome} className="mx-auto block max-h-[205mm] w-auto max-w-full object-contain" />
            {r.imagens.length > 1 && (
              <figcaption className="mt-2 text-center font-serif text-[10pt] italic text-gray-700">
                Imagem {i + 1} de {r.imagens.length} – Protocolo {r.protocolo}
              </figcaption>
            )}
          </figure>
        </Pagina>
      ))}
    </div>
  );
}

function Pagina({ r, children }: { r: ConteudoRelatorio; children: React.ReactNode }) {
  return (
    <article className="folha-a4 mx-auto flex flex-col border border-gray-200 shadow-md">
      <header className="mb-[10mm] flex items-start justify-between gap-4">
        <div className="pt-[8mm]">
          <div className="[font-family:'Courier_New',Courier,monospace] text-[17pt] font-bold leading-none tracking-wide text-black underline decoration-2 underline-offset-4">
            {r.nomeCabecalho}
          </div>
          {r.cnpj && <div className="mt-1 font-sans text-[7.5pt] text-black">CNPJ {r.cnpj}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <Logo className="h-[24mm] w-auto !rounded-none" />
          {r.slogan && <div className="mt-0.5 font-serif text-[11pt] font-bold text-black">“{r.slogan.replace(/[“”"!]/g, "")}”</div>}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {r.rodape && <footer className="mt-[8mm] font-sans text-[7.5pt] leading-snug text-black">{rodapeComSite(r.rodape)}</footer>}
    </article>
  );
}

/** Destaca o endereço do site no rodapé, como no modelo. */
function rodapeComSite(texto: string) {
  const m = /(WWW\.[^\s]+)/i.exec(texto);
  if (!m) return texto;
  return (
    <>
      {texto.slice(0, m.index)}
      <span className="text-blue-700 underline">{m[1]}</span>
      {texto.slice(m.index + m[1].length)}
    </>
  );
}
