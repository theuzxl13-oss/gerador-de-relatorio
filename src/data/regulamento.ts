/**
 * REGULAMENTO INTERNO DA FAZENDA DA ILHA
 *
 * Fonte: "REGULAMENTO_Fazenda da Ilha (1) - Copia.pdf" (13 páginas).
 * Texto transcrito do PDF original, mantendo a numeração de tópicos, itens
 * e subitens. Grafias do original foram preservadas.
 *
 * Trechos em que o PDF tem sobreposição de carimbo ou leitura incerta estão
 * marcados com "[leitura incerta: ...]" ou "[trecho ilegível no PDF]", e a norma
 * recebe `revisaoManual: true`. Esses trechos NÃO foram completados por
 * suposição: devem ser conferidos no documento físico e corrigidos na tela
 * Base Normativa.
 */
import type { Norma } from "@/lib/types";

export interface SecaoDocumento {
  numero: string;
  titulo: string;
  /** Frase introdutória do tópico, quando houver. */
  caput?: string;
}

export const REGULAMENTO_PREAMBULO =
  "O presente regulamento interno, regulamenta, no que lhe compete, o procedimento dos associados e seus locatários e usuários dos imóveis da associação, em suas relações recíprocas, e de conformidade com o que segue:";

export const SECOES_REGULAMENTO: SecaoDocumento[] = [
  { numero: "I", titulo: "DOS DIREITOS DOS ASSOCIADOS" },
  { numero: "II", titulo: "DOS DEVERES DOS ASSOCIADOS", caput: "São deveres dos associados." },
  { numero: "III", titulo: "DAS PROIBIÇÕES", caput: "Fica expressamente proibido aos associados:" },
  { numero: "IV", titulo: "DOS EMPREGADOS DA ASSOCIAÇÃO E PARTICULARES" },
  { numero: "V", titulo: "DA COLETA DO LIXO" },
  { numero: "VI", titulo: "DA PORTARIA, SEGURANÇA E ZELADORIA" },
  { numero: "VII", titulo: "DAS ÁREAS DE LAZER" },
  { numero: "VIII", titulo: "DA UTILIZAÇÃO RECURSOS DA SEDE ADMINISTRATIVA" },
  { numero: "IX", titulo: "DA REGULAMENTAÇÃO PARA EDIFICAÇÕES E REFORMAS" },
  { numero: "X", titulo: "DA COMERCIALIZAÇÃO DE LOTES" },
  { numero: "XI", titulo: "DAS TAXAS DA ASSOCIAÇÃO" },
  { numero: "XII", titulo: "DO REGULAMENTO" },
  {
    numero: "XIII",
    titulo: "DA ISENÇÃO DE RESPONSABILIDADES",
    caput: "A Associação, por si e seus prepostos, não assume responsabilidade:",
  },
  { numero: "XIV", titulo: "FOGO" },
  { numero: "XV", titulo: "ATOS DISCIPLINARES" },
];

const tituloSecao = (n: string) => SECOES_REGULAMENTO.find((s) => s.numero === n)!.titulo;

interface Opcoes {
  item?: string;
  itemTitulo?: string;
  subitem?: string;
  palavrasChave?: string[];
  categorias?: string[];
  aplicavel?: boolean;
  pagina?: number;
  revisao?: string;
}

function ri(secao: string, texto: string, o: Opcoes = {}): Norma {
  const id = ["RI", secao, o.subitem ?? o.item].filter(Boolean).join("-");
  return {
    id,
    documento: "REGULAMENTO",
    secaoNumero: secao,
    secaoTitulo: tituloSecao(secao),
    item: o.item,
    itemTitulo: o.itemTitulo,
    subitem: o.subitem,
    texto,
    palavrasChave: o.palavrasChave ?? [],
    categorias: o.categorias ?? [],
    aplicavelOcorrencias: o.aplicavel ?? (o.categorias?.length ?? 0) > 0,
    pagina: o.pagina,
    revisaoManual: o.revisao ? true : undefined,
    observacaoRevisao: o.revisao,
    ativo: true,
  };
}

const SOSSEGO = "Perturbação de sossego";
const OBRA_HORARIO = "Obra fora do horário permitido";
const OBRA_TRANSTORNO = "Transtornos causados por obra";
const MATERIAL = "Material/entulho em área comum";
const LIXO = "Descarte irregular de lixo";
const FOGO = "Queimada / fogo";
const BALAO = "Soltura de balões";
const VELOCIDADE = "Excesso de velocidade";
const RUIDO_VEICULO = "Veículo com ruído / modificado";
const ESTACIONAMENTO = "Estacionamento irregular";
const HABILITACAO = "Condução sem habilitação";
const ANIMAIS = "Animal causando transtorno";
const SILVESTRE = "Captura de animal silvestre";
const CONSTRUCAO = "Construção irregular";
const ARVORES = "Remoção de árvores / fechamento fora do lote";
const AREAS = "Dano a áreas verdes / comuns";
const MECANICA = "Serviço mecânico em área comum";
const JOGOS = "Jogos em local inadequado";
const LAZER = "Uso irregular das áreas de lazer";
const LAGO = "Uso irregular dos lagos";
const ESGOTO = "Despejo de águas servidas / esgoto";
const PLACAS = "Placas, faixas ou letreiros";
const INADIMPLENCIA = "Inadimplência";
const DESRESPEITO = "Desrespeito à Diretoria / funcionários";
const IDENTIFICACAO = "Identificação e controle de acesso";
const NAO_RESIDENCIAL = "Uso não residencial do imóvel";
const PERIGO = "Substância ou material perigoso";
const LOCACAO = "Locação / cessão sem comunicação";
const SEDE = "Uso irregular da Sede Administrativa";
const EMPREGADOS = "Relação com empregados da Associação";
const COMERCIALIZACAO = "Comercialização irregular de lotes";
const CAMINHOES = "Entrada de caminhões / entregas em horário vedado";
const DESCUMPRIMENTO = "Descumprimento de normas da Associação";

export const NORMAS_REGULAMENTO: Norma[] = [
  // ───────────── I – DOS DIREITOS DOS ASSOCIADOS (pág. 2) ─────────────
  ri("I", "Usar, gozar e dispor do seu imóvel como lhe aprouver, respeitadas as restrições da Associação e o estipulado no Estatuto, e neste Regulamento de forma a não prejudicar igual direito dos demais associados e não comprometer o bom nome da Associação;", { item: "1", pagina: 2 }),
  ri("I", "Usar as áreas comunitárias conforme seu destino e sobre elas gozar de todos os direitos previstos no Estatuto, no respectivo Regulamento e nas restrições legais;", { item: "2", pagina: 2 }),
  ri("I", "Vender ou alugar seu imóvel, independente da anuência dos demais associados.", { item: "3", pagina: 2 }),

  // ───────────── II – DOS DEVERES DOS ASSOCIADOS (págs. 2–3) ─────────────
  ri("II", "Utilizar seu imóvel para fim exclusivamente residencial (exceto lotes comerciais);", {
    item: "1", pagina: 2, categorias: [NAO_RESIDENCIAL],
    palavrasChave: ["residencial", "comercial", "comércio", "loja", "escritório", "empresa", "pousada"],
  }),
  ri("II", "Cumprir e fazer cumprir o disposto nas restrições da Associação, nos Estatutos e nos Regulamentos Internos;", {
    item: "2", pagina: 2, categorias: [DESCUMPRIMENTO],
    palavrasChave: ["cumprir", "restrições", "estatuto", "regulamento"],
  }),
  ri("II", "Concorrer, na forma prevista nos Estatutos, para as despesas da Associação;", {
    item: "3", pagina: 2, categorias: [INADIMPLENCIA],
    palavrasChave: ["despesas", "taxa", "pagamento", "inadimplência"],
  }),
  ri("II", "Acatar as determinações da Diretoria, inclusive as decisões ou avisos especiais que desta [leitura incerta: “ühima”] emanarem, para os casos de urgência;", {
    item: "4", pagina: 2, categorias: [DESRESPEITO],
    palavrasChave: ["acatar", "determinação", "diretoria", "aviso", "desobedeceu", "não acatou"],
    revisao: "O OCR leu “ühima” (provavelmente “última”). Conferir a palavra no PDF original.",
  }),
  ri("II", "Dar conhecimento ao locatário, visitantes ou funcionários do imóvel de todas as condições dos Estatutos e dos Regulamentos Internos, obrigando-os a respeitá-los;", {
    item: "5", pagina: 2, categorias: [LOCACAO],
    palavrasChave: ["locatário", "inquilino", "visitantes", "funcionários", "dar conhecimento"],
  }),
  ri("II", "Cuidar para que eventual construção ou reforma em sua unidade autônoma, não traga transtornos para os demais associados e/ou áreas comunitárias da associação;", {
    item: "6", pagina: 2, categorias: [OBRA_TRANSTORNO, OBRA_HORARIO],
    palavrasChave: ["construção", "reforma", "obra", "poeira", "sujeira da obra"],
  }),
  ri("II", "Fornecer à segurança ou porteiros sua identidade, assim como a de seus familiares, ocupantes e usuários de sua unidade, e se possível, avisar a chegada de visitantes, tudo a fim de facilitar o controle da entrada e permanência dessas pessoas no Empreendimento;", {
    item: "7", pagina: 2, categorias: [IDENTIFICACAO],
    palavrasChave: ["identidade", "identificação", "portaria", "porteiro", "segurança", "visitantes", "entrada"],
  }),
  ri("II", "Observar as regras do sossego e tranquilidade, em especial a partir da 22:00 horas, evitando atividades e reuniões ruidosas;", {
    item: "8", pagina: 2, categorias: [SOSSEGO],
    palavrasChave: ["sossego", "tranquilidade", "barulho", "som alto", "perturbação", "silêncio", "22h", "22:00", "ruidosas", "festa", "música alta"],
  }),
  ri("II", "Cuidar para que seus familiares, funcionários ou visitantes não prejudiquem a tranquilidade dos demais moradores, responsabilizando-se civilmente por quaisquer atitudes danosas que [leitura incerta: “contranem”] o bem estar, a segurança, o direito de propriedade dos moradores e a coisa comum, ou que venham a ferir as disposições do Regulamento Interno;", {
    item: "9", pagina: 3, categorias: [SOSSEGO, AREAS],
    palavrasChave: ["familiares", "visitantes", "funcionários", "tranquilidade", "bem estar", "convidados"],
    revisao: "O OCR leu “contranem” (provavelmente “contrariem”). Conferir a palavra no PDF original.",
  }),
  ri("II", "Preservar as áreas verdes, e as áreas comuns;", {
    item: "10", pagina: 3, categorias: [AREAS, ARVORES],
    palavrasChave: ["áreas verdes", "áreas comuns", "preservar", "dano", "jardim", "gramado"],
  }),
  ri("II", "Cadastrar, junto à Diretoria e sob sua responsabilidade empregados ligados a construção civil e/ou empregados de sua residência;", {
    item: "11", pagina: 3, categorias: [IDENTIFICACAO],
    palavrasChave: ["cadastrar", "cadastro", "empregados", "pedreiro", "construção civil", "doméstica", "não cadastrado"],
  }),
  ri("II", "Dar ciência expressa ao comprador, em caso de venda, das restrições e condições previstas no Estatuto, deste Regulamento e do Compromisso Original de Compra e Venda, de unidades, bem como cientificar a Associação da venda ou cessão;", {
    item: "12", pagina: 3, categorias: [LOCACAO],
    palavrasChave: ["venda", "comprador", "cessão", "cientificar"],
  }),
  ri("II", "Dar ciência ao locatário ou comodatário, das restrições e condições previstas no Estatuto e do Regulamento Interno;", {
    item: "13", pagina: 3, categorias: [LOCACAO],
    palavrasChave: ["locatário", "comodatário", "inquilino", "aluguel"],
  }),
  ri("II", "Cumprir as leis federais, estaduais e municipais vigentes no país.", {
    item: "14", pagina: 3, categorias: [DESCUMPRIMENTO],
    palavrasChave: ["leis", "legislação"],
  }),

  // ───────────── III – DAS PROIBIÇÕES (págs. 3–4) ─────────────
  ri("III", "Manter, nos respectivos imóveis, qualquer substância ou aparelho, bem como instalações que possam causar perigo a segurança dos associados, locatários, usuários, comodatários, ou trazer incômodo ou intranquilidade aos mesmos;", {
    item: "1", pagina: 3, categorias: [PERIGO, SOSSEGO],
    palavrasChave: ["substância", "aparelho", "instalações", "perigo", "incômodo", "intranquilidade"],
  }),
  ri("III", "Ter em depósito materiais inflamáveis de qualquer natureza, explosivos ou de mau odor,", {
    item: "2", pagina: 3, categorias: [PERIGO],
    palavrasChave: ["inflamáveis", "explosivos", "mau odor", "mau cheiro", "combustível", "gasolina"],
  }),
  ri("III", "Depositar lixo, materiais de construção, ou qualquer outro material particular, a não ser transitoriamente, desde que expressamente autorizado pela diretoria ou preposto, nas alamedas, áreas verdes ou qualquer outro lugar fora dos respectivos imóveis;", {
    item: "3", pagina: 3, categorias: [MATERIAL, LIXO],
    palavrasChave: ["depositar", "lixo", "materiais de construção", "material de construção", "entulho", "areia", "alamedas", "áreas verdes", "fora do imóvel", "rua"],
  }),
  ri("III", "Possuir e manter no Empreendimento animais domésticos ou domesticados, que impeçam por sua agressividade, o livre trânsito dos Associados pelas áreas comuns. A circulação dos mesmos fora dos limites do lote só é permitida de forma aprisionada, acompanhado do responsável;", {
    item: "4", pagina: 3, categorias: [ANIMAIS],
    palavrasChave: ["animais", "animal", "cachorro", "cão", "agressividade", "agressivo", "solto", "sem coleira", "guia"],
  }),
  ri("III", "Transitar com veículos, em velocidade superior a 30 Km/h;", {
    item: "5", pagina: 3, categorias: [VELOCIDADE],
    palavrasChave: ["velocidade", "alta velocidade", "30 km/h", "veículo", "correndo"],
  }),
  ri("III", "Transitar pelas ruas com veículos fora de suas especificações originais de fabrica (com relação a ruido),", {
    item: "6", pagina: 3, categorias: [RUIDO_VEICULO],
    palavrasChave: ["escapamento", "ruído", "descarga", "veículo modificado", "moto barulhenta"],
  }),
  ri("III", "Estacionar ônibus e caminhões nas ruas do Empreendimento sem expressa autorização da Diretoria;", {
    item: "7", pagina: 3, categorias: [ESTACIONAMENTO, CAMINHOES],
    palavrasChave: ["estacionar", "ônibus", "caminhão", "caminhões", "estacionado"],
  }),
  ri("III", "Entregar a condução de veiculos, a pessoas não habilitadas;", {
    item: "8", pagina: 3, categorias: [HABILITACAO],
    palavrasChave: ["não habilitadas", "habilitação", "menor dirigindo", "sem carteira"],
  }),
  ri("III", "Realizar jogos nas partes comuns do Empreendimento, fora dos locais apropriados,", {
    item: "9", pagina: 3, categorias: [JOGOS],
    palavrasChave: ["jogos", "bola", "futebol na rua", "partes comuns"],
  }),
  ri("III", "Executar, ou permitir que se executem, serviços de mecânica, pintura, funilaria ou similares ou mesmo qualquer conserto de carros ou motores de [leitura incerta: “qualité”] espécie, nas partes externas/comunitárias do Empreendimento, exceto casos de emergências;", {
    item: "10", pagina: 4, categorias: [MECANICA],
    palavrasChave: ["mecânica", "pintura", "funilaria", "conserto de carros", "motores"],
    revisao: "O OCR leu “qualité” (provavelmente “qualquer”). Conferir a palavra no PDF original.",
  }),
  ri("III", "As áreas comuns do Empreendimento, especialmente portarias, ruas, alamedas, calçadas, [leitura incerta: “pracas,etc”], deverão estar sempre livres e desimpedidas, não podendo ai serem depositados, sob qualquer pretexto, quaisquer objetos, moveis, caixões, brinquedos, materiais de construção, etc;", {
    item: "11", pagina: 4, categorias: [MATERIAL, ESTACIONAMENTO],
    palavrasChave: ["áreas comuns", "ruas", "alamedas", "calçadas", "calçada", "livres", "desimpedidas", "objetos", "móveis", "materiais de construção", "entulho", "obstrução"],
    revisao: "O OCR leu “pracas,etc” (provavelmente “praças, etc”). Conferir no PDF original.",
  }),
  ri("III", "Transitar com veículos pelas vias internas do Empreendimento, sem habilitação, sem o cartão de identificação, ou similar aprovado;", {
    item: "12", pagina: 4, categorias: [HABILITACAO, IDENTIFICACAO],
    palavrasChave: ["sem habilitação", "cartão de identificação", "vias internas", "dirigindo"],
  }),
  ri("III", "Construção de residências sem aprovação do projeto junto à Associação e no Órgão Publico;", {
    item: "13", pagina: 4, categorias: [CONSTRUCAO],
    palavrasChave: ["construção", "sem aprovação", "projeto", "obra irregular", "construção irregular", "alvará"],
  }),
  ri("III", "Aprisionar ou capturar qualquer espécie de animal silvestre;", {
    item: "14", pagina: 4, categorias: [SILVESTRE],
    palavrasChave: ["animal silvestre", "capturar", "aprisionar", "pássaro", "gaiola", "armadilha"],
  }),
  ri("III", "Realizar qualquer tipo de fechamento, benfeitoria ou remoção de árvores fora das divisas dos lotes;", {
    item: "15", pagina: 4, categorias: [ARVORES],
    palavrasChave: ["fechamento", "benfeitoria", "remoção de árvores", "árvore", "corte de árvore", "fora das divisas", "cerca", "muro"],
  }),

  // ───────────── IV – DOS EMPREGADOS DA ASSOCIAÇÃO E PARTICULARES (pág. 4) ─────────────
  ri("IV", "Os trabalhos dos empregados da Associação serão controlados pela Diretoria ou por quem esta indicar;", { item: "1", pagina: 4 }),
  ri("IV", "O horário de trabalho dos empregados da Associação será fixado pela Diretoria, de acordo com a necessidade dos serviços, respeitada a lei;", { item: "2", pagina: 4 }),
  ri("IV", "Qualquer reclamação ou sugestão, relativamente ao trabalho dos empregados da Associação, deverá ser levada a Diretoria ou preposto, sendo proibido ao associado determinar ou alterar o serviço deste contratado;", {
    item: "3", pagina: 4, categorias: [EMPREGADOS, DESRESPEITO],
    palavrasChave: ["empregados da associação", "determinar", "alterar o serviço", "deu ordem", "funcionário"],
  }),
  ri("IV", "Nenhum empregado da Associação poderá aceitar as chaves de residência, em caso de ausência dos moradores, assim como o associado não poderá entregar as chaves de sua residência a nenhum serviçal da associação;", {
    item: "4", pagina: 4, categorias: [EMPREGADOS],
    palavrasChave: ["chaves", "chave", "serviçal", "empregado"],
  }),
  ri("IV", "Os empregados responsáveis pela segurança terão autonomia para orientar os associados e solicitar as punições previstas no item \"XV - ATOS DISCIPLINARES\", caso necessário;", { item: "5", pagina: 4 }),
  ri("IV", "Nenhum empregado, prestador de serviço ou preposto, poderá autorizar o uso de áreas comuns a terceiros, consistindo a autorização falta grave.", {
    item: "6", pagina: 4, categorias: [EMPREGADOS],
    palavrasChave: ["autorizar", "áreas comuns", "terceiros", "falta grave"],
  }),

  // ───────────── V – DA COLETA DO LIXO (pág. 4) — tópico sem itens numerados ─────────────
  ri("V", "A coleta de lixo é realizada pela Associação, em dias pré-determinados, devendo portanto ser depositado em lixeiras apropriadas somente nos dias de coleta, devidamente acondicionados. O procedimento para sua reciclagem será determinado pela Diretoria junto às Comissões de Proprietários na ocasião oportuna.", {
    pagina: 4, categorias: [LIXO],
    palavrasChave: ["lixo", "coleta", "lixeiras", "dias de coleta", "acondicionados", "saco de lixo", "fora do dia"],
  }),

  // ───────────── VI – DA PORTARIA, SEGURANÇA E ZELADORIA (pág. 5) ─────────────
  ri("VI", "As normas e procedimentos operacionais da zeladoria, portaria e da segurança da associação serão determinados pela Diretoria, juntamente com as Comissões;", { item: "1", pagina: 5 }),
  ri("VI", "Da Revista de Prestadores de Serviços. Entende-se por prestador de serviços:\n2.1) Pedreiros e quaisquer outros empregados que trabalhem em obras residenciais ou para a associação;\n2.2) Poceiros;\n2.3) Empregados domésticos;\n2.4) Lenhadores;\n2.5) Funcionários de qualquer empresa contratada;\n2.6) Representantes de empresas contratadas;\n2.7) Autônomos a serviço.", { item: "2", pagina: 5 }),
  ri("VI", "A revista deverá ocorrer quando do acesso e ou saída da Associação, nas portarias, que poderá ser de forma aleatória;", {
    item: "3", pagina: 5, categorias: [IDENTIFICACAO],
    palavrasChave: ["revista", "portaria", "acesso", "saída", "prestador"],
  }),
  ri("VI", "Deverão ser revistados carros e bolsas de mão;", {
    item: "4", pagina: 5, categorias: [IDENTIFICACAO],
    palavrasChave: ["revista", "revistados", "carros", "bolsas", "recusou revista"],
  }),
  ri("VI", "Estão excluídos da revista os serviçais acompanhados dos proprietários responsáveis;", { item: "5", pagina: 5 }),

  // ───────────── VII – DAS ÁREAS DE LAZER (págs. 5–10) ─────────────
  ri("VII", "As áreas de esporte e lazer da Associação serão utilizadas pelos proprietários, seus dependentes e convidados, respeitando as normas deste regulamento;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.1", pagina: 5, categorias: [LAZER],
    palavrasChave: ["áreas de esporte", "áreas de lazer", "convidados", "dependentes"],
  }),
  ri("VII", "As áreas para a prática de esporte (quadras e campos de futebol), foram criadas para atenderem aos Associados e dependentes. Portanto, para que se possa trazer convidados, faz-se necessário preencher os seguintes requisitos, sem o que a utilização fica proibida:", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2", pagina: 5, categorias: [LAZER],
    palavrasChave: ["quadras", "campos de futebol", "convidados", "requisitos"],
  }),
  ri("VII", "Obter prévia autorização da Diretoria que, a seu critério, concêde-la-á ou não, visando, sempre, os interesses da coletividade e preservação do patrimônio da Associação;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.1", pagina: 5, categorias: [LAZER],
    palavrasChave: ["autorização", "convidados", "sem autorização"],
  }),
  ri("VII", "Concedida a autorização, o interessado, previamente, fornecerá relação escrita dos convidados, com a indicação do número da carteira de indentidade e endereço de cada um, e horário a ser reservado, que não excederá a 02 (duas) horas por dia;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.2", pagina: 5, categorias: [LAZER],
    palavrasChave: ["relação de convidados", "lista de convidados", "duas horas"],
  }),
  ri("VII", "As reservas deverão ser solicitadas com antecedência mínima de 02 (dois) dias, através de nossa Sede Administrativa; que deverá enviar copia para a segurança;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.3", pagina: 5, categorias: [LAZER],
    palavrasChave: ["reserva", "sem reserva", "antecedência"],
  }),
  ri("VII", "O associado deverá orientar seus convidados sobre o regulamento da Associação e ficará responsável pelos atos ou danos que seus convidados possam causar, respondendo civilmente pelos mesmos, devendo ressarcir a Associação imediatamente dos prejuízos causados;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.4", pagina: 6, categorias: [LAZER, AREAS],
    palavrasChave: ["convidados", "danos", "prejuízos", "ressarcir"],
  }),
  ri("VII", "A utilização das áreas de lazer só poderá ser feita por convidados quando houver a presença do proprietário, o que inviabiliza qualquer tipo de carta ou autorizações por escrito. O associado deverá orientar e responsabilizar-se pelo não cumprimento deste por terceiros;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.5", pagina: 6, categorias: [LAZER],
    palavrasChave: ["convidados sem o proprietário", "presença do proprietário", "autorização por escrito"],
  }),
  ri("VII", "O associado deverá estar presente, quando da utilização das áreas comuns por seus convidados orientando-os e responsabilizando-se pelo não cumprimento deste regulamento por terceiros;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.6", pagina: 6, categorias: [LAZER],
    palavrasChave: ["convidados", "associado ausente", "presença"],
  }),
  ri("VII", "Não é permitido fazer churrascos ou pick-nick fora das áreas destinadas a estas praticas;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.7", pagina: 6, categorias: [LAZER, FOGO],
    palavrasChave: ["churrasco", "pick-nick", "piquenique", "fora das áreas"],
  }),
  ri("VII", "Não é permitido, sob hipótese alguma, que os automóveis sejam estacionados em locais que possam causar danos a Associação, ou que obstruam o livre trânsito;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.8", pagina: 6, categorias: [ESTACIONAMENTO],
    palavrasChave: ["estacionados", "estacionamento", "obstruam", "livre trânsito", "automóveis"],
  }),
  ri("VII", "A natureza, os equipamentos e instalações, devem ser preservados, não sendo permitido arrancar ou danificar plantas ou árvores ou fazer mau uso dos equipamentos, ficando o proprietário sujeito as penalidades cabíveis;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.9", pagina: 6, categorias: [AREAS, ARVORES],
    palavrasChave: ["arrancar", "danificar", "plantas", "árvores", "equipamentos", "mau uso"],
  }),
  ri("VII", "Não é permitido usar de palavras de baixo calão nos jogos ou nas áreas comuns,", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.10", pagina: 6, categorias: [DESRESPEITO, LAZER],
    palavrasChave: ["baixo calão", "palavrão", "palavrões", "xingamento", "xingou"],
  }),
  ri("VII", "Não é permitido o tráfego de quaisquer veículos no gramado das áreas de lazer;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.11", pagina: 6, categorias: [LAZER, AREAS],
    palavrasChave: ["veículo no gramado", "gramado", "tráfego"],
  }),
  ri("VII", "Oportunamente será estipulada uma taxa de utilização das áreas de lazer;", { item: "1", itemTitulo: "Gerais", subitem: "1.2.12", pagina: 6 }),
  ri("VII", "Quando da conclusão da área de lazer anexa próximo à portaria dois, todas as atividades envolvendo convidados serão lá realizadas;", { item: "1", itemTitulo: "Gerais", subitem: "1.2.13", pagina: 6 }),
  ri("VII", "Não serão concedidas autorizações para uso das áreas de lazer aos inadimplentes;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.14", pagina: 6, categorias: [LAZER, INADIMPLENCIA],
    palavrasChave: ["inadimplentes", "áreas de lazer"],
  }),
  ri("VII", "O associado que infringir a regulamentação das áreas de lazer, permitir abusos de qualquer ordem, desrespeitar as instruções da diretoria ou seus prepostos, ou de alguma forma causar incômodo e mal estar aos demais associados, ficará sujeito a multas e a efeito suspensivo relativo ao uso das mesmas;", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.15", pagina: 6, categorias: [LAZER, DESRESPEITO],
    palavrasChave: ["áreas de lazer", "abusos", "desrespeitar", "incômodo", "mal estar"],
  }),
  ri("VII", "Em caso de danos a Sede Social, mobiliários, ornamentos ou seus pertences, fica a Associação autorizada a proceder os reparos necessários e a lançar a débito do responsável na taxa mensal da Associação o valor do reembolso, acrescido da taxa de administração desses serviços.", {
    item: "1", itemTitulo: "Gerais", subitem: "1.2.16", pagina: 6, categorias: [AREAS, LAZER],
    palavrasChave: ["danos", "sede social", "mobiliário", "reparos", "quebrou"],
  }),
  ri("VII", "Não é permitida a prática de esportes com calçado inadequado ao piso;", {
    item: "2", itemTitulo: "Campos de Futebol (quadras gramadas)", subitem: "2.1", pagina: 6, categorias: [LAZER],
    palavrasChave: ["calçado inadequado", "campo de futebol", "chuteira"],
  }),
  ri("VII", "Não é permitida sua utilização quando o gramado estiver encharcado;", {
    item: "2", itemTitulo: "Campos de Futebol (quadras gramadas)", subitem: "2.2", pagina: 6, categorias: [LAZER],
    palavrasChave: ["gramado encharcado", "campo de futebol", "chuva"],
  }),
  ri("VII", "Somente proprietários e parentes diretos [leitura incerta: “poderãouuzat”] os campos de futebol", {
    item: "2", itemTitulo: "Campos de Futebol (quadras gramadas)", subitem: "2.3", pagina: 7, categorias: [LAZER],
    palavrasChave: ["campos de futebol", "parentes diretos", "proprietários"],
    revisao: "O OCR leu “poderãouuzat” (provavelmente “poderão utilizar”). Conferir no PDF original.",
  }),
  ri("VII", "Terão preferência aqueles que possuírem reserva antecipada, que terá duração máxima de até 02 (duas) horas de utilização por dia reservado;", {
    item: "2", itemTitulo: "Campos de Futebol (quadras gramadas)", subitem: "2.4", pagina: 7, categorias: [LAZER],
    palavrasChave: ["reserva", "campo de futebol", "duas horas"],
  }),
  ri("VII", "A utilização do quiosque com churrasqueira só é permitida com a presença do proprietário, o número máximo será de 15 (quinze) convidados mais o proprietário;", {
    item: "3", itemTitulo: "Quiosques com Churrasqueiras", subitem: "3.1", pagina: 7, categorias: [LAZER],
    palavrasChave: ["quiosque", "churrasqueira", "15 convidados", "presença do proprietário"],
  }),
  ri("VII", "A utilização das churrasqueiras será feita mediante reserva antecipada. Na ocorrência de atraso superior a 30 (trinta) minutos do início do horário reservado, o quiosque será liberado para uso por terceiros interessados;", {
    item: "3", itemTitulo: "Quiosques com Churrasqueiras", subitem: "3.2", pagina: 7, categorias: [LAZER],
    palavrasChave: ["churrasqueira", "reserva", "quiosque", "sem reserva"],
  }),
  ri("VII", "A associação não dispõe de acessórios para churrasco (grelhas, espetos, facas, etc), cabendo portanto ao proprietário a disponibilização destes materiais;", { item: "3", itemTitulo: "Quiosques com Churrasqueiras", subitem: "3.3", pagina: 7 }),
  ri("VII", "Será de responsabilidade do proprietário quaisquer danos causados as instalações da Associação;", {
    item: "3", itemTitulo: "Quiosques com Churrasqueiras", subitem: "3.4", pagina: 7, categorias: [LAZER, AREAS],
    palavrasChave: ["quiosque", "danos", "instalações"],
  }),
  ri("VII", "Após o uso o proprietário deverá deixar a área de lazer nas mesmas condições de limpeza em que a encontrou.", {
    item: "3", itemTitulo: "Quiosques com Churrasqueiras", subitem: "3.5", pagina: 7, categorias: [LAZER, LIXO],
    palavrasChave: ["limpeza", "quiosque sujo", "sujeira", "deixou sujo", "churrasqueira suja"],
  }),
  ri("VII", "Não é permitida sua utilização, quando o gramado estiver encharcado;", {
    item: "4", itemTitulo: "Quadras de Vôlei", subitem: "4.1", pagina: 7, categorias: [LAZER],
    palavrasChave: ["vôlei", "gramado encharcado"],
  }),
  ri("VII", "O número máximo é de 05 (cinco) convidados, por proprietário.", {
    item: "4", itemTitulo: "Quadras de Vôlei", subitem: "4.2", pagina: 7, categorias: [LAZER],
    palavrasChave: ["vôlei", "cinco convidados"],
  }),
  ri("VII", "Terão preferência aqueles que possuírem reserva antecipada, que terá duração máxima de até 02 (duas) horas de utilização por dia reservado;", {
    item: "4", itemTitulo: "Quadras de Vôlei", subitem: "4.3", pagina: 7, categorias: [LAZER],
    palavrasChave: ["vôlei", "reserva"],
  }),
  ri("VII", "Só é permitida sua utilização com tênis ou calçados com sola de borracha, ou similar;", {
    item: "5", itemTitulo: "Quadra Poliesportiva e Paredão de Tênis", subitem: "5.1", pagina: 7, categorias: [LAZER],
    palavrasChave: ["quadra poliesportiva", "calçado", "sola de borracha", "tênis"],
  }),
  ri("VII", "Terão preferência aqueles que possuirem reserva antecipada, que terá duração máxima de até 02 (duas) horas de utilização por dia reservado;", {
    item: "5", itemTitulo: "Quadra Poliesportiva e Paredão de Tênis", subitem: "5.2", pagina: 7, categorias: [LAZER],
    palavrasChave: ["quadra poliesportiva", "reserva"],
  }),
  ri("VII", "O número máximo é de 05 (cinco) convidados, por proprietário, independentemente do número de lotes que este possua.", {
    item: "5", itemTitulo: "Quadra Poliesportiva e Paredão de Tênis", subitem: "5.3", pagina: 7, categorias: [LAZER],
    palavrasChave: ["quadra poliesportiva", "cinco convidados"],
  }),
  ri("VII", "As malhas deverão ser retiradas na administração através da assinatura da requisição de materiais pelo proprietário responsável ou seu dependente (pais ou filhos) responsabilizando-se pelas mesmas;", {
    item: "6", itemTitulo: "Quadras de Malhas", subitem: "6.1", pagina: 8, categorias: [LAZER],
    palavrasChave: ["malhas", "requisição"],
  }),
  ri("VII", "O número máximo de convidados será de 05 (cinco) pessoas por proprietário, independentemente do número de lotes que este possua;", {
    item: "6", itemTitulo: "Quadras de Malhas", subitem: "6.2", pagina: 8, categorias: [LAZER],
    palavrasChave: ["malhas", "cinco convidados"],
  }),
  ri("VII", "Não é permitida sua utilização por menores de 12 (doze) anos;", {
    item: "6", itemTitulo: "Quadras de Malhas", subitem: "6.3", pagina: 8, categorias: [LAZER],
    palavrasChave: ["malhas", "menores de 12 anos", "criança"],
  }),
  ri("VII", "Não é permitida sua utilização para fins alheios à prática do jogo de malhas.", {
    item: "6", itemTitulo: "Quadras de Malhas", subitem: "6.4", pagina: 8, categorias: [LAZER],
    palavrasChave: ["malhas", "fins alheios"],
  }),
  ri("VII", "O play-ground tem por finalidade especifica jogos e brincadeiras infantis, destinando-se portanto, às crianças até 10 (dez) anos de idade. Poderá ser utilizado diariamente no horário das 7:00 às 22:00 horas;", {
    item: "7", itemTitulo: "Disposições sobre o uso de Play-Ground", subitem: "7.1", pagina: 8, categorias: [LAZER],
    palavrasChave: ["play-ground", "playground", "parquinho", "crianças", "10 anos", "horário"],
  }),
  ri("VII", "O play-ground será utilizado prioritariamente pelos filhos de proprietários do Empreendimento, sendo permitida a presença de visitantes desde que não prejudique o uso por parte de outros associados;", {
    item: "7", itemTitulo: "Disposições sobre o uso de Play-Ground", subitem: "7.2", pagina: 8, categorias: [LAZER],
    palavrasChave: ["play-ground", "playground", "visitantes"],
  }),
  ri("VII", "Cabe aos senhores pais ou responsáveis orientarem seus filhos ou tutelados a cuidarem da segurança dos mesmos, durante sua permanência no play-ground;", { item: "7", itemTitulo: "Disposições sobre o uso de Play-Ground", subitem: "7.3", pagina: 8 }),
  ri("VII", "Fica vedado o jogo de bola ou qualquer outro jogo organizado nas dependências do play- ground e demais áreas de uso comum;", {
    item: "7", itemTitulo: "Disposições sobre o uso de Play-Ground", subitem: "7.4", pagina: 8, categorias: [JOGOS, LAZER],
    palavrasChave: ["jogo de bola", "bola", "futebol", "play-ground", "áreas de uso comum"],
  }),
  ri("VII", "Os danos causados nas dependências do play-ground serão levados a débito dos associados responsáveis pelos causadores.", {
    item: "7", itemTitulo: "Disposições sobre o uso de Play-Ground", subitem: "7.5", pagina: 8, categorias: [AREAS, LAZER],
    palavrasChave: ["danos", "play-ground", "playground", "brinquedo quebrado"],
  }),
  ri("VII", "A Sede Social se destina exclusivamente a realização de reuniões entre proprietários, jogos de mesa e carteado, ou eventos de interesse da própria Associação;", {
    item: "8", itemTitulo: "Sede Social ou Salão de Reuniões Familiares Bolsão 1", subitem: "8.1", pagina: 8, categorias: [LAZER],
    palavrasChave: ["sede social", "salão", "reuniões"],
  }),
  ri("VII", "Não é permitida a permanência de convidados no salão dos pisos superior e inferior,", {
    item: "8", itemTitulo: "Sede Social ou Salão de Reuniões Familiares Bolsão 1", subitem: "8.2", pagina: 8, categorias: [LAZER],
    palavrasChave: ["sede social", "convidados no salão"],
  }),
  ri("VII", "A permanência de menores de idade no salão do piso superior só será permitida com acompanhamento de pais ou responsáveis;", {
    item: "8", itemTitulo: "Sede Social ou Salão de Reuniões Familiares Bolsão 1", subitem: "8.3", pagina: 8, categorias: [LAZER],
    palavrasChave: ["menores", "salão", "desacompanhados"],
  }),
  ri("VII", "Não é permitida a utilização dos salões para festas ou reuniões de congrassamento com mais de 15 (quinze) proprietários;", {
    item: "8", itemTitulo: "Sede Social ou Salão de Reuniões Familiares Bolsão 1", subitem: "8.4", pagina: 8, categorias: [LAZER],
    palavrasChave: ["festa no salão", "salões", "15 proprietários"],
  }),
  ri("VII", "É terminantemente proibida a utilização de aparelhos de som em qualquer volume, após as 22:00 horas;", {
    item: "8", itemTitulo: "Sede Social ou Salão de Reuniões Familiares Bolsão 1", subitem: "8.5", pagina: 9, categorias: [SOSSEGO, LAZER],
    palavrasChave: ["aparelhos de som", "som", "22:00", "sede social", "salão"],
  }),
  ri("VII", "Das 8:00 as 22:00 horas será permitida a utilização de aparelhos de som dentro de volumes compatíveis com a condição do sossego nas áreas próximas ao prédio.", {
    item: "8", itemTitulo: "Sede Social ou Salão de Reuniões Familiares Bolsão 1", subitem: "8.6", pagina: 9, categorias: [SOSSEGO, LAZER],
    palavrasChave: ["aparelhos de som", "volume", "sossego", "sede social", "salão"],
  }),
  ri("VII", "Lago:\nDefinições:\nLago 1 Represa existente entre os bolsões 1 e 2 que confronta com a Av. João Ernesto Marcelino;\nLago 2-Represa existente ao sul do bolsão 2 que confronta com a Av. João Ernesto Marcelino;\nLago 3- Represa existente nos fundos dos lotes das quadras 80, 81, 100, 101;", { item: "9", itemTitulo: "Lago", pagina: 9 }),
  ri("VII", "É expressamente proibido nadar nos lagos; a associação não dispõe de condições de segurança, ou quaisquer materiais para salvamento, ficando isenta de acidentes que possam acontecer,", {
    item: "9", itemTitulo: "Lago", subitem: "9.1", pagina: 9, categorias: [LAGO],
    palavrasChave: ["nadar", "nadando", "lago", "banho"],
  }),
  ri("VII", "São permitidos esportes náuticos de navegação sem motor a combustão apenas no lago 1; entenda-se por esportes náuticos de navegação, qualquer tipo de embarcação, a vela, a remo, ou motor elétrico que não ultrapasse 01 HP de potência e 06 (seis) metros de comprimento;", {
    item: "9", itemTitulo: "Lago", subitem: "9.2", pagina: 9, categorias: [LAGO],
    palavrasChave: ["barco", "embarcação", "motor a combustão", "jet ski", "lancha", "lago"],
  }),
  ri("VII", "A Associação não se responsabilizará por embarcações que fiquem no lago e imediações;", { item: "9", itemTitulo: "Lago", subitem: "9.3", pagina: 9 }),
  ri("VII", "É permitido pescar apenas no lago 2, com varas, caniços, molinetes e linhadas de mão,", {
    item: "9", itemTitulo: "Lago", subitem: "9.4", pagina: 9, categorias: [LAGO],
    palavrasChave: ["pescar", "pesca", "lago 2", "pescando"],
  }),
  ri("VII", "É expressamente proibido o uso de qualquer tipo de armadilha como, redes, tarrafas, bombas, cercos, covos e outras;", {
    item: "9", itemTitulo: "Lago", subitem: "9.5", pagina: 9, categorias: [LAGO, SILVESTRE],
    palavrasChave: ["armadilha", "rede", "tarrafa", "bombas", "pesca"],
  }),
  ri("VII", "Não é permitido o uso de garatéias, exceto com iscas artificiais;", {
    item: "9", itemTitulo: "Lago", subitem: "9.6", pagina: 9, categorias: [LAGO],
    palavrasChave: ["garatéia", "isca"],
  }),
  ri("VII", "A Diretoria poderá suspender a permissão para pesca sem prévio aviso, em vista de épocas de desovas, implantação de novos peixes ou quaisquer outros motivos que venham a prejudicar a preservação da fauna e flora;", {
    item: "9", itemTitulo: "Lago", subitem: "9.7", pagina: 9, categorias: [LAGO],
    palavrasChave: ["pesca suspensa", "desova"],
  }),
  ri("VII", "Não é permitido qualquer tipo de fogo a qualquer pretexto na beira dos lagos;", {
    item: "9", itemTitulo: "Lago", subitem: "9.8", pagina: 9, categorias: [FOGO, LAGO],
    palavrasChave: ["fogo", "beira do lago", "fogueira", "lago"],
  }),
  ri("VII", "O lixo deverá ser colocado em local adequado;", {
    item: "9", itemTitulo: "Lago", subitem: "9.9", pagina: 9, categorias: [LIXO, LAGO],
    palavrasChave: ["lixo", "lago", "local adequado"],
  }),
  ri("VII", "O proprietário não poderá dar autorizações a convidados seus, para que pesquem nos lagos.", {
    item: "9", itemTitulo: "Lago", subitem: "9.10", pagina: 9, categorias: [LAGO],
    palavrasChave: ["convidados pescando", "pesca", "autorização"],
  }),
  {
    ...ri("VII", "NOTA: A pesca em todo o território nacional é fiscalizada pelo governo federal. Para evitar problemas com a fiscalização, cadastre-se através do pagamento da taxa específica, disponível nas agências do Banco do Brasil.", { item: "9", itemTitulo: "Lago", subitem: "NOTA", pagina: 9 }),
    id: "RI-VII-9-NOTA",
  },
  ri("VII", "A utilização do salão de jogos anexo à lanchonete será livremente permitida aos proprietários, sendo que, permanecerá aberto diariamente no horário das 8:00 às 22:00 horas.", {
    item: "10", itemTitulo: "Salão de Jogos (Anexo a Lanchonete)", pagina: 10,
  }),

  // ───────────── VIII – DA UTILIZAÇÃO RECURSOS DA SEDE ADMINISTRATIVA (pág. 10) ─────────────
  ri("VIII", "O telefone deve ser utilizado somente pelos associados para emergências. É vedada a sua utilização por prestadores de serviços e funcionários de obras, para fins particulares;", {
    item: "1", pagina: 10, categorias: [SEDE], palavrasChave: ["telefone", "prestadores", "fins particulares"],
  }),
  ri("VIII", "A utilização do telefone para fins particulares só será permitida em casos de urgência e por um período máximo de 03 (três) minutos. Neste caso, o responsável deverá preencher formulário especifico para registro da ligação efetuada, com data, hora, quadra, lote e assinatura;", {
    item: "2", pagina: 10, categorias: [SEDE], palavrasChave: ["telefone", "três minutos", "formulário"],
  }),
  ri("VIII", "A emissão de FAX para fins particulares para fora da grande São Paulo (interurbanos) será cobrada oportunamente nos boletos, de acordo com as taxas das companhias telefônicas;", { item: "3", pagina: 10 }),
  ri("VIII", "Para emissão e recebimento de fax particulares os documentos deverão ser retirados pelo interessado na administração em horário comercial;", { item: "4", pagina: 10 }),
  ri("VIII", "Será cobrada a taxa estipulada pela diretoria fixada no quadro de avisos;", { item: "5", pagina: 10 }),
  ri("VIII", "Fax recebidos ou emitidos por particulares com assuntos pertinentes à Associação não serão cobrados, a exemplo da relação de nomes de visitantes de proprietários, croqui de lotes, plantas, etc;", { item: "6", pagina: 10 }),
  ri("VIII", "Não é permitido o fornecimento ou utilização de quaisquer materiais administrativos para fins particulares,", {
    item: "7", pagina: 10, categorias: [SEDE], palavrasChave: ["materiais administrativos", "fins particulares"],
  }),
  ri("VIII", "Não é permitida a utilização do microcomputador e impressora pelos associados ou empregados não habilitados;", {
    item: "8", pagina: 10, categorias: [SEDE], palavrasChave: ["computador", "impressora"],
  }),
  ri("VIII", "É proibido o acesso a disquetes particulares;", { item: "9", pagina: 10 }),
  ri("VIII", "O salão de reuniões da Sede Administrativa poderá ser utilizado para festas, mediante reserva prévia;", {
    item: "10", pagina: 10, categorias: [SEDE, LAZER], palavrasChave: ["salão de reuniões", "festa", "reserva prévia"],
  }),
  ri("VIII", "Todas as consultas aos arquivos da Associação deverão ser realizadas na própria Sede Administrativa, mediante acompanhamento da secretaria, não sendo permitida a remoção de documentos do local. Caso o associado queira, poderá solicitar cópia da documentação mediante pagamento prévio e com expressa autorização da diretoria;", {
    item: "11", pagina: 10, categorias: [SEDE], palavrasChave: ["arquivos", "documentos", "remoção de documentos"],
  }),
  ri("VIII", "Não serão fornecidos cadastros de proprietários e de inadimplentes;", { item: "12", pagina: 10 }),
  ri("VIII", "Para reclamações ou sugestões o proprietário deverá preencher impresso específico, disponível na Administração ou o livro de ocorrências em posse da zeladoria;", { item: "13", pagina: 10 }),
  ri("VIII", "A diretoria deverá manter à disposição dos proprietários na Sede Administrativa, os relatórios atualizados sobre todas as ações judiciais existentes movidas pela e contra a Associação.", { item: "14", pagina: 10 }),

  // ───────────── IX – DA REGULAMENTAÇÃO PARA EDIFICAÇÕES E REFORMAS (pág. 11) ─────────────
  ri("IX", "O proprietário deverá obedecer as determinações da Prefeitura Municipal e demais órgãos públicos competentes referente a utilização e aproveitamento do lote, não podendo fazer instalações prejudiciais aos lotes vizinhos, responsabilizando-se civilmente por eventuais infrações as leis, regulamentos e posturas que devem ser observadas;", {
    item: "1", pagina: 11, categorias: [CONSTRUCAO],
    palavrasChave: ["prefeitura", "instalações prejudiciais", "lotes vizinhos", "vizinho"],
  }),
  ri("IX", "Além da observância das leis, regulamentos e posturas referidas na cláusula anterior, deverá ainda o proprietário observar supletiva e cumulativamente, as restrições de ordem específica, estabelecidas no compromisso original de compra e venda de lotes, que regula o direito de utilização e aproveitamento dos lotes, visando proteger os proprietários contra o uso indevido e danoso dos imóveis;", {
    item: "2", pagina: 11, categorias: [CONSTRUCAO],
    palavrasChave: ["compromisso de compra e venda", "restrições", "uso indevido"],
  }),
  ri("IX", "O projeto deverá ser analisado pela Associação e aprovado pelos órgãos dos poderes públicos competentes;", {
    item: "3", pagina: 11, categorias: [CONSTRUCAO],
    palavrasChave: ["projeto", "aprovação", "sem projeto", "obra sem aprovação", "construção irregular"],
  }),
  ri("IX", "Nos lotes residenciais não será permitida a construção de prédios para fins comerciais, industriais ou escritórios;", {
    item: "4", pagina: 11, categorias: [CONSTRUCAO, NAO_RESIDENCIAL],
    palavrasChave: ["fins comerciais", "industriais", "escritórios", "prédio comercial"],
  }),
  ri("IX", "A localização do poço, sendo o caso, e o sistema de esgotos, serão determinados pela Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha. Para tanto o proprietário deverá consultar a Associação antes do início do projeto da construção;", {
    item: "5", pagina: 11, categorias: [CONSTRUCAO, ESGOTO],
    palavrasChave: ["poço", "esgoto", "fossa", "sistema de esgotos"],
  }),
  ri("IX", "O horário de trabalho permitido nas obras é de Segunda-feira à Sexta-feira, das 7:00 às 18:00 horas e aos sábados das 7:00 às 14:00 horas.", {
    item: "6", pagina: 11, categorias: [OBRA_HORARIO],
    palavrasChave: ["horário de obra", "obra fora do horário", "obra", "pedreiro", "domingo", "feriado", "sábado", "após 18h", "antes das 7h"],
  }),
  ri("IX", "É proibida a entrada de caminhões, tratores, basculantes e qualquer tipo de veículo para entrega de materiais de construção, jardinagem e afins aos sábados (não será permitido, no sábado após 14:00 entrada de caminhões com mudanças e entrega de móveis e eletrodomésticos). Os casos omissos serão avaliados pela Diretoria;", {
    item: "6", subitem: "6.1", pagina: 11, categorias: [CAMINHOES, OBRA_HORARIO],
    palavrasChave: ["caminhão", "caminhões", "tratores", "basculantes", "entrega", "sábado", "mudança", "materiais de construção"],
  }),
  ri("IX", "Não será permitida a utilização das calçadas da associação como depósito de material, sendo que em caso de necessidade extrema, poder-se-á ocupar transitoriamente até a faixa correspondente à terça parte da largura da calçada quando do descarregamento de materiais de construção;", {
    item: "7", pagina: 11, categorias: [MATERIAL],
    palavrasChave: ["calçada", "calçadas", "depósito de material", "material na calçada", "materiais de construção", "areia", "entulho"],
  }),
  ri("IX", "Em hipótese alguma, será permitido o despejo de águas servidas, sem o devido tratamento, nas galerias ou canaletas pluviais do arruamento;", {
    item: "8", pagina: 11, categorias: [ESGOTO],
    palavrasChave: ["águas servidas", "esgoto", "canaletas", "galerias pluviais", "despejo"],
  }),
  ri("IX", "O item \"21\" do Compromisso original de Compra e Venda proíbe faixas e letreiros, exclui-se deste caso, a placa de identificação do Engenheiro e ou Arquiteto responsável pela obra com suas informações exigidas pelos Órgãos. Públicos;", {
    item: "9", pagina: 11, categorias: [PLACAS],
    palavrasChave: ["faixas", "letreiros", "placa", "obra"],
  }),
  ri("IX", "É obrigatório a construção de banheiro provisório;", {
    item: "10", pagina: 11, categorias: [CONSTRUCAO],
    palavrasChave: ["banheiro provisório", "obra sem banheiro"],
  }),
  ri("IX", "As construções fora do corpo principal do imóvel, destinadas a lazer serão objeto de análise pela associação e só serão permitidas após a conclusão da cobertura da residência principal;", {
    item: "11", pagina: 11, categorias: [CONSTRUCAO],
    palavrasChave: ["edícula", "construção de lazer", "cobertura da residência"],
  }),
  ri("IX", "Não é permitido a construção do corpo principal, com menos de 90 m² (noventa metros quadrados)", {
    item: "12", pagina: 11, categorias: [CONSTRUCAO],
    palavrasChave: ["90 m²", "metragem", "área mínima"],
  }),

  // ───────────── X – DA COMERCIALIZAÇÃO DE LOTES (pág. 12) ─────────────
  ri("X", "É expressamente proibida a colocação de placas, faixas ou letreiros nos lotes ou residências;", {
    item: "1", pagina: 12, categorias: [PLACAS],
    palavrasChave: ["placas", "faixas", "letreiros", "vende-se", "aluga-se"],
  }),
  ri("X", "As vendas realizadas por imobiliárias só serão permitidas mediante cadastro prévio na Associação, mediante apresentação do CRECI correspondente;", {
    item: "2", pagina: 12, categorias: [COMERCIALIZACAO],
    palavrasChave: ["imobiliária", "corretor", "CRECI", "cadastro"],
  }),
  ri("X", "É permitida a transação do imóvel pelo proprietário, desde que seja realizada diretamente por ele e sem a utilização de prepostos não habilitados;", {
    item: "3", pagina: 12, categorias: [COMERCIALIZACAO],
    palavrasChave: ["transação", "prepostos não habilitados", "venda"],
  }),

  // ───────────── XI – DAS TAXAS DA ASSOCIAÇÃO (pág. 12) ─────────────
  ri("XI", "Além da obrigatoriedade moral e cívica do pagamento das taxas da Associação, os Associados deverão respeitar as cláusulas previstas nos Estatutos;", {
    item: "1", pagina: 12, categorias: [INADIMPLENCIA], palavrasChave: ["pagamento", "taxas"],
  }),
  ri("XI", "Considerar-se-á inadimplente todo associado que incorrer na falta de pagamento de qualquer taxa de manutenção, novos investimentos aprovados em Assembléia, multas, consumo de água ou aquisição de bens ou equipamentos da Associação;", {
    item: "2", pagina: 12, categorias: [INADIMPLENCIA], palavrasChave: ["inadimplente", "falta de pagamento", "taxa de manutenção", "multas"],
  }),
  ri("XI", "Caberá à diretoria decidir quanto às negociações e formas de pagamento das taxas com atraso.", { item: "3", pagina: 12 }),

  // ───────────── XII – DO REGULAMENTO (pág. 12) — tópico sem itens numerados ─────────────
  ri("XII", "O presente Regulamento entrará em vigor dentro de trinta dias.\nO presente regulamento poderá ser revisto mediante aprovação em Assembléia especialmente convocada para esta finalidade.", { pagina: 12 }),

  // ───────────── XIII – DA ISENÇÃO DE RESPONSABILIDADES (pág. 12) ─────────────
  ri("XIII", "Por acidentes ou danos de ordem pessoal ou material, bem como extravios, estragos, quebra de instalações ou objetos que, em qualquer circunstância ou ocasião, sofram os associados, locatários- usuários. Não responde também, por objetos ou coisas confiadas aos empregados da associação;", { item: "1", pagina: 12 }),
  ri("XIII", "Por furtos e roubos de que sejam vitimas, dentro do loteamento, os associados, inquilinos, ocupantes ou estranhos, em quaisquer circunstâncias e ocasiões;", { item: "2", pagina: 12 }),
  ri("XIII", "Pela interrupção eventual que se verificar no loteamento, em qualquer ocasião, do serviço de eletricidade, gás e telefone, seja qual for a causa, ou pela falta de água em casos fortuitos;", { item: "3", pagina: 12 }),
  ri("XIII", "Qualquer dano causado ao loteamento (partes comuns) e as suas benfeitorias e acessórios por proprietários, inquilinos ou visitantes, acarretará a devida advertência ao responsável, o qual arcará totalmente com as despesas de reparação, mediante conta apresentada pela administradora, diretoria ou zeladoria, independentemente da multa prevista na lei e nos Estatutos.", {
    item: "4", pagina: 12, categorias: [AREAS],
    palavrasChave: ["dano", "danificou", "partes comuns", "benfeitorias", "quebrou", "vandalismo", "reparação", "advertência"],
  }),

  // ───────────── XIV – FOGO (pág. 13) ─────────────
  ri("XIV", "É proibido acender fogueira ou qualquer outro tipo de fogo em áreas comuns;", {
    item: "1", pagina: 13, categorias: [FOGO],
    palavrasChave: ["fogueira", "fogo", "áreas comuns", "acender fogo"],
  }),
  ri("XIV", "De acordo com a legislação ambiental, é proibido fazer queimadas de lixo e folhagens em toda a área de manancial;", {
    item: "2", pagina: 13, categorias: [FOGO, LIXO],
    palavrasChave: ["queimada", "queimadas", "queimar lixo", "folhagens", "manancial", "fumaça", "queimando folhas"],
  }),
  ri("XIV", "É proibido por lei federal soltarem-se balões.", {
    item: "3", pagina: 13, categorias: [BALAO],
    palavrasChave: ["balão", "balões"],
  }),

  // ───────────── XV – ATOS DISCIPLINARES (pág. 13) ─────────────
  ri("XV", "A diretoria deverá fiscalizar o cumprimento do regulamento e, no caso do descumprimento, tomará as medidas legais necessárias e aplicará as ações disciplinares internas previstas neste regulamento;", { item: "1", pagina: 13 }),
  ri("XV", "Além das previstas na legislação vigente, aos infratores do Regulamento Interno, serão aplicadas na ordem descrita abaixo:", { item: "2", pagina: 13 }),
  ri("XV", "Carta convite para diálogo com a diretoria ou comissões;", { item: "2", subitem: "2.1", pagina: 13 }),
  ri("XV", "Notificação por escrito, com prazo para atendimento se for o caso;", { item: "2", subitem: "2.2", pagina: 13 }),
  ri("XV", "Multa no valor de até uma taxa da Associação;", { item: "2", subitem: "2.3", pagina: 13 }),
  ri("XV", "Nos casos de reincidência a multa será dobrada;", { item: "2", subitem: "2.4", pagina: 13 }),
  ri("XV", "Considera-se reincidente, o infrator associado, dependente ou visitante que, dentro de um prazo de 12 (doze) meses, repetir a falta;", { item: "3", pagina: 13 }),
  ri("XV", "As multas serão decididas pela diretoria. Os casos omissos serão avaliados pela diretoria junto com as comissões;", { item: "4", pagina: 13 }),
  ri("XV", "Caberá recurso ao proprietário no prazo de 30 (trinta) dias a partir do recebimento da notificação ou multa;", { item: "5", pagina: 13 }),
  ri("XV", "Ao zelador, seguranças é delegado o direito de coibir qualquer descumprimento do Regulamento Interno;", { item: "6", pagina: 13 }),
  ri("XV", "Tornam-se sem efeito todas as disposições contrárias a este Regulamento.", { item: "7", pagina: 13 }),
];
