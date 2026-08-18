import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Multer memory storage for file uploads (supports up to 50MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Gemini Client to handle any environment variable naming and missing key gracefully
const getAiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "A chave GEMINI_API_KEY não foi configurada nas variáveis de ambiente. Verifique o painel de variáveis da Vercel ou o arquivo .env."
    );
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Empty default structure
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

// API Endpoint 1: Health & sample data
app.get(["/api/sample-data", "/sample-data", "/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", data: DEFAULT_EMPTY_DATA });
});

// Helper for Gemini Extraction Logic
const executeGeminiExtraction = async (contentsParts: any[], res: express.Response) => {
  try {
    const ai = getAiClient();

    const systemPrompt = `
Você é um especialista em processamento de documentos ambientais policiais e fiscais (BOTC - Boletim de Ocorrência / Termo Circunstanciado e PAFA / Relatório de Fiscalização) da Polícia Militar Ambiental de Santa Catarina (2º BPMA).

Analise todos os documentos PDF fornecidos (podendo incluir 1 ou mais PAFAs e Boletins de Ocorrência) e extraia estritamente as 17 tags no formato JSON.

REGRAS OBRIGATÓRIAS DE NEGÓCIO:

1. {{ LEI_ENQUADRAMENTO }}:
   - REGRA DE PREFERÊNCIA CRÍTICA E OBRIGATÓRIA: Busque estritamente a TIPIFICAÇÃO DE CRIME AMBIENTAL com base na **Lei Federal nº 9.605/1998** (Lei dos Crimes Ambientais).
   - Formato obrigatório para 1 crime: "Art. [Número] da Lei Federal nº 9.605/1998" (ex: "Art. 60 da Lei Federal nº 9.605/1998", "Art. 38-A da Lei Federal nº 9.605/1998").
   - MÚLTIPLOS CRIMES / MÚLTIPLOS PAFAS: Se houver mais de uma tipificação penal identificada nos documentos, concatene todos os artigos de forma coesa (ex: "Art. 38-A e Art. 60 da Lei Federal nº 9.605/1998" ou "Art. 38, Art. 48 e Art. 60 da Lei Federal nº 9.605/1998").
   - IMPORTANTE: Nos relatórios de fiscalização ou autos de infração é comum constar o enquadramento administrativo do Decreto Federal nº 6.514/2008. IGNORE a citação do Decreto nº 6.514/2008 ou de decretos estaduais para esta tag e extraia/identifique SEMPRE o artigo criminal equivalente correspondente da **Lei Federal nº 9.605/1998**.

2. {{ TIPO_DOCUMENTO }}:
   - Regra de determinação do rito processual penal:
     * Se houver apenas 1 crime e a pena máxima cominada na Lei nº 9.605/1998 for <= 2 anos (ex: Art. 48, Art. 60, Art. 64 isolados) -> Preencha com: "TERMO CIRCUNSTANCIADO"
     * Se houver concurso de crimes (múltiplas infrações) OU se qualquer um dos crimes tiver pena máxima cominada > 2 anos (ex: Art. 38, Art. 38-A, Art. 50, Art. 54) -> Preencha com: "NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL"

3. {{ AIA_NUMERO }}:
   - Se houver 1 Auto de Infração Ambiental: extraia o número completo (ex: "17585-E").
   - MÚLTIPLOS AUTOS DE INFRAÇÃO (mesmo autuado com 2 ou mais AIAs/PAFAs): concatene todos os números de forma legível e elegante (ex: "17585-E e 17586-E" ou "17585-E, 17586-E e 17587-E").

4. {{ TE_NUMERO }} e {{ DESCRICAO_TE }}:
   - TE_NUMERO: Se houver 1 Termo de Embargo/Suspensão, extraia o número (ex: "1234-E"). Se houver múltiplos Termos de Embargo, concatene-os (ex: "1234-E e 1235-E"). Se não houver embargo nos autos, preencha com "Não aplicado".
   - DESCRICAO_TE: Descrição sintetizada do objeto do embargo. Se houver múltiplos embargos, resuma o objeto de cada um (ex: "1,5 ha de vegetação nativa no TE 1234-E e 0,8 ha de APP no TE 1235-E").

5. {{ RESUMO_RELATORIO_FISCALIZACAO }}:
   - Elabore um parágrafo síntese focado estritamente em AUTORIA e MATERIALIDADE extraídos de todos os Relatórios de Fiscalização/PAFAs fornecidos.
   - Integre os fatos de todas as fiscalizações em uma narrativa única, coesa e objetiva, detalhando a conduta praticada, áreas totais afetadas em m² ou hectares, se há intervenção em APP ou vegetação nativa, método de constatação (drone/VANT, satélite, vistoria in loco) e as datas das constatações.

6. DEMAIS TAGS OBRIGATÓRIAS:
   - NOME_INFRATOR: Nome completo do autuado/investigado.
   - NUMERO_SADE: Protocolo/Número SADE (se houver mais de um, concatene).
   - DATA_FATO: Data da constatação no formato DD/MM/AAAA (se houver datas distintas, indique-as).
   - HORA_FATO: Horário no formato HH:MM.
   - ENDEREÇO: Endereço completo com município e UF.
   - COORDENADAS_UTM: Coordenadas geográficas ou UTM.
   - AGENTES_ATENDENTES: Nome(s) e posto/graduação dos agentes fiscalizadores.
   - PROCESSO_GAIA: Número do(s) processo(s) no sistema GAIA (concatene se houver mais de um).
   - PROCESSO_SGPE: Número do(s) processo(s) no SGP-e (concatene se houver mais de um).
   - BO_NUMERO: Número completo do BO/BOTC.
   - DATA_ATUAL: Data de geração do documento por extenso (ex: "13 de agosto de 2026").

Retorne APENAS o objeto JSON com exatamente essas 17 chaves:
TIPO_DOCUMENTO, NOME_INFRATOR, LEI_ENQUADRAMENTO, AIA_NUMERO, NUMERO_SADE, DATA_FATO, HORA_FATO, ENDEREÇO, COORDENADAS_UTM, AGENTES_ATENDENTES, RESUMO_RELATORIO_FISCALIZACAO, PROCESSO_GAIA, PROCESSO_SGPE, TE_NUMERO, DESCRICAO_TE, BO_NUMERO, DATA_ATUAL.
`;

    contentsParts.push({
      text: systemPrompt,
    });

    const modelsToTry = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        TIPO_DOCUMENTO: { type: Type.STRING },
        NOME_INFRATOR: { type: Type.STRING },
        LEI_ENQUADRAMENTO: { type: Type.STRING },
        AIA_NUMERO: { type: Type.STRING },
        NUMERO_SADE: { type: Type.STRING },
        DATA_FATO: { type: Type.STRING },
        HORA_FATO: { type: Type.STRING },
        ENDEREÇO: { type: Type.STRING },
        COORDENADAS_UTM: { type: Type.STRING },
        AGENTES_ATENDENTES: { type: Type.STRING },
        RESUMO_RELATORIO_FISCALIZACAO: { type: Type.STRING },
        PROCESSO_GAIA: { type: Type.STRING },
        PROCESSO_SGPE: { type: Type.STRING },
        TE_NUMERO: { type: Type.STRING },
        DESCRICAO_TE: { type: Type.STRING },
        BO_NUMERO: { type: Type.STRING },
        DATA_ATUAL: { type: Type.STRING },
      },
      required: [
        "TIPO_DOCUMENTO",
        "NOME_INFRATOR",
        "LEI_ENQUADRAMENTO",
        "AIA_NUMERO",
        "NUMERO_SADE",
        "DATA_FATO",
        "HORA_FATO",
        "ENDEREÇO",
        "COORDENADAS_UTM",
        "AGENTES_ATENDENTES",
        "RESUMO_RELATORIO_FISCALIZACAO",
        "PROCESSO_GAIA",
        "PROCESSO_SGPE",
        "TE_NUMERO",
        "DESCRICAO_TE",
        "BO_NUMERO",
        "DATA_ATUAL",
      ],
    };

    const callGeminiWithRetry = async (): Promise<any> => {
      let lastError: any = null;
      for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[Gemini API] Solicitando processamento com modelo: ${modelName} (tentativa ${attempt})...`);
            return await ai.models.generateContent({
              model: modelName,
              contents: [
                {
                  role: "user",
                  parts: contentsParts,
                },
              ],
              config: {
                responseMimeType: "application/json",
                responseSchema: jsonSchema,
              },
            });
          } catch (err: any) {
            lastError = err;
            const status = err?.status || err?.code || "";
            const errMsg = String(err?.message || "").toLowerCase();
            const isRateLimit = status === 429 || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("resource_exhausted");
            const isDemandSpike = status === 503 || status === "UNAVAILABLE" || errMsg.includes("503") || errMsg.includes("unavailable");
            
            if (isDemandSpike || isRateLimit) {
              console.log(`[Gemini API] Modelo ${modelName} retornou ${isRateLimit ? "Limite de Requisições/Quota (429)" : "Alta Demanda (503)"}. Alternando para próximo modelo...`);
              break;
            } else {
              console.log(`[Gemini API] Tentativa ${attempt} com ${modelName} falhou: ${err?.message || err}.`);
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 1000));
              }
            }
          }
        }
      }
      throw lastError || new Error("Não foi possível processar a requisição com os modelos de IA disponíveis.");
    };

    const response = await callGeminiWithRetry();

    const rawText = response.text || "";
    let cleanJson = rawText.trim();
    cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    if (!cleanJson) {
      throw new Error("A resposta da IA veio vazia.");
    }

    const extractedData = JSON.parse(cleanJson);

    if (extractedData.TIPO_DOCUMENTO && extractedData.TIPO_DOCUMENTO.toUpperCase().includes("CIRCUNST")) {
      extractedData.TIPO_DOCUMENTO = "TERMO CIRCUNSTANCIADO";
    }

    const now = new Date();
    const formattedToday = now.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    extractedData.DATA_ATUAL = formattedToday;

    return res.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error("Erro na extração via Gemini:", error);
    const errText = String(error?.message || "");
    let userMsg = "Falha no processamento com IA: " + errText;
    if (errText.includes("429") || errText.includes("quota") || errText.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "Limite de requisições por minuto da API atingido temporariamente. Aguarde 30 segundos e tente novamente.";
    }
    return res.status(500).json({
      error: userMsg,
    });
  }
};

// API Endpoint 2A: Ultra-lightweight JSON text extract (Bypasses Vercel 4.5MB 413 limit)
app.post(["/api/extract-text", "/extract-text"], async (req, res) => {
  try {
    const { text, documents } = req.body;
    if (!text && (!documents || documents.length === 0)) {
      return res.status(400).json({ error: "Nenhum texto de documento foi fornecido." });
    }

    const contentsParts: any[] = [];
    if (Array.isArray(documents) && documents.length > 0) {
      documents.forEach((doc: { name?: string; text: string }, idx: number) => {
        contentsParts.push({
          text: `\n=== CONTEÚDO DO DOCUMENTO PDF #${idx + 1} (${doc.name || "Documento"}) ===\n${doc.text}\n`,
        });
      });
    } else if (text) {
      contentsParts.push({
        text: `\n=== CONTEÚDO DOS DOCUMENTOS PDF ===\n${text}\n`,
      });
    }

    return await executeGeminiExtraction(contentsParts, res);
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao processar texto: " + (err?.message || err) });
  }
});

// API Endpoint 2B: Multipart extract fallback
app.post(["/api/extract", "/extract"], (req, res, next) => {
  if (req.is("application/json") || req.body?.text) {
    return next();
  }
  req.setTimeout(300000);
  res.setTimeout(300000);

  upload.array("pdfs", 10)(req, res, (err) => {
    if (err) {
      console.error("[Multer Upload Error]:", err);
      return res.status(400).json({ error: "Erro ao carregar o arquivo PDF: " + (err.message || "Arquivo inválido ou excede o limite de tamanho.") });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (req.body && (req.body.text || req.body.documents)) {
      const { text, documents } = req.body;
      const contentsParts: any[] = [];
      if (Array.isArray(documents) && documents.length > 0) {
        documents.forEach((doc: { name?: string; text: string }, idx: number) => {
          contentsParts.push({
            text: `\n=== CONTEÚDO DO DOCUMENTO PDF #${idx + 1} (${doc.name || "Documento"}) ===\n${doc.text}\n`,
          });
        });
      } else if (text) {
        contentsParts.push({
          text: `\n=== CONTEÚDO DOS DOCUMENTOS PDF ===\n${text}\n`,
        });
      }
      return await executeGeminiExtraction(contentsParts, res);
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo PDF foi enviado." });
    }

    const contentsParts: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      contentsParts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: file.buffer.toString("base64"),
        },
      });
    }

    return await executeGeminiExtraction(contentsParts, res);
  } catch (error: any) {
    console.error("Erro na rota /api/extract:", error);
    return res.status(500).json({ error: error?.message || "Erro ao processar extração." });
  }
});

// Helper to replace tags in DOCX XML string when Word splits placeholders across tags
function replaceDocxXmlPlaceholders(xmlString: string, data: Record<string, string>): string {
  let updatedXml = xmlString;

  // Build dictionary with normalized aliases for keys (e.g. ENDEREÇO vs ENDERECO)
  const dict: Record<string, string> = { ...data };
  if (data.ENDEREÇO && !dict.ENDERECO) dict.ENDERECO = data.ENDEREÇO;
  if (data.ENDERECO && !dict.ENDERECO) dict.ENDEREÇO = data.ENDERECO;
  if (dict.TIPO_DOCUMENTO && dict.TIPO_DOCUMENTO.toUpperCase().includes("CIRCUNST")) {
    dict.TIPO_DOCUMENTO = "TERMO CIRCUNSTANCIADO";
  }

  if (!dict.AUTORIDADE_NOME) {
    dict.AUTORIDADE_NOME = "Andréia Cristina Fergitz";
  }
  if (!dict.AUTORIDADE_CARGO) {
    dict.AUTORIDADE_CARGO = "Tenente Coronel PM - Comandante do 2ºBPMA";
  }

  // Always ensure current date is present if DATA_ATUAL is missing or default
  if (!dict.DATA_ATUAL || dict.DATA_ATUAL.includes("MODELO")) {
    const now = new Date();
    dict.DATA_ATUAL = now.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  for (const [key, val] of Object.entries(dict)) {
    const stringVal = val === undefined || val === null ? "" : String(val);
    const escapedValue = stringVal
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    // Replace strict matches like {{ KEY }} or {{KEY}}
    const keyEscaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexExact = new RegExp(`{{\\s*${keyEscaped}\\s*}}`, "g");
    updatedXml = updatedXml.replace(regexExact, escapedValue);

    // Also handle single bracket matches like { KEY }
    const regexSingle = new RegExp(`{\\s*${keyEscaped}\\s*}`, "g");
    updatedXml = updatedXml.replace(regexSingle, escapedValue);
  }

  return updatedXml;
}

// Generate base DOCX XML template matching "Relatório - MODELO.PDF" (Text-only header, no logos)
function createDefaultDocxBuffer(data: Record<string, string>): Buffer {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <!-- Header with PMSC Title (Text Only) -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="9000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9000" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="18"/>
                <w:color w:val="64748B"/>
              </w:rPr>
              <w:t>POLÍCIA MILITAR DE SANTA CATARINA</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="26"/>
                <w:color w:val="0F172A"/>
              </w:rPr>
              <w:t>2º Batalhão de Polícia Militar Ambiental</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:color w:val="475569"/>
              </w:rPr>
              <w:t>Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="60"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:color w:val="475569"/>
              </w:rPr>
              <w:t>Fone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Document Title (Centered & Underlined, 3 lines before and 3 lines after) -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="720" w:after="720"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:u w:val="single"/>
          <w:sz w:val="26"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>{{ TIPO_DOCUMENTO }}</w:t>
      </w:r>
    </w:p>

    <!-- 3-Column Metadata Row -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblInd w:w="0" w:type="dxa"/>
        <w:tblCellMar>
          <w:top w:w="0" w:type="dxa"/>
          <w:left w:w="120" w:type="dxa"/>
          <w:bottom w:w="0" w:type="dxa"/>
          <w:right w:w="120" w:type="dxa"/>
        </w:tblCellMar>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
          <w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="3000"/>
        <w:gridCol w:w="3000"/>
        <w:gridCol w:w="3000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="160"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">Autor dos Fatos: </w:t></w:r>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ NOME_INFRATOR }}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="160"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">Tipificação Penal: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ LEI_ENQUADRAMENTO }}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="160"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">Auto de Infração Ambiental: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">AIA n. </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ AIA_NUMERO }}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Highlighted Box (1-Cell Table with Gray Shading - Perfectly Aligned 9000 dxa Width) -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblInd w:w="0" w:type="dxa"/>
        <w:tblCellMar>
          <w:top w:w="160" w:type="dxa"/>
          <w:left w:w="180" w:type="dxa"/>
          <w:bottom w:w="160" w:type="dxa"/>
          <w:right w:w="180" w:type="dxa"/>
        </w:tblCellMar>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="9000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9000" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Origem: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ NUMERO_SADE }}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Data/Hora dos Fatos: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ DATA_FATO }}</w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve"> às </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ HORA_FATO }}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Local: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ ENDEREÇO }}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="40"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Coordenada: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ COORDENADAS_UTM }}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="20"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">Atendentes: </w:t></w:r>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>{{ AGENTES_ATENDENTES }}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Síntese dos Fatos e Materialidade (2 linhas antes do título) -->
    <w:p>
      <w:pPr><w:spacing w:before="480" w:after="100"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>SÍNTESE DOS FATOS E MATERIALIDADE</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="240"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t>{{ RESUMO_RELATORIO_FISCALIZACAO }}</w:t>
      </w:r>
    </w:p>

    <!-- Providências Administrativas -->
    <w:p>
      <w:pPr><w:spacing w:before="480" w:after="100"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>PROVIDÊNCIAS ADMINISTRATIVAS</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t xml:space="preserve">Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>{{ PROCESSO_GAIA }}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t xml:space="preserve"> (Processo PMSC </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>{{ PROCESSO_SGPE }}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t>):</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="360"/><w:spacing w:after="60"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">• Auto(s) de Infração Ambiental: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ AIA_NUMERO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="360"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">• Embargo(s)/Suspensão: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ TE_NUMERO }}</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve"> (</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ DESCRICAO_TE }}</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>)</w:t></w:r>
    </w:p>

    <!-- Anexos -->
    <w:p>
      <w:pPr><w:spacing w:before="480" w:after="100"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>ANEXOS</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t>Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:</w:t>
      </w:r>
    </w:p>
    ${
      data.ANEXOS_LISTA && data.ANEXOS_LISTA.trim().length > 0
        ? data.ANEXOS_LISTA.split("\n")
            .filter((l) => l.trim().length > 0)
            .map(
              (item) =>
                `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>${item
                  .trim()
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</w:t></w:r></w:p>`
            )
            .join("\n")
        : `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">1. Boletim de Ocorrência nº </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ BO_NUMERO }}</w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>;</w:t></w:r></w:p>
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">2. Auto(s) de Infração Ambiental n. </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ AIA_NUMERO }}</w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>;</w:t></w:r></w:p>
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">3. Termo(s) de Embargo/Suspensão n. </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ TE_NUMERO }}</w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>;</w:t></w:r></w:p>
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>4. Relatório de Fiscalização;</w:t></w:r></w:p>
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>5. Relatório fotográfico, mapas e listas de coordenadas;</w:t></w:r></w:p>
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.</w:t></w:r></w:p>`
    }

    <!-- Signature Block (3 linhas antes e 3 linhas depois da data) -->
    <w:p>
      <w:pPr><w:spacing w:before="720" w:after="720"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t xml:space="preserve">Chapecó, </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t>{{ DATA_ATUAL }}</w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr>
        <w:t>.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>{{ AUTORIDADE_NOME }}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr>
        <w:t>{{ AUTORIDADE_CARGO }}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr>
        <w:t>Autoridade Ambiental Fiscalizadora</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr>
      <w:r>
        <w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr>
        <w:t>(Documento assinado eletronicamente)</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/_rels/document.xml.rels", docRelsXml);
  
  // Replace tags in document.xml
  const renderedXml = replaceDocxXmlPlaceholders(documentXml, data);
  zip.file("word/document.xml", renderedXml);

  return zip.generate({ type: "nodebuffer" });
}

// API Endpoint 3: Generate filled DOCX file
app.post(["/api/generate-docx", "/generate-docx"], async (req, res) => {
  try {
    const rawData = req.body.data;
    const tagData: Record<string, string> = typeof rawData === "string" ? JSON.parse(rawData) : (rawData || DEFAULT_EMPTY_DATA);

    // Use standard single model matching the PMSC 2º BPMA reference PDF
    const outputBuffer = createDefaultDocxBuffer(tagData);

    const filename = `Notificacao_${(tagData.NOME_INFRATOR || "Infrator").replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(outputBuffer);
  } catch (err: any) {
    console.error("Erro ao gerar DOCX:", err);
    return res.status(500).json({ error: "Erro ao gerar arquivo .docx: " + (err?.message || "Erro desconhecido") });
  }
});

// API Endpoint 4: Generate executable Python script string
app.post(["/api/generate-python-script", "/generate-python-script"], (req, res) => {
  const data = req.body.data || DEFAULT_EMPTY_DATA;
  const jsonFormatted = JSON.stringify(data, null, 4);

  const pythonScriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Preenchimento de Notificação de Infração Ambiental em Formato Word (.docx)
Modelo: Relatório - MODELO.PDF / 01. MOD. NOTIFICAÇÃO - COMUM.docx
Biblioteca principal: python-docx

Pré-requisitos:
    pip install python-docx pypdf
"""

import json
import os
import re
from docx import Document

# 1. DADOS EXTRAÍDOS E MAPEADOS DAS TAGS
DADOS_TAGS = ${jsonFormatted}

def substituir_texto_em_paragrafo(paragrafo, mapa_tags):
    """Substitui tags no parágrafo preservando a formatação do texto."""
    texto_completo = paragrafo.text
    tags_encontradas = [tag for tag in mapa_tags if f"{{" in tag or tag in texto_completo]
    
    if not tags_encontradas and not any(tag in texto_completo for tag in mapa_tags.keys()):
        return

    for chave, valor in mapa_tags.items():
        # Suporta {{ TAG }} e {{TAG}}
        padroes = [f"{{{{{chave}}}}}", f"{{{{ {chave} }}}}", f"{{{chave}}}"]
        for padrao in padroes:
            if padrao in paragrafo.text:
                # Substituição no nível de runs para manter formatação
                for run in paragrafo.runs:
                    if padrao in run.text:
                        run.text = run.text.replace(padrao, str(valor))
                # Se a tag ficou dividida entre múltiplos runs:
                if padrao in paragrafo.text:
                    paragrafo.text = paragrafo.text.replace(padrao, str(valor))

def preencher_notificacao_docx(caminho_modelo, caminho_saida, dados):
    """Carrega o arquivo .docx modelo e realiza a substituição das tags."""
    if not os.path.exists(caminho_modelo):
        print(f"[AVISO] Arquivo modelo '{caminho_modelo}' não encontrado localmente.")
        print("Criando novo documento Word com a estrutura padrão...")
        doc = Document()
        
        # Cabeçalho
        p = doc.add_paragraph()
        p.alignment = 1 # Centralizado
        run = p.add_run("2º BATALHÃO DE POLÍCIA MILITAR AMBIENTAL\\n")
        run.bold = True
        p.add_run("Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000, Fone (49) 3321-0180\\n")
        
        # Título
        p_tipo = doc.add_paragraph()
        p_tipo.alignment = 1
        run_tipo = p_tipo.add_run(f"\\n{dados.get('TIPO_DOCUMENTO')}\\n")
        run_tipo.bold = True
        
        doc.add_paragraph(f"Autor dos Fatos: {dados.get('NOME_INFRATOR')}   Tipificação Penal: {dados.get('LEI_ENQUADRAMENTO')}   AIA n. {dados.get('AIA_NUMERO')}")
        doc.add_paragraph(f"Origem: {dados.get('NUMERO_SADE')}")
        doc.add_paragraph(f"Data/Hora dos Fatos: {dados.get('DATA_FATO')} às {dados.get('HORA_FATO')}")
        doc.add_paragraph(f"Local: {dados.get('ENDEREÇO')}")
        doc.add_paragraph(f"Coordenada: {dados.get('COORDENADAS_UTM')}")
        doc.add_paragraph(f"Atendentes: {dados.get('AGENTES_ATENDENTES')}")
        
        doc.add_heading("SÍNTESE DOS FATOS E MATERIALIDADE", level=2)
        doc.add_paragraph(dados.get('RESUMO_RELATORIO_FISCALIZACAO'))
        
        doc.add_heading("PROVIDÊNCIAS ADMINISTRATIVAS", level=2)
        doc.add_paragraph(f"Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. {dados.get('PROCESSO_GAIA')} (Processo PMSC {dados.get('PROCESSO_SGPE')}):")
        doc.add_paragraph(f"• Auto de Infração Ambiental: {dados.get('AIA_NUMERO')}")
        doc.add_paragraph(f"• Embargo/Suspensão: {dados.get('TE_NUMERO')} ({dados.get('DESCRICAO_TE')})")
        
        doc.add_heading("ANEXOS", level=2)
        doc.add_paragraph("Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:")
        doc.add_paragraph(f"1. Boletim de Ocorrência nº {dados.get('BO_NUMERO')};")
        doc.add_paragraph(f"2. Auto de Infração Ambiental n. {dados.get('AIA_NUMERO')};")
        doc.add_paragraph(f"3. Termo de Embargo/Suspensão n. {dados.get('TE_NUMERO')};")
        doc.add_paragraph("4. Relatório de Fiscalização;")
        doc.add_paragraph("5. Relatório fotográfico, mapas e listas de coordenadas;")
        doc.add_paragraph("6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.")
        
        doc.add_paragraph(f"\\nChapecó, {dados.get('DATA_ATUAL')}.\\n")
        
        p_sig = doc.add_paragraph()
        p_sig.alignment = 1
        nome_autoridade = dados.get('AUTORIDADE_NOME', 'Andréia Cristina Fergitz')
        cargo_autoridade = dados.get('AUTORIDADE_CARGO', 'Tenente Coronel PM - Comandante do 2ºBPMA')
        p_sig.add_run(f"{nome_autoridade}\\n").bold = True
        p_sig.add_run(f"{cargo_autoridade}\\nAutoridade Ambiental Fiscalizadora\\n(Documento assinado eletronicamente)")
    else:
        doc = Document(caminho_modelo)
        for p in doc.paragraphs:
            substituir_texto_em_paragrafo(p, dados)
        for tabela in doc.tables:
            for linha in tabela.rows:
                for celula in linha.cells:
                    for p in celula.paragraphs:
                        substituir_texto_em_paragrafo(p, dados)

    doc.save(caminho_saida)
    print(f"[SUCESSO] Notificação gerada com sucesso em: {os.path.abspath(caminho_saida)}")

if __name__ == "__main__":
    modelo_file = "01. MOD. NOTIFICAÇÃO - COMUM.docx"
    saida_file = f"Notificacao_Preenchida_{DADOS_TAGS['NOME_INFRATOR'].replace(' ', '_')}.docx"
    
    preencher_notificacao_docx(modelo_file, saida_file, DADOS_TAGS)
`;

  res.setHeader("Content-Type", "text/x-python");
  res.setHeader("Content-Disposition", 'attachment; filename="preencher_notificacao.py"');
  return res.send(pythonScriptContent);
});

// Vite Development Server Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Servidor] Rodando na porta ${PORT}`);
  });
}

export default app;

const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_REGION ||
  process.env.LAMBDA_TASK_ROOT
);

if (!isServerless) {
  startServer();
}

