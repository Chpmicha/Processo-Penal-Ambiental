const DEFAULT_EMPTY_DATA = {
  TIPO_DOCUMENTO: "NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL",
  NOME_INFRATOR: "",
  LEI_ENQUADRAMENTO: "",
  AIA_NUMERO: "",
  NUMERO_SADE: "",
  DATA_FATO: "",
  HORA_FATO: "",
  ENDEREÇO: "",
  COORDENADAS_UTM: "",
  AGENTES_ATENDENTES: "",
  RESUMO_RELATORIO_FISCALIZACAO: "",
  PROCESSO_GAIA: "",
  PROCESSO_SGPE: "",
  TE_NUMERO: "",
  DESCRICAO_TE: "",
  BO_NUMERO: "",
  DATA_ATUAL: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
  AUTORIDADE_NOME: "Andréia Cristina Fergitz",
  AUTORIDADE_CARGO: "Tenente Coronel PM - Comandante do 2ºBPMA"
};

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({ status: "ok", data: DEFAULT_EMPTY_DATA });
}
