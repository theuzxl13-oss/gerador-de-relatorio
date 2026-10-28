/**
 * Ocorrências demonstrativas. As fundamentações são montadas a partir das
 * normas reais da base (por id) — nenhuma citação é escrita à mão aqui.
 */
import { criarSnapshot } from "@/lib/citacao";
import { somarDias, statusDaOcorrencia } from "@/lib/providencia";
import type { Norma, Ocorrencia, Providencia, Tratamento } from "@/lib/types";
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
  complemento?: string;
  /** Decisão demonstrativa da Administração. */
  decisao?: "ARQUIVADO" | "NOTIFICADO_ESCLARECEU" | "NOTIFICADO_PENDENTE" | "MULTADO";
}

const ADM_DEMO = { id: "demo-administracao", nome: "Administração (demonstração)" };

function providenciaDemo(decisao: Demo["decisao"], data: string): Providencia | undefined {
  if (!decisao) return undefined;
  const decididoEm = `${somarDias(data, 2)}T10:00:00`;
  if (decisao === "ARQUIVADO") return { tipo: "ARQUIVADO", descricao: "Situação regularizada no mesmo dia, após orientação da segurança.", decididoEm, decididoPor: ADM_DEMO };
  if (decisao === "MULTADO")
    return { tipo: "MULTADO", descricao: "Multa lançada no boleto da taxa de manutenção.", decididoEm, decididoPor: ADM_DEMO, multaValor: 350, reincidente: false, dataRecebimento: somarDias(data, 4), recursoSituacao: "SEM_RECURSO" };
  const esclareceu = decisao === "NOTIFICADO_ESCLARECEU";
  return {
    tipo: "NOTIFICADO",
    descricao: "Notificação por escrito entregue pela portaria.",
    decididoEm,
    decididoPor: ADM_DEMO,
    dataRecebimento: somarDias(data, 3),
    esclarecimentoInicio: somarDias(data, 3),
    esclarecimentoFim: somarDias(data, 13),
    esclarecimentoResultado: esclareceu ? "ESCLARECEU" : "PENDENTE",
    esclarecimentoObservacao: esclareceu ? "Compareceu à Administração, reconheceu o ocorrido e se comprometeu a não repetir." : undefined,
    recursoSituacao: "SEM_RECURSO",
  };
}

const DEMOS: Demo[] = [
  { diasAtras: 70, horario: "23:30", ocorrencia: "Perturbação de sossego", descricao: "Som alto após as 22h.", nome: "Cristiane Fregonezi", tratamento: "Associada", quadra: "09", lote: "08", principal: "RI-II-8", decisao: "NOTIFICADO_ESCLARECEU" },
  { diasAtras: 40, horario: "23:15", ocorrencia: "Perturbação de sossego", descricao: "Som alto em reunião na residência após as 22h, mesmo após orientação da segurança.", nome: "Carlos Henrique Moreira", tratamento: "Associado", quadra: "12", lote: "04", principal: "RI-II-8", decisao: "NOTIFICADO_ESCLARECEU" },
  { diasAtras: 33, horario: "09:20", ocorrencia: "Material de construção na calçada", descricao: "Areia e blocos ocupando toda a largura da calçada.", nome: "Marcos Vinícius Prado", tratamento: "Proprietário", quadra: "31", lote: "17", principal: "RI-IX-7", decisao: "NOTIFICADO_PENDENTE" },
  { diasAtras: 26, horario: "16:05", ocorrencia: "Veículo em alta velocidade", nome: "Renata Albuquerque", tratamento: "Moradora", quadra: "07", lote: "22", principal: "RI-III-5", decisao: "MULTADO" },
  { diasAtras: 20, horario: "14:10", ocorrencia: "Queimada", descricao: "Queima de folhas e galhos no fundo do lote.", nome: "José Aparecido Lima", tratamento: "Associado", quadra: "45", lote: "09", principal: "RI-XIV-2", decisao: "ARQUIVADO" },
  { diasAtras: 12, horario: "10:30", ocorrencia: "Entulho em área comum", nome: "Fernanda Castro", tratamento: "Proprietária", quadra: "18", lote: "02", principal: "RI-III-11", complementar: "ES-11-a" },
  { diasAtras: 6, horario: "07:45", ocorrencia: "Cachorro solto sem guia", descricao: "Animal circulando solto na alameda, sem acompanhamento do responsável.", nome: "Paulo Roberto Dias", tratamento: "Morador", quadra: "09", lote: "11", principal: "RI-III-4" },
  { diasAtras: 3, horario: "15:20", ocorrencia: "Piscina suja", descricao: "Água parada e escura na piscina da residência.", nome: "Luciana Teixeira", tratamento: "Associada", quadra: "22", lote: "15" },
  { diasAtras: 2, horario: "18:20", ocorrencia: "Menor conduzindo veículo", nome: "Antônio Carlos Ferreira", tratamento: "Associado", quadra: "27", lote: "05", principal: "RI-III-8", complemento: "ao deixar conduzir o veículo, sendo constatado que o condutor era menor de idade" },
  { diasAtras: 1, horario: "22:40", ocorrencia: "Som alto", nome: "Ricardo Nunes", tratamento: "Visitante", quadra: "03", lote: "06", principal: "RI-II-8" },
  { diasAtras: 0, horario: "14:40", ocorrencia: "Perturbação de sossego", nome: "Cristiane Fregonezi", tratamento: "Associada", quadra: "09", lote: "08", principal: "RI-II-8" },
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
    const providencia = providenciaDemo(d.decisao, data);
    return {
      data,
      horario: d.horario,
      ocorrencia: d.ocorrencia,
      descricao: d.descricao,
      complemento: d.complemento,
      nome: d.nome,
      tratamento: d.tratamento,
      quadra: d.quadra,
      lote: d.lote,
      fundamentacaoPrincipal: p ? { ...criarSnapshot(p, "AUTOMATICA", "ALTA"), confirmadoEm: instante } : undefined,
      fundamentacaoComplementar: c ? { ...criarSnapshot(c, "MANUAL"), confirmadoEm: instante } : undefined,
      incluirTextoNorma: false,
      providencia,
      status: statusDaOcorrencia({ fundamentacaoPrincipal: p, providencia }),
      criadoEm: instante,
      atualizadoEm: instante,
    };
  });
}
