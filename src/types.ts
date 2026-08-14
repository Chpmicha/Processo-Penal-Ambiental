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
}

export interface ProcessingHistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  infrator: string;
  tipoDocumento: string;
  data: ExtractedData;
}
