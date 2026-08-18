import PizZip from "pizzip";

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

function replaceDocxXmlPlaceholders(xmlString: string, data: Record<string, string>): string {
  let updatedXml = xmlString;
  const dict: Record<string, string> = { ...data };
  if (data.ENDEREÇO && !dict.ENDERECO) dict.ENDERECO = data.ENDEREÇO;
  if (data.ENDERECO && !dict.ENDERECO) dict.ENDEREÇO = data.ENDERECO;
  if (dict.TIPO_DOCUMENTO && dict.TIPO_DOCUMENTO.toUpperCase().includes("CIRCUNST")) {
    dict.TIPO_DOCUMENTO = "TERMO CIRCUNSTANCIADO";
  }
  if (!dict.AUTORIDADE_NOME) dict.AUTORIDADE_NOME = "Andréia Cristina Fergitz";
  if (!dict.AUTORIDADE_CARGO) dict.AUTORIDADE_CARGO = "Tenente Coronel PM - Comandante do 2ºBPMA";
  if (!dict.DATA_ATUAL || dict.DATA_ATUAL.includes("MODELO")) {
    const now = new Date();
    dict.DATA_ATUAL = now.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  }

  const escapeXml = (unsafe: string) => {
    return String(unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  for (const [key, rawVal] of Object.entries(dict)) {
    const val = escapeXml(rawVal);
    const patterns = [
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
      new RegExp(`\\{${key}\\}`, "g"),
    ];
    for (const pattern of patterns) {
      updatedXml = updatedXml.replace(pattern, val);
    }
  }

  return updatedXml;
}

function createDefaultDocxBuffer(data: Record<string, string>): Buffer {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  let anexosXml = "";
  let anexosList: string[] = [];
  if (data.ANEXOS_LISTA && data.ANEXOS_LISTA.trim().length > 0) {
    anexosList = data.ANEXOS_LISTA.split("\n").map(s => s.trim()).filter(s => s.length > 0);
  } else {
    anexosList = [
      `1. Boletim de Ocorrência nº ${data.BO_NUMERO || "---"};`,
      `2. Auto de Infração Ambiental n. ${data.AIA_NUMERO || "---"};`,
      `3. Termo de Embargo/Suspensão n. ${data.TE_NUMERO || "---"};`,
      `4. Relatório de Fiscalização;`,
      `5. Relatório fotográfico, mapas e listas de coordenadas;`,
      `6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.`
    ];
  }

  anexosList.forEach((anexo) => {
    anexosXml += `
    <w:p>
      <w:pPr><w:ind w:left="360"/><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">${anexo}</w:t></w:r>
    </w:p>`;
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="left"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>POLÍCIA MILITAR DE SANTA CATARINA</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="left"/><w:spacing w:after="60"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>2º Batalhão de Polícia Militar Ambiental</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="left"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="left"/><w:spacing w:after="240"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="8" w:color="E2E8F0"/></w:pBdr></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>Fone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="360"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>{{ TIPO_DOCUMENTO }}</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">Autor dos Fatos: </w:t></w:r>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ NOME_INFRATOR }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">Tipificação Penal: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ LEI_ENQUADRAMENTO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">Auto de Infração Ambiental: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>AIA n. {{ AIA_NUMERO }}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Origem: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>{{ NUMERO_SADE }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Data/Hora dos Fatos: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>{{ DATA_FATO }} às {{ HORA_FATO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Local: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>{{ ENDEREÇO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Coordenada: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>{{ COORDENADAS_UTM }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Atendentes: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>{{ AGENTES_ATENDENTES }}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr><w:t>SÍNTESE DOS FATOS E MATERIALIDADE</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="240" w:line="280" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ RESUMO_RELATORIO_FISCALIZACAO }}</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr><w:t>PROVIDÊNCIAS ADMINISTRATIVAS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="120" w:line="280" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. {{ PROCESSO_GAIA }} (Processo PMSC {{ PROCESSO_SGPE }}):</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="360"/><w:spacing w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">• Auto de Infração Ambiental: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ AIA_NUMERO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="360"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">• Embargo/Suspensão: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ TE_NUMERO }} ({{ DESCRICAO_TE }})</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr><w:t>ANEXOS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="120" w:line="260" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:</w:t></w:r>
    </w:p>
    ${anexosXml}

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="360"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>Chapecó, {{ DATA_ATUAL }}.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ AUTORIDADE_NOME }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>{{ AUTORIDADE_CARGO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>Autoridade Ambiental Fiscalizadora</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>(Documento assinado eletronicamente)</w:t></w:r>
    </w:p>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/_rels/document.xml.rels", docRelsXml);
  const renderedXml = replaceDocxXmlPlaceholders(documentXml, data);
  zip.file("word/document.xml", renderedXml);

  return zip.generate({ type: "nodebuffer" });
}

export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const rawData = body.data;
    const tagData: Record<string, string> = typeof rawData === "string" ? JSON.parse(rawData) : (rawData || DEFAULT_EMPTY_DATA);

    const outputBuffer = createDefaultDocxBuffer(tagData);
    const filename = `Notificacao_${(tagData.NOME_INFRATOR || "Infrator").replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(outputBuffer);
  } catch (err: any) {
    console.error("Erro ao gerar DOCX:", err);
    return res.status(500).json({ error: "Erro ao gerar arquivo .docx: " + (err?.message || "Erro desconhecido") });
  }
}
