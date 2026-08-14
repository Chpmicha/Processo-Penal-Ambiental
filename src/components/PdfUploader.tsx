import React, { useRef, useState } from "react";
import { Upload, FileUp, Sparkles, AlertCircle } from "lucide-react";

interface PdfUploaderProps {
  onExtract: (pdfFiles: File[]) => Promise<void>;
  onShowToast?: (message: string, type?: "success" | "error") => void;
  isProcessing: boolean;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  onExtract,
  onShowToast,
  isProcessing,
}) => {
  const [selectedPdfs, setSelectedPdfs] = useState<File[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedPdfs((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemovePdf = (index: number) => {
    setSelectedPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartExtraction = async () => {
    if (selectedPdfs.length < 1) {
      onShowToast?.(
        "Atenção: Por favor, selecione ao menos 1 arquivo PDF para realizar a análise.",
        "error"
      );
      pdfInputRef.current?.click();
      return;
    }
    await onExtract(selectedPdfs);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            1. Envio dos Documentos PDF do Processo
          </h2>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold uppercase px-2 py-0.5 rounded border border-slate-200">
          Entrada de Dados
        </span>
      </div>

      {/* PDF Dropzone */}
      <div
        onClick={() => pdfInputRef.current?.click()}
        className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[140px]"
      >
        <input
          type="file"
          ref={pdfInputRef}
          onChange={handlePdfSelect}
          accept="application/pdf"
          multiple
          className="hidden"
        />
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Clique para selecionar os arquivos PDF do Processo
          </p>
          <p className="text-[11px] text-blue-600 font-medium mt-1">
            Anexe o 02. BOTC e o 03. Relatório de Fiscalização/PAFA (mínimo de 2 arquivos PDF)
          </p>
        </div>
      </div>

      {/* Selected PDFs List */}
      {selectedPdfs.length > 0 && (
        <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Arquivos Anexados ({selectedPdfs.length}):</span>
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded border border-green-200">
                ✓ {selectedPdfs.length} arquivo(s) pronto(s) para análise
              </span>
            </div>
            <button
              onClick={() => setSelectedPdfs([])}
              className="text-[10px] text-red-600 hover:underline font-bold uppercase cursor-pointer"
            >
              Limpar lista
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedPdfs.map((file, idx) => (
              <div
                key={idx}
                className="bg-white text-slate-800 text-xs font-medium px-2.5 py-1.5 rounded border border-slate-200 flex items-center gap-2 shadow-xs"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[240px]">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePdf(idx);
                  }}
                  className="text-slate-400 hover:text-red-600 ml-1 font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          A IA analisará o BOTC e o Relatório para extrair autoria, materialidade e enquadramento.
        </p>
        <button
          onClick={handleStartExtraction}
          disabled={isProcessing}
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-white transition-all shadow-md active:scale-[0.98] ${
            selectedPdfs.length >= 1 && !isProcessing
              ? "bg-[#1e40af] hover:bg-blue-700 cursor-pointer shadow-blue-900/20"
              : "bg-slate-400 cursor-not-allowed opacity-70"
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isProcessing ? "animate-spin text-amber-300" : ""}`} />
          <span>
            {isProcessing ? "Analisando PDFs com Gemini IA..." : "Analisar e Extrair Dados"}
          </span>
        </button>
      </div>
    </div>
  );
};

