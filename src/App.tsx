import React, { useState } from "react";
import { Header } from "./components/Header";
import { PdfUploader } from "./components/PdfUploader";
import { TagEditorForm } from "./components/TagEditorForm";
import { DocumentPreview } from "./components/DocumentPreview";
import { PythonScriptModal } from "./components/PythonScriptModal";
import { ExtractedData } from "./types";
import { CheckCircle, AlertCircle, UploadCloud, Edit3, FileText, Code2 } from "lucide-react";

export default function App() {
  const [data, setData] = useState<ExtractedData>({
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
    AUTORIDADE_CARGO: "Tenente Coronel PM - Comandante do 2ºBPMA",
  });
  const [hasExtracted, setHasExtracted] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"tags" | "preview" | "python">("preview");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [showPythonModal, setShowPythonModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExtractPdfs = async (pdfFiles: File[]) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      pdfFiles.forEach((file) => formData.append("pdfs", file));

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch {
        throw new Error(`Servidor inacessível ou tempo limite excedido (código ${response.status}).`);
      }

      if (response.ok && result?.success && result?.data) {
        setData(result.data);
        setHasExtracted(true);
        showToast("Dados extraídos com sucesso da análise dos PDFs com Gemini IA!");
      } else {
        throw new Error(result?.error || `Erro do servidor (${response.status}) ao processar os PDFs.`);
      }
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("Failed to fetch")) {
        showToast("Conexão interrompida. Se o PDF for muito pesado (escaneado), aguarde alguns segundos e tente enviar novamente.", "error");
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

  const handleDownloadPythonScript = async () => {
    try {
      const response = await fetch("/api/generate-python-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preencher_notificacao_${(data.NOME_INFRATOR || "processo").replace(/[^a-zA-Z0-9]/g, "_")}.py`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("Script Python (.py) baixado com sucesso!");
    } catch (err: any) {
      showToast("Erro ao baixar script Python: " + (err?.message || "Erro"), "error");
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
        onDownloadPython={() => setShowPythonModal(true)}
        isGeneratingDocx={isGeneratingDocx}
        hasExtracted={hasExtracted}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* PDF Upload Card */}
        <PdfUploader
          onExtract={handleExtractPdfs}
          onShowToast={showToast}
          isProcessing={isProcessing}
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
            <button
              onClick={() => setActiveTab("python")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "python"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Código Python &amp; JSON</span>
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

        {activeTab === "python" && (
          <div className="max-w-5xl mx-auto">
            <PythonScriptModal data={data} onDownloadScript={handleDownloadPythonScript} />
          </div>
        )}

        {/* Python Script Modal popup when triggered from header */}
        {showPythonModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
              <button
                onClick={() => setShowPythonModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
              <PythonScriptModal data={data} onDownloadScript={handleDownloadPythonScript} />
            </div>
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
      </footer>
    </div>
  );
}

