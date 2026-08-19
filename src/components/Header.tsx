import React from "react";
import { Building2, Download, RotateCcw } from "lucide-react";
import { UNIDADES_2BPMA } from "../types";

interface HeaderProps {
  onDownloadDocx: () => void;
  onReset: () => void;
  isGeneratingDocx: boolean;
  hasExtracted?: boolean;
  selectedUnitId: string;
  onUnitChange: (unitId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onDownloadDocx,
  onReset,
  isGeneratingDocx,
  hasExtracted,
  selectedUnitId,
  onUnitChange,
}) => {
  return (
    <header className="bg-[#0f172a] text-white border-b border-slate-700 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="https://i.postimg.cc/T3nnCR92/logo-azul.png"
            alt="Brasão 2º BPMA"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl shrink-0 drop-shadow-xl hover:scale-105 transition-transform duration-200"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Processo Penal Ambiental
              </h1>
              <span className="bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-blue-400/30">
                PMSC / 2º BPMA
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium tracking-wide mt-0.5">
              2º Batalhão de Polícia Militar Ambiental
            </p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5 hidden sm:block">
              Sistema de Geração de Processo Penal Ambiental
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Rápido de Unidade */}
          <div className="flex items-center bg-slate-800/95 border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-xs">
            <Building2 className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                Unidade / Subunidade
              </span>
              <select
                value={selectedUnitId}
                onChange={(e) => onUnitChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1 pt-0.5"
                title="Selecione a Unidade do 2º BPMA para ajustar cabeçalho, endereço e autoridade fiscalizadora"
              >
                {UNIDADES_2BPMA.map((unit) => (
                  <option key={unit.id} value={unit.id} className="bg-slate-900 text-white py-1">
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Limpar formulário e anexos para iniciar um novo processo"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Novo Processo</span>
          </button>

          <button
            onClick={onDownloadDocx}
            disabled={isGeneratingDocx || !hasExtracted}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-white transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98] ${
              hasExtracted && !isGeneratingDocx
                ? "bg-[#1e40af] hover:bg-blue-700 cursor-pointer"
                : "bg-slate-700 opacity-60 cursor-not-allowed"
            }`}
            title={hasExtracted ? "Gerar notificação em Word" : "Envie os PDFs para habilitar"}
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingDocx ? "Gerando..." : "Gerar Word (.docx)"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

