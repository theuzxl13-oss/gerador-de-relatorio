"use client";

import { useMemo, useState } from "react";
import { pesquisarNormas, type Candidato } from "@/lib/analysis/engine";
import { citacaoCompleta, rotuloDispositivo, rotuloSecao } from "@/lib/citacao";
import { DOCUMENTO_NOME, type DocumentoTipo, type Norma } from "@/lib/types";
import { Botao, Entrada, Modal, SeloConfianca } from "./ui";

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  normas: Norma[];
  /** Candidatas da análise automática (exibidas no modo "Alterar fundamentação"). */
  candidatos?: Candidato[];
  titulo: string;
  aoSelecionar: (norma: Norma, papel: "principal" | "complementar", candidato?: Candidato) => void;
  permitirComplementar?: boolean;
  consultaInicial?: string;
}

/** Pesquisa e seleção manual de uma norma da Base Normativa. */
export function SeletorNorma({ aberto, aoFechar, normas, candidatos, titulo, aoSelecionar, permitirComplementar, consultaInicial = "" }: Props) {
  const [consulta, setConsulta] = useState(consultaInicial);
  const [documento, setDocumento] = useState<DocumentoTipo | "">("");

  const resultados = useMemo(() => pesquisarNormas(consulta, normas, documento || undefined).slice(0, 60), [consulta, normas, documento]);

  const Item = ({ n, candidato }: { n: Norma; candidato?: Candidato }) => (
    <li className="rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-900">{rotuloDispositivo(n)}</span>
        <span className="text-sm text-gray-600">· {DOCUMENTO_NOME[n.documento]} · {rotuloSecao(n)}</span>
        {candidato && <SeloConfianca confianca={candidato.confianca} />}
        {n.revisaoManual && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">Revisar texto</span>}
        {!n.aplicavelOcorrencias && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Institucional</span>}
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-gray-700">{n.texto}</p>
      {candidato && candidato.motivos.length > 0 && <p className="mt-1 text-xs text-gray-500">{candidato.motivos.join(" · ")}</p>}
      <p className="mt-1 text-xs text-gray-500">Citação: {citacaoCompleta(n)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Botao className="!py-1.5" onClick={() => aoSelecionar(n, "principal", candidato)}>Usar como principal</Botao>
        {permitirComplementar && (
          <Botao variante="secundario" className="!py-1.5" onClick={() => aoSelecionar(n, "complementar", candidato)}>
            Usar como complementar
          </Botao>
        )}
      </div>
    </li>
  );

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={titulo} largura="max-w-4xl">
      {candidatos && candidatos.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Normas encontradas pela análise</h3>
          <ul className="space-y-3">
            {candidatos.map((c) => (
              <Item key={c.norma.id} n={c.norma} candidato={c} />
            ))}
          </ul>
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Pesquisar na Base Normativa</h3>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Entrada
          autoFocus
          placeholder="Ex.: calçada, lixo, 22:00, artigo 11, item 8..."
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
        />
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(["", "REGULAMENTO", "ESTATUTO"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDocumento(d)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${documento === d ? "bg-white shadow-sm" : "text-gray-600"}`}
            >
              {d === "" ? "Todos" : DOCUMENTO_NOME[d]}
            </button>
          ))}
        </div>
      </div>
      {resultados.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Nenhuma norma encontrada para a pesquisa.</p>
      ) : (
        <ul className="space-y-3">
          {resultados.map((n) => (
            <Item key={n.id} n={n} />
          ))}
        </ul>
      )}
    </Modal>
  );
}
