import { caputSecao } from "@/data/normas";
import { rotuloSecao } from "@/lib/citacao";
import { DOCUMENTO_NOME, type Norma } from "@/lib/types";

type Ref = Pick<Norma, "documento" | "secaoNumero" | "secaoTitulo" | "artigo" | "alinea" | "paragrafo" | "item" | "itemTitulo" | "subitem" | "texto">;

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1 text-sm sm:grid-cols-[130px_1fr]">
      <dt className="font-medium text-gray-500">{rotulo}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  );
}

/** Exibe os dados estruturados de uma norma e o texto real do documento. */
export function NormaDetalhe({ norma, compacto = false }: { norma: Ref; compacto?: boolean }) {
  const caput = norma.documento === "REGULAMENTO" ? caputSecao(norma.documento, norma.secaoNumero) : undefined;
  return (
    <div>
      <dl className="divide-y divide-gray-100">
        <Linha rotulo="Documento">{DOCUMENTO_NOME[norma.documento]}</Linha>
        <Linha rotulo={norma.documento === "ESTATUTO" ? "Capítulo" : "Seção"}>{rotuloSecao(norma)}</Linha>
        {norma.documento === "ESTATUTO" ? (
          <>
            <Linha rotulo="Artigo">{norma.artigo}</Linha>
            {norma.alinea && <Linha rotulo="Alínea">{norma.alinea}</Linha>}
            {norma.paragrafo && <Linha rotulo="Parágrafo">{norma.paragrafo}</Linha>}
          </>
        ) : (
          <>
            <Linha rotulo="Item">
              {norma.item ?? "— (tópico sem itens numerados)"}
              {norma.itemTitulo ? ` – ${norma.itemTitulo}` : ""}
            </Linha>
            {norma.subitem && <Linha rotulo="Subitem">{norma.subitem}</Linha>}
          </>
        )}
      </dl>
      <div className="mt-3">
        <div className="mb-1 text-sm font-medium text-gray-500">Trecho do documento</div>
        <blockquote className={`whitespace-pre-line rounded-lg border-l-4 border-marca-500 bg-marca-50 px-4 py-3 text-sm leading-relaxed text-gray-900 ${compacto ? "line-clamp-4" : ""}`}>
          {caput && <span className="mb-1 block text-xs italic text-gray-600">{caput}</span>}
          {norma.texto}
        </blockquote>
      </div>
    </div>
  );
}
