/**
 * Ocorrências demonstrativas. As fundamentações são montadas a partir das
 * normas reais da base (por id) — nenhuma citação é escrita à mão aqui.
 */
import { criarSnapshot } from "@/lib/citacao";
import type { Norma, Ocorrencia, StatusOcorrencia, Tratamento } from "@/lib/types";
import { NORMAS_ORIGINAIS } from "./normas";
import { hojeISO } from "@/lib/relatorio";

interface Demo {
  diasAtras: number;
  horario: string;
  ocorrencia: string;
  descricao?: string;
  nome: string;
  tratamento: Tratamento;
  quadra: string;
  lote: string;
  principal?: string;
  complementar?: string;
  status: StatusOcorrencia;
}

const DEMOS: Demo[] = [
  { diasAtras: 40, horario: "23:15", ocorrencia: "Perturbação de sossego", descricao: "Som alto em reunião na residência após as 22h, mesmo após orientação da segurança.", nome: "Carlos Henrique Moreira", tratamento: "Associado", quadra: "12", lote: "04", principal: "RI-II-8", status: "CONCLUIDA" },
  { diasAtras: 33, horario: "09:20", ocorrencia: "Material de construção na calçada", descricao: "Areia e blocos ocupando toda a largura da calçada.", nome: "Marcos Vinícius Prado", tratamento: "Proprietário", quadra: "31", lote: "17", principal: "RI-IX-7", status: "NOTIFICADA" },
  { diasAtras: 26, horario: "16:05", ocorrencia: "Veículo em alta velocidade", nome: "Renata Albuquerque", tratamento: "Moradora", quadra: "07", lote: "22", principal: "RI-III-5", status: "NOTIFICADA" },
  { diasAtras: 20, horario: "14:10", ocorrencia: "Queimada", descricao: "Queima de folhas e galhos no fundo do lote.", nome: "José Aparecido Lima", tratamento: "Associado", quadra: "45", lote: "09", principal: "RI-XIV-2", status: "CONCLUIDA" },
  { diasAtras: 12, horario: "10:30", ocorrencia: "Entulho em área comum", nome: "Fernanda Castro", tratamento: "Proprietária", quadra: "18", lote: "02", principal: "RI-III-11", complementar: "ES-11-a", status: "REGISTRADA" },
  { diasAtras: 6, horario: "07:45", ocorrencia: "Cachorro solto sem guia", descricao: "Animal circulando solto na alameda, sem acompanhamento do responsável.", nome: "Paulo Roberto Dias", tratamento: "Morador", quadra: "09", lote: "11", principal: "RI-III-4", status: "REGISTRADA" },
  { diasAtras: 3, horario: "15:20", ocorrencia: "Piscina suja", descricao: "Água parada e escura na piscina da residência.", nome: "Luciana Teixeira", tratamento: "Associada", quadra: "22", lote: "15", status: "AGUARDANDO_ANALISE" },
  { diasAtras: 1, horario: "22:40", ocorrencia: "Som alto", nome: "Ricardo Nunes", tratamento: "Visitante", quadra: "03", lote: "06", principal: "RI-II-8", status: "REGISTRADA" },
  { diasAtras: 0, horario: "14:40", ocorrencia: "Perturbação de sossego", nome: "Cristiane Fregonezi", tratamento: "Associada", quadra: "09", lote: "08", principal: "RI-II-8", status: "REGISTRADA" },
];

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return hojeISO(d);
}

/** Gera as ocorrências demonstrativas em ordem cronológica (sem id/protocolo). */
export function ocorrenciasDemonstrativas(normas: Norma[] = NORMAS_ORIGINAIS): Omit<Ocorrencia, "id" | "protocolo">[] {
  const porId = new Map(normas.map((n) => [n.id, n]));
  return DEMOS.map((d) => {
    const data = diasAtras(d.diasAtras);
    const instante = `${data}T${d.horario}:00`;
    const p = d.principal ? porId.get(d.principal) : undefined;
    const c = d.complementar ? porId.get(d.complementar) : undefined;
    return {
      data,
      horario: d.horario,
      ocorrencia: d.ocorrencia,
      descricao: d.descricao,
      nome: d.nome,
      tratamento: d.tratamento,
      quadra: d.quadra,
      lote: d.lote,
      fundamentacaoPrincipal: p ? { ...criarSnapshot(p, "AUTOMATICA", "ALTA"), confirmadoEm: instante } : undefined,
      fundamentacaoComplementar: c ? { ...criarSnapshot(c, "MANUAL"), confirmadoEm: instante } : undefined,
      incluirTextoNorma: true,
      status: d.status,
      criadoEm: instante,
      atualizadoEm: instante,
    };
  });
}
