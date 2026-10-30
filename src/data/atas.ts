/**
 * Deliberações de Assembleia Geral (atas registradas).
 *
 * Os textos são transcritos LITERALMENTE das atas digitalizadas, inclusive
 * concordância e grafia originais. Nada é resumido ou reescrito: o relatório
 * cita a deliberação e, se pedido, transcreve este texto.
 *
 * Convenção dos campos (documento "ATA"):
 *  - secaoNumero: data da assembleia (DD/MM/AAAA);
 *  - secaoTitulo: tipo da assembleia, como no título da ata;
 *  - item / itemTitulo: item da Ordem do Dia e o assunto, como na ata.
 */
import type { Norma } from "@/lib/types";
import type { SecaoDocumento } from "./regulamento";

export const AIRBNB = "Locação não residencial (Airbnb / temporada)";

export const ATAS: SecaoDocumento[] = [
  {
    numero: "26/06/2022",
    titulo: "ASSEMBLEIA GERAL EXTRAORDINÁRIA",
    caput:
      "Ata da Assembléia Geral Extraordinária da Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha, realizada em 26 de junho de 2022, com firmas do Presidente e do Secretário reconhecidas em 24/08/2022 (Registro Civil das Pessoas Naturais e Tabelião de Notas de Embu-Guaçu).",
  },
];

export const ATAS_CABECALHO =
  "Deliberações de Assembleia Geral registradas em ata. As deliberações têm força obrigatória para os associados (Estatuto Social, Art. 11, alínea \"b\": acatar e cumprir as deliberações das Assembléias Gerais).";

export const NORMAS_ATAS: Norma[] = [
  {
    id: "ATA-2022-06-26-1",
    documento: "ATA",
    secaoNumero: "26/06/2022",
    secaoTitulo: "ASSEMBLEIA GERAL EXTRAORDINÁRIA",
    item: "1",
    itemTitulo: "Permissão ou Proibição da Locação não residencial Tipo “Airbnb”",
    texto:
      "Foi apurado os votos para Permissão ou Proibição da Locação não residencial Tipo “Airbnb”; e tivemos 10 votos para sim, tivemos 141 não, 00 votos em branco e 00 voto nulo. Declaro a Proibição da Locação não residencial Tipo “Airbnb”, logo, atingiu o quórum qualificado de 82%, por conseguinte, fica alterado o Estatuto Social que passa a proibir a locação não residencial tipo “Airbnb” e assemelhados e de forma particular e será aplicado multas progressivas conforme previsto no Regulamento Interno e Estatuto Social.",
    palavrasChave: [
      "airbnb", "booking", "locação não residencial", "locação por temporada", "aluguel por temporada", "aluguel por diária",
      "hóspede", "hóspedes", "hospedagem", "diária", "temporada", "assemelhados",
    ],
    categorias: [AIRBNB],
    aplicavelOcorrencias: true,
    pagina: 3,
    ativo: true,
  },
];
