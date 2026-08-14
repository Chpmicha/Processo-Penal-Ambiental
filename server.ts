import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import PDFDocument from "pdfkit";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

const parsePdfBuffer = async (buffer: Buffer): Promise<{ text: string }> => {
  try {
    if (!buffer || buffer.length === 0) return { text: "" };
    
    // 1. Try v2 style PDFParse class
    let PDFParseClass = pdfParseModule?.PDFParse;
    if (!PDFParseClass && pdfParseModule?.default) {
      PDFParseClass = pdfParseModule.default.PDFParse || pdfParseModule.default;
    }

    if (PDFParseClass && typeof PDFParseClass === "function") {
      try {
        const parser = new PDFParseClass({ data: new Uint8Array(buffer) });
        if (typeof parser.getText === "function") {
          const textResult = await parser.getText();
          const textStr = typeof textResult === "string" ? textResult : (textResult?.text || "");
          if (textStr && textStr.trim().length > 10) {
            return { text: textStr.trim() };
          }
        }
      } catch (innerErr) {
        console.warn("[pdf-parse] Aviso ao extrair texto com PDFParse:", innerErr);
      }
    }

    // 2. Try v1 style function as fallback
    if (typeof pdfParseModule === "function") {
      try {
        const res = await (pdfParseModule as any)(buffer);
        if (res && res.text && typeof res.text === "string" && res.text.trim().length > 10) {
          return { text: res.text.trim() };
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.warn("[pdf-parse] Erro ao extrair texto do PDF:", err);
  }
  return { text: "" };
};

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

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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

// API Endpoint 1: Health check
app.get("/api/sample-data", (req, res) => {
  res.json({ status: "ok", data: DEFAULT_EMPTY_DATA });
});

// API Endpoint 2: Extract tags from uploaded PDFs using Gemini AI
app.post("/api/extract", (req, res, next) => {
  // Set extended timeout for PDF processing & AI call (5 minutes)
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
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo PDF foi enviado." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY não definida no ambiente.");
      return res.status(500).json({ error: "Chave de API Gemini não configurada no servidor. Verifique as configurações de secrets." });
    }

    const contentsParts: any[] = [];

    // System instructions & prompt rules
    const systemPrompt = `
Você é um especialista em processamento de documentos ambientais policiais e fiscais (BOTC - Boletim de Ocorrência / Termo Circunstanciado e PAFA / Relatório de Fiscalização).

Analise os documentos PDF fornecidos e extraia estritamente as 17 tags no formato JSON.

REGRAS OBRIGATÓRIAS DE NEGÓCIO:

1. {{ LEI_ENQUADRAMENTO }}:
   - REGRA DE PREFERÊNCIA CRÍTICA E OBRIGATÓRIA: Busque estritamente a TIPIFICAÇÃO DE CRIME AMBIENTAL com base na **Lei Federal nº 9.605/1998** (Lei dos Crimes Ambientais).
   - Formato obrigatório: "Art. [Número] da Lei Federal nº 9.605/1998" (ex: "Art. 60 da Lei Federal nº 9.605/1998", "Art. 38-A da Lei Federal nº 9.605/1998", "Art. 64 da Lei Federal nº 9.605/1998").
   - IMPORTANTE: Nos relatórios de fiscalização ou autos de infração é comum constar o enquadramento administrativo do Decreto Federal nº 6.514/2008. IGNORE a citação do Decreto nº 6.514/2008 ou de decretos estaduais para esta tag e extraia/identifique SEMPRE o artigo criminal equivalente correspondente da **Lei Federal nº 9.605/1998**.

2. {{ TIPO_DOCUMENTO }}:
   - Verifique a pena máxima cominada no artigo do crime ambiental da **Lei Federal nº 9.605/1998** citado:
     * Se a pena máxima cominada na Lei nº 9.605/1998 for <= 2 anos (ex: Art. 48, Art. 60, Art. 64) -> Preencha com: "TERMO CIRCUNSTANCIADO"
     * Se a pena máxima cominada na Lei nº 9.605/1998 for > 2 anos (ex: Art. 38, Art. 38-A, Art. 50, Art. 54) -> Preencha com: "NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL"

3. {{ RESUMO_RELATORIO_FISCALIZACAO }}:
   - Elabore um parágrafo síntese focado estritamente em AUTORIA e MATERIALIDADE extraídos do Relatório de Fiscalização/PAFA.
   - Detalhe a conduta praticada, área afetada em m² ou hectares, se há intervenção em APP ou vegetação nativa, método de constatação (drone/VANT, satélite, vistoria in loco) e a data da intervenção.

4. DEMAIS TAGS OBRIGATÓRIAS:
   - NOME_INFRATOR: Nome completo do autuado/investigado.
   - AIA_NUMERO: Número do Auto de Infração Ambiental (ex: "17585-E").
   - NUMERO_SADE: Protocolo/Número SADE.
   - DATA_FATO: Data da constatação no formato DD/MM/AAAA.
   - HORA_FATO: Horário no formato HH:MM.
   - ENDEREÇO: Endereço completo com município e UF.
   - COORDENADAS_UTM: Coordenadas geográficas ou UTM (ex: "22J 329.383m E, 7.016.470m N").
   - AGENTES_ATENDENTES: Nome(s) e posto/graduação dos agentes fiscalizadores.
   - PROCESSO_GAIA: Número do processo no sistema GAIA.
   - PROCESSO_SGPE: Número do processo no SGP-e.
   - TE_NUMERO: Número do Termo de Embargo.
   - DESCRICAO_TE: Descrição sintetizada do objeto do embargo.
   - BO_NUMERO: Número completo do BO/BOTC.
   - DATA_ATUAL: Data de geração do documento por extenso (ex: "13 de agosto de 2026").

Retorne APENAS o objeto JSON com exatamente essas 17 chaves:
TIPO_DOCUMENTO, NOME_INFRATOR, LEI_ENQUADRAMENTO, AIA_NUMERO, NUMERO_SADE, DATA_FATO, HORA_FATO, ENDEREÇO, COORDENADAS_UTM, AGENTES_ATENDENTES, RESUMO_RELATORIO_FISCALIZACAO, PROCESSO_GAIA, PROCESSO_SGPE, TE_NUMERO, DESCRICAO_TE, BO_NUMERO, DATA_ATUAL.
`;

    // Process uploaded PDFs: extract text first to avoid sending huge base64 payloads
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let extractedText = "";
      try {
        const parsed = await parsePdfBuffer(file.buffer);
        if (parsed && parsed.text) {
          const cleanText = parsed.text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "").trim();
          if (cleanText.length > 10) {
            extractedText = cleanText;
          }
        }
      } catch (err) {
        console.warn(`[pdf-parse] Não foi possível extrair texto puro do arquivo ${file.originalname}:`, err);
      }

      if (extractedText) {
        console.log(`[PDF] Texto extraído com sucesso de ${file.originalname} (${extractedText.length} caracteres).`);
        contentsParts.push({
          text: `\n=== CONTEÚDO DO DOCUMENTO PDF #${i + 1} (${file.originalname}) ===\n${extractedText}\n`
        });
      } else {
        console.log(`[PDF] PDF escaneado/imagem em ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB), enviando como dados binários.`);
        contentsParts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: file.buffer.toString("base64"),
          },
        });
      }
    }

    contentsParts.push({
      text: systemPrompt,
    });

    // Models to try in order of highest availability and speed
    const modelsToTry = ["gemini-flash-latest", "gemini-3.7-flash", "gemini-3.1-flash-lite"];
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

    // Helper for generating content with resilient fallback across models in case of 503 high demand or network spike
    const callGeminiWithRetry = async (): Promise<any> => {
      let lastError: any = null;
      for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[Gemini API] Solicitando processamento com ${modelName}...`);
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
            const isDemandSpike = status === 503 || status === "UNAVAILABLE" || (err?.message && err.message.includes("503"));
            
            if (isDemandSpike) {
              console.log(`[Gemini API] Modelo ${modelName} com alta demanda temporária (503). Alternando para próximo modelo de contingência...`);
              break; // Immediately move to next fallback model
            } else {
              console.log(`[Gemini API] Tentativa ${attempt} com ${modelName} falhou, tentando novamente...`);
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 800));
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

    // Normalize TIPO_DOCUMENTO to ensure CIRCUNSTANCIADO without accent
    if (extractedData.TIPO_DOCUMENTO && extractedData.TIPO_DOCUMENTO.toUpperCase().includes("CIRCUNST")) {
      extractedData.TIPO_DOCUMENTO = "TERMO CIRCUNSTANCIADO";
    }

    // Always override DATA_ATUAL with today's real current date in Portuguese
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
    return res.status(500).json({
      error: "Falha no processamento com IA: " + (error?.message || "Erro interno"),
    });
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

// Generate base DOCX XML template matching "Relatório - MODELO.PDF" with Header Logo
function createDefaultDocxBuffer(data: Record<string, string>): Buffer {
  let logoBase64 = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "brasao_2bpma.png");
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString("base64");
    }
  } catch (e) {
    console.warn("Não foi possível carregar o brasão para o DOCX:", e);
  }

  const hasLogo = logoBase64.length > 0;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <!-- Header Table with PMSC Title and Logo -->
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
        <w:gridCol w:w="6800"/>
        <w:gridCol w:w="2200"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="6800" w:type="dxa"/>
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
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2200" w:type="dxa"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          ${
            hasLogo
              ? `<w:p>
            <w:pPr><w:jc w:val="right"/></w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="1000000" cy="1150000"/>
                  <wp:docPr id="1" name="Brasão 2º BPMA"/>
                  <wp:cNvGraphicFramePr/>
                  <a:graphic>
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic>
                        <pic:nvPicPr>
                          <pic:cNvPr id="0" name="Brasão 2º BPMA"/>
                          <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="rIdLogo"/>
                          <a:stretch><a:fillRect/></a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="1000000" cy="1150000"/>
                          </a:xfrm>
                          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>`
              : `<w:p><w:r><w:t></w:t></w:r></w:p>`
          }
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
      <w:r><w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">• Auto de Infração Ambiental: </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ AIA_NUMERO }}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="360"/><w:spacing w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="21"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">• Embargo/Suspensão: </w:t></w:r>
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
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">2. Auto de Infração Ambiental n. </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ AIA_NUMERO }}</w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>;</w:t></w:r></w:p>
    <w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">3. Termo de Embargo/Suspensão n. </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>{{ TE_NUMERO }}</w:t></w:r><w:r><w:rPr><w:sz w:val="21"/><w:color w:val="1E293B"/></w:rPr><w:t>;</w:t></w:r></w:p>
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
  ${hasLogo ? `<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>` : ""}
</Relationships>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/_rels/document.xml.rels", docRelsXml);

  if (hasLogo) {
    zip.file("word/media/image1.png", Buffer.from(logoBase64, "base64"));
  }
  
  // Replace tags in document.xml
  const renderedXml = replaceDocxXmlPlaceholders(documentXml, data);
  zip.file("word/document.xml", renderedXml);

  return zip.generate({ type: "nodebuffer" });
}

function createDefaultPdfBuffer(data: Record<string, string>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        autoFirstPage: true,
        margins: { top: 24, bottom: 24, left: 38, right: 38 },
        info: {
          Title: `Notificação - ${data.NOME_INFRATOR || "Processo"}`,
          Author: "2º BPMA - PMSC",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const logoPath = path.join(process.cwd(), "public", "brasao_2bpma.png");
      const hasLogo = fs.existsSync(logoPath);
      const printableWidth = 595.28 - 76; // 519.28 pt

      // 1. Header layout
      const startY = 24;
      if (hasLogo) {
        try {
          doc.image(logoPath, 595.28 - 38 - 48, startY - 2, { width: 48 });
        } catch (imgErr) {
          console.warn("Aviso ao carregar imagem no PDFKit:", imgErr);
        }
      }

      doc.font("Helvetica-Bold").fontSize(7).fillColor("#64748b").text("POLÍCIA MILITAR DE SANTA CATARINA", 38, startY);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a").text("2º Batalhão de Polícia Militar Ambiental", 38, startY + 10);
      doc.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Avenida Fernando Machado, 1870-D, Chapecó-SC, CEP 89803-000", 38, startY + 23);
      doc.text("Fone: (49) 3321-0180 | E-mail: 2bpmachapecop3@pm.sc.gov.br", 38, startY + 33);

      // Header Divider line
      doc.strokeColor("#e2e8f0").lineWidth(0.8).moveTo(38, startY + 48).lineTo(595.28 - 38, startY + 48).stroke();

      // 2. Document Title (3 linhas antes e 3 linhas depois)
      const titleY = startY + 48 + 26;
      const docTitle = data.TIPO_DOCUMENTO || "NOTIFICAÇÃO DE INFRAÇÃO PENAL AMBIENTAL";
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(docTitle, 38, titleY, {
        align: "center",
        underline: true,
        width: printableWidth,
      });

      // 3. Metadata 3-Column Row (3 linhas após o título)
      const metaY = titleY + 14 + 26;
      const colWidth = printableWidth / 3;

      // Col 1: Autor dos Fatos
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#334155").text("Autor dos Fatos: ", 38, metaY, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#0f172a").text(data.NOME_INFRATOR || "Não informado");

      // Col 2: Tipificação Penal
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#334155").text("Tipificação Penal: ", 38 + colWidth, metaY, { continued: true });
      doc.font("Helvetica").fillColor("#0f172a").text(data.LEI_ENQUADRAMENTO || "Não informado");

      // Col 3: Auto de Infração Ambiental
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#334155").text("Auto de Infração: ", 38 + colWidth * 2, metaY, { continued: true });
      doc.font("Helvetica").fillColor("#0f172a").text(`AIA n. ${data.AIA_NUMERO || "---"}`);

      // 4. Highlight Box (Origem, Data/Hora, Local, Coordenadas, Atendentes)
      const boxY = metaY + 14;
      const boxHeight = 60;
      doc.roundedRect(38, boxY, printableWidth, boxHeight, 4).fillAndStroke("#f8fafc", "#cbd5e1");

      // Red Info Badge
      doc.circle(49, boxY + 12, 5.5).fill("#dc2626");
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#ffffff").text("i", 47.5, boxY + 8.5);

      doc.fillColor("#1e293b").fontSize(7);
      const lineSpacing = 10.5;
      let textY = boxY + 5.5;
      const textIndent = 60;

      doc.font("Helvetica-Bold").text("Origem: ", textIndent, textY, { continued: true });
      doc.font("Helvetica").text(data.NUMERO_SADE || "Não informado");

      textY += lineSpacing;
      doc.font("Helvetica-Bold").text("Data/Hora dos Fatos: ", textIndent, textY, { continued: true });
      doc.font("Helvetica").text(`${data.DATA_FATO || "Não informado"} às ${data.HORA_FATO || ""}`);

      textY += lineSpacing;
      doc.font("Helvetica-Bold").text("Local: ", textIndent, textY, { continued: true });
      doc.font("Helvetica").text(data.ENDEREÇO || "Não informado");

      textY += lineSpacing;
      doc.font("Helvetica-Bold").text("Coordenada: ", textIndent, textY, { continued: true });
      doc.font("Helvetica").text(data.COORDENADAS_UTM || "Não informado");

      textY += lineSpacing;
      doc.font("Helvetica-Bold").text("Atendentes: ", textIndent, textY, { continued: true });
      doc.font("Helvetica").text(data.AGENTES_ATENDENTES || "Não informado");

      let currentY = boxY + boxHeight + 20;

      // 5. SÍNTESE DOS FATOS E MATERIALIDADE (2 linhas antes do título)
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("SÍNTESE DOS FATOS E MATERIALIDADE", 38, currentY);
      currentY = doc.y + 4;

      const resumo = data.RESUMO_RELATORIO_FISCALIZACAO || "Não informado";
      doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b").text(resumo, 38, currentY, {
        align: "justify",
        width: printableWidth,
        lineGap: 2.0,
      });

      // 2 linhas de espaço após o parágrafo antes do próximo título
      currentY = doc.y + 20;

      // 6. PROVIDÊNCIAS ADMINISTRATIVAS (2 linhas antes do título)
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("PROVIDÊNCIAS ADMINISTRATIVAS", 38, currentY);
      currentY = doc.y + 4;

      const providencias = `Em decorrência dos fatos, visando individualizar a autoria e impedir a continuidade das intervenções irregulares para evitar o agravamento do dano, foram adotadas as seguintes medidas, já inseridas no sistema GAIA sob o Processo n. ${data.PROCESSO_GAIA || "---"} (Processo PMSC ${data.PROCESSO_SGPE || "---"}):`;
      doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b").text(providencias, 38, currentY, {
        align: "justify",
        width: printableWidth,
        lineGap: 2.0,
      });

      currentY = doc.y + 3.5;
      doc.font("Helvetica-Bold").fontSize(7.5).text("• Auto de Infração Ambiental: ", 48, currentY, { continued: true });
      doc.font("Helvetica").text(data.AIA_NUMERO || "---");

      currentY = doc.y + 2.5;
      doc.font("Helvetica-Bold").fontSize(7.5).text("• Embargo/Suspensão: ", 48, currentY, { continued: true });
      doc.font("Helvetica").text(`${data.TE_NUMERO || "---"} (${data.DESCRICAO_TE || "---"})`);

      // 2 linhas de espaço após o parágrafo/itens antes do próximo título
      currentY = doc.y + 20;

      // 7. ANEXOS (2 linhas antes do título)
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("ANEXOS", 38, currentY);
      currentY = doc.y + 4;

      doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b").text("Diante do exposto, encaminho o presente procedimento à Vossa Excelência, instruído com as seguintes peças:", 38, currentY, {
        width: printableWidth,
        lineGap: 1.5,
      });

      currentY = doc.y + 3;
      let anexos: string[] = [];
      if (data.ANEXOS_LISTA && data.ANEXOS_LISTA.trim().length > 0) {
        anexos = data.ANEXOS_LISTA.split("\n").map(s => s.trim()).filter(s => s.length > 0);
      } else {
        anexos = [
          `1. Boletim de Ocorrência nº ${data.BO_NUMERO || "---"};`,
          `2. Auto de Infração Ambiental n. ${data.AIA_NUMERO || "---"};`,
          `3. Termo de Embargo/Suspensão n. ${data.TE_NUMERO || "---"};`,
          `4. Relatório de Fiscalização;`,
          `5. Relatório fotográfico, mapas e listas de coordenadas;`,
          `6. Cópias dos documentos pessoais, contrato social e registro do imóvel rural.`,
        ];
      }

      anexos.forEach((anexo) => {
        doc.font("Helvetica").fontSize(7.3).fillColor("#1e293b").text(anexo, 48, currentY, { width: printableWidth - 10 });
        currentY = doc.y + 2;
      });

      // 3 linhas de espaço antes da cidade e da data
      currentY = doc.y + 30;

      // 8. Data e Assinatura
      doc.font("Helvetica").fontSize(8).fillColor("#1e293b").text(`Chapecó, ${data.DATA_ATUAL || ""}.`, 38, currentY, {
        align: "center",
        width: printableWidth,
      });

      // 3 linhas de espaço após a cidade e da data antes da autoridade
      currentY = doc.y + 30;
      const nomeAutoridade = data.AUTORIDADE_NOME || "Andréia Cristina Fergitz";
      const cargoAutoridade = data.AUTORIDADE_CARGO || "Tenente Coronel PM - Comandante do 2ºBPMA";

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(nomeAutoridade, 38, currentY, {
        align: "center",
        width: printableWidth,
      });
      currentY = doc.y + 2;
      doc.font("Helvetica").fontSize(7.5).fillColor("#334155").text(cargoAutoridade, 38, currentY, {
        align: "center",
        width: printableWidth,
      });
      currentY = doc.y + 1.5;
      doc.font("Helvetica").fontSize(7).fillColor("#475569").text("Autoridade Ambiental Fiscalizadora", 38, currentY, {
        align: "center",
        width: printableWidth,
      });
      currentY = doc.y + 1.5;
      doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("#64748b").text("(Documento assinado eletronicamente)", 38, currentY, {
        align: "center",
        width: printableWidth,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// API Endpoint 3: Generate filled DOCX file
app.post("/api/generate-docx", async (req, res) => {
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

// API Endpoint: Generate filled PDF file
app.post("/api/generate-pdf", async (req, res) => {
  try {
    const rawData = req.body.data;
    const tagData: Record<string, string> = typeof rawData === "string" ? JSON.parse(rawData) : (rawData || DEFAULT_EMPTY_DATA);

    const outputBuffer = await createDefaultPdfBuffer(tagData);
    const filename = `Notificacao_${(tagData.NOME_INFRATOR || "Infrator").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(outputBuffer);
  } catch (err: any) {
    console.error("Erro ao gerar PDF:", err);
    return res.status(500).json({ error: "Erro ao gerar arquivo .pdf: " + (err?.message || "Erro desconhecido") });
  }
});

// API Endpoint 4: Generate executable Python script string
app.post("/api/generate-python-script", (req, res) => {
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

startServer();
