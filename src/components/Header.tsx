import React from "react";
import { Code, Download } from "lucide-react";

interface HeaderProps {
  onDownloadDocx: () => void;
  onDownloadPython: () => void;
  isGeneratingDocx: boolean;
  hasExtracted?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onDownloadDocx,
  onDownloadPython,
  isGeneratingDocx,
  hasExtracted,
}) => {
  return (
    <header className="bg-[#0f172a] text-white border-b border-slate-700 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/brasao_2bpma.png"
            alt="Brasão 2º BPMA"
            className="h-10 w-auto object-contain shrink-0 drop-shadow"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Processo Penal Ambiental
              </h1>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-blue-400/30">
                PMSC / 2º BPMA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              Sistema de Geração de Processo Penal Ambiental
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadPython}
            disabled={!hasExtracted}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors ${
              hasExtracted
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border-slate-700 cursor-pointer"
                : "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
            }`}
            title={hasExtracted ? "Baixar Script Python auto-executável" : "Envie os PDFs para habilitar"}
          >
            <Code className="w-4 h-4 text-blue-400" />
            <span>Script Python (.py)</span>
          </button>

          <button
            onClick={onDownloadDocx}
            disabled={isGeneratingDocx || !hasExtracted}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-white transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98] ${
              hasExtracted && !isGeneratingDocx
                ? "bg-[#1e40af] hover:bg-blue-700 cursor-pointer"
                : "bg-slate-700 opacity-60 cursor-not-allowed"
            }`}
            title={hasExtracted ? "Gerar notificação em Word" : "Envie os PDFs para habilitar"}
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingDocx ? "Gerando..." : "Gerar Notificação (.docx)"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
