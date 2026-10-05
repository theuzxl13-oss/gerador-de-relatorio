/**
 * Dicionário de categorias de ocorrência e seus sinônimos.
 *
 * Cada categoria agrupa expressões que o funcionário costuma usar ao relatar
 * uma ocorrência. A categoria é o "elo" entre a linguagem simples da
 * ocorrência e as normas cadastradas (campo `categorias` de cada norma).
 *
 * Convenções dos termos:
 *  - escritos sem acento e em minúsculas (a comparação é feita após normalização);
 *  - podem ter várias palavras ("som alto");
 *  - o sufixo "*" indica prefixo de palavra ("barulh*" casa com barulho, barulhento...).
 *
 * Este arquivo NÃO contém normas. Uma categoria sem norma correspondente na
 * Base Normativa nunca gera fundamentação.
 */

export interface CategoriaOcorrencia {
  nome: string;
  termos: string[];
}

export const CATEGORIAS: CategoriaOcorrencia[] = [
  {
    nome: "Perturbação de sossego",
    termos: [
      "sossego", "perturbacao", "perturb*", "barulh*", "som alto", "som muito alto", "som", "musica*",
      "volume alto", "alto volume", "caixa de som", "paredao", "festa*", "grit*", "algazarra", "baderna",
      "ruido*", "zoada", "zuada", "bagunca", "tranquilidade", "silencio", "incomod*", "intranquil*",
      "reuniao ruidosa", "karaoke", "batuque", "pagode", "rojao", "rojoes", "fogos de artificio",
    ],
  },
  {
    nome: "Obra fora do horário permitido",
    termos: [
      "obra fora do horario", "obra no domingo", "obra domingo", "obra no feriado", "trabalhando na obra",
      "obra", "obras", "pedreiro*", "betoneira", "britadeira", "martel*", "serra eletrica", "furadeira",
      "construindo", "reforma*", "servico de obra", "fora do horario",
    ],
  },
  {
    nome: "Transtornos causados por obra",
    termos: [
      "obra", "obras", "reforma*", "construcao", "poeira", "sujeira da obra", "lama",
      "pedreiro*", "trabalhadores da obra",
    ],
  },
  {
    nome: "Material/entulho em área comum",
    termos: [
      "entulho*", "material de construcao", "materiais de construcao", "material", "materiais", "areia",
      "pedra", "pedras", "brita", "tijolo*", "bloco*", "cimento", "cacamba*", "madeira*",
      "telha*", "ferragem", "calcada*", "na rua", "via publica", "alameda*", "area comum", "areas comuns",
      "praca", "obstru*", "desimpedid*", "moveis na rua", "objetos na rua", "deixou na rua",
      "jogou na rua", "despejou", "deposit*",
    ],
  },
  {
    nome: "Descarte irregular de lixo",
    termos: [
      "lixo", "lixos", "lixeira*", "saco de lixo", "sacos de lixo", "descart*", "residuo*", "coleta",
      "fora do dia", "dia de coleta", "jogou lixo", "lixo na rua", "restos", "podas", "galhos",
    ],
  },
  {
    nome: "Queimada / fogo",
    termos: [
      "queimad*", "queima*", "queimou", "fogo", "fogueira", "fumaca", "incendio", "ateou fogo",
      "pondo fogo", "colocou fogo", "botou fogo", "queimando lixo", "queimando folhas", "brasa",
    ],
  },
  {
    nome: "Soltura de balões",
    termos: ["balao", "baloes", "soltou balao", "soltando balao"],
  },
  {
    nome: "Excesso de velocidade",
    termos: [
      "velocidade", "alta velocidade", "em alta", "correndo", "corrida", "racha", "acelerando",
      "acelerou", "rapido demais", "muito rapido", "30 km", "30km", "km/h", "kmh", "imprudencia",
      "cantando pneu",
    ],
  },
  {
    nome: "Veículo com ruído / modificado",
    termos: [
      "escapamento*", "descarga aberta", "descarga livre", "moto barulhenta", "carro barulhento",
      "som automotivo", "veiculo modificado", "ruido de veiculo", "estouro de escapamento",
    ],
  },
  {
    nome: "Estacionamento irregular",
    termos: [
      "estacion*", "parado na rua", "parou na rua", "onibus", "caminhao parado", "caminhao estacionado",
      "obstruindo", "bloqueando", "bloqueou", "trancando", "fechando a rua", "na frente da garagem",
    ],
  },
  {
    nome: "Condução sem habilitação",
    termos: [
      "sem habilitacao", "sem carteira", "nao habilitado", "inabilitado", "menor dirigindo",
      "crianca dirigindo", "adolescente dirigindo", "menor de idade dirigindo", "dirigindo sem",
      "pilotando sem", "cartao de identificacao", "sem cartao",
    ],
  },
  {
    nome: "Animal causando transtorno",
    termos: [
      "animal", "animais", "cachorro*", "cao", "caes", "cadela", "pitbull", "rottweiler", "gato*",
      "cavalo*", "agressiv*", "bravo", "atacou", "mordeu", "mordida", "solto", "soltos", "sem coleira",
      "sem guia", "latido*", "latindo", "fezes",
    ],
  },
  {
    nome: "Captura de animal silvestre",
    termos: [
      "silvestre*", "passaro*", "passarinho*", "gaiola", "alcapao", "armadilha*", "captur*", "caca",
      "cacando", "aprisionou", "capivara", "tucano", "sagui", "mico",
    ],
  },
  {
    nome: "Construção irregular",
    termos: [
      "construcao irregular", "obra irregular", "obra sem aprovacao", "sem projeto", "projeto nao aprovado",
      "sem aprovacao", "sem alvara", "irregular", "embarg*", "ampliacao", "edicula", "puxadinho",
      "construcao", "construiu", "construindo", "edificacao", "banheiro provisorio", "metragem",
    ],
  },
  {
    nome: "Remoção de árvores / fechamento fora do lote",
    termos: [
      "arvore*", "cortou arvore", "corte de arvore", "derrub*", "desmat*", "remocao de arvore",
      "cerca fora", "muro fora", "fora da divisa", "fora do lote", "fechamento", "invadiu area",
      "invasao de area", "cercou",
    ],
  },
  {
    nome: "Dano a áreas verdes / comuns",
    termos: [
      "area verde", "areas verdes", "dano*", "danific*", "quebr*", "vandal*", "depred*", "pichac*",
      "pichou", "destruiu", "estragou", "arrancou planta*", "plantas", "jardim", "gramado",
    ],
  },
  {
    nome: "Serviço mecânico em área comum",
    termos: [
      "mecanica", "mecanico", "conserto de carro", "consertando carro", "funilaria", "pintura de carro",
      "oficina", "trocando oleo", "troca de oleo", "motor",
    ],
  },
  {
    nome: "Jogos em local inadequado",
    termos: [
      "jogando bola", "bola na rua", "futebol na rua", "jogo na rua", "jogos", "jogando", "partida",
    ],
  },
  {
    nome: "Uso irregular das áreas de lazer",
    termos: [
      "area de lazer", "areas de lazer", "quiosque*", "churrasqueira*", "churrasco*", "piquenique",
      "pick-nick", "convidad*", "quadra", "quadras", "campo de futebol", "campo", "volei", "tenis",
      "malha*", "play-ground", "playground", "parquinho", "brinquedo*", "sede social", "salao",
      "baixo calao", "palavrao", "palavroes", "reserva", "sem reserva",
    ],
  },
  {
    nome: "Uso irregular dos lagos",
    termos: [
      "lago*", "represa", "nadando", "nadar", "nadou", "banho no lago", "pesca*", "pescar", "pescando",
      "rede de pesca", "tarrafa", "garateia", "barco*", "jet ski", "jetski", "lancha", "embarcac*",
    ],
  },
  {
    nome: "Despejo de águas servidas / esgoto",
    termos: [
      "esgoto*", "agua servida", "aguas servidas", "fossa", "canaleta*", "galeria pluvial",
      "boca de lobo", "agua suja", "despejo de agua", "vazamento de esgoto", "mau cheiro de esgoto",
    ],
  },
  {
    nome: "Placas, faixas ou letreiros",
    termos: ["placa*", "faixa*", "letreiro*", "vende-se", "vende se", "aluga-se", "aluga se", "anuncio*", "propaganda"],
  },
  {
    nome: "Inadimplência",
    termos: ["inadimpl*", "taxa*", "boleto*", "atraso no pagamento", "nao pagou", "debito*", "mensalidade"],
  },
  {
    nome: "Desrespeito à Diretoria / funcionários",
    termos: [
      "desrespeit*", "desacat*", "xing*", "ofend*", "ofensa*", "ameac*", "agrediu", "agressao verbal",
      "desobedec*", "recusou", "nao acatou", "ignorou", "porteiro*", "seguranca*", "vigilante*",
      "zelador*", "funcionario da associacao", "diretoria", "orientacao",
    ],
  },
  {
    nome: "Identificação e controle de acesso",
    termos: [
      "identificac*", "identificar", "sem identificacao", "portaria", "acesso", "entrada",
      "entrou sem", "nao se identificou", "documento", "cadastro", "cadastrar", "nao cadastrado",
      "visitante nao avisado", "nao avisou", "revista", "revistar", "prestador*",
    ],
  },
  {
    nome: "Uso não residencial do imóvel",
    termos: [
      "comercio", "comercial", "loja", "escritorio", "empresa", "atividade comercial", "vendendo",
      "pousada", "hospedagem", "industria", "fabrica",
    ],
  },
  {
    nome: "Substância ou material perigoso",
    termos: [
      "inflamav*", "explosiv*", "gasolina", "combustivel", "botijo*", "gas", "produto quimico",
      "perigo*", "mau odor", "mau cheiro", "odor", "fedor", "cheiro forte",
    ],
  },
  {
    nome: "Locação / cessão sem comunicação",
    termos: [
      "inquilino*", "locatari*", "locacao", "aluguel", "alugou", "alugado", "comodat*", "temporada",
      "cessao", "vendeu", "venda do imovel", "novo proprietario", "comprador",
    ],
  },
  {
    nome: "Uso indevido do nome da Associação",
    termos: ["nome da associacao", "em nome da associacao", "usou o nome", "se passou"],
  },
  {
    nome: "Uso irregular da Sede Administrativa",
    termos: ["telefone", "fax", "computador", "impressora", "sede administrativa", "arquivo*", "material administrativo"],
  },
  {
    nome: "Relação com empregados da Associação",
    termos: [
      "chave*", "deixou a chave", "empregado da associacao", "funcionario da associacao", "mandou o funcionario",
      "deu ordem", "alterou o servico", "autorizou terceiros",
    ],
  },
  {
    nome: "Comercialização irregular de lotes",
    termos: ["imobiliaria*", "corretor*", "creci", "venda de lote", "vendendo lote"],
  },
  {
    nome: "Entrada de caminhões / entregas em horário vedado",
    termos: [
      "caminhao", "caminhoes", "trator*", "basculante*", "entrega*", "mudanca*", "frete",
      "caminhao no sabado", "entrega no sabado", "material de construcao no sabado",
    ],
  },
  {
    nome: "Descumprimento de normas da Associação",
    termos: [
      "descumpriu", "descumprimento", "regulamento", "estatuto", "norma*", "regra*", "infracao", "infringiu",
    ],
  },
];

/** Expressões que indicam período noturno / após 22h na descrição. */
export const TERMOS_NOTURNOS = [
  "madrugada", "noite", "a noite", "de noite", "noturno", "depois das 22", "apos as 22", "apos 22",
  "depois das 10", "22h", "22 h", "22:00", "23h", "23:00", "meia noite", "meia-noite", "0h", "1h", "2h", "3h",
];

/** Expressões que indicam domingo/feriado na descrição. */
export const TERMOS_DOMINGO = ["domingo", "feriado"];
export const TERMOS_SABADO = ["sabado"];
