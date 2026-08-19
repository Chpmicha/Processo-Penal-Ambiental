import React, { useState } from "react";
import { Header } from "./components/Header";
import { PdfUploader } from "./components/PdfUploader";
import { TagEditorForm } from "./components/TagEditorForm";
import { DocumentPreview } from "./components/DocumentPreview";
import { ExtractedData, UNIDADES_2BPMA } from "./types";
import { extractTextFromPdfFile } from "./utils/pdfExtractor";
import { getUnitById, detectUnitByLocation, applyUnitToData } from "./utils/unitHelpers";
import { CheckCircle, AlertCircle, Edit3, FileText } from "lucide-react";

const DEFAULT_UNIT = UNIDADES_2BPMA[0];

const BASE_INITIAL_DATA: ExtractedData = {
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
  AUTORIDADE_NOME: DEFAULT_UNIT.autoridadeNome,
  AUTORIDADE_CARGO: DEFAULT_UNIT.autoridadeCargo,
  UNIDADE_ID: DEFAULT_UNIT.id,
  UNIDADE_NOME: DEFAULT_UNIT.name,
  UNIDADE_ENDERECO: DEFAULT_UNIT.endereco,
  UNIDADE_CONTATO: DEFAULT_UNIT.contato,
  CIDADE_FECHO: DEFAULT_UNIT.cidade,
};

export default function App() {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(DEFAULT_UNIT.id);
  const [data, setData] = useState<ExtractedData>(BASE_INITIAL_DATA);
  const [selectedPdfs, setSelectedPdfs] = useState<File[]>([]);
  const [hasExtracted, setHasExtracted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"tags" | "preview">("preview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = getUnitById(unitId);
    setData((prev) => applyUnitToData(prev, unit));
    showToast(`Unidade alterada para: ${unit.name}`);
  };

  const handleReset = () => {
    const currentUnit = getUnitById(selectedUnitId);
    const resetData = applyUnitToData(
      {
        ...BASE_INITIAL_DATA,
        DATA_ATUAL: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      },
      currentUnit
    );
    setData(resetData);
    setSelectedPdfs([]);
    setHasExtracted(false);
    showToast("Dados e anexos limpos com sucesso! Pronto para processar um novo caso.");
  };

  const handleExtractPdfs = async (pdfFiles: File[]) => {
    setIsProcessing(true);
    try {
      // 1. Extração de texto ultra-leve no navegador (elimina o erro 413 do Vercel)
      const extractedDocs: { name: string; text: string }[] = [];
      let combinedText = "";
      for (const file of pdfFiles) {
        const text = await extractTextFromPdfFile(file);
        if (text && text.trim().length > 20) {
          extractedDocs.push({ name: file.name, text });
          combinedText += " " + text;
        }
      }

      let response: Response;

      if (extractedDocs.length > 0) {
        // Envia o texto extraído como JSON puro (~20KB em vez de 20MB)
        response = await fetch("/api/extract-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documents: extractedDocs }),
        });
      } else {
        // Fallback para envio binário de arquivo
        const formData = new FormData();
        pdfFiles.forEach((file) => formData.append("pdfs", file));

        response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
      }

      let result: any = null;
      const responseText = await response.text();
      try {
        result = JSON.parse(responseText);
      } catch {
        if (response.status === 413) {
          throw new Error("Tamanho dos arquivos excede o limite serverless. Tente carregar PDFs com texto selecionável ou com menos páginas com fotos.");
        }
        if (responseText && responseText.length > 0 && responseText.length < 300 && !responseText.includes("<!DOCTYPE")) {
          throw new Error(`Erro do servidor (${response.status}): ${responseText}`);
        }
        if (response.status === 500) {
          throw new Error("Erro no servidor (500). Verifique se a variável GEMINI_API_KEY foi adicionada no painel do Vercel (Settings > Environment Variables) e se um novo Deploy foi realizado.");
        }
        throw new Error(`Servidor inacessível ou tempo limite excedido (código ${response.status}).`);
      }

      if (response.ok && result?.success && result?.data) {
        let extracted = result.data as ExtractedData;

        // Auto-detect unit if location text matches one of the 9 units, otherwise apply current unit
        const locationText = (extracted.ENDEREÇO || "") + " " + (extracted.RESUMO_RELATORIO_FISCALIZACAO || "") + " " + combinedText;
        const detectedUnit = detectUnitByLocation(locationText);
        
        let unitToApply = getUnitById(selectedUnitId);
        if (detectedUnit && detectedUnit.id !== "chapeco") {
          unitToApply = detectedUnit;
          setSelectedUnitId(detectedUnit.id);
        }

        const finalData = applyUnitToData(extracted, unitToApply);
        setData(finalData);
        setHasExtracted(true);
        showToast(`Dados extraídos com sucesso! Unidade aplicada: ${unitToApply.name}`);
      } else {
        throw new Error(result?.error || `Erro do servidor (${response.status}) ao processar os PDFs.`);
      }
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("Failed to fetch")) {
        showToast("Conexão interrompida. Verifique sua conexão ou se a chave GEMINI_API_KEY está configurada no painel do Vercel.", "error");
      } else {
        showToast("Falha na extração: " + errMsg, "error");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsGeneratingDocx(true);
    try {
      const response = await fetch("/api/generate-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro ao gerar arquivo Word");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Notificacao_${(data.NOME_INFRATOR || "Infrator").replace(/ /g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("Arquivo Notificação (.docx) gerado e baixado com sucesso!");
    } catch (err: any) {
      showToast("Erro na geração do DOCX: " + (err?.message || "Erro"), "error");
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold border ${
            notification.type === "success"
              ? "bg-slate-900 border-green-500 text-white"
              : "bg-slate-900 border-red-500 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        onDownloadDocx={handleDownloadDocx}
        onReset={handleReset}
        isGeneratingDocx={isGeneratingDocx}
        hasExtracted={hasExtracted}
        selectedUnitId={selectedUnitId}
        onUnitChange={handleUnitChange}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* PDF Upload Card */}
        <PdfUploader
          onExtract={handleExtractPdfs}
          onShowToast={showToast}
          isProcessing={isProcessing}
          selectedPdfs={selectedPdfs}
          setSelectedPdfs={setSelectedPdfs}
        />

        {/* View Switcher / Visual Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "preview"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Visualização do Documento (A4)</span>
            </button>
            <button
              onClick={() => setActiveTab("tags")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "tags"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Painel de Tags &amp; Dados Extraídos</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 hidden md:block">
            {data.NOME_INFRATOR ? `Processo: ${data.NOME_INFRATOR}` : "Formulário aberto para edição manual ou extração"}
          </div>
        </div>

        {/* Dynamic Views: Side-by-side or Tabbed Content */}
        {activeTab === "tags" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div>
              <TagEditorForm data={data} onChange={setData} />
            </div>
            <div className="sticky top-6 self-start">
              <DocumentPreview data={data} />
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="max-w-4xl mx-auto">
            <DocumentPreview data={data} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-600 mt-auto space-y-1">
        <p className="font-semibold">
          Sistema de Automação de Processos Penais Ambientais • 2º Batalhão de Polícia Militar Ambiental (PMSC)
        </p>
        <p className="text-[11px] text-slate-500">
          Desenvolvido por 2º Sgt PM Michatowski - 928954@pm.sc.gov.br
        </p>
        <p className="text-[11px] text-slate-500">
          Andréia Cristina Fergitz | Tenente-Coronel PM Comandante do 2º BPMA
        </p>
      </footer>
    </div>
  );
}

