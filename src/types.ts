export interface UnitInfo {
  id: string;
  name: string;
  subtitulo: string;
  endereco: string;
  contato: string;
  cidade: string;
  autoridadeNome: string;
  autoridadeCargo: string;
  municipios?: string[];
}

export const UNIDADES_2BPMA: UnitInfo[] = [
  {
    id: "chapeco",
    name: "2º BPMA | 1ª CIA - Chapecó",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Av. Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000",
    contato: "Fone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br",
    cidade: "Chapecó",
    autoridadeNome: "Guilherme Wildner Wolf",
    autoridadeCargo: "Capitão PM - Comandante da 1ª Cia do 2º BPMA",
    municipios: [
      "Chapecó", "Chapeco", "Xanxerê", "Xanxere", "Xaxim", "Coronel Freitas",
      "Guatambu", "Cordilheira Alta", "Nova Itaberaba", "Pinhalzinho",
      "Seara", "Faxinal dos Guedes", "Abelardo Luz", "São Lourenço do Oeste",
      "Sao Lourenco do Oeste", "Caxambu do Sul", "Águas de Chapecó", "Aguas de Chapeco",
      "Planalto Alegre", "São Carlos", "Sao Carlos"
    ],
  },
  {
    id: "concordia",
    name: "2º BPMA | 1ª CIA | 1º Pel | 2º GP - Concórdia",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Tv. Cabo Zamarki, nº 100, Bairro Nossa Senhora da Salete, Concórdia-SC, CEP 89700-360",
    contato: "Fone: (49) 3441-3719 | E-mail: 2bpma1c1p2gconcordiap3@pm.sc.gov.br",
    cidade: "Concórdia",
    autoridadeNome: "Guilherme Wildner Wolf",
    autoridadeCargo: "Capitão PM - Comandante da 1ª Cia do 2º BPMA",
    municipios: [
      "Concórdia", "Concordia", "Itá", "Ita", "Ipumirim", "Arabutã", "Arabuta",
      "Lindóia do Sul", "Lindoia do Sul", "Piratuba", "Ipira",
      "Presidente Castello Branco", "Peritiba", "Alto Bela Vista", "Jaborá", "Jabora"
    ],
  },
  {
    id: "smo",
    name: "2º BPMA | 1ª CIA | 2º Pel - São Miguel do Oeste",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Vinte e Um de Abril, 1657 - Centro, São Miguel do Oeste-SC, CEP 89900-000",
    contato: "Fone: (49) 3631-7481 | E-mail: 2bpma1c2ppmasmop3@pm.sc.gov.br",
    cidade: "São Miguel do Oeste",
    autoridadeNome: "Alcenir Luis Minuscoli",
    autoridadeCargo: "Capitão PM - Comandante do 2º Pelotão da 1ª Cia do 2º BPMA",
    municipios: [
      "São Miguel do Oeste", "Sao Miguel do Oeste", "Maravilha", "Dionísio Cerqueira",
      "Dionisio Cerqueira", "Itapiranga", "Iporã do Oeste", "Ipora do Oeste",
      "Descanso", "Guaraciaba", "Anchieta", "Campo Erê", "Campo Ere",
      "Mondaí", "Mondai", "Palma Sola", "Cunha Porã", "Cunha Pora", "São José do Cedro", "Sao Jose do Cedro"
    ],
  },
  {
    id: "lages",
    name: "2º BPMA | 2ª CIA - Lages",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Archilau Batista do Amaral, s/nº, Universitário, Lages-SC, CEP 88.511-130",
    contato: "Fone: (49) 3289-8576 | E-mail: 2bpma2clagesp3@pm.sc.gov.br",
    cidade: "Lages",
    autoridadeNome: "Jardel da Silva",
    autoridadeCargo: "Major PM - Comandante da 2ª Cia do 2º BPMA",
    municipios: [
      "Lages", "São Joaquim", "Sao Joaquim", "Urupema", "Urubici", "Bocaina do Sul",
      "Painel", "Correia Pinto", "Otacílio Costa", "Otacilio Costa", "Palmeira",
      "Bom Retiro", "Bom Jardim da Serra", "Anita Garibaldi", "Campo Belo do Sul",
      "Capão Alto", "Capao Alto", "Cerro Negro", "São José do Cerrito", "Sao Jose do Cerrito", "Ponte Alta"
    ],
  },
  {
    id: "curitibanos",
    name: "2º BPMA | 2ª CIA | 1º Pel | 3º GP - Curitibanos",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Barão do Rio Branco, nº 549, Centro, Curitibanos-SC, CEP 89520-000",
    contato: "Fone: (49) 3221-7978 | E-mail: 2bpma2clagesp3@pm.sc.gov.br",
    cidade: "Curitibanos",
    autoridadeNome: "Jardel da Silva",
    autoridadeCargo: "Major PM - Comandante da 2ª Cia do 2º BPMA",
    municipios: [
      "Curitibanos", "São Cristóvão do Sul", "Sao Cristovao do Sul",
      "Ponte Alta do Norte", "Santa Cecília", "Santa Cecilia", "Frei Rogério",
      "Frei Rogerio", "Brunópolis", "Brunopolis", "Monte Carlo"
    ],
  },
  {
    id: "joacaba",
    name: "2º BPMA | 2ª CIA | 2º Pel - Joaçaba",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Armindo Raimundo Heberle, 315 - Vila Remor, Joaçaba-SC, CEP 89600-000",
    contato: "Fone: (49) 3554-8950 | E-mail: 2bpma2c2pjoacabap3@pm.sc.gov.br",
    cidade: "Joaçaba",
    autoridadeNome: "Diego Porto",
    autoridadeCargo: "Capitão PM - Comandante do 2º Pelotão da 2ª Cia do 2º BPMA",
    municipios: [
      "Joaçaba", "Joacaba", "Herval d'Oeste", "Herval d Oeste", "Luzerna",
      "Campos Novos", "Capinzal", "Ouro", "Catanduvas", "Água Doce", "Agua Doce",
      "Treze Tílias", "Treze Tilias", "Ibicaré", "Ibicare", "Tangará", "Tangara", "Pinheiro Preto"
    ],
  },
  {
    id: "canoinhas",
    name: "2º BPMA | 3ª CIA - Canoinhas",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Duque de Caxias, nº 576, Centro, Canoinhas-SC, CEP 89460-102",
    contato: "Fone: (47) 3431-8775 | E-mail: 2bpma3ccanoinhasp3@pm.sc.gov.br",
    cidade: "Canoinhas",
    autoridadeNome: "Edimar Boarão",
    autoridadeCargo: "1º Tenente PM - Comandante da 3ª Cia do 2º BPMA",
    municipios: [
      "Canoinhas", "Três Barras", "Tres Barras", "Major Vieira", "Bela Vista do Toldo",
      "Irineópolis", "Irineopolis", "Papanduva", "Mafra", "Itaiópolis", "Itaiopolis", "Monte Castelo"
    ],
  },
  {
    id: "porto_uniao",
    name: "2º BPMA | 3ª CIA | 2º Pel | 1º GP - Porto União",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Nilo Peçanha, nº. 1435, bairro São Pedro, Porto União-SC, CEP 89400-000",
    contato: "Fone: (47) 3431-8773 | E-mail: 2bpma3ccanoinhasp3@pm.sc.gov.br",
    cidade: "Porto União",
    autoridadeNome: "Edimar Boarão",
    autoridadeCargo: "1º Tenente PM - Comandante da 3ª Cia do 2º BPMA",
    municipios: ["Porto União", "Porto Uniao", "Matos Costa", "Calmon"],
  },
  {
    id: "cacador",
    name: "2º BPMA | 3ª CIA | 2º Pel | 2º GP - Caçador",
    subtitulo: "2º Batalhão de Polícia Militar Ambiental",
    endereco: "Rua Nelson Eugênio Busato, nº 890, Bom Sucesso, Caçador-SC, CEP 89501-260",
    contato: "Fone: (47) 3554-8945 | E-mail: 2bpma3ccanoinhasp3@pm.sc.gov.br",
    cidade: "Caçador",
    autoridadeNome: "Edimar Boarão",
    autoridadeCargo: "1º Tenente PM - Comandante da 3ª Cia do 2º BPMA",
    municipios: [
      "Caçador", "Cacador", "Lebon Régis", "Lebon Regis", "Rio das Antas",
      "Timbó Grande", "Timbo Grande", "Macieira", "Videira", "Fraiburgo",
      "Arroio Trinta", "Salto Veloso", "Iomerê", "Iomere"
    ],
  },
];

export interface ExtractedData {
  TIPO_DOCUMENTO: string;
  NOME_INFRATOR: string;
  LEI_ENQUADRAMENTO: string;
  AIA_NUMERO: string;
  NUMERO_SADE: string;
  DATA_FATO: string;
  HORA_FATO: string;
  ENDEREÇO: string;
  COORDENADAS_UTM: string;
  AGENTES_ATENDENTES: string;
  RESUMO_RELATORIO_FISCALIZACAO: string;
  PROCESSO_GAIA: string;
  PROCESSO_SGPE: string;
  TE_NUMERO: string;
  DESCRICAO_TE: string;
  BO_NUMERO: string;
  DATA_ATUAL: string;
  ANEXOS_LISTA?: string;
  AUTORIDADE_NOME?: string;
  AUTORIDADE_CARGO?: string;
  UNIDADE_ID?: string;
  UNIDADE_NOME?: string;
  UNIDADE_ENDERECO?: string;
  UNIDADE_CONTATO?: string;
  CIDADE_FECHO?: string;
}

export interface ProcessingHistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  infrator: string;
  tipoDocumento: string;
  data: ExtractedData;
}

