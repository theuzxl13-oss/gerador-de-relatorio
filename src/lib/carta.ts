/**
 * Carta ao morador (notificação ou multa), gerada a partir da providência registrada.
 *
 * Regra de ouro: nenhuma fundamentação é escrita à mão. A falta é citada pelo
 * snapshot gravado no relatório e as regras do procedimento (tópico XV do
 * Regulamento Interno e Art. 58 do Estatuto) vêm da Base Normativa vigente. Se
 * alguma norma não estiver cadastrada ou ativa, a frase que a citaria é omitida e
 * um aviso é devolvido para a Administração conferir antes de imprimir.
 */
import { citacaoCompleta } from "./citacao";
import { formatarReais } from "./providencia";
import { dataCurta, dataPorExtenso, generoDoTratamento, linhaLocalData } from "./relatorio";
import { PRAZO_RECURSO_DIAS, type Configuracoes, type Norma, type Ocorrencia } from "./types";

export const NORMAS_DA_CARTA = {
  notificacao: "RI-XV-2.2",
  multa: "RI-XV-2.3",
  multaDobrada: "RI-XV-2.4",
  reincidencia: "RI-XV-3",
  recurso: "RI-XV-5",
  cobranca: "ES-58-p2",
} as const;

export interface ConteudoCarta {
  nomeCabecalho: string;
  cnpj: string;
  slogan: string;
  rodape: string;
  titulo: string;
  localData: string;
  referencia: string;
  destinatario: string[];
  paragrafos: string[];
  /** Dispositivos citados, transcritos da base (o texto da falta vem do relatório). */
  dispositivos: { citacao: string; texto: string }[];
  assinatura: string[];
  /** Linha de recibo para quem entregar a carta preencher. */
  recibo: string;
  /** Pendências que a Administração deve conferir (não são impressas). */
  avisos: string[];
}

export class ErroCarta extends Error {}

export function montarCarta(o: Ocorrencia, cfg: Configuracoes, normas: Norma[], hoje: string): ConteudoCarta {
  const p = o.providencia;
  if (!p || (p.tipo !== "NOTIFICADO" && p.tipo !== "MULTADO")) {
    throw new ErroCarta("A carta só pode ser gerada para relatórios notificados ou multados.");
  }
  if (!o.fundamentacaoPrincipal) {
    throw new ErroCarta("O relatório não tem fundamentação. Defina a norma descumprida (Editar) antes de emitir a carta.");
  }
  if (p.tipo === "NOTIFICADO" && (!p.esclarecimentoInicio || !p.esclarecimentoFim)) {
    throw new ErroCarta("Informe o período de esclarecimento na providência antes de emitir a carta.");
  }

  const termo = cfg.termoSecaoRegulamento ?? "tópico";
  const avisos: string[] = [];
  const porId = new Map(normas.map((n) => [n.id, n]));
  const dispositivos: ConteudoCarta["dispositivos"] = [];
  /** Citação de uma norma do procedimento; undefined (com aviso) se não estiver ativa na base. */
  const citar = (id: string, para: string): string | undefined => {
    const n = porId.get(id);
    if (!n || !n.ativo) {
      avisos.push(`A norma ${id} (${para}) não está ativa na Base Normativa: a carta foi gerada sem citá-la. Confira antes de imprimir.`);
      return undefined;
    }
    if (n.revisaoManual) avisos.push(`A norma ${id} (${para}) está marcada para revisão manual: confira o texto no documento original.`);
    const c = citacaoCompleta(n, termo);
    if (!dispositivos.some((d) => d.citacao === c)) dispositivos.push({ citacao: c, texto: n.texto });
    return c;
  };

  const g = generoDoTratamento(o.tratamento, o.genero);
  const flex = (m: string, f: string, n: string) => (g === "F" ? f : g === "M" ? m : n);
  const tratamento = o.tratamento === "Outro" ? o.tratamentoOutro?.trim() || "" : o.tratamento;

  const falta = [o.fundamentacaoPrincipal, o.fundamentacaoComplementar].filter((f) => !!f);
  if (falta.some((f) => f!.revisaoPendente)) avisos.push("A norma do relatório estava marcada para revisão manual quando foi vinculada: confira o texto no documento original.");
  const citacoesFalta = falta.map((f) => citacaoCompleta(f!, termo)).join(" e no ");
  const quando = `${dataPorExtenso(o.data)}, às ${o.horario}`;
  const imovel = `Quadra ${o.quadra.trim()}, Lote ${o.lote.trim()}`;

  const paragrafos: string[] = [
    `Comunicamos que, conforme relatório de ocorrência${o.protocolo ? ` nº ${o.protocolo}` : ""} registrado em ${quando}, ` +
      `foi constatada a seguinte ocorrência: ${o.ocorrencia.trim().toUpperCase()}, em ${imovel}. ` +
      `O fato caracteriza descumprimento do disposto no ${citacoesFalta}.`,
  ];
  for (const f of falta) dispositivos.push({ citacao: citacaoCompleta(f!, termo), texto: f!.texto });

  if (p.tipo === "NOTIFICADO") {
    const base = citar(NORMAS_DA_CARTA.notificacao, "notificação por escrito");
    paragrafos.push(
      `Diante disso, fica V.Sa. ${flex("NOTIFICADO", "NOTIFICADA", "NOTIFICADO(A)")}${base ? `, com fundamento no ${base},` : ""} ` +
        `a apresentar esclarecimento à Administração no período de ${dataCurta(p.esclarecimentoInicio!)} a ${dataCurta(p.esclarecimentoFim!)}.`,
    );
  } else {
    if (!(p.multaValor && p.multaValor > 0)) throw new ErroCarta("Informe o valor da multa na providência antes de emitir a carta.");
    const base = citar(NORMAS_DA_CARTA.multa, "multa");
    let reinc = "";
    if (p.reincidente) {
      const dobrada = citar(NORMAS_DA_CARTA.multaDobrada, "multa dobrada na reincidência");
      const defin = citar(NORMAS_DA_CARTA.reincidencia, "definição de reincidência");
      const refs = [dobrada, defin].filter(Boolean).join(" e no ");
      reinc = `, aplicada em dobro por se tratar de reincidência${refs ? ` (${refs})` : ""}`;
    }
    paragrafos.push(
      `Diante disso, foi aplicada a V.Sa. MULTA no valor de ${formatarReais(p.multaValor)}${base ? `, com fundamento no ${base}` : ""}${reinc}.`,
    );
    const cobranca = citar(NORMAS_DA_CARTA.cobranca, "cobrança da multa");
    if (cobranca) paragrafos.push(`Nos termos do ${cobranca}, a multa será cobrada no mesmo vencimento da taxa de manutenção.`);
  }

  const recurso = citar(NORMAS_DA_CARTA.recurso, "prazo de recurso");
  if (recurso) {
    paragrafos.push(
      `Conforme o ${recurso}, caberá recurso no prazo de ${PRAZO_RECURSO_DIAS} (trinta) dias a partir do recebimento desta ${p.tipo === "MULTADO" ? "notificação de multa" : "notificação"}.`,
    );
  }
  paragrafos.push("Permanecemos à disposição para os esclarecimentos necessários.");

  return {
    nomeCabecalho: cfg.nomeCabecalho,
    cnpj: cfg.cnpj,
    slogan: cfg.slogan,
    rodape: cfg.rodape,
    titulo: p.tipo === "MULTADO" ? "NOTIFICAÇÃO DE MULTA" : "NOTIFICAÇÃO",
    localData: linhaLocalData(cfg.cidade, hoje),
    referencia: `Ref.: Relatório de ocorrência${o.protocolo ? ` nº ${o.protocolo}` : ""} de ${dataCurta(o.data)}`,
    destinatario: [
      `${flex("Ao Sr.", "À Sra.", "Ao(À) Sr(a).")} ${o.nome}`,
      [tratamento, `Quadra ${o.quadra.trim()}, Lote ${o.lote.trim()}`].filter(Boolean).join(" – "),
    ],
    paragrafos,
    dispositivos,
    assinatura: ["Administração", cfg.nomeCabecalho],
    recibo: "Recebi a via original em ____/____/________.   Assinatura: ________________________________",
    avisos,
  };
}
