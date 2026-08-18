import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "A chave GEMINI_API_KEY não foi configurada nas variáveis de ambiente da Vercel. Adicione GEMINI_API_KEY em Settings > Environment Variables e faça um novo Deploy."
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

const modelsToTry = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Utilize POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { text, documents } = body;

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

    contentsParts.push({ text: systemPrompt });

    const ai = getAiClient();
    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
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
          if (response) break;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code || "";
          const errMsg = String(err?.message || "").toLowerCase();
          const isRateLimit =
            status === 429 ||
            errMsg.includes("429") ||
            errMsg.includes("quota") ||
            errMsg.includes("resource_exhausted");
          const isDemandSpike =
            status === 503 ||
            status === "UNAVAILABLE" ||
            errMsg.includes("503") ||
            errMsg.includes("unavailable");

          if (isDemandSpike || isRateLimit) {
            break;
          } else if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
      if (response) break;
    }

    if (!response) {
      throw lastError || new Error("Não foi possível processar a requisição com os modelos Gemini disponíveis.");
    }

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

    return res.status(200).json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error("Erro na rota serverless /api/extract-text:", error);
    const errText = String(error?.message || "");
    let userMsg = "Falha no processamento com IA: " + errText;
    if (errText.includes("429") || errText.includes("quota") || errText.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "Limite de requisições por minuto da API atingido temporariamente. Aguarde 30 segundos e tente novamente.";
    }
    return res.status(500).json({
      error: userMsg,
    });
  }
}
